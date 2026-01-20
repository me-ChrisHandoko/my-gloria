package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// RoleHandler handles HTTP requests for roles
type RoleHandler struct {
	roleService *services.RoleService
}

// NewRoleHandler creates a new RoleHandler instance
func NewRoleHandler(roleService *services.RoleService) *RoleHandler {
	return &RoleHandler{
		roleService: roleService,
	}
}

// CreateRole handles creating a new role
// @Summary Create a new role
// @Tags roles
// @Accept json
// @Produce json
// @Param request body models.CreateRoleRequest true "Role data"
// @Success 201 {object} models.RoleResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /roles [post]
func (h *RoleHandler) CreateRole(c *gin.Context) {
	var req models.CreateRoleRequest

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

	// Business logic: Create role via service
	role, err := h.roleService.CreateRole(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, role.ToResponse())
}

// GetRoles handles getting list of roles with pagination and filters
// @Summary Get list of roles
// @Tags roles
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param search query string false "Search by name or code"
// @Param is_active query bool false "Filter by active status"
// @Param is_system_role query bool false "Filter by system role status"
// @Param hierarchy_level query int false "Filter by hierarchy level"
// @Param sort_by query string false "Sort by field" default(created_at)
// @Param sort_order query string false "Sort order (asc/desc)" default(desc)
// @Success 200 {object} services.RoleListResult
// @Failure 500 {object} map[string]string
// @Router /roles [get]
func (h *RoleHandler) GetRoles(c *gin.Context) {
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

	// HTTP: Parse is_system_role filter
	var isSystemRole *bool
	if isSystemRoleStr := c.Query("is_system_role"); isSystemRoleStr != "" {
		val, _ := strconv.ParseBool(isSystemRoleStr)
		isSystemRole = &val
	}

	// HTTP: Parse hierarchy_level filter
	var hierarchyLevel *int
	if hierarchyLevelStr := c.Query("hierarchy_level"); hierarchyLevelStr != "" {
		val, err := strconv.Atoi(hierarchyLevelStr)
		if err == nil {
			hierarchyLevel = &val
		}
	}

	// Build params
	params := services.RoleListParams{
		Page:           page,
		PageSize:       pageSize,
		Search:         search,
		IsActive:       isActive,
		IsSystemRole:   isSystemRole,
		HierarchyLevel: hierarchyLevel,
		SortBy:         sortBy,
		SortOrder:      sortOrder,
	}

	// Business logic: Get roles via service
	result, err := h.roleService.GetRoles(params)
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

// GetRoleByID handles getting a single role by ID
// @Summary Get role by ID
// @Tags roles
// @Produce json
// @Param id path string true "Role ID"
// @Success 200 {object} models.RoleResponse
// @Failure 404 {object} map[string]string
// @Router /roles/{id} [get]
func (h *RoleHandler) GetRoleByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get role via service
	role, err := h.roleService.GetRoleByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, role.ToResponse())
}

// GetRoleWithPermissions handles getting a role with its permissions
// @Summary Get role with permissions
// @Tags roles
// @Produce json
// @Param id path string true "Role ID"
// @Success 200 {object} models.RoleWithPermissionsResponse
// @Failure 404 {object} map[string]string
// @Router /roles/{id}/permissions [get]
func (h *RoleHandler) GetRoleWithPermissions(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get role with permissions via service
	roleWithPermissions, err := h.roleService.GetRoleWithPermissions(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, roleWithPermissions)
}

// UpdateRole handles updating an existing role
// @Summary Update role
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param request body models.UpdateRoleRequest true "Updated role data"
// @Success 200 {object} models.RoleResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /roles/{id} [put]
func (h *RoleHandler) UpdateRole(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Business logic: Update role via service
	role, err := h.roleService.UpdateRole(id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, role.ToResponse())
}

// DeleteRole handles deleting a role (soft delete)
// @Summary Delete role
// @Tags roles
// @Param id path string true "Role ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /roles/{id} [delete]
func (h *RoleHandler) DeleteRole(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete role via service
	if err := h.roleService.DeleteRole(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Role berhasil dihapus"})
}

// AssignPermissionToRole handles assigning a permission to a role
// @Summary Assign permission to role
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param request body models.AssignPermissionToRoleRequest true "Permission assignment data"
// @Success 201 {object} models.RolePermission
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /roles/{id}/permissions [post]
func (h *RoleHandler) AssignPermissionToRole(c *gin.Context) {
	// HTTP: Get role ID from URL
	roleID := c.Param("id")

	// HTTP: Parse and validate request
	var req models.AssignPermissionToRoleRequest
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

	// Business logic: Assign permission via service
	rolePermission, err := h.roleService.AssignPermissionToRole(roleID, req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, rolePermission)
}

// RevokePermissionFromRole handles revoking a permission from a role
// @Summary Revoke permission from role
// @Tags roles
// @Param id path string true "Role ID"
// @Param permission_id path string true "Permission Assignment ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /roles/{id}/permissions/{permission_id} [delete]
func (h *RoleHandler) RevokePermissionFromRole(c *gin.Context) {
	// HTTP: Get IDs from URL
	roleID := c.Param("id")
	permissionAssignmentID := c.Param("permission_id")

	// Business logic: Revoke permission via service
	if err := h.roleService.RevokePermissionFromRole(roleID, permissionAssignmentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Permission berhasil dicabut dari role"})
}
