package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// SchoolHandler handles HTTP requests for schools
type SchoolHandler struct {
	schoolService *services.SchoolService
}

// NewSchoolHandler creates a new SchoolHandler instance
func NewSchoolHandler(schoolService *services.SchoolService) *SchoolHandler {
	return &SchoolHandler{
		schoolService: schoolService,
	}
}

// CreateSchool handles creating a new school
// @Summary Create a new school
// @Tags schools
// @Accept json
// @Produce json
// @Param request body models.CreateSchoolRequest true "School data"
// @Success 201 {object} models.SchoolResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /schools [post]
func (h *SchoolHandler) CreateSchool(c *gin.Context) {
	var req models.CreateSchoolRequest

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

	// Business logic: Create school via service
	school, err := h.schoolService.CreateSchool(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, school.ToResponse())
}

// GetSchools handles getting list of schools with pagination and filters
// @Summary Get list of schools
// @Tags schools
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param search query string false "Search by name or code"
// @Param is_active query bool false "Filter by active status"
// @Param sort_by query string false "Sort by field" default(created_at)
// @Param sort_order query string false "Sort order (asc/desc)" default(desc)
// @Success 200 {object} services.SchoolListResult
// @Failure 500 {object} map[string]string
// @Router /schools [get]
func (h *SchoolHandler) GetSchools(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	lokasi := c.Query("lokasi")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// Build params
	params := services.SchoolListParams{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		Lokasi:    lokasi,
		IsActive:  isActive,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Business logic: Get schools via service
	result, err := h.schoolService.GetSchools(params)
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

// GetSchoolByID handles getting a single school by ID
// @Summary Get school by ID
// @Tags schools
// @Produce json
// @Param id path string true "School ID"
// @Success 200 {object} models.SchoolResponse
// @Failure 404 {object} map[string]string
// @Router /schools/{id} [get]
func (h *SchoolHandler) GetSchoolByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get school via service
	school, err := h.schoolService.GetSchoolByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, school.ToResponse())
}

// UpdateSchool handles updating a school
// @Summary Update a school
// @Tags schools
// @Accept json
// @Produce json
// @Param id path string true "School ID"
// @Param request body models.UpdateSchoolRequest true "School data"
// @Success 200 {object} models.SchoolResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /schools/{id} [put]
func (h *SchoolHandler) UpdateSchool(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdateSchoolRequest
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

	// Business logic: Update school via service
	school, err := h.schoolService.UpdateSchool(id, req, userID.(string))
	if err != nil {
		if err.Error() == "sekolah tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, school.ToResponse())
}

// DeleteSchool handles deleting a school
// @Summary Delete a school
// @Tags schools
// @Produce json
// @Param id path string true "School ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /schools/{id} [delete]
func (h *SchoolHandler) DeleteSchool(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete school via service
	err := h.schoolService.DeleteSchool(id)
	if err != nil {
		if err.Error() == "sekolah tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Sekolah berhasil dihapus"})
}

// GetAvailableSchoolCodes handles getting available school codes from active teachers
// @Summary Get available school codes
// @Tags schools
// @Produce json
// @Success 200 {object} map[string][]string
// @Failure 500 {object} map[string]string
// @Router /schools/available-codes [get]
func (h *SchoolHandler) GetAvailableSchoolCodes(c *gin.Context) {
	// Business logic: Get available school codes via service
	codes, err := h.schoolService.GetAvailableSchoolCodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"codes": codes})
}
