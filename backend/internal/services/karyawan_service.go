package services

import (
	"errors"
	"fmt"

	"backend/internal/models"

	"gorm.io/gorm"
)

// KaryawanService handles business logic for employees
type KaryawanService struct {
	db *gorm.DB
}

// NewKaryawanService creates a new KaryawanService instance
func NewKaryawanService(db *gorm.DB) *KaryawanService {
	return &KaryawanService{db: db}
}

// KaryawanListParams represents parameters for listing employees
type KaryawanListParams struct {
	Page           int
	Limit          int
	Search         string
	BagianKerja    string
	JenisKaryawan  string
	StatusAktif    string
}

// KaryawanListResult represents the result of listing employees
type KaryawanListResult struct {
	Data       []*models.DataKaryawanListResponse `json:"data"`
	Total      int64                              `json:"total"`
	Page       int                                `json:"page"`
	Limit      int                                `json:"limit"`
	TotalPages int                                `json:"total_pages"`
}

// GetKaryawans retrieves list of employees with pagination and filters
func (s *KaryawanService) GetKaryawans(params KaryawanListParams) (*KaryawanListResult, error) {
	query := s.db.Model(&models.DataKaryawan{})

	// Apply search filter (search by name, email, or NIP)
	if params.Search != "" {
		query = query.Where("nama ILIKE ? OR email ILIKE ? OR nip ILIKE ?",
			"%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply bagian_kerja filter
	if params.BagianKerja != "" {
		query = query.Where("bagian_kerja = ?", params.BagianKerja)
	}

	// Apply jenis_karyawan filter
	if params.JenisKaryawan != "" {
		query = query.Where("jenis_karyawan = ?", params.JenisKaryawan)
	}

	// Apply status_aktif filter (default to 'Aktif' if not specified)
	if params.StatusAktif != "" {
		query = query.Where("status_aktif = ?", params.StatusAktif)
	} else {
		// Default filter: only return active employees
		query = query.Where("status_aktif = ?", "Aktif")
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total karyawan: %w", err)
	}

	// Set default pagination
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 10
	}

	// Apply pagination
	offset := (params.Page - 1) * params.Limit
	query = query.Offset(offset).Limit(params.Limit)

	// Apply default sorting
	query = query.Order("nama ASC")

	// Fetch employees
	var karyawans []models.DataKaryawan
	if err := query.Find(&karyawans).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data karyawan: %w", err)
	}

	// Convert to list response
	karyawanList := make([]*models.DataKaryawanListResponse, len(karyawans))
	for i, karyawan := range karyawans {
		karyawanList[i] = karyawan.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	return &KaryawanListResult{
		Data:       karyawanList,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetKaryawanByNIP retrieves an employee by NIP
func (s *KaryawanService) GetKaryawanByNIP(nip string) (*models.DataKaryawan, error) {
	var karyawan models.DataKaryawan
	if err := s.db.First(&karyawan, "nip = ?", nip).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("karyawan tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data karyawan: %w", err)
	}

	return &karyawan, nil
}

// GetFilterOptions retrieves unique values for filter dropdowns
func (s *KaryawanService) GetFilterOptions() (map[string][]string, error) {
	options := make(map[string][]string)

	// Get unique bagian_kerja values
	var bagianKerjaList []string
	if err := s.db.Model(&models.DataKaryawan{}).
		Distinct("bagian_kerja").
		Where("bagian_kerja IS NOT NULL AND bagian_kerja != ''").
		Order("bagian_kerja").
		Pluck("bagian_kerja", &bagianKerjaList).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil opsi bagian kerja: %w", err)
	}
	options["bagian_kerja"] = bagianKerjaList

	// Get unique jenis_karyawan values
	var jenisKaryawanList []string
	if err := s.db.Model(&models.DataKaryawan{}).
		Distinct("jenis_karyawan").
		Where("jenis_karyawan IS NOT NULL AND jenis_karyawan != ''").
		Order("jenis_karyawan").
		Pluck("jenis_karyawan", &jenisKaryawanList).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil opsi jenis karyawan: %w", err)
	}
	options["jenis_karyawan"] = jenisKaryawanList

	// Get unique status_aktif values
	var statusAktifList []string
	if err := s.db.Model(&models.DataKaryawan{}).
		Distinct("status_aktif").
		Where("status_aktif IS NOT NULL AND status_aktif != ''").
		Order("status_aktif").
		Pluck("status_aktif", &statusAktifList).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil opsi status aktif: %w", err)
	}
	options["status_aktif"] = statusAktifList

	return options, nil
}
