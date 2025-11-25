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

// DepartmentHandler handles department-related HTTP requests
type DepartmentHandler struct {
	departmentService service.DepartmentService
	auditService      service.AuditService
}

// NewDepartmentHandler creates a new department handler instance
func NewDepartmentHandler(departmentService service.DepartmentService, auditService service.AuditService) *DepartmentHandler {
	return &DepartmentHandler{
		departmentService: departmentService,
		auditService:      auditService,
	}
}

func (h *DepartmentHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	departments, total, err := h.departmentService.GetAllPaginated(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, departments, total, params)
}

func (h *DepartmentHandler) GetActive(c *gin.Context) {
	departments, err := h.departmentService.GetActive()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", departments)
}

func (h *DepartmentHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	department, err := h.departmentService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrDepartmentNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", department)
}

func (h *DepartmentHandler) GetByCode(c *gin.Context) {
	code := c.Param("code")
	department, err := h.departmentService.GetByCode(code)
	if err != nil {
		if errors.Is(err, service.ErrDepartmentNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", department)
}

func (h *DepartmentHandler) GetBySchoolID(c *gin.Context) {
	schoolID := c.Param("schoolId")
	departments, err := h.departmentService.GetBySchoolID(schoolID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", departments)
}

func (h *DepartmentHandler) GetByParentID(c *gin.Context) {
	parentID := c.Param("parentId")
	departments, err := h.departmentService.GetByParentID(parentID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", departments)
}

func (h *DepartmentHandler) GetTree(c *gin.Context) {
	tree, err := h.departmentService.GetTree()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", tree)
}

func (h *DepartmentHandler) Create(c *gin.Context) {
	var req domain.CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	createdBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	department, err := h.departmentService.Create(&req, &createdBy)
	if err != nil {
		if errors.Is(err, service.ErrDepartmentCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := department.Name
	go h.auditService.LogCreate(createdBy, profileID, "organization", "department", department.ID, &entityDisplay, department, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusCreated, "Department created successfully", department)
}

func (h *DepartmentHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	oldDepartment, _ := h.departmentService.GetByID(id)

	modifiedBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	department, err := h.departmentService.Update(id, &req, &modifiedBy)
	if err != nil {
		if errors.Is(err, service.ErrDepartmentNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrDepartmentCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, service.ErrCircularReference) {
			ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := department.Name
	go h.auditService.LogUpdate(modifiedBy, profileID, "organization", "department", department.ID, &entityDisplay, oldDepartment, department, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "Department updated successfully", department)
}

func (h *DepartmentHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	oldDepartment, _ := h.departmentService.GetByID(id)

	err := h.departmentService.Delete(id)
	if err != nil {
		if errors.Is(err, service.ErrDepartmentNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrCannotDeleteWithChildren) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	userID := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	var entityDisplay string
	if oldDepartment != nil {
		entityDisplay = oldDepartment.Name
	}
	go h.auditService.LogDelete(userID, profileID, "organization", "department", id, &entityDisplay, oldDepartment, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "Department deleted successfully", nil)
}
