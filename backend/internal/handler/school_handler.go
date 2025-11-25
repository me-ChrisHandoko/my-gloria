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

// SchoolHandler handles school-related HTTP requests
type SchoolHandler struct {
	schoolService service.SchoolService
	auditService  service.AuditService
}

// NewSchoolHandler creates a new school handler instance
func NewSchoolHandler(schoolService service.SchoolService, auditService service.AuditService) *SchoolHandler {
	return &SchoolHandler{
		schoolService: schoolService,
		auditService:  auditService,
	}
}

func (h *SchoolHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	schools, total, err := h.schoolService.GetAllPaginated(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, schools, total, params)
}

func (h *SchoolHandler) GetActive(c *gin.Context) {
	schools, err := h.schoolService.GetActive()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", schools)
}

func (h *SchoolHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	school, err := h.schoolService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrSchoolNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", school)
}

func (h *SchoolHandler) GetByCode(c *gin.Context) {
	code := c.Param("code")
	school, err := h.schoolService.GetByCode(code)
	if err != nil {
		if errors.Is(err, service.ErrSchoolNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", school)
}

func (h *SchoolHandler) Create(c *gin.Context) {
	var req domain.CreateSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	createdBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	school, err := h.schoolService.Create(&req, &createdBy)
	if err != nil {
		if errors.Is(err, service.ErrSchoolCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := school.Name
	go h.auditService.LogCreate(createdBy, profileID, "organization", "school", school.ID, &entityDisplay, school, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusCreated, "School created successfully", school)
}

func (h *SchoolHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdateSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	oldSchool, _ := h.schoolService.GetByID(id)

	modifiedBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	school, err := h.schoolService.Update(id, &req, &modifiedBy)
	if err != nil {
		if errors.Is(err, service.ErrSchoolNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrSchoolCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := school.Name
	go h.auditService.LogUpdate(modifiedBy, profileID, "organization", "school", school.ID, &entityDisplay, oldSchool, school, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "School updated successfully", school)
}

func (h *SchoolHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	oldSchool, _ := h.schoolService.GetByID(id)

	err := h.schoolService.Delete(id)
	if err != nil {
		if errors.Is(err, service.ErrSchoolNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
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
	if oldSchool != nil {
		entityDisplay = oldSchool.Name
	}
	go h.auditService.LogDelete(userID, profileID, "organization", "school", id, &entityDisplay, oldSchool, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "School deleted successfully", nil)
}
