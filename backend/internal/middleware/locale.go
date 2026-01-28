// Package middleware - Locale detection middleware for i18n support
package middleware

import (
	"strings"

	"backend/internal/i18n"

	"github.com/gin-gonic/gin"
)

// LocaleMiddleware detects the user's preferred language and sets it in context.
// Detection priority:
// 1. Cookie "NEXT_LOCALE" (set by frontend)
// 2. Accept-Language header
// 3. Default locale (Indonesian)
func LocaleMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		locale := detectLocale(c)

		// Store locale in context for use by handlers
		c.Set("locale", locale)

		// Set Content-Language response header
		c.Header("Content-Language", locale)

		c.Next()
	}
}

// detectLocale determines the locale from request
func detectLocale(c *gin.Context) string {
	// Priority 1: Cookie from frontend (NEXT_LOCALE)
	if cookie, err := c.Cookie("NEXT_LOCALE"); err == nil && cookie != "" {
		if i18n.IsSupported(cookie) {
			return cookie
		}
	}

	// Priority 2: Accept-Language header
	acceptLang := c.GetHeader("Accept-Language")
	if acceptLang != "" {
		locale := parseAcceptLanguage(acceptLang)
		if i18n.IsSupported(locale) {
			return locale
		}
	}

	// Priority 3: Default locale
	return i18n.DefaultLocale
}

// parseAcceptLanguage extracts the primary language from Accept-Language header
// Examples:
//   - "id-ID,id;q=0.9,en;q=0.8" -> "id"
//   - "en-US,en;q=0.9" -> "en"
//   - "id" -> "id"
func parseAcceptLanguage(header string) string {
	// Split by comma to get language preferences
	parts := strings.Split(header, ",")
	if len(parts) == 0 {
		return i18n.DefaultLocale
	}

	// Get the first (highest priority) language
	firstLang := strings.TrimSpace(parts[0])

	// Remove quality value if present (e.g., "en;q=0.9" -> "en")
	firstLang = strings.Split(firstLang, ";")[0]

	// Extract base language code (e.g., "id-ID" -> "id")
	firstLang = strings.Split(firstLang, "-")[0]

	return strings.ToLower(strings.TrimSpace(firstLang))
}

// GetLocaleFromContext is a helper to get locale from gin.Context
func GetLocaleFromContext(c *gin.Context) string {
	locale := c.GetString("locale")
	if locale == "" {
		return i18n.DefaultLocale
	}
	return locale
}
