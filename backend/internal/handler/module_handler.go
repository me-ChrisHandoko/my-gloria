package handler

import (
	"errors"
	"net/http"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/response"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// ModuleHandler handles module-related HTTP requests
type ModuleHandler struct {
	moduleService service.ModuleService
	auditService  service.AuditService
}

// NewModuleHandler creates a new module handler instance
func NewModuleHandler(moduleService service.ModuleService, auditService service.AuditService) *ModuleHandler {
	return &ModuleHandler{
		moduleService: moduleService,
		auditService:  auditService,
	}
}

// GetAll retrieves all modules with pagination
func (h *ModuleHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	modules, total, err := h.moduleService.GetAll(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, modules, total, params)
}

// GetByID retrieves a module by ID
func (h *ModuleHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	module, err := h.moduleService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrModuleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", module)
}

// GetByCode retrieves a module by code
func (h *ModuleHandler) GetByCode(c *gin.Context) {
	code := c.Param("code")
	module, err := h.moduleService.GetByCode(code)
	if err != nil {
		if errors.Is(err, service.ErrModuleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", module)
}

// GetActive retrieves all active modules
func (h *ModuleHandler) GetActive(c *gin.Context) {
	modules, err := h.moduleService.GetActive()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", modules)
}

// GetByCategory retrieves modules by category
func (h *ModuleHandler) GetByCategory(c *gin.Context) {
	category := domain.ModuleCategory(c.Param("category"))
	if !category.IsValid() {
		ErrorResponse(c, http.StatusBadRequest, "invalid category")
		return
	}

	modules, err := h.moduleService.GetByCategory(category)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", modules)
}

// GetByParentID retrieves modules by parent ID
func (h *ModuleHandler) GetByParentID(c *gin.Context) {
	parentID := c.Param("parentId")
	var parentIDPtr *string
	if parentID != "" && parentID != "null" && parentID != "root" {
		parentIDPtr = &parentID
	}

	modules, err := h.moduleService.GetByParentID(parentIDPtr)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", modules)
}

// GetTree retrieves the complete module tree structure
func (h *ModuleHandler) GetTree(c *gin.Context) {
	tree, err := h.moduleService.GetTree()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", tree)
}

// GetCategories retrieves all valid module categories
func (h *ModuleHandler) GetCategories(c *gin.Context) {
	categories := h.moduleService.GetCategories()
	SuccessResponse(c, http.StatusOK, "", categories)
}

// Create creates a new module
func (h *ModuleHandler) Create(c *gin.Context) {
	var req domain.CreateModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	userID := middleware.GetCurrentUserID(c)
	module, err := h.moduleService.Create(&req, userID)
	if err != nil {
		if errors.Is(err, service.ErrModuleCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, service.ErrInvalidCategory) {
			ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionCreate, "modules", "Module", module.ID, module.Name, nil, module)

	SuccessResponse(c, http.StatusCreated, "module created successfully", module)
}

// Update updates an existing module
func (h *ModuleHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var req domain.UpdateModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Get old values for audit
	oldModule, _ := h.moduleService.GetByID(id)

	userID := middleware.GetCurrentUserID(c)
	module, err := h.moduleService.Update(id, &req, userID)
	if err != nil {
		if errors.Is(err, service.ErrModuleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrModuleCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, service.ErrModuleCircularReference) {
			ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, service.ErrInvalidCategory) {
			ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionUpdate, "modules", "Module", module.ID, module.Name, oldModule, module)

	SuccessResponse(c, http.StatusOK, "module updated successfully", module)
}

// Delete deletes a module
func (h *ModuleHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	reason := c.Query("reason")
	if reason == "" {
		reason = "Deleted by user"
	}

	// Get module for audit
	module, err := h.moduleService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrModuleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if err := h.moduleService.Delete(id, userID, reason); err != nil {
		if errors.Is(err, service.ErrModuleHasChildren) {
			ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionDelete, "modules", "Module", id, module.Name, module, nil)

	SuccessResponse(c, http.StatusOK, "module deleted successfully", nil)
}

// GetRoleModuleAccess retrieves module access for a role
func (h *ModuleHandler) GetRoleModuleAccess(c *gin.Context) {
	roleID := c.Param("roleId")
	access, err := h.moduleService.GetRoleModuleAccess(roleID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", access)
}

// AssignRoleModuleAccess assigns module access to a role
func (h *ModuleHandler) AssignRoleModuleAccess(c *gin.Context) {
	roleID := c.Param("roleId")

	var req domain.AssignModuleAccessToRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	userID := middleware.GetCurrentUserID(c)
	if err := h.moduleService.AssignRoleModuleAccess(roleID, &req, userID); err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionAssign, "modules", "RoleModuleAccess", roleID, "", nil, req)

	SuccessResponse(c, http.StatusOK, "module access assigned to role", nil)
}

// RemoveRoleModuleAccess removes module access from a role
func (h *ModuleHandler) RemoveRoleModuleAccess(c *gin.Context) {
	roleID := c.Param("roleId")
	moduleID := c.Param("moduleId")

	if err := h.moduleService.RemoveRoleModuleAccess(roleID, moduleID); err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionRevoke, "modules", "RoleModuleAccess", roleID, "", nil, nil)

	SuccessResponse(c, http.StatusOK, "module access removed from role", nil)
}

// GetUserModuleAccess retrieves module access for a user
func (h *ModuleHandler) GetUserModuleAccess(c *gin.Context) {
	userID := c.Param("userId")
	access, err := h.moduleService.GetUserModuleAccess(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", access)
}

// AssignUserModuleAccess assigns module access to a user
func (h *ModuleHandler) AssignUserModuleAccess(c *gin.Context) {
	userID := c.Param("userId")

	var req domain.AssignModuleAccessToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	assignedBy := middleware.GetCurrentUserID(c)
	if err := h.moduleService.AssignUserModuleAccess(userID, &req, assignedBy); err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionAssign, "modules", "UserModuleAccess", userID, "", nil, req)

	SuccessResponse(c, http.StatusOK, "module access assigned to user", nil)
}

// RemoveUserModuleAccess removes module access from a user
func (h *ModuleHandler) RemoveUserModuleAccess(c *gin.Context) {
	userID := c.Param("userId")
	moduleID := c.Param("moduleId")

	if err := h.moduleService.RemoveUserModuleAccess(userID, moduleID); err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	h.auditService.LogFromContext(c, domain.AuditActionRevoke, "modules", "UserModuleAccess", userID, "", nil, nil)

	SuccessResponse(c, http.StatusOK, "module access removed from user", nil)
}

// GetMyModules retrieves modules accessible by the current user
func (h *ModuleHandler) GetMyModules(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		ErrorResponse(c, http.StatusUnauthorized, "user not authenticated")
		return
	}

	modules, err := h.moduleService.GetUserEffectiveModules(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", modules)
}
