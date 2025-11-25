package middleware

import (
	"strconv"
	"strings"

	"backend/internal/config"

	"github.com/gin-gonic/gin"
)

// CORSConfig holds CORS middleware configuration
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	MaxAge         int
}

// CORS returns a CORS middleware using application config
func CORS(cfg *config.Config) gin.HandlerFunc {
	corsConfig := CORSConfig{
		AllowedOrigins: cfg.CORSAllowedOrigins,
		AllowedMethods: cfg.CORSAllowedMethods,
		AllowedHeaders: cfg.CORSAllowedHeaders,
		MaxAge:         cfg.CORSMaxAge,
	}

	return CORSWithConfig(corsConfig)
}

// CORSWithConfig returns a CORS middleware with custom configuration
func CORSWithConfig(cfg CORSConfig) gin.HandlerFunc {
	allowedOrigins := make(map[string]bool)
	allowAll := false

	for _, origin := range cfg.AllowedOrigins {
		if origin == "*" {
			allowAll = true
			break
		}
		allowedOrigins[origin] = true
	}

	methods := strings.Join(cfg.AllowedMethods, ", ")
	headers := strings.Join(cfg.AllowedHeaders, ", ")
	maxAge := "86400"
	if cfg.MaxAge > 0 {
		maxAge = strconv.Itoa(cfg.MaxAge)
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// Determine allowed origin
		var allowedOrigin string
		if allowAll {
			allowedOrigin = "*"
		} else if origin != "" && allowedOrigins[origin] {
			allowedOrigin = origin
		}

		if allowedOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowedOrigin)
			c.Header("Access-Control-Allow-Methods", methods)
			c.Header("Access-Control-Allow-Headers", headers)
			c.Header("Access-Control-Max-Age", maxAge)
			c.Header("Access-Control-Allow-Credentials", "true")

			// Vary header for caching
			if !allowAll {
				c.Header("Vary", "Origin")
			}
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
