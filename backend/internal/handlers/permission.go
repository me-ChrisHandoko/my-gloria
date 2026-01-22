package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// PermissionHandler handles HTTP requests for permissions
type PermissionHandler struct {
	permissionService *services.PermissionService
}

// NewPermissionHandler creates a new PermissionHandler instance
func NewPermissionHandler(permissionService *services.PermissionService) *PermissionHandler {
	return &PermissionHandler{
		permissionService: permissionService,
	}
}

// CreatePermission handles creating a new permission
// @Summary Create a new permission
// @Tags permissions
// @Accept json
// @Produce json
// @Param request body models.CreatePermissionRequest true "Permission data"
// @Success 201 {object} models.PermissionResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /permissions [post]
func (h *PermissionHandler) CreatePermission(c *gin.Context) {
	var req models.CreatePermissionRequest

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

	// Business logic: Create permission via service
	permission, err := h.permissionService.CreatePermission(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, permission.ToResponse())
}

// GetPermissions handles getting list of permissions with pagination and filters
// @Summary Get list of permissions
// @Tags permissions
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Param search query string false "Search by name, code, or resource"
// @Param resource query string false "Filter by resource"
// @Param action query string false "Filter by action"
// @Param scope query string false "Filter by scope"
// @Param category query string false "Filter by category"
// @Param is_active query bool false "Filter by active status"
// @Param is_system_permission query bool false "Filter by system permission status"
// @Param sort_by query string false "Sort by field" default(code)
// @Param sort_order query string false "Sort order (asc/desc)" default(asc)
// @Success 200 {object} services.PermissionListResult
// @Failure 500 {object} map[string]string
// @Router /permissions [get]
func (h *PermissionHandler) GetPermissions(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	resource := c.Query("resource")
	action := c.Query("action")
	scope := c.Query("scope")
	category := c.Query("category")
	sortBy := c.DefaultQuery("sort_by", "code")
	sortOrder := c.DefaultQuery("sort_order", "asc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// HTTP: Parse is_system_permission filter
	var isSystemPermission *bool
	if isSystemPermissionStr := c.Query("is_system_permission"); isSystemPermissionStr != "" {
		val, _ := strconv.ParseBool(isSystemPermissionStr)
		isSystemPermission = &val
	}

	// Build params
	params := services.PermissionListParams{
		Page:               page,
		PageSize:           pageSize,
		Search:             search,
		Resource:           resource,
		Action:             action,
		Scope:              scope,
		Category:           category,
		IsActive:           isActive,
		IsSystemPermission: isSystemPermission,
		SortBy:             sortBy,
		SortOrder:          sortOrder,
	}

	// Business logic: Get permissions via service
	result, err := h.permissionService.GetPermissions(params)
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

// GetPermissionByID handles getting a single permission by ID
// @Summary Get permission by ID
// @Tags permissions
// @Produce json
// @Param id path string true "Permission ID"
// @Success 200 {object} models.PermissionResponse
// @Failure 404 {object} map[string]string
// @Router /permissions/{id} [get]
func (h *PermissionHandler) GetPermissionByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get permission via service
	permission, err := h.permissionService.GetPermissionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, permission.ToResponse())
}

// UpdatePermission handles updating an existing permission
// @Summary Update permission
// @Tags permissions
// @Accept json
// @Produce json
// @Param id path string true "Permission ID"
// @Param request body models.UpdatePermissionRequest true "Permission update data"
// @Success 200 {object} models.PermissionResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /permissions/{id} [put]
func (h *PermissionHandler) UpdatePermission(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	var req models.UpdatePermissionRequest

	// HTTP: Parse and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Business logic: Update permission via service
	permission, err := h.permissionService.UpdatePermission(id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, permission.ToResponse())
}

// DeletePermission handles deleting a permission
// @Summary Delete permission
// @Tags permissions
// @Produce json
// @Param id path string true "Permission ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /permissions/{id} [delete]
func (h *PermissionHandler) DeletePermission(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete permission via service
	if err := h.permissionService.DeletePermission(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"message": "Permission berhasil dihapus",
	})
}

// GetPermissionGroups handles getting permissions grouped by group_name
// @Summary Get permissions grouped by group_name
// @Tags permissions
// @Produce json
// @Success 200 {object} map[string][]models.PermissionGroupResponse
// @Failure 500 {object} map[string]string
// @Router /permissions/groups [get]
func (h *PermissionHandler) GetPermissionGroups(c *gin.Context) {
	// Business logic: Get permission groups via service
	groups, err := h.permissionService.GetPermissionGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"data": groups,
	})
}

// GetPermissionScopes handles getting all available permission scopes
// @Summary Get all permission scopes
// @Tags permissions
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /permissions/scopes [get]
func (h *PermissionHandler) GetPermissionScopes(c *gin.Context) {
	// Get all valid scopes from enum
	scopes := models.AllPermissionScopes()

	// Build response with scope value and label
	type ScopeOption struct {
		Value string `json:"value"`
		Label string `json:"label"`
	}

	options := make([]ScopeOption, len(scopes))
	for i, scope := range scopes {
		var label string
		switch scope {
		case models.PermissionScopeOwn:
			label = "Own (Data sendiri)"
		case models.PermissionScopeDepartment:
			label = "Department"
		case models.PermissionScopeSchool:
			label = "School"
		case models.PermissionScopeAll:
			label = "All (Semua data)"
		}

		options[i] = ScopeOption{
			Value: string(scope),
			Label: label,
		}
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"data": options,
	})
}

// GetPermissionActions handles getting all available permission actions
// @Summary Get all permission actions
// @Tags permissions
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /permissions/actions [get]
func (h *PermissionHandler) GetPermissionActions(c *gin.Context) {
	// Get all valid actions from enum
	actions := models.AllPermissionActions()

	// Build response with action value and label
	type ActionOption struct {
		Value string `json:"value"`
		Label string `json:"label"`
	}

	options := make([]ActionOption, len(actions))
	for i, action := range actions {
		options[i] = ActionOption{
			Value: string(action),
			Label: string(action),
		}
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"data": options,
	})
}
