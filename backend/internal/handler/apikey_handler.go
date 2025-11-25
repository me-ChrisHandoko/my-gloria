package handler

import (
	"errors"
	"net/http"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// ApiKeyHandler handles API key-related HTTP requests
type ApiKeyHandler struct {
	apiKeyService service.ApiKeyService
	auditService  service.AuditService
}

// NewApiKeyHandler creates a new API key handler instance
func NewApiKeyHandler(apiKeyService service.ApiKeyService, auditService service.AuditService) *ApiKeyHandler {
	return &ApiKeyHandler{
		apiKeyService: apiKeyService,
		auditService:  auditService,
	}
}

func (h *ApiKeyHandler) GetAll(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	apiKeys, err := h.apiKeyService.GetAll(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", apiKeys)
}

func (h *ApiKeyHandler) GetActive(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	apiKeys, err := h.apiKeyService.GetActive(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", apiKeys)
}

func (h *ApiKeyHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)

	// Use ownership-verified method
	apiKey, err := h.apiKeyService.GetByIDForUser(id, userID)
	if err != nil {
		if errors.Is(err, service.ErrApiKeyNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		// Check for access denied error
		if err.Error() == "access denied: you don't own this API key" {
			ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", apiKey)
}

func (h *ApiKeyHandler) Create(c *gin.Context) {
	var req domain.CreateApiKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	userID := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	apiKey, err := h.apiKeyService.Create(userID, &req)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := apiKey.Name
	go h.auditService.LogCreate(userID, profileID, "security", "api_key", apiKey.ID, &entityDisplay, apiKey.ApiKeyResponse, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusCreated, "API key created successfully. Please save the key - it will not be shown again.", apiKey)
}

func (h *ApiKeyHandler) Revoke(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)

	// Get old values for audit
	oldApiKey, _ := h.apiKeyService.GetByIDForUser(id, userID)

	// Use ownership-verified method
	err := h.apiKeyService.RevokeForUser(id, userID)
	if err != nil {
		if errors.Is(err, service.ErrApiKeyNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		// Check for access denied error
		if err.Error() == "access denied: you don't own this API key" {
			ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	var entityDisplay string
	if oldApiKey != nil {
		entityDisplay = oldApiKey.Name
	}
	go h.auditService.LogAction(userID, profileID, domain.AuditActionRevoke, "security", "api_key", id, &entityDisplay, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "API key revoked successfully", nil)
}

func (h *ApiKeyHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	userID := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)

	// Get old values for audit
	oldApiKey, _ := h.apiKeyService.GetByIDForUser(id, userID)

	// Use ownership-verified method
	err := h.apiKeyService.DeleteForUser(id, userID)
	if err != nil {
		if errors.Is(err, service.ErrApiKeyNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		// Check for access denied error
		if err.Error() == "access denied: you don't own this API key" {
			ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	var entityDisplay string
	if oldApiKey != nil {
		entityDisplay = oldApiKey.Name
	}
	go h.auditService.LogDelete(userID, profileID, "security", "api_key", id, &entityDisplay, oldApiKey, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "API key deleted successfully", nil)
}
