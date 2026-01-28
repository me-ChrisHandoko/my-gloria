// Package i18n provides internationalization support for the backend API.
// It supports multiple languages and retrieves the locale from gin.Context.
package i18n

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

// Supported locales
const (
	LocaleID = "id" // Indonesian (default)
	LocaleEN = "en" // English
)

// Default locale when none is specified
const DefaultLocale = LocaleID

// translations holds all translations indexed by locale
var translations = map[string]map[string]string{
	LocaleID: TranslationsID,
	LocaleEN: TranslationsEN,
}

// T returns the translated message for the given key.
// It uses the locale stored in gin.Context (set by LocaleMiddleware).
// Falls back to Indonesian if translation not found.
func T(c *gin.Context, key string) string {
	locale := GetLocale(c)

	// Try to get translation for current locale
	if msgs, ok := translations[locale]; ok {
		if msg, ok := msgs[key]; ok {
			return msg
		}
	}

	// Fallback to default locale (Indonesian)
	if locale != DefaultLocale {
		if msgs, ok := translations[DefaultLocale]; ok {
			if msg, ok := msgs[key]; ok {
				return msg
			}
		}
	}

	// Return key if not found (useful for debugging)
	return key
}

// TF returns the translated message with format arguments.
// Example: TF(c, "validation.min_length", "Password", 8) -> "Password minimal 8 karakter"
func TF(c *gin.Context, key string, args ...interface{}) string {
	template := T(c, key)
	if len(args) > 0 {
		return fmt.Sprintf(template, args...)
	}
	return template
}

// GetLocale returns the current locale from gin.Context.
// Returns default locale if not set.
func GetLocale(c *gin.Context) string {
	if c == nil {
		return DefaultLocale
	}
	locale := c.GetString("locale")
	if locale == "" {
		return DefaultLocale
	}
	return locale
}

// IsSupported checks if a locale is supported
func IsSupported(locale string) bool {
	_, ok := translations[locale]
	return ok
}

// GetSupportedLocales returns list of supported locales
func GetSupportedLocales() []string {
	locales := make([]string, 0, len(translations))
	for locale := range translations {
		locales = append(locales, locale)
	}
	return locales
}
