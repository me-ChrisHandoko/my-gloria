package middleware

import (
	"backend/internal/auth"

	"github.com/gin-gonic/gin"
)

// CSRFProtection is a middleware that validates CSRF tokens for state-changing requests
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only check CSRF for state-changing methods (not GET, HEAD, OPTIONS)
		method := c.Request.Method
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			c.Next()
			return
		}

		// Get user ID from context (set by AuthRequired middleware)
		userID := c.GetString("user_id")
		if userID == "" {
			c.JSON(403, gin.H{"error": "CSRF validation failed: user not authenticated"})
			c.Abort()
			return
		}

		// Get CSRF token from X-CSRF-Token header
		csrfToken := c.GetHeader("X-CSRF-Token")
		if csrfToken == "" {
			c.JSON(403, gin.H{"error": "CSRF token is required"})
			c.Abort()
			return
		}

		// Validate CSRF token
		if err := auth.ValidateCSRFToken(csrfToken, userID); err != nil {
			c.JSON(403, gin.H{"error": "CSRF validation failed: " + err.Error()})
			c.Abort()
			return
		}

		// CSRF token is valid, continue
		c.Next()
	}
}
