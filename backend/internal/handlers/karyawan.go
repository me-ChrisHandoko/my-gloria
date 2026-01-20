package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// KaryawanHandler handles HTTP requests for employees
type KaryawanHandler struct {
	karyawanService *services.KaryawanService
}

// NewKaryawanHandler creates a new KaryawanHandler instance
func NewKaryawanHandler(karyawanService *services.KaryawanService) *KaryawanHandler {
	return &KaryawanHandler{
		karyawanService: karyawanService,
	}
}

// GetKaryawans handles getting list of employees with pagination and filters
// @Summary Get list of employees
// @Tags employees
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Page size" default(10)
// @Param search query string false "Search by name, email, or NIP"
// @Param bagian_kerja query string false "Filter by bagian kerja"
// @Param jenis_karyawan query string false "Filter by jenis karyawan"
// @Param status_aktif query string false "Filter by status aktif"
// @Success 200 {object} services.KaryawanListResult
// @Failure 500 {object} map[string]string
// @Router /employees [get]
func (h *KaryawanHandler) GetKaryawans(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	bagianKerja := c.Query("bagian_kerja")
	jenisKaryawan := c.Query("jenis_karyawan")
	statusAktif := c.Query("status_aktif")

	// Build params
	params := services.KaryawanListParams{
		Page:          page,
		Limit:         limit,
		Search:        search,
		BagianKerja:   bagianKerja,
		JenisKaryawan: jenisKaryawan,
		StatusAktif:   statusAktif,
	}

	// Business logic: Get karyawans via service
	result, err := h.karyawanService.GetKaryawans(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, result)
}

// GetKaryawanByNIP handles getting a single employee by NIP
// @Summary Get employee by NIP
// @Tags employees
// @Produce json
// @Param nip path string true "Employee NIP"
// @Success 200 {object} models.DataKaryawanResponse
// @Failure 404 {object} map[string]string
// @Router /employees/{nip} [get]
func (h *KaryawanHandler) GetKaryawanByNIP(c *gin.Context) {
	// HTTP: Get NIP from URL
	nip := c.Param("nip")

	// Business logic: Get karyawan via service
	karyawan, err := h.karyawanService.GetKaryawanByNIP(nip)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, karyawan.ToResponse())
}

// GetFilterOptions handles getting unique values for filter dropdowns
// @Summary Get filter options
// @Tags employees
// @Produce json
// @Success 200 {object} map[string][]string
// @Failure 500 {object} map[string]string
// @Router /employees/filter-options [get]
func (h *KaryawanHandler) GetFilterOptions(c *gin.Context) {
	// Business logic: Get filter options via service
	options, err := h.karyawanService.GetFilterOptions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, options)
}
