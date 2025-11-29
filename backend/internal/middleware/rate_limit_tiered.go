package middleware

import (
	"net/http"
	"strconv"
	"time"

	"backend/internal/response"

	"github.com/gin-gonic/gin"
)

// RateLimitTier defines different rate limit tiers based on endpoint sensitivity
type RateLimitTier string

const (
	// TierPublic for public/read-only endpoints (highest limit)
	TierPublic RateLimitTier = "public"
	// TierNormal for standard authenticated endpoints
	TierNormal RateLimitTier = "normal"
	// TierSensitive for user management and data modification
	TierSensitive RateLimitTier = "sensitive"
	// TierCritical for expensive queries and critical operations
	TierCritical RateLimitTier = "critical"
)

// TieredRateLimitConfig holds rate limit configurations for different tiers
type TieredRateLimitConfig struct {
	PublicLimit     int // Requests per hour for public endpoints
	NormalLimit     int // Requests per hour for normal endpoints
	SensitiveLimit  int // Requests per hour for sensitive endpoints
	CriticalLimit   int // Requests per hour for critical endpoints
	CleanupInterval time.Duration
}

// DefaultTieredRateLimitConfig returns default tiered rate limit configuration
func DefaultTieredRateLimitConfig() *TieredRateLimitConfig {
	return &TieredRateLimitConfig{
		PublicLimit:     1000, // 1000 req/hour for lists
		NormalLimit:     500,  // 500 req/hour for standard ops
		SensitiveLimit:  200,  // 200 req/hour for create/update/delete
		CriticalLimit:   100,  // 100 req/hour for expensive queries
		CleanupInterval: 10 * time.Minute,
	}
}

// RateLimitTiered returns a middleware that applies tiered rate limiting
func RateLimitTiered(tier RateLimitTier, config *TieredRateLimitConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultTieredRateLimitConfig()
	}

	// Determine limit based on tier
	var requestsPerHour int
	switch tier {
	case TierPublic:
		requestsPerHour = config.PublicLimit
	case TierNormal:
		requestsPerHour = config.NormalLimit
	case TierSensitive:
		requestsPerHour = config.SensitiveLimit
	case TierCritical:
		requestsPerHour = config.CriticalLimit
	default:
		requestsPerHour = config.NormalLimit
	}

	// Create rate limiter for this tier
	rlConfig := &RateLimitConfig{
		RequestsPerHour: requestsPerHour,
		BurstSize:       requestsPerHour / 10,
		CleanupInterval: config.CleanupInterval,
	}

	if rlConfig.BurstSize < 10 {
		rlConfig.BurstSize = 10
	}

	rl := NewRateLimiter(rlConfig)

	return func(c *gin.Context) {
		var key string

		// Determine rate limit key based on authentication
		authCtx := GetAuthContext(c)
		if authCtx != nil {
			if authCtx.APIKeyID != "" {
				key = "apikey:" + authCtx.APIKeyID + ":" + string(tier)
			} else if authCtx.UserID != "" {
				key = "user:" + authCtx.UserID + ":" + string(tier)
			}
		}

		// Fall back to IP-based limiting if no auth
		if key == "" {
			key = "ip:" + c.ClientIP() + ":" + string(tier)
		}

		// Check rate limit
		if !rl.Allow(key) {
			// Set rate limit headers
			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerHour))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10))
			c.Header("X-RateLimit-Tier", string(tier))
			c.Header("Retry-After", "60")

			response.Error(c, http.StatusTooManyRequests, "rate limit exceeded for "+string(tier)+" tier")
			c.Abort()
			return
		}

		// Add tier info to response header for debugging
		c.Header("X-RateLimit-Tier", string(tier))

		c.Next()
	}
}

// RateLimitPublic is a convenience function for public tier rate limiting
func RateLimitPublic() gin.HandlerFunc {
	return RateLimitTiered(TierPublic, nil)
}

// RateLimitNormal is a convenience function for normal tier rate limiting
func RateLimitNormal() gin.HandlerFunc {
	return RateLimitTiered(TierNormal, nil)
}

// RateLimitSensitive is a convenience function for sensitive tier rate limiting
func RateLimitSensitive() gin.HandlerFunc {
	return RateLimitTiered(TierSensitive, nil)
}

// RateLimitCritical is a convenience function for critical tier rate limiting
func RateLimitCritical() gin.HandlerFunc {
	return RateLimitTiered(TierCritical, nil)
}
