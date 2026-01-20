package helpers

import (
	"github.com/gin-gonic/gin"
)

// SetAuthCookies sets both access and refresh token cookies
func SetAuthCookies(c *gin.Context, accessToken, refreshToken string, isProduction bool) {
	// Access token cookie (1 hour expiry)
	c.SetCookie(
		"gloria_access_token", // name
		accessToken,           // value
		3600,                  // maxAge in seconds (1 hour)
		"/",                   // path
		"",                    // domain (empty = current domain)
		isProduction,          // secure (HTTPS only in production)
		true,                  // httpOnly
	)

	// Refresh token cookie (7 days expiry)
	c.SetCookie(
		"gloria_refresh_token", // name
		refreshToken,           // value
		604800,                 // maxAge in seconds (7 days)
		"/",                    // path
		"",                     // domain
		isProduction,           // secure
		true,                   // httpOnly
	)
}

// ClearAuthCookies removes both access and refresh token cookies, and CSRF token cookie
func ClearAuthCookies(c *gin.Context) {
	// Clear access token cookie (negative maxAge deletes the cookie)
	c.SetCookie(
		"gloria_access_token",
		"",
		-1, // maxAge: -1 deletes the cookie
		"/",
		"",
		false,
		true,
	)

	// Clear refresh token cookie
	c.SetCookie(
		"gloria_refresh_token",
		"",
		-1,
		"/",
		"",
		false,
		true,
	)

	// Clear CSRF token cookie
	ClearCSRFCookie(c)
}

// UpdateAccessTokenCookie updates only the access token cookie (used after refresh)
func UpdateAccessTokenCookie(c *gin.Context, accessToken string, isProduction bool) {
	c.SetCookie(
		"gloria_access_token",
		accessToken,
		3600, // 1 hour
		"/",
		"",
		isProduction,
		true,
	)
}

// SetCSRFCookie sets the CSRF token cookie (NOT httpOnly - JavaScript needs to read it)
func SetCSRFCookie(c *gin.Context, csrfToken string, isProduction bool) {
	c.SetCookie(
		"gloria_csrf_token", // name
		csrfToken,           // value
		86400,               // maxAge in seconds (24 hours)
		"/",                 // path
		"",                  // domain
		isProduction,        // secure (HTTPS only in production)
		false,               // httpOnly: FALSE - JavaScript needs to read this
	)
}

// ClearCSRFCookie removes the CSRF token cookie
func ClearCSRFCookie(c *gin.Context) {
	c.SetCookie(
		"gloria_csrf_token",
		"",
		-1, // maxAge: -1 deletes the cookie
		"/",
		"",
		false,
		false,
	)
}
