package handler

import (
	"errors"
	"net/http"

	"backend/internal/middleware"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// PermissionHandler handles permission-related HTTP requests
type PermissionHandler struct {
	permissionService service.PermissionService
}

// NewPermissionHandler creates a new permission handler instance
func NewPermissionHandler(permissionService service.PermissionService) *PermissionHandler {
	return &PermissionHandler{
		permissionService: permissionService,
	}
}

// GetAll returns all permissions
// @Summary Get all permissions
// @Description Returns a list of all permissions
// @Tags Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response{data=[]domain.PermissionListResponse}
// @Failure 500 {object} Response
// @Router /web/permissions [get]
func (h *PermissionHandler) GetAll(c *gin.Context) {
	permissions, err := h.permissionService.GetAll()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", permissions)
}

// GetByID returns a permission by ID
// @Summary Get permission by ID
// @Description Returns a permission by its ID
// @Tags Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Permission ID"
// @Success 200 {object} Response{data=domain.PermissionResponse}
// @Failure 404 {object} Response
// @Failure 500 {object} Response
// @Router /web/permissions/{id} [get]
func (h *PermissionHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	permission, err := h.permissionService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrPermissionNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", permission)
}

// GetByResource returns all permissions for a resource
// @Summary Get permissions by resource
// @Description Returns all permissions for a specific resource
// @Tags Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param resource path string true "Resource name"
// @Success 200 {object} Response{data=[]domain.PermissionListResponse}
// @Failure 500 {object} Response
// @Router /web/permissions/resource/{resource} [get]
func (h *PermissionHandler) GetByResource(c *gin.Context) {
	resource := c.Param("resource")
	permissions, err := h.permissionService.GetByResource(resource)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", permissions)
}

// GetMyPermissions returns the current user's effective permissions
// @Summary Get my permissions
// @Description Returns the effective permissions for the current authenticated user
// @Tags Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response{data=service.EffectivePermissions}
// @Failure 401 {object} Response
// @Failure 500 {object} Response
// @Router /web/permissions/me [get]
func (h *PermissionHandler) GetMyPermissions(c *gin.Context) {
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	permissions, err := h.permissionService.GetEffectivePermissions(authCtx.UserID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", permissions)
}

// CheckPermission checks if the current user has a specific permission
// @Summary Check permission
// @Description Checks if the current user has a specific permission
// @Tags Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param permission query string true "Permission code to check"
// @Success 200 {object} Response{data=map[string]bool}
// @Failure 400 {object} Response
// @Failure 401 {object} Response
// @Router /web/permissions/check [get]
func (h *PermissionHandler) CheckPermission(c *gin.Context) {
	permission := c.Query("permission")
	if permission == "" {
		ErrorResponse(c, http.StatusBadRequest, "permission query parameter is required")
		return
	}

	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	hasPermission := h.permissionService.HasPermission(authCtx.UserID, permission)
	SuccessResponse(c, http.StatusOK, "", gin.H{
		"permission":     permission,
		"has_permission": hasPermission,
	})
}

// GetUserPermissions returns permissions for a specific user (admin only)
// @Summary Get user permissions
// @Description Returns the effective permissions for a specific user
// @Tags Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param userId path string true "User ID"
// @Success 200 {object} Response{data=service.EffectivePermissions}
// @Failure 403 {object} Response
// @Failure 500 {object} Response
// @Router /web/permissions/user/{userId} [get]
func (h *PermissionHandler) GetUserPermissions(c *gin.Context) {
	userID := c.Param("userId")

	permissions, err := h.permissionService.GetEffectivePermissions(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", permissions)
}
