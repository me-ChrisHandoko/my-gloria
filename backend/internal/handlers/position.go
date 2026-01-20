package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// PositionHandler handles HTTP requests for positions
type PositionHandler struct {
	positionService *services.PositionService
}

// NewPositionHandler creates a new PositionHandler instance
func NewPositionHandler(positionService *services.PositionService) *PositionHandler {
	return &PositionHandler{
		positionService: positionService,
	}
}

// CreatePosition handles creating a new position
// @Summary Create a new position
// @Tags positions
// @Accept json
// @Produce json
// @Param request body models.CreatePositionRequest true "Position data"
// @Success 201 {object} models.PositionResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /positions [post]
func (h *PositionHandler) CreatePosition(c *gin.Context) {
	var req models.CreatePositionRequest

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

	// Business logic: Create position via service
	position, err := h.positionService.CreatePosition(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, position.ToResponse())
}

// GetPositions handles getting list of positions with pagination and filters
// @Summary Get list of positions
// @Tags positions
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param search query string false "Search by name or code"
// @Param department_id query string false "Filter by department ID"
// @Param school_id query string false "Filter by school ID"
// @Param hierarchy_level query int false "Filter by hierarchy level"
// @Param is_active query bool false "Filter by active status"
// @Param sort_by query string false "Sort by field" default(hierarchy_level)
// @Param sort_order query string false "Sort order (asc/desc)" default(asc)
// @Success 200 {object} services.PositionListResult
// @Failure 500 {object} map[string]string
// @Router /positions [get]
func (h *PositionHandler) GetPositions(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	departmentID := c.Query("department_id")
	schoolID := c.Query("school_id")
	sortBy := c.DefaultQuery("sort_by", "hierarchy_level")
	sortOrder := c.DefaultQuery("sort_order", "asc")

	// HTTP: Parse hierarchy_level filter
	var hierarchyLevel *int
	if hierarchyLevelStr := c.Query("hierarchy_level"); hierarchyLevelStr != "" {
		val, _ := strconv.Atoi(hierarchyLevelStr)
		hierarchyLevel = &val
	}

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// Build params
	params := services.PositionListParams{
		Page:           page,
		PageSize:       pageSize,
		Search:         search,
		DepartmentID:   departmentID,
		SchoolID:       schoolID,
		HierarchyLevel: hierarchyLevel,
		IsActive:       isActive,
		SortBy:         sortBy,
		SortOrder:      sortOrder,
	}

	// Business logic: Get positions via service
	result, err := h.positionService.GetPositions(params)
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

// GetPositionByID handles getting a single position by ID
// @Summary Get position by ID
// @Tags positions
// @Produce json
// @Param id path string true "Position ID"
// @Success 200 {object} models.PositionResponse
// @Failure 404 {object} map[string]string
// @Router /positions/{id} [get]
func (h *PositionHandler) GetPositionByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get position via service
	position, err := h.positionService.GetPositionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, position.ToResponse())
}

// UpdatePosition handles updating a position
// @Summary Update a position
// @Tags positions
// @Accept json
// @Produce json
// @Param id path string true "Position ID"
// @Param request body models.UpdatePositionRequest true "Position data"
// @Success 200 {object} models.PositionResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /positions/{id} [put]
func (h *PositionHandler) UpdatePosition(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdatePositionRequest
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

	// Business logic: Update position via service
	position, err := h.positionService.UpdatePosition(id, req, userID.(string))
	if err != nil {
		if err.Error() == "posisi tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, position.ToResponse())
}

// DeletePosition handles deleting a position
// @Summary Delete a position
// @Tags positions
// @Produce json
// @Param id path string true "Position ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /positions/{id} [delete]
func (h *PositionHandler) DeletePosition(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete position via service
	err := h.positionService.DeletePosition(id)
	if err != nil {
		if err.Error() == "posisi tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Posisi berhasil dihapus"})
}
