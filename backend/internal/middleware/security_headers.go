package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders returns a middleware that adds security headers to all responses
// These headers protect against common web vulnerabilities:
// - Clickjacking (X-Frame-Options)
// - XSS attacks (Content-Security-Policy)
// - MIME-type sniffing (X-Content-Type-Options)
// - Downgrade attacks (Strict-Transport-Security)
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent clickjacking attacks by disallowing iframe embedding
		// This protects login pages from being embedded in malicious sites
		c.Header("X-Frame-Options", "DENY")

		// Prevent browsers from MIME-sniffing responses
		// Forces browser to respect Content-Type header
		c.Header("X-Content-Type-Options", "nosniff")

		// Protect against XSS attacks with Content Security Policy
		// - default-src 'self': Only load resources from same origin
		// - script-src 'self' 'unsafe-inline': Allow inline scripts (needed for Next.js)
		// - style-src 'self' 'unsafe-inline': Allow inline styles (needed for Tailwind)
		// - img-src 'self' data: https:: Allow images from self, data URLs, and HTTPS
		// - font-src 'self' data:: Allow fonts from self and data URLs
		// - connect-src 'self': Only allow API calls to same origin
		// - frame-ancestors 'none': Prevent embedding in iframes (redundant with X-Frame-Options)
		c.Header("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https: blob:; "+
				"font-src 'self' data:; "+
				"connect-src 'self' https://api.clerk.com https://*.clerk.accounts.dev wss://*.clerk.accounts.dev; "+
				"frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev; "+
				"frame-ancestors 'none'; "+
				"base-uri 'self'; "+
				"form-action 'self'")

		// Force HTTPS in production (commented for development)
		// Enable this in production by checking environment
		// c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		// Prevent browsers from caching sensitive data
		// Useful for authenticated pages
		if c.Request.URL.Path != "/ping" {
			c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		}

		// Referrer policy - only send origin for cross-origin requests
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy - disable potentially dangerous features
		c.Header("Permissions-Policy",
			"geolocation=(), "+
				"microphone=(), "+
				"camera=(), "+
				"payment=(), "+
				"usb=(), "+
				"magnetometer=(), "+
				"gyroscope=(), "+
				"accelerometer=()")

		c.Next()
	}
}

// SecurityHeadersProduction returns stricter security headers for production
// Includes HSTS header to force HTTPS
func SecurityHeadersProduction() gin.HandlerFunc {
	return func(c *gin.Context) {
		// All the standard security headers
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https: blob:; "+
				"font-src 'self' data:; "+
				"connect-src 'self' https://api.clerk.com https://*.clerk.accounts.dev wss://*.clerk.accounts.dev; "+
				"frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev; "+
				"frame-ancestors 'none'; "+
				"base-uri 'self'; "+
				"form-action 'self'")

		// ✅ PRODUCTION: Force HTTPS with HSTS
		// max-age=31536000: 1 year
		// includeSubDomains: Apply to all subdomains
		// preload: Allow inclusion in browser HSTS preload lists
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy",
			"geolocation=(), "+
				"microphone=(), "+
				"camera=(), "+
				"payment=(), "+
				"usb=(), "+
				"magnetometer=(), "+
				"gyroscope=(), "+
				"accelerometer=()")

		c.Next()
	}
}
