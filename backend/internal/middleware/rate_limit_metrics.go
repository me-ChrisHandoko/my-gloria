package middleware

import (
	"sync/atomic"
	"time"
)

// RateLimitMetrics tracks rate limiting statistics
type RateLimitMetrics struct {
	TotalRequests    int64     // Total requests processed
	AllowedRequests  int64     // Requests allowed
	RejectedRequests int64     // Requests rejected (429)
	ActiveLimiters   int64     // Current active limiters
	StartTime        time.Time // Metrics start time
}

// Global metrics instance
var globalMetrics = &RateLimitMetrics{
	StartTime: time.Now(),
}

// IncrementAllowed increments the allowed requests counter
func IncrementAllowed() {
	atomic.AddInt64(&globalMetrics.TotalRequests, 1)
	atomic.AddInt64(&globalMetrics.AllowedRequests, 1)
}

// IncrementRejected increments the rejected requests counter
func IncrementRejected() {
	atomic.AddInt64(&globalMetrics.TotalRequests, 1)
	atomic.AddInt64(&globalMetrics.RejectedRequests, 1)
}

// UpdateActiveLimiters updates the active limiters count
func UpdateActiveLimiters(count int64) {
	atomic.StoreInt64(&globalMetrics.ActiveLimiters, count)
}

// GetRateLimitMetrics returns current rate limiting metrics
func GetRateLimitMetrics() map[string]interface{} {
	total := atomic.LoadInt64(&globalMetrics.TotalRequests)
	allowed := atomic.LoadInt64(&globalMetrics.AllowedRequests)
	rejected := atomic.LoadInt64(&globalMetrics.RejectedRequests)
	active := atomic.LoadInt64(&globalMetrics.ActiveLimiters)

	var rejectionRate float64
	if total > 0 {
		rejectionRate = float64(rejected) / float64(total) * 100
	}

	uptime := time.Since(globalMetrics.StartTime)

	return map[string]interface{}{
		"total_requests":     total,
		"allowed_requests":   allowed,
		"rejected_requests":  rejected,
		"rejection_rate_pct": rejectionRate,
		"active_limiters":    active,
		"uptime_seconds":     uptime.Seconds(),
		"requests_per_sec":   float64(total) / uptime.Seconds(),
	}
}

// ResetRateLimitMetrics resets all metrics counters
func ResetRateLimitMetrics() {
	atomic.StoreInt64(&globalMetrics.TotalRequests, 0)
	atomic.StoreInt64(&globalMetrics.AllowedRequests, 0)
	atomic.StoreInt64(&globalMetrics.RejectedRequests, 0)
	globalMetrics.StartTime = time.Now()
}
