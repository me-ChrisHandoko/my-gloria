package middleware

import (
	"log"
	"strings"

	"backend/internal/database"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// apiKeyService is a package-level variable for the API key service
var apiKeyService *services.ApiKeyService

// InitApiKeyService initializes the API key service for middleware use
func InitApiKeyService() {
	apiKeyService = services.NewApiKeyService(database.GetDB())
}

// GetApiKeyService returns the API key service instance
func GetApiKeyService() *services.ApiKeyService {
	return apiKeyService
}

// ApiKeyAuth is a middleware that validates API key from request headers
// Supports two header formats:
// 1. X-API-Key: gla_xxxxx
// 2. Authorization: ApiKey gla_xxxxx
func ApiKeyAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Ensure service is initialized
		if apiKeyService == nil {
			InitApiKeyService()
		}

		// Extract API key from headers
		apiKey := extractApiKey(c)
		if apiKey == "" {
			c.JSON(401, gin.H{
				"error":   "API key required",
				"message": "Please provide API key via X-API-Key header or Authorization: ApiKey <key>",
			})
			c.Abort()
			return
		}

		// Validate API key format (must have prefix_body format)
		if !isValidApiKeyFormat(apiKey) {
			c.JSON(401, gin.H{
				"error":   "Invalid API key format",
				"message": "API key must be in format: gla_xxxxx",
			})
			c.Abort()
			return
		}

		// Validate API key against database
		key, err := apiKeyService.ValidateApiKey(apiKey)
		if err != nil {
			c.JSON(401, gin.H{
				"error":   "Invalid API key",
				"message": err.Error(),
			})
			c.Abort()
			return
		}

		// Check IP whitelist if configured
		clientIP := c.ClientIP()
		if len(key.AllowedIPs) > 0 {
			if !apiKeyService.IsIPAllowed(clientIP, key.AllowedIPs) {
				log.Printf("[API_KEY_AUTH] IP not allowed: key=%s ip=%s allowed=%v",
					key.DisplayKey(), clientIP, key.AllowedIPs)
				c.JSON(403, gin.H{
					"error":   "IP not allowed",
					"message": "Your IP address is not in the allowed list for this API key",
				})
				c.Abort()
				return
			}
		}

		// Update usage statistics asynchronously (don't block the request)
		go func() {
			if err := apiKeyService.UpdateApiKeyUsage(key.ID, clientIP); err != nil {
				log.Printf("[API_KEY_AUTH] Failed to update usage stats: %v", err)
			}
		}()

		// Log successful authentication
		log.Printf("[API_KEY_AUTH] Authenticated: key=%s user_id=%s ip=%s",
			key.DisplayKey(), key.UserID, clientIP)

		// Set context values for downstream handlers
		c.Set("api_key_id", key.ID)
		c.Set("api_key_name", key.Name)
		c.Set("user_id", key.UserID)
		c.Set("auth_method", "api_key")

		// Store permissions if available (for fine-grained access control)
		if key.Permissions != nil {
			c.Set("api_key_permissions", key.Permissions)
		}

		c.Next()
	}
}

// extractApiKey extracts the API key from request headers
// Checks X-API-Key header first, then Authorization header
func extractApiKey(c *gin.Context) string {
	// Method 1: X-API-Key header (preferred for simplicity)
	if apiKey := c.GetHeader("X-API-Key"); apiKey != "" {
		return strings.TrimSpace(apiKey)
	}

	// Method 2: Authorization header with ApiKey scheme
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 {
			scheme := strings.ToLower(parts[0])
			if scheme == "apikey" || scheme == "api-key" {
				return strings.TrimSpace(parts[1])
			}
		}
	}

	return ""
}

// isValidApiKeyFormat checks if the API key has valid format (prefix_body)
func isValidApiKeyFormat(apiKey string) bool {
	parts := strings.SplitN(apiKey, "_", 2)
	if len(parts) != 2 {
		return false
	}

	// Check prefix is not empty and body has minimum length
	prefix := parts[0]
	body := parts[1]

	return len(prefix) > 0 && len(body) >= 16
}

// ApiKeyOptional is a middleware that validates API key if present, but doesn't require it
// Useful for endpoints that support both authenticated and anonymous access
func ApiKeyOptional() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Ensure service is initialized
		if apiKeyService == nil {
			InitApiKeyService()
		}

		// Try to extract API key
		apiKey := extractApiKey(c)
		if apiKey == "" {
			// No API key provided, continue without authentication
			c.Set("auth_method", "anonymous")
			c.Next()
			return
		}

		// Validate API key format
		if !isValidApiKeyFormat(apiKey) {
			// Invalid format, continue as anonymous
			c.Set("auth_method", "anonymous")
			c.Next()
			return
		}

		// Validate API key against database
		key, err := apiKeyService.ValidateApiKey(apiKey)
		if err != nil {
			// Invalid key, continue as anonymous
			c.Set("auth_method", "anonymous")
			c.Next()
			return
		}

		// Check IP whitelist if configured
		clientIP := c.ClientIP()
		if len(key.AllowedIPs) > 0 {
			if !apiKeyService.IsIPAllowed(clientIP, key.AllowedIPs) {
				// IP not allowed, continue as anonymous
				c.Set("auth_method", "anonymous")
				c.Next()
				return
			}
		}

		// Update usage statistics asynchronously
		go func() {
			if err := apiKeyService.UpdateApiKeyUsage(key.ID, clientIP); err != nil {
				log.Printf("[API_KEY_AUTH] Failed to update usage stats: %v", err)
			}
		}()

		// Set context values
		c.Set("api_key_id", key.ID)
		c.Set("api_key_name", key.Name)
		c.Set("user_id", key.UserID)
		c.Set("auth_method", "api_key")

		if key.Permissions != nil {
			c.Set("api_key_permissions", key.Permissions)
		}

		c.Next()
	}
}
