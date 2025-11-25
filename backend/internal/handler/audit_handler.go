package handler

import (
	"errors"
	"net/http"
	"strconv"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// AuditHandler handles audit log-related HTTP requests
type AuditHandler struct {
	auditService service.AuditService
}

// NewAuditHandler creates a new audit handler instance
func NewAuditHandler(auditService service.AuditService) *AuditHandler {
	return &AuditHandler{auditService: auditService}
}

// GetAll retrieves audit logs with filtering and pagination
func (h *AuditHandler) GetAll(c *gin.Context) {
	var filter domain.AuditLogFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	logs, total, err := h.auditService.GetAll(&filter)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
		"meta": gin.H{
			"total":       total,
			"page":        filter.Page,
			"limit":       filter.Limit,
			"total_pages": (total + int64(filter.Limit) - 1) / int64(filter.Limit),
		},
	})
}

// GetByID retrieves a single audit log by ID
func (h *AuditHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	log, err := h.auditService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrAuditLogNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", log)
}

// GetByActorID retrieves audit logs by actor ID
func (h *AuditHandler) GetByActorID(c *gin.Context) {
	actorID := c.Param("actorId")
	limit := parseLimit(c.Query("limit"), 50)

	logs, err := h.auditService.GetByActorID(actorID, limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", logs)
}

// GetByEntity retrieves audit logs for a specific entity
func (h *AuditHandler) GetByEntity(c *gin.Context) {
	entityType := c.Param("entityType")
	entityID := c.Param("entityId")
	limit := parseLimit(c.Query("limit"), 50)

	logs, err := h.auditService.GetByEntityID(entityType, entityID, limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", logs)
}

// GetByModule retrieves audit logs by module
func (h *AuditHandler) GetByModule(c *gin.Context) {
	module := c.Param("module")
	limit := parseLimit(c.Query("limit"), 50)

	logs, err := h.auditService.GetByModule(module, limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", logs)
}

// GetMyAuditLogs retrieves audit logs for the current user
func (h *AuditHandler) GetMyAuditLogs(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		ErrorResponse(c, http.StatusUnauthorized, "user not authenticated")
		return
	}

	limit := parseLimit(c.Query("limit"), 50)

	logs, err := h.auditService.GetMyAuditLogs(userID, limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", logs)
}

// GetModules retrieves all unique modules from audit logs
func (h *AuditHandler) GetModules(c *gin.Context) {
	modules, err := h.auditService.GetModules()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", modules)
}

// GetEntityTypes retrieves all unique entity types from audit logs
func (h *AuditHandler) GetEntityTypes(c *gin.Context) {
	entityTypes, err := h.auditService.GetEntityTypes()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", entityTypes)
}

// GetActions retrieves all available audit actions
func (h *AuditHandler) GetActions(c *gin.Context) {
	actions := h.auditService.GetActions()
	SuccessResponse(c, http.StatusOK, "", actions)
}

// GetCategories retrieves all available audit categories
func (h *AuditHandler) GetCategories(c *gin.Context) {
	categories := h.auditService.GetCategories()
	SuccessResponse(c, http.StatusOK, "", categories)
}

// Helper function to parse limit query parameter
func parseLimit(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	limit, err := strconv.Atoi(s)
	if err != nil || limit <= 0 {
		return defaultVal
	}
	if limit > 100 {
		return 100
	}
	return limit
}
