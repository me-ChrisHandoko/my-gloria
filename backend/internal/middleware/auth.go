package middleware

import (
	"strings"

	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/models"

	"github.com/gin-gonic/gin"
)

// AuthRequired is a middleware that validates JWT token
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// Primary: Try to get token from httpOnly cookie (secure, XSS-safe)
		cookieToken, err := c.Cookie("gloria_access_token")
		if err == nil && cookieToken != "" {
			token = cookieToken
		} else {
			// Fallback: Check Authorization header (for API clients that can't use cookies)
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && parts[0] == "Bearer" {
					token = parts[1]
				}
			}
		}

		// If no token found in either cookie or header
		if token == "" {
			c.JSON(401, gin.H{"error": "authentication required"})
			c.Abort()
			return
		}

		// Validate JWT token
		claims, err := auth.ValidateToken(token)
		if err != nil {
			c.JSON(401, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		// Verify user exists and is active
		db := database.GetDB()
		var user models.User
		if err := db.First(&user, "id = ?", claims.UserID).Error; err != nil {
			c.JSON(401, gin.H{"error": "user not found"})
			c.Abort()
			return
		}

		if !user.IsActive {
			c.JSON(401, gin.H{"error": "account is inactive"})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)

		c.Next()
	}
}
