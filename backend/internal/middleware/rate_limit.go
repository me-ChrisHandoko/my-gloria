package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"backend/internal/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter manages rate limiting for different keys (users/API keys)
type RateLimiter struct {
	limiters     sync.Map // map[string]*limiterEntry
	rate         rate.Limit
	burst        int
	cleanupEvery time.Duration
}

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	RequestsPerHour int           // Number of requests allowed per hour
	BurstSize       int           // Maximum burst size (usually 10% of RequestsPerHour)
	CleanupInterval time.Duration // How often to clean up old limiters
}

// DefaultRateLimitConfig returns default rate limit configuration
func DefaultRateLimitConfig() *RateLimitConfig {
	return &RateLimitConfig{
		RequestsPerHour: 1000,
		BurstSize:       100,
		CleanupInterval: 10 * time.Minute,
	}
}

// NewRateLimiter creates a new rate limiter with the specified configuration
func NewRateLimiter(config *RateLimitConfig) *RateLimiter {
	rl := &RateLimiter{
		rate:         rate.Limit(float64(config.RequestsPerHour) / 3600), // per second
		burst:        config.BurstSize,
		cleanupEvery: config.CleanupInterval,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// getLimiter returns or creates a rate limiter for the given key
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	now := time.Now()

	// Try to get existing limiter
	if entry, exists := rl.limiters.Load(key); exists {
		e := entry.(*limiterEntry)
		e.lastSeen = now
		return e.limiter
	}

	// Create new limiter
	limiter := rate.NewLimiter(rl.rate, rl.burst)
	rl.limiters.Store(key, &limiterEntry{
		limiter:  limiter,
		lastSeen: now,
	})

	return limiter
}

// Allow checks if a request should be allowed for the given key
func (rl *RateLimiter) Allow(key string) bool {
	return rl.getLimiter(key).Allow()
}

// cleanup removes old limiters that haven't been used recently
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.cleanupEvery)
	defer ticker.Stop()

	for range ticker.C {
		threshold := time.Now().Add(-rl.cleanupEvery * 2)
		rl.limiters.Range(func(key, value interface{}) bool {
			entry := value.(*limiterEntry)
			if entry.lastSeen.Before(threshold) {
				rl.limiters.Delete(key)
			}
			return true
		})
	}
}

// RateLimit returns a middleware that limits requests based on user/API key
func RateLimit(requestsPerHour int) gin.HandlerFunc {
	config := &RateLimitConfig{
		RequestsPerHour: requestsPerHour,
		BurstSize:       requestsPerHour / 10,
		CleanupInterval: 10 * time.Minute,
	}

	if config.BurstSize < 10 {
		config.BurstSize = 10
	}

	rl := NewRateLimiter(config)

	return func(c *gin.Context) {
		var key string

		// Determine rate limit key based on authentication
		authCtx := GetAuthContext(c)
		if authCtx != nil {
			if authCtx.APIKeyID != "" {
				key = "apikey:" + authCtx.APIKeyID
			} else if authCtx.UserID != "" {
				key = "user:" + authCtx.UserID
			}
		}

		// Fall back to IP-based limiting if no auth
		if key == "" {
			key = "ip:" + c.ClientIP()
		}

		// Check rate limit
		if !rl.Allow(key) {
			// Increment rejected counter
			IncrementRejected()

			// Set rate limit headers
			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerHour))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10))
			c.Header("Retry-After", "60")

			response.Error(c, http.StatusTooManyRequests, "rate limit exceeded")
			c.Abort()
			return
		}

		// Increment allowed counter
		IncrementAllowed()

		c.Next()
	}
}

// RateLimitByIP returns a middleware that limits requests by IP address only
func RateLimitByIP(requestsPerHour int) gin.HandlerFunc {
	config := &RateLimitConfig{
		RequestsPerHour: requestsPerHour,
		BurstSize:       requestsPerHour / 10,
		CleanupInterval: 10 * time.Minute,
	}

	if config.BurstSize < 10 {
		config.BurstSize = 10
	}

	rl := NewRateLimiter(config)

	return func(c *gin.Context) {
		key := "ip:" + c.ClientIP()

		if !rl.Allow(key) {
			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerHour))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10))
			c.Header("Retry-After", "60")

			response.Error(c, http.StatusTooManyRequests, "rate limit exceeded")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitStrict returns a stricter rate limiter for sensitive endpoints (like auth)
func RateLimitStrict(requestsPerMinute int) gin.HandlerFunc {
	config := &RateLimitConfig{
		RequestsPerHour: requestsPerMinute * 60,
		BurstSize:       requestsPerMinute / 2,
		CleanupInterval: 5 * time.Minute,
	}

	if config.BurstSize < 5 {
		config.BurstSize = 5
	}

	rl := NewRateLimiter(config)

	return func(c *gin.Context) {
		key := "strict:" + c.ClientIP()

		if !rl.Allow(key) {
			IncrementRejected()

			c.Header("X-RateLimit-Limit", strconv.Itoa(requestsPerMinute))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("Retry-After", "60")

			response.Error(c, http.StatusTooManyRequests, "too many requests, please slow down")
			c.Abort()
			return
		}

		IncrementAllowed()

		c.Next()
	}
}
