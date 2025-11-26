package handler

import (
	"net/http"

	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// DashboardHandler handles dashboard-related HTTP requests
type DashboardHandler struct {
	dashboardService service.DashboardService
}

// NewDashboardHandler creates a new dashboard handler instance
func NewDashboardHandler(dashboardService service.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

// GetStatistics retrieves aggregated statistics for the dashboard
func (h *DashboardHandler) GetStatistics(c *gin.Context) {
	stats, err := h.dashboardService.GetStatistics()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", stats)
}

// GetEmployeeStatistics retrieves employee statistics
func (h *DashboardHandler) GetEmployeeStatistics(c *gin.Context) {
	stats, err := h.dashboardService.GetEmployeeStatistics()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", stats)
}

// GetOrganizationStatistics retrieves organization statistics
func (h *DashboardHandler) GetOrganizationStatistics(c *gin.Context) {
	stats, err := h.dashboardService.GetOrganizationStatistics()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", stats)
}

// GetSystemStatistics retrieves system statistics
func (h *DashboardHandler) GetSystemStatistics(c *gin.Context) {
	stats, err := h.dashboardService.GetSystemStatistics()
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	SuccessResponse(c, http.StatusOK, "", stats)
}
