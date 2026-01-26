package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// ModuleHandler handles HTTP requests for modules
type ModuleHandler struct {
	moduleService *services.ModuleService
}

// NewModuleHandler creates a new ModuleHandler instance
func NewModuleHandler(moduleService *services.ModuleService) *ModuleHandler {
	return &ModuleHandler{
		moduleService: moduleService,
	}
}

// CreateModule handles creating a new module
// @Summary Create a new module
// @Tags modules
// @Accept json
// @Produce json
// @Param request body models.CreateModuleRequest true "Module data"
// @Success 201 {object} models.ModuleResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /modules [post]
func (h *ModuleHandler) CreateModule(c *gin.Context) {
	var req models.CreateModuleRequest

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

	// Business logic: Create module via service
	module, err := h.moduleService.CreateModule(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, module.ToResponse())
}

// GetModules handles getting list of modules with pagination and filters
// @Summary Get list of modules
// @Tags modules
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param search query string false "Search by name or code"
// @Param category query string false "Filter by category"
// @Param parent_id query string false "Filter by parent ID (use 'null' for root modules)"
// @Param is_active query bool false "Filter by active status"
// @Param is_visible query bool false "Filter by visible status"
// @Param sort_by query string false "Sort by field" default(sort_order)
// @Param sort_order query string false "Sort order (asc/desc)" default(asc)
// @Success 200 {object} services.ModuleListResult
// @Failure 500 {object} map[string]string
// @Router /modules [get]
func (h *ModuleHandler) GetModules(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	category := c.Query("category")
	parentID := c.Query("parent_id")
	sortBy := c.DefaultQuery("sort_by", "sort_order")
	sortOrder := c.DefaultQuery("sort_order", "asc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// HTTP: Parse is_visible filter
	var isVisible *bool
	if isVisibleStr := c.Query("is_visible"); isVisibleStr != "" {
		val, _ := strconv.ParseBool(isVisibleStr)
		isVisible = &val
	}

	// Build params
	params := services.ModuleListParams{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		Category:  category,
		ParentID:  parentID,
		IsActive:  isActive,
		IsVisible: isVisible,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Business logic: Get modules via service
	result, err := h.moduleService.GetModules(params)
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

// GetModuleByID handles getting a single module by ID
// @Summary Get module by ID
// @Tags modules
// @Produce json
// @Param id path string true "Module ID"
// @Success 200 {object} models.ModuleResponse
// @Failure 404 {object} map[string]string
// @Router /modules/{id} [get]
func (h *ModuleHandler) GetModuleByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get module via service
	module, err := h.moduleService.GetModuleByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, module.ToResponse())
}

// GetModuleTree handles getting module tree structure
// @Summary Get module tree structure
// @Tags modules
// @Produce json
// @Success 200 {array} models.ModuleTreeResponse
// @Failure 500 {object} map[string]string
// @Router /modules/tree [get]
func (h *ModuleHandler) GetModuleTree(c *gin.Context) {
	// Business logic: Get module tree via service
	tree, err := h.moduleService.GetModuleTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, tree)
}

// UpdateModule handles updating a module
// @Summary Update a module
// @Tags modules
// @Accept json
// @Produce json
// @Param id path string true "Module ID"
// @Param request body models.UpdateModuleRequest true "Module data"
// @Success 200 {object} models.ModuleResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /modules/{id} [put]
func (h *ModuleHandler) UpdateModule(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdateModuleRequest
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

	// Business logic: Update module via service
	module, err := h.moduleService.UpdateModule(id, req, userID.(string))
	if err != nil {
		if err.Error() == "module tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, module.ToResponse())
}

// DeleteModule handles deleting a module
// @Summary Delete a module
// @Tags modules
// @Produce json
// @Param id path string true "Module ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /modules/{id} [delete]
func (h *ModuleHandler) DeleteModule(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete module via service
	err := h.moduleService.DeleteModule(id)
	if err != nil {
		if err.Error() == "module tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Module berhasil dihapus"})
}

// ==================== Role Module Access Handlers ====================

// GetRoleModuleAccesses handles getting module accesses for a role
// @Summary Get module accesses for a role
// @Tags roles
// @Produce json
// @Param id path string true "Role ID"
// @Success 200 {array} models.RoleModuleAccessResponse
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /roles/{id}/modules [get]
func (h *ModuleHandler) GetRoleModuleAccesses(c *gin.Context) {
	// HTTP: Get role ID from URL
	roleID := c.Param("id")

	// Business logic: Get role module accesses via service
	accesses, err := h.moduleService.GetRoleModuleAccesses(roleID)
	if err != nil {
		if err.Error() == "role tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, accesses)
}

// AssignModuleToRole handles assigning a module to a role
// @Summary Assign a module to a role
// @Tags roles
// @Accept json
// @Produce json
// @Param id path string true "Role ID"
// @Param request body models.AssignModuleAccessToRoleRequest true "Module assignment data"
// @Success 201 {object} models.RoleModuleAccessResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /roles/{id}/modules [post]
func (h *ModuleHandler) AssignModuleToRole(c *gin.Context) {
	// HTTP: Get role ID from URL
	roleID := c.Param("id")

	// HTTP: Parse and validate request
	var req models.AssignModuleAccessToRoleRequest
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

	// Business logic: Assign module to role via service
	access, err := h.moduleService.AssignModuleToRole(roleID, req, userID.(string))
	if err != nil {
		if err.Error() == "role tidak ditemukan" || err.Error() == "module tidak ditemukan" || err.Error() == "position tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "module sudah di-assign ke role ini" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, access.ToResponse())
}

// RevokeModuleFromRole handles revoking a module from a role
// @Summary Revoke a module from a role
// @Tags roles
// @Produce json
// @Param id path string true "Role ID"
// @Param access_id path string true "Module Access ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /roles/{id}/modules/{access_id} [delete]
func (h *ModuleHandler) RevokeModuleFromRole(c *gin.Context) {
	// HTTP: Get IDs from URL
	roleID := c.Param("id")
	accessID := c.Param("access_id")

	// Business logic: Revoke module from role via service
	err := h.moduleService.RevokeModuleFromRole(roleID, accessID)
	if err != nil {
		if err.Error() == "module access tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Module berhasil dicabut dari role"})
}
