package handler

import (
	"errors"
	"net/http"
	"strconv"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/response"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// PositionHandler handles position-related HTTP requests
type PositionHandler struct {
	positionService service.PositionService
	auditService    service.AuditService
}

// NewPositionHandler creates a new position handler instance
func NewPositionHandler(positionService service.PositionService, auditService service.AuditService) *PositionHandler {
	return &PositionHandler{
		positionService: positionService,
		auditService:    auditService,
	}
}

func (h *PositionHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	positions, total, err := h.positionService.GetAllPaginated(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, positions, total, params)
}

func (h *PositionHandler) GetActive(c *gin.Context) {
	positions, err := h.positionService.GetActive()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", positions)
}

func (h *PositionHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	position, err := h.positionService.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrPositionNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", position)
}

func (h *PositionHandler) GetByCode(c *gin.Context) {
	code := c.Param("code")
	position, err := h.positionService.GetByCode(code)
	if err != nil {
		if errors.Is(err, service.ErrPositionNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", position)
}

func (h *PositionHandler) GetByDepartmentID(c *gin.Context) {
	departmentID := c.Param("departmentId")
	positions, err := h.positionService.GetByDepartmentID(departmentID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", positions)
}

func (h *PositionHandler) GetBySchoolID(c *gin.Context) {
	schoolID := c.Param("schoolId")
	positions, err := h.positionService.GetBySchoolID(schoolID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", positions)
}

func (h *PositionHandler) GetByHierarchyLevel(c *gin.Context) {
	levelStr := c.Param("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil {
		ErrorResponse(c, http.StatusBadRequest, "invalid hierarchy level")
		return
	}

	positions, err := h.positionService.GetByHierarchyLevel(level)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", positions)
}

func (h *PositionHandler) GetWithHierarchy(c *gin.Context) {
	id := c.Param("id")
	position, err := h.positionService.GetWithHierarchy(id)
	if err != nil {
		if errors.Is(err, service.ErrPositionNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", position)
}

func (h *PositionHandler) Create(c *gin.Context) {
	var req domain.CreatePositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	createdBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	position, err := h.positionService.Create(&req, &createdBy)
	if err != nil {
		if errors.Is(err, service.ErrPositionCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := position.Name
	go h.auditService.LogCreate(createdBy, profileID, "organization", "position", position.ID, &entityDisplay, position, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusCreated, "Position created successfully", position)
}

func (h *PositionHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req domain.UpdatePositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	oldPosition, _ := h.positionService.GetByID(id)

	modifiedBy := middleware.GetCurrentUserID(c)
	profileID := middleware.GetCurrentProfileID(c)
	position, err := h.positionService.Update(id, &req, &modifiedBy)
	if err != nil {
		if errors.Is(err, service.ErrPositionNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		if errors.Is(err, service.ErrPositionCodeExists) {
			ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	entityDisplay := position.Name
	go h.auditService.LogUpdate(modifiedBy, profileID, "organization", "position", position.ID, &entityDisplay, oldPosition, position, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "Position updated successfully", position)
}

func (h *PositionHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	oldPosition, _ := h.positionService.GetByID(id)

	err := h.positionService.Delete(id)
	if err != nil {
		if errors.Is(err, service.ErrPositionNotFound) {
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
	if oldPosition != nil {
		entityDisplay = oldPosition.Name
	}
	go h.auditService.LogDelete(userID, profileID, "organization", "position", id, &entityDisplay, oldPosition, nil, &ipAddress, &userAgent)

	SuccessResponse(c, http.StatusOK, "Position deleted successfully", nil)
}
