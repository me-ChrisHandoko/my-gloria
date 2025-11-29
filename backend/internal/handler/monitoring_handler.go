package handler

import (
	"net/http"

	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// MonitoringHandler handles monitoring endpoints
type MonitoringHandler struct{}

// NewMonitoringHandler creates a new monitoring handler
func NewMonitoringHandler() *MonitoringHandler {
	return &MonitoringHandler{}
}

// GetRateLimitMetrics returns rate limiting metrics
func (h *MonitoringHandler) GetRateLimitMetrics(c *gin.Context) {
	metrics := middleware.GetRateLimitMetrics()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

// GetAuthCacheStats returns auth cache statistics
func (h *MonitoringHandler) GetAuthCacheStats(c *gin.Context) {
	stats := middleware.GetAuthCacheStats()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetSystemHealth returns overall system health metrics
func (h *MonitoringHandler) GetSystemHealth(c *gin.Context) {
	rateLimitMetrics := middleware.GetRateLimitMetrics()
	cacheStats := middleware.GetAuthCacheStats()

	// Calculate health score based on metrics
	healthScore := 100.0
	warnings := []string{}

	// Check rejection rate
	rejectionRate := rateLimitMetrics["rejection_rate_pct"].(float64)
	if rejectionRate > 10 {
		healthScore -= 20
		warnings = append(warnings, "High rate limit rejection rate")
	} else if rejectionRate > 5 {
		healthScore -= 10
		warnings = append(warnings, "Elevated rate limit rejection rate")
	}

	// Check active limiters
	activeLimiters := rateLimitMetrics["active_limiters"].(int64)
	if activeLimiters > 10000 {
		healthScore -= 15
		warnings = append(warnings, "High number of active rate limiters")
	}

	// Check cache efficiency
	totalItems := cacheStats["total_items"]
	expired := cacheStats["expired"]
	if totalItems > 0 && expired > totalItems/2 {
		healthScore -= 10
		warnings = append(warnings, "High cache expiration rate")
	}

	status := "healthy"
	if healthScore < 70 {
		status = "degraded"
	}
	if healthScore < 50 {
		status = "unhealthy"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status":              status,
			"health_score":        healthScore,
			"warnings":            warnings,
			"rate_limit_metrics":  rateLimitMetrics,
			"cache_stats":         cacheStats,
		},
	})
}
