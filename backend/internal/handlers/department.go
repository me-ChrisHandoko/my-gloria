package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// DepartmentHandler handles HTTP requests for departments
type DepartmentHandler struct {
	departmentService *services.DepartmentService
}

// NewDepartmentHandler creates a new DepartmentHandler instance
func NewDepartmentHandler(departmentService *services.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{
		departmentService: departmentService,
	}
}

// CreateDepartment handles creating a new department
// @Summary Create a new department
// @Tags departments
// @Accept json
// @Produce json
// @Param request body models.CreateDepartmentRequest true "Department data"
// @Success 201 {object} models.DepartmentResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /departments [post]
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req models.CreateDepartmentRequest

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

	// Business logic: Create department via service
	department, err := h.departmentService.CreateDepartment(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, department.ToResponse())
}

// GetDepartments handles getting list of departments with pagination and filters
// @Summary Get list of departments
// @Tags departments
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param search query string false "Search by name or code"
// @Param school_id query string false "Filter by school ID"
// @Param parent_id query string false "Filter by parent ID (use 'null' for root departments)"
// @Param is_active query bool false "Filter by active status"
// @Param sort_by query string false "Sort by field" default(created_at)
// @Param sort_order query string false "Sort order (asc/desc)" default(desc)
// @Success 200 {object} services.DepartmentListResult
// @Failure 500 {object} map[string]string
// @Router /departments [get]
func (h *DepartmentHandler) GetDepartments(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	search := c.Query("search")
	schoolID := c.Query("school_id")
	parentID := c.Query("parent_id")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// Build params
	params := services.DepartmentListParams{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		SchoolID:  schoolID,
		ParentID:  parentID,
		IsActive:  isActive,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Business logic: Get departments via service
	result, err := h.departmentService.GetDepartments(params)
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

// GetDepartmentByID handles getting a single department by ID
// @Summary Get department by ID
// @Tags departments
// @Produce json
// @Param id path string true "Department ID"
// @Success 200 {object} models.DepartmentResponse
// @Failure 404 {object} map[string]string
// @Router /departments/{id} [get]
func (h *DepartmentHandler) GetDepartmentByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get department via service
	department, err := h.departmentService.GetDepartmentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, department.ToResponse())
}

// GetDepartmentTree handles getting department tree structure
// @Summary Get department tree structure
// @Tags departments
// @Produce json
// @Success 200 {array} models.DepartmentTreeResponse
// @Failure 500 {object} map[string]string
// @Router /departments/tree [get]
func (h *DepartmentHandler) GetDepartmentTree(c *gin.Context) {
	// Business logic: Get department tree via service
	tree, err := h.departmentService.GetDepartmentTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, tree)
}

// UpdateDepartment handles updating a department
// @Summary Update a department
// @Tags departments
// @Accept json
// @Produce json
// @Param id path string true "Department ID"
// @Param request body models.UpdateDepartmentRequest true "Department data"
// @Success 200 {object} models.DepartmentResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /departments/{id} [put]
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdateDepartmentRequest
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

	// Business logic: Update department via service
	department, err := h.departmentService.UpdateDepartment(id, req, userID.(string))
	if err != nil {
		if err.Error() == "departemen tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, department.ToResponse())
}

// DeleteDepartment handles deleting a department
// @Summary Delete a department
// @Tags departments
// @Produce json
// @Param id path string true "Department ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /departments/{id} [delete]
func (h *DepartmentHandler) DeleteDepartment(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete department via service
	err := h.departmentService.DeleteDepartment(id)
	if err != nil {
		if err.Error() == "departemen tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Departemen berhasil dihapus"})
}

// GetAvailableDepartmentCodes handles getting available department codes from data_karyawan
// @Summary Get available department codes
// @Tags departments
// @Produce json
// @Success 200 {object} map[string][]string
// @Failure 500 {object} map[string]string
// @Router /departments/available-codes [get]
func (h *DepartmentHandler) GetAvailableDepartmentCodes(c *gin.Context) {
	// Business logic: Get available codes via service
	codes, err := h.departmentService.GetAvailableDepartmentCodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"codes": codes})
}
