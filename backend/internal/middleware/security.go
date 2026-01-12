package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders adds security-related HTTP headers to all responses
// This middleware protects against common web vulnerabilities:
// - Clickjacking (X-Frame-Options)
// - MIME sniffing (X-Content-Type-Options)
// - XSS attacks (X-XSS-Protection, Content-Security-Policy)
// - Man-in-the-middle attacks (Strict-Transport-Security)
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent clickjacking attacks by disallowing the page to be embedded in frames
		// DENY: Page cannot be displayed in a frame, regardless of the site attempting to do so
		c.Header("X-Frame-Options", "DENY")

		// Prevent MIME sniffing
		// Browsers won't try to guess content type, must respect Content-Type header
		c.Header("X-Content-Type-Options", "nosniff")

		// Enable XSS protection (legacy but still useful for older browsers)
		// 1; mode=block: Enable XSS filter and block page if attack detected
		c.Header("X-XSS-Protection", "1; mode=block")

		// Content Security Policy - prevents XSS and other injection attacks
		// default-src 'self': Only allow resources from same origin
		// This is a strict policy, adjust based on your needs
		c.Header("Content-Security-Policy", "default-src 'self'")

		// Referrer Policy - controls how much referrer information is sent
		// strict-origin-when-cross-origin: Send full URL for same-origin, only origin for cross-origin
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature Policy)
		// Disable potentially dangerous browser features
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Force HTTPS in production (HSTS - HTTP Strict Transport Security)
		// Only enable in production to avoid development issues
		if gin.Mode() == gin.ReleaseMode {
			// max-age=31536000: Enforce HTTPS for 1 year
			// includeSubDomains: Apply to all subdomains
			// preload: Allow inclusion in browser HSTS preload list
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		c.Next()
	}
}
