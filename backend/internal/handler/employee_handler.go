package handler

import (
	"errors"
	"net/http"
	"strconv"

	"backend/internal/response"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// EmployeeHandler handles employee-related HTTP requests
type EmployeeHandler struct {
	employeeService service.EmployeeService
}

// NewEmployeeHandler creates a new employee handler instance
func NewEmployeeHandler(employeeService service.EmployeeService) *EmployeeHandler {
	return &EmployeeHandler{employeeService: employeeService}
}

// GetAll retrieves all employees with pagination
func (h *EmployeeHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	employees, total, err := h.employeeService.GetAll(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, employees, total, params)
}

// GetActive retrieves all active employees with pagination
func (h *EmployeeHandler) GetActive(c *gin.Context) {
	params := response.GetPaginationParams(c)

	employees, total, err := h.employeeService.GetActive(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, employees, total, params)
}

// GetByNIP retrieves an employee by NIP
func (h *EmployeeHandler) GetByNIP(c *gin.Context) {
	nip := c.Param("nip")
	employee, err := h.employeeService.GetByNIP(nip)
	if err != nil {
		if errors.Is(err, service.ErrEmployeeNotFound) {
			ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", employee)
}

// GetByDepartment retrieves employees by department
func (h *EmployeeHandler) GetByDepartment(c *gin.Context) {
	bagianKerja := c.Param("department")
	params := response.GetPaginationParams(c)

	employees, total, err := h.employeeService.GetByDepartment(bagianKerja, params.Page, params.Limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, employees, total, params)
}

// GetByLocation retrieves employees by location
func (h *EmployeeHandler) GetByLocation(c *gin.Context) {
	lokasi := c.Param("location")
	params := response.GetPaginationParams(c)

	employees, total, err := h.employeeService.GetByLocation(lokasi, params.Page, params.Limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Paginated(c, http.StatusOK, employees, total, params)
}

// Search searches for employees
func (h *EmployeeHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		ErrorResponse(c, http.StatusBadRequest, "search query is required")
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	employees, err := h.employeeService.Search(query, limit)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	SuccessResponse(c, http.StatusOK, "", employees)
}

// GetStatistics retrieves employee statistics
func (h *EmployeeHandler) GetStatistics(c *gin.Context) {
	stats, err := h.employeeService.GetStatistics()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", stats)
}
