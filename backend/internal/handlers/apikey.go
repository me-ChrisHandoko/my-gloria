package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// ApiKeyHandler handles HTTP requests for API keys
type ApiKeyHandler struct {
	apiKeyService *services.ApiKeyService
}

// NewApiKeyHandler creates a new ApiKeyHandler instance
func NewApiKeyHandler(apiKeyService *services.ApiKeyService) *ApiKeyHandler {
	return &ApiKeyHandler{
		apiKeyService: apiKeyService,
	}
}

// CreateApiKey handles creating a new API key
// @Summary Create a new API key
// @Tags api-keys
// @Accept json
// @Produce json
// @Param request body models.CreateApiKeyRequest true "API key data"
// @Success 201 {object} models.ApiKeyCreatedResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api-keys [post]
func (h *ApiKeyHandler) CreateApiKey(c *gin.Context) {
	var req models.CreateApiKeyRequest

	// HTTP: Parse and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Create API key via service
	result, err := h.apiKeyService.CreateApiKey(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	// IMPORTANT: The plain text key is only shown ONCE during creation!
	c.JSON(http.StatusCreated, gin.H{
		"message": "API key berhasil dibuat. Simpan key ini dengan aman, karena tidak akan ditampilkan lagi!",
		"data":    result,
	})
}

// GetApiKeys handles getting list of API keys for current user
// @Summary Get list of API keys
// @Tags api-keys
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param search query string false "Search by name"
// @Param is_active query bool false "Filter by active status"
// @Param sort_by query string false "Sort by field" default(created_at)
// @Param sort_order query string false "Sort order (asc/desc)" default(desc)
// @Success 200 {object} services.ApiKeyListResult
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api-keys [get]
func (h *ApiKeyHandler) GetApiKeys(c *gin.Context) {
	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// Build params
	params := services.ApiKeyListParams{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		IsActive:  isActive,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Business logic: Get API keys via service
	result, err := h.apiKeyService.GetApiKeys(userID.(string), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"data":        result.Data,
		"total":       result.Total,
		"page":        result.Page,
		"page_size":   result.PageSize,
		"total_pages": result.TotalPages,
	})
}

// GetApiKey handles getting a single API key by ID
// @Summary Get API key by ID
// @Tags api-keys
// @Produce json
// @Param id path string true "API key ID"
// @Success 200 {object} models.ApiKeyResponse
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api-keys/{id} [get]
func (h *ApiKeyHandler) GetApiKey(c *gin.Context) {
	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get API key via service
	key, err := h.apiKeyService.GetApiKeyByID(id, userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, key.ToResponse())
}

// RevokeApiKey handles revoking (deactivating) an API key
// @Summary Revoke an API key
// @Tags api-keys
// @Produce json
// @Param id path string true "API key ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api-keys/{id}/revoke [post]
func (h *ApiKeyHandler) RevokeApiKey(c *gin.Context) {
	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Revoke API key via service
	err := h.apiKeyService.RevokeApiKey(id, userID.(string))
	if err != nil {
		if err.Error() == "API key tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "API key berhasil dinonaktifkan"})
}

// DeleteApiKey handles permanently deleting an API key
// @Summary Delete an API key
// @Tags api-keys
// @Produce json
// @Param id path string true "API key ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api-keys/{id} [delete]
func (h *ApiKeyHandler) DeleteApiKey(c *gin.Context) {
	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete API key via service
	err := h.apiKeyService.DeleteApiKey(id, userID.(string))
	if err != nil {
		if err.Error() == "API key tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "API key berhasil dihapus"})
}
