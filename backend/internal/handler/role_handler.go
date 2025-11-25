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

// RoleHandler handles role-related HTTP requests
type RoleHandler struct {
	roleService  service.RoleService
	auditService service.AuditService
}

// NewRoleHandler creates a new role handler instance
func NewRoleHandler(roleService service.RoleService, auditService service.AuditService) *RoleHandler {
	return &RoleHandler{
		roleService:  roleService,
		auditService: auditService,
	}
}

func (h *RoleHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	roles, total, err := h.roleService.GetAllPaginated(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, roles, total, params)
}

func (h *RoleHandler) GetActive(c *gin.Context) {
	roles, err := h.roleService.GetActive()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", roles)
}

func (h *RoleHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	role, err := h.roleService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrRoleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", role)
}

func (h *RoleHandler) GetByCode(c *gin.Context) {
	code := c.Param("code")
	role, err := h.roleService.GetByCode(code)
	if err != nil {
		if errors.Is(err, service.ErrRoleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", role)
}

func (h *RoleHandler) GetWithPermissions(c *gin.Context) {
	id := c.Param("id")
	role, err := h.roleService.GetWithPermissions(id)
	if err != nil {
		if errors.Is(err, service.ErrRoleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", role)
}

func (h *RoleHandler) Create(c *gin.Context) {
	var req domain.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	createdBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	role, err := h.roleService.Create(&req, &createdBy)
	if err != nil {
		if errors.Is(err, service.ErrRoleCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log for role creation
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := role.Name
	go h.auditService.LogCreate(
		createdBy,
		profileID,
		"rbac",
		"role",
		role.ID,
		&entityDisplay,
		role,
		nil,
		&ipAddress,
		&userAgent,
	)

	SuccessResponse(c, http.StatusCreated, "Role created successfully", role)
}

func (h *RoleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Get old values for audit
	oldRole, _ := h.roleService.GetByID(id)

	role, err := h.roleService.Update(id, &req)
	if err != nil {
		if errors.Is(err, service.ErrRoleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrRoleCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log for role update
	userID := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := role.Name
	go h.auditService.LogUpdate(
		userID,
		profileID,
		"rbac",
		"role",
		role.ID,
		&entityDisplay,
		oldRole,
		role,
		nil,
		&ipAddress,
		&userAgent,
	)

	SuccessResponse(c, http.StatusOK, "Role updated successfully", role)
}

func (h *RoleHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	// Get old values for audit before deletion
	oldRole, _ := h.roleService.GetByID(id)

	err := h.roleService.Delete(id)
	if err != nil {
		if errors.Is(err, service.ErrRoleNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrCannotDeleteSystem) {
			ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log for role deletion
	userID := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	var entityDisplay string
	if oldRole != nil {
		entityDisplay = oldRole.Name
	}
	go h.auditService.LogDelete(
		userID,
		profileID,
		"rbac",
		"role",
		id,
		&entityDisplay,
		oldRole,
		nil,
		&ipAddress,
		&userAgent,
	)

	SuccessResponse(c, http.StatusOK, "Role deleted successfully", nil)
}

func (h *RoleHandler) AssignPermission(c *gin.Context) {
	roleID := c.Param("id")
	var req domain.AssignPermissionToRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	grantedBy := middleware.GetCurrentUserID(c)
	err := h.roleService.AssignPermission(roleID, &req, grantedBy)
	if err != nil {
		if errors.Is(err, service.ErrRoleNotFound) || errors.Is(err, service.ErrPermissionNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "Permission assigned successfully", nil)
}

func (h *RoleHandler) RemovePermission(c *gin.Context) {
	roleID := c.Param("id")
	permissionID := c.Param("permissionId")

	err := h.roleService.RemovePermission(roleID, permissionID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "Permission removed successfully", nil)
}

func (h *RoleHandler) GetRolePermissions(c *gin.Context) {
	roleID := c.Param("id")
	permissions, err := h.roleService.GetRolePermissions(roleID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", permissions)
}
