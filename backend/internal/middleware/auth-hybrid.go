package middleware

import (
	"strings"

	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/models"

	"github.com/gin-gonic/gin"
)

// AuthRequiredHybrid is a middleware that validates JWT token from either:
// 1. Authorization header (Bearer token) - for client-side requests
// 2. Cookie (access_token) - for server-side SSR requests
func AuthRequiredHybrid() gin.HandlerFunc {
	return func(c *gin.Context) {
		var token string

		// Try to get token from Authorization header first (client-side requests)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		// If no token in header, try to get from cookie (SSR requests)
		if token == "" {
			var err error
			token, err = c.Cookie("gloria_access_token")
			if err != nil || token == "" {
				c.JSON(401, gin.H{"error": "authentication required"})
				c.Abort()
				return
			}
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
