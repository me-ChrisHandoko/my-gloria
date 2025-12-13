package middleware

import (
	"log"
	"net/http"
	"strings"
	"time"

	"backend/internal/response"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gin-gonic/gin"
)

// UserProfileLookup is an interface for looking up user profiles
// This allows the middleware to be decoupled from the service layer
type UserProfileLookup interface {
	// GetOrCreateByClerkUserID looks up a user profile by Clerk user ID.
	// If not found, it attempts to auto-register by matching any of the provided emails with data_karyawan.
	// Returns the user profile info or an error if user cannot be found or registered.
	GetOrCreateByClerkUserID(clerkUserID string, emails []string) (*UserProfileInfo, error)
}

// UserProfileInfo contains the minimal user profile info needed for auth context
type UserProfileInfo struct {
	ID          string
	ClerkUserID string
	NIP         string
	IsActive    bool
	Permissions []string
	Roles       []string
}

// ClerkAuthConfig holds configuration for Clerk authentication
type ClerkAuthConfig struct {
	SecretKey string
}

// Global cache for auth context (30 second TTL for faster HR status updates)
// Reduced from 5 minutes to 30 seconds to ensure HR status changes take effect quickly
// Real-time invalidation via LISTEN/NOTIFY provides immediate effect
var authCache = NewCache(30*time.Second, 10*time.Second)

// InvalidateAuthCache invalidates the cache for a specific user
// Should be called when user permissions, roles, or profile changes
func InvalidateAuthCache(clerkUserID string) {
	if clerkUserID != "" {
		authCache.Delete("auth:" + clerkUserID)
	}
}

// ClearAuthCache clears all cached auth data
// Useful for bulk updates or testing
func ClearAuthCache() {
	authCache.Clear()
}

// GetAuthCacheStats returns cache statistics
func GetAuthCacheStats() map[string]int {
	return authCache.GetStats()
}

// ClerkAuth returns a middleware that validates Clerk session tokens
// It also handles auto-registration for new users by matching their email with data_karyawan
func ClerkAuth(lookup UserProfileLookup) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		token := extractBearerToken(c)
		if token == "" {
			log.Println("❌ ClerkAuth: No token in Authorization header")
			response.Error(c, http.StatusUnauthorized, "missing authorization token")
			c.Abort()
			return
		}

		tokenPrefix := token
		if len(token) > 20 {
			tokenPrefix = token[:20]
		}
		log.Printf("🔑 ClerkAuth: Token received (length: %d, prefix: %s...)", len(token), tokenPrefix)

		// Verify the session token with Clerk
		claims, err := jwt.Verify(c.Request.Context(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			log.Printf("❌ ClerkAuth: Token verification failed - %v", err)
			response.Error(c, http.StatusUnauthorized, "invalid or expired token")
			c.Abort()
			return
		}

		log.Printf("✅ ClerkAuth: Token verified successfully for user: %s", claims.Subject)

		// Get the Clerk user ID from claims
		clerkUserID := claims.Subject
		if clerkUserID == "" {
			response.Error(c, http.StatusUnauthorized, "invalid token claims")
			c.Abort()
			return
		}

		// Check cache first
		cacheKey := "auth:" + clerkUserID
		var userInfo *UserProfileInfo

		if cached, found := authCache.Get(cacheKey); found {
			// Cache hit - use cached user info
			userInfo = cached.(*UserProfileInfo)
		} else {
			// Cache miss - fetch from database
			// Fetch user details from Clerk to get email for auto-registration
			clerkUser, err := user.Get(c.Request.Context(), clerkUserID)
			if err != nil {
				response.Error(c, http.StatusUnauthorized, "failed to fetch user details")
				c.Abort()
				return
			}

			// ✅ SECURITY FIX: Require X-Login-Email header to prevent confused deputy attacks
			// This ensures user authenticates with the exact email they validated in frontend
			loginEmail := c.GetHeader("X-Login-Email")
			var emails []string

			if loginEmail == "" {
				// X-Login-Email header is REQUIRED for web authentication
				// This prevents users with multiple emails from accidentally using wrong account
				log.Printf("⚠️ [ClerkAuth] Missing X-Login-Email header")

				// For backward compatibility during transition, we'll allow it but log warning
				// TODO: Make this a hard requirement after all clients are updated
				log.Printf("📧 [ClerkAuth] Falling back to all verified emails (deprecated)")

				// Collect all verified email addresses as fallback
				for i, emailAddr := range clerkUser.EmailAddresses {
					isPrimary := clerkUser.PrimaryEmailAddressID != nil && emailAddr.ID == *clerkUser.PrimaryEmailAddressID
					isVerified := emailAddr.Verification != nil && emailAddr.Verification.Status == "verified"
					log.Printf("   [%d] %s (Primary: %v, Verified: %v)", i+1, emailAddr.EmailAddress, isPrimary, isVerified)

					if isVerified {
						emails = append(emails, emailAddr.EmailAddress)
					}
				}
			} else {
				log.Printf("📧 [ClerkAuth] Login email from frontend: %s", loginEmail)

				// Verify X-Login-Email is one of user's verified emails
				isValid := false
				for _, emailAddr := range clerkUser.EmailAddresses {
					if emailAddr.Verification != nil && emailAddr.Verification.Status == "verified" && emailAddr.EmailAddress == loginEmail {
						isValid = true
						break
					}
				}

				if !isValid {
					// X-Login-Email does not match any verified email - SECURITY VIOLATION
					log.Printf("🚫 [ClerkAuth] X-Login-Email '%s' is not a verified email for this user", loginEmail)
					response.Error(c, http.StatusForbidden, "email mismatch - please re-authenticate")
					c.Abort()
					return
				}

				log.Printf("✅ [ClerkAuth] Using login email (verified): %s", loginEmail)
				emails = []string{loginEmail}
			}

			if len(emails) == 0 {
				log.Printf("⚠️ [ClerkAuth] No verified email found for user %s", clerkUserID)
				response.Error(c, http.StatusUnauthorized, "no verified email address")
				c.Abort()
				return
			}

			log.Printf("✅ [ClerkAuth] Will try to match with %d email(s)", len(emails))

			// Look up or create user profile by Clerk user ID and emails
			userInfo, err = lookup.GetOrCreateByClerkUserID(clerkUserID, emails)
			if err != nil {
				response.Error(c, http.StatusUnauthorized, err.Error())
				c.Abort()
				return
			}

			// Store in cache
			authCache.Set(cacheKey, userInfo)
		}

		// Check if user is active
		if !userInfo.IsActive {
			response.Error(c, http.StatusForbidden, "user account is inactive")
			c.Abort()
			return
		}

		// Set auth context
		authCtx := &AuthContext{
			Type:        AuthTypeClerk,
			UserID:      userInfo.ID,
			ClerkUserID: userInfo.ClerkUserID,
			NIP:         userInfo.NIP,
			Permissions: userInfo.Permissions,
			Roles:       userInfo.Roles,
		}
		SetAuthContext(c, authCtx)

		c.Next()
	}
}

