package middleware

import (
	"net/http"
	"strings"

	"backend/internal/response"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
)

// UserProfileLookup is an interface for looking up user profiles
// This allows the middleware to be decoupled from the service layer
type UserProfileLookup interface {
	GetByClerkUserID(clerkUserID string) (*UserProfileInfo, error)
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

// ClerkAuth returns a middleware that validates Clerk session tokens
func ClerkAuth(lookup UserProfileLookup) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		token := extractBearerToken(c)
		if token == "" {
			response.Error(c, http.StatusUnauthorized, "missing authorization token")
			c.Abort()
			return
		}

		// Verify the session token with Clerk
		claims, err := jwt.Verify(c.Request.Context(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "invalid or expired token")
			c.Abort()
			return
		}

		// Get the Clerk user ID from claims
		clerkUserID := claims.Subject
		if clerkUserID == "" {
			response.Error(c, http.StatusUnauthorized, "invalid token claims")
			c.Abort()
			return
		}

		// Look up the user profile by Clerk user ID
		userInfo, err := lookup.GetByClerkUserID(clerkUserID)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "user not found")
			c.Abort()
			return
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

		// Look up the user profile by Clerk user ID
		userInfo, err := lookup.GetByClerkUserID(clerkUserID)
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
