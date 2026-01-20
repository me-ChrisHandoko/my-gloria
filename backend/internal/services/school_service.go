package services

import (
	"errors"
	"fmt"
	"strings"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SchoolService handles business logic for schools
type SchoolService struct {
	db *gorm.DB
}

// NewSchoolService creates a new SchoolService instance
func NewSchoolService(db *gorm.DB) *SchoolService {
	return &SchoolService{db: db}
}

// SchoolListParams represents parameters for listing schools
type SchoolListParams struct {
	Page      int
	PageSize  int
	Search    string
	Lokasi    string
	IsActive  *bool
	SortBy    string
	SortOrder string
}

// SchoolListResult represents the result of listing schools
type SchoolListResult struct {
	Data       []*models.SchoolListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// CreateSchool creates a new school with validation
func (s *SchoolService) CreateSchool(req models.CreateSchoolRequest, userID string) (*models.School, error) {
	// Business rule: Check if code already exists
	var existing models.School
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode sekolah sudah digunakan")
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Create school entity
	school := models.School{
		ID:         uuid.New().String(),
		Code:       req.Code,
		Name:       req.Name,
		Lokasi:     &req.Lokasi,
		Address:    req.Address,
		Phone:      req.Phone,
		Email:      req.Email,
		Principal:  req.Principal,
		IsActive:   true, // Default business rule
		CreatedBy:  &username,
		ModifiedBy: &username,
	}

	// Persist to database
	if err := s.db.Create(&school).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat sekolah: %w", err)
	}

	return &school, nil
}

// GetSchools retrieves list of schools with pagination and filters
func (s *SchoolService) GetSchools(params SchoolListParams) (*SchoolListResult, error) {
	query := s.db.Model(&models.School{})

	// Apply search filter
	if params.Search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply lokasi filter
	if params.Lokasi != "" {
		query = query.Where("lokasi = ?", params.Lokasi)
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total sekolah: %w", err)
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy + " " + params.SortOrder
		query = query.Order(order)
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch schools
	var schools []models.School
	if err := query.Find(&schools).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data sekolah: %w", err)
	}

	// Convert to list response
	schoolList := make([]*models.SchoolListResponse, len(schools))
	for i, school := range schools {
		schoolList[i] = school.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &SchoolListResult{
		Data:       schoolList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetSchoolByID retrieves a school by ID
func (s *SchoolService) GetSchoolByID(id string) (*models.School, error) {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("sekolah tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data sekolah: %w", err)
	}

	return &school, nil
}

// getUsername retrieves user's username for storing in created_by/modified_by
// Returns username if available, otherwise formats email (removes @domain, replaces _ with space)
func (s *SchoolService) getUsername(userID string) string {
	var user models.User
	if err := s.db.Select("username", "email").First(&user, "id = ?", userID).Error; err != nil {
		return ""
	}

	// Use username if available
	if user.Username != nil && *user.Username != "" {
		return *user.Username
	}

	// Fallback: format email (remove @domain, replace _ with space)
	email := user.Email
	if atIndex := strings.Index(email, "@"); atIndex > 0 {
		email = email[:atIndex]
	}
	return strings.ReplaceAll(email, "_", " ")
}

// UpdateSchool updates a school with validation
func (s *SchoolService) UpdateSchool(id string, req models.UpdateSchoolRequest, userID string) (*models.School, error) {
	// Find existing school
	school, err := s.GetSchoolByID(id)
	if err != nil {
		return nil, err
	}

	// Business rule: Check if code is being changed and already in use
	if req.Code != nil && *req.Code != school.Code {
		var existing models.School
		if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
			return nil, errors.New("kode sekolah sudah digunakan")
		}
	}

	// Update fields
	if req.Code != nil {
		school.Code = *req.Code
	}
	if req.Name != nil {
		school.Name = *req.Name
	}
	if req.Lokasi != nil {
		school.Lokasi = req.Lokasi
	}
	if req.Address != nil {
		school.Address = req.Address
	}
	if req.Phone != nil {
		school.Phone = req.Phone
	}
	if req.Email != nil {
		school.Email = req.Email
	}
	if req.Principal != nil {
		school.Principal = req.Principal
	}
	if req.IsActive != nil {
		school.IsActive = *req.IsActive
	}

	// Get username for audit trail
	username := s.getUsername(userID)
	school.ModifiedBy = &username

	// Persist changes
	if err := s.db.Save(&school).Error; err != nil {
		return nil, fmt.Errorf("gagal memperbarui sekolah: %w", err)
	}

	return school, nil
}

// DeleteSchool deletes a school with validation
func (s *SchoolService) DeleteSchool(id string) error {
	// Check if school exists
	school, err := s.GetSchoolByID(id)
	if err != nil {
		return err
	}

	// Business rule: Check if school has departments
	var departmentCount int64
	s.db.Model(&models.Department{}).Where("school_id = ?", id).Count(&departmentCount)
	if departmentCount > 0 {
		return errors.New("tidak dapat menghapus sekolah yang memiliki departemen")
	}

	// Business rule: Check if school has positions
	var positionCount int64
	s.db.Model(&models.Position{}).Where("school_id = ?", id).Count(&positionCount)
	if positionCount > 0 {
		return errors.New("tidak dapat menghapus sekolah yang memiliki posisi")
	}

	// Delete school
	if err := s.db.Delete(&school).Error; err != nil {
		return fmt.Errorf("gagal menghapus sekolah: %w", err)
	}

	return nil
}

// GetAvailableSchoolCodes retrieves distinct bagian_kerja from active teachers
func (s *SchoolService) GetAvailableSchoolCodes() ([]string, error) {
	var codes []string

	// Query: SELECT DISTINCT(bagian_kerja) FROM data_karyawan
	// WHERE status_aktif = 'Aktif' AND jenis_karyawan = 'GURU'
	// ORDER BY bagian_kerja ASC
	if err := s.db.Table("data_karyawan").
		Select("DISTINCT bagian_kerja").
		Where("status_aktif = ? AND jenis_karyawan = ?", "Aktif", "GURU").
		Where("bagian_kerja IS NOT NULL AND bagian_kerja != ''").
		Order("bagian_kerja ASC").
		Pluck("bagian_kerja", &codes).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil kode sekolah: %w", err)
	}

	return codes, nil
}