// ClerkAuthOptional returns a middleware that validates Clerk session tokens but allows unauthenticated requests
// It also handles auto-registration for new users by matching their email with data_karyawan
func ClerkAuthOptional(lookup UserProfileLookup) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		token := extractBearerToken(c)
		if token == "" {
			// No token provided, continue without auth
			c.Next()
			return
		}

		// Verify the session token with Clerk
		claims, err := jwt.Verify(c.Request.Context(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			// Invalid token, continue without auth
			c.Next()
			return
		}

		// Get the Clerk user ID from claims
		clerkUserID := claims.Subject
		if clerkUserID == "" {
			c.Next()
			return
		}

		// Fetch user details from Clerk to get email for auto-registration
		clerkUser, err := user.Get(c.Request.Context(), clerkUserID)
		if err != nil {
			c.Next()
			return
		}

		// Check if frontend provided login email hint
		loginEmailHint := c.GetHeader("X-Login-Email")
		var emails []string

		if loginEmailHint != "" {
			log.Printf("📧 [ClerkAuthOptional] Login email hint from frontend: %s", loginEmailHint)

			// Verify that the hint email is actually one of the user's verified emails
			isValidHint := false
			for _, emailAddr := range clerkUser.EmailAddresses {
				isVerified := emailAddr.Verification != nil && emailAddr.Verification.Status == "verified"
				if isVerified && emailAddr.EmailAddress == loginEmailHint {
					isValidHint = true
					break
				}
			}

			if isValidHint {
				log.Printf("✅ [ClerkAuthOptional] Login email hint is valid and verified, using it exclusively")
				emails = []string{loginEmailHint}
			} else {
				log.Printf("⚠️ [ClerkAuthOptional] Login email hint is not valid or not verified, falling back to all emails")
			}
		}

		// If no valid hint, collect all verified email addresses
		if len(emails) == 0 {
			log.Printf("📧 [ClerkAuthOptional] No valid login hint, checking all verified emails (%d total)", len(clerkUser.EmailAddresses))

			// Collect all verified email addresses
			for i, emailAddr := range clerkUser.EmailAddresses {
				isPrimary := clerkUser.PrimaryEmailAddressID != nil && emailAddr.ID == *clerkUser.PrimaryEmailAddressID
				isVerified := emailAddr.Verification != nil && emailAddr.Verification.Status == "verified"
				log.Printf("   [%d] %s (Primary: %v, Verified: %v)", i+1, emailAddr.EmailAddress, isPrimary, isVerified)

				// Only include verified emails
				if isVerified {
					emails = append(emails, emailAddr.EmailAddress)
				}
			}
		}

		if len(emails) == 0 {
			log.Printf("⚠️ [ClerkAuthOptional] No verified email found for user %s", clerkUserID)
			c.Next()
			return
		}

		log.Printf("✅ [ClerkAuthOptional] Will try to match with %d email(s)", len(emails))

		// Look up or create user profile by Clerk user ID and emails
		userInfo, err := lookup.GetOrCreateByClerkUserID(clerkUserID, emails)
		if err != nil {
			c.Next()
			return
		}

		// Check if user is active
		if !userInfo.IsActive {
			c.Next()
			return
		}

		// Set auth context
		authCtx := &AuthContext{
			Type:        AuthTypeClerk,
			UserID:      userInfo.ID,
			ClerkUserID: userInfo.ClerkUserID,
			NIP:         userInfo.NIP,
			Permissions: userInfo.Permissions,
			Roles:       userInfo.Roles,
		}
		SetAuthContext(c, authCtx)

		c.Next()
	}
}

// InitClerk initializes the Clerk client with the provided secret key
func InitClerk(secretKey string) {
	clerk.SetKey(secretKey)
}

// extractBearerToken extracts the token from the Authorization header
func extractBearerToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	// Check for Bearer prefix
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}
