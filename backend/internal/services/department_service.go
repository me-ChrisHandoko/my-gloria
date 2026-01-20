package services

import (
	"errors"
	"fmt"
	"strings"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DepartmentService handles business logic for departments
type DepartmentService struct {
	db *gorm.DB
}

// NewDepartmentService creates a new DepartmentService instance
func NewDepartmentService(db *gorm.DB) *DepartmentService {
	return &DepartmentService{db: db}
}

// DepartmentListParams represents parameters for listing departments
type DepartmentListParams struct {
	Page      int
	PageSize  int
	Search    string
	SchoolID  string
	ParentID  string // "null" for root departments, specific ID for children
	IsActive  *bool
	SortBy    string
	SortOrder string
}

// DepartmentListResult represents the result of listing departments
type DepartmentListResult struct {
	Data       []*models.DepartmentListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// getUsername retrieves user's username for storing in created_by/modified_by
// Returns username if available, otherwise formats email (removes @domain, replaces _ with space)
func (s *DepartmentService) getUsername(userID string) string {
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

// CreateDepartment creates a new department with validation
func (s *DepartmentService) CreateDepartment(req models.CreateDepartmentRequest, userID string) (*models.Department, error) {
	// Business rule: Check if code already exists
	var existing models.Department
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode departemen sudah digunakan")
	}

	// Validate school_id if provided
	if req.SchoolID != nil {
		if err := s.validateSchoolExists(*req.SchoolID); err != nil {
			return nil, err
		}
	}

	// Validate parent_id if provided
	if req.ParentID != nil {
		if err := s.validateDepartmentExists(*req.ParentID); err != nil {
			return nil, errors.New("parent departemen tidak ditemukan")
		}
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Create department entity
	department := models.Department{
		ID:          uuid.New().String(),
		Code:        req.Code,
		Name:        req.Name,
		SchoolID:    req.SchoolID,
		ParentID:    req.ParentID,
		Description: req.Description,
		IsActive:    true,
		CreatedBy:   &username,
		ModifiedBy:  &username,
	}

	// Persist to database
	if err := s.db.Create(&department).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat departemen: %w", err)
	}

	// Load relations for response
	s.db.Preload("School").Preload("Parent").First(&department, "id = ?", department.ID)

	return &department, nil
}

// GetDepartments retrieves list of departments with pagination and filters
func (s *DepartmentService) GetDepartments(params DepartmentListParams) (*DepartmentListResult, error) {
	query := s.db.Model(&models.Department{})

	// Apply search filter
	if params.Search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply school filter
	if params.SchoolID != "" {
		query = query.Where("school_id = ?", params.SchoolID)
	}

	// Apply parent filter (including null check)
	if params.ParentID != "" {
		if params.ParentID == "null" {
			query = query.Where("parent_id IS NULL")
		} else {
			query = query.Where("parent_id = ?", params.ParentID)
		}
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total departemen: %w", err)
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy + " " + params.SortOrder
		query = query.Order(order)
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch departments with Parent relation
	var departments []models.Department
	if err := query.Preload("Parent").Find(&departments).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data departemen: %w", err)
	}

	// Convert to list response
	departmentList := make([]*models.DepartmentListResponse, len(departments))
	for i, dept := range departments {
		departmentList[i] = dept.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &DepartmentListResult{
		Data:       departmentList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetDepartmentByID retrieves a department by ID with relations
func (s *DepartmentService) GetDepartmentByID(id string) (*models.Department, error) {
	var department models.Department
	if err := s.db.Preload("School").Preload("Parent").First(&department, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("departemen tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data departemen: %w", err)
	}

	return &department, nil
}

// GetDepartmentTree retrieves department tree structure
func (s *DepartmentService) GetDepartmentTree() ([]*models.DepartmentTreeResponse, error) {
	// Get all active departments
	var departments []models.Department
	if err := s.db.Where("is_active = ?", true).Order("name ASC").Find(&departments).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data departemen: %w", err)
	}

	// Build department map for quick lookup
	deptMap := make(map[string]*models.Department)
	for i := range departments {
		deptMap[departments[i].ID] = &departments[i]
	}

	// Build tree structure (parent-child relationships)
	var rootDepartments []*models.Department
	for i := range departments {
		dept := &departments[i]
		if dept.ParentID == nil {
			// This is a root department
			rootDepartments = append(rootDepartments, dept)
		} else {
			// Add as child to parent
			if parent, exists := deptMap[*dept.ParentID]; exists {
				parent.Children = append(parent.Children, *dept)
			}
		}
	}

	// Convert to tree response
	treeResponse := make([]*models.DepartmentTreeResponse, len(rootDepartments))
	for i, dept := range rootDepartments {
		treeResponse[i] = dept.ToTreeResponse()
	}

	return treeResponse, nil
}

// UpdateDepartment updates a department with validation
func (s *DepartmentService) UpdateDepartment(id string, req models.UpdateDepartmentRequest, userID string) (*models.Department, error) {
	// Find existing department
	department, err := s.GetDepartmentByID(id)
	if err != nil {
		return nil, err
	}

	// Business rule: Check if code is being changed and already in use
	if req.Code != nil && *req.Code != department.Code {
		var existing models.Department
		if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
			return nil, errors.New("kode departemen sudah digunakan")
		}
	}

	// Validate school_id if being changed (allow empty string to clear)
	if req.SchoolID != nil && *req.SchoolID != "" {
		if err := s.validateSchoolExists(*req.SchoolID); err != nil {
			return nil, err
		}
	}

	// Business rule: Validate parent_id and check for circular reference (allow empty string to clear)
	if req.ParentID != nil && *req.ParentID != "" {
		if err := s.validateDepartmentExists(*req.ParentID); err != nil {
			return nil, errors.New("parent departemen tidak ditemukan")
		}

		// Check for circular reference
		if err := s.checkCircularReference(id, *req.ParentID); err != nil {
			return nil, err
		}
	}

	// Update fields
	if req.Code != nil {
		department.Code = *req.Code
	}
	if req.Name != nil {
		department.Name = *req.Name
	}
	// Handle school_id - empty string means clear the field (set to null)
	if req.SchoolID != nil {
		if *req.SchoolID == "" {
			department.SchoolID = nil
		} else {
			department.SchoolID = req.SchoolID
		}
	}
	// Handle parent_id - empty string means clear the field (set to null)
	if req.ParentID != nil {
		if *req.ParentID == "" {
			department.ParentID = nil
		} else {
			department.ParentID = req.ParentID
		}
	}
	if req.Description != nil {
		department.Description = req.Description
	}
	if req.IsActive != nil {
		department.IsActive = *req.IsActive
	}

	// Get username for audit trail
	username := s.getUsername(userID)
	department.ModifiedBy = &username

	// Build update map with explicit field values
	// Using map allows us to explicitly set NULL for pointer fields
	updateMap := map[string]interface{}{
		"code":        department.Code,
		"name":        department.Name,
		"description": department.Description,
		"is_active":   department.IsActive,
		"modified_by": department.ModifiedBy,
	}

	// Handle nullable fields explicitly
	if req.SchoolID != nil {
		if *req.SchoolID == "" {
			updateMap["school_id"] = nil
		} else {
			updateMap["school_id"] = *req.SchoolID
		}
	}

	if req.ParentID != nil {
		if *req.ParentID == "" {
			updateMap["parent_id"] = nil
		} else {
			updateMap["parent_id"] = *req.ParentID
		}
	}

	// Use Select to explicitly specify which fields to update (including NULL values)
	// This is more reliable than Updates with map for nullable fields
	selectFields := []string{"code", "name", "description", "is_active", "modified_by"}

	if req.SchoolID != nil {
		selectFields = append(selectFields, "school_id")
	}
	if req.ParentID != nil {
		selectFields = append(selectFields, "parent_id")
	}

	// Use Select + Updates to force update of specified fields
	if err := s.db.Model(&department).Select(selectFields).Updates(updateMap).Error; err != nil {
		return nil, fmt.Errorf("gagal memperbarui departemen: %w", err)
	}

	// Load relations for response
	s.db.Preload("School").Preload("Parent").First(&department, "id = ?", department.ID)

	return department, nil
}

// DeleteDepartment deletes a department with validation
func (s *DepartmentService) DeleteDepartment(id string) error {
	// Check if department exists
	department, err := s.GetDepartmentByID(id)
	if err != nil {
		return err
	}

	// Business rule: Check if department has children
	var childCount int64
	s.db.Model(&models.Department{}).Where("parent_id = ?", id).Count(&childCount)
	if childCount > 0 {
		return errors.New("tidak dapat menghapus departemen yang memiliki sub-departemen")
	}

	// Business rule: Check if department has positions
	var positionCount int64
	s.db.Model(&models.Position{}).Where("department_id = ?", id).Count(&positionCount)
	if positionCount > 0 {
		return errors.New("tidak dapat menghapus departemen yang memiliki posisi")
	}

	// Delete department
	if err := s.db.Delete(&department).Error; err != nil {
		return fmt.Errorf("gagal menghapus departemen: %w", err)
	}

	return nil
}

// Helper methods for validation

func (s *DepartmentService) validateSchoolExists(id string) error {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		return errors.New("sekolah tidak ditemukan")
	}
	return nil
}

func (s *DepartmentService) validateDepartmentExists(id string) error {
	var department models.Department
	if err := s.db.First(&department, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

// GetAvailableDepartmentCodes returns distinct bidang_kerja from data_karyawan
// Query: SELECT DISTINCT(bidang_kerja) FROM public.data_karyawan
// WHERE status_aktif = 'Aktif' AND bagian_kerja = 'YAYASAN' ORDER BY bidang_kerja ASC
func (s *DepartmentService) GetAvailableDepartmentCodes() ([]string, error) {
	var codes []string

	err := s.db.Model(&models.DataKaryawan{}).
		Select("DISTINCT(bidang_kerja)").
		Where("status_aktif = ? AND bagian_kerja = ?", "Aktif", "YAYASAN").
		Where("bidang_kerja IS NOT NULL AND bidang_kerja != ''").
		Order("bidang_kerja ASC").
		Pluck("bidang_kerja", &codes).Error

	if err != nil {
		return nil, fmt.Errorf("gagal mengambil kode departemen: %w", err)
	}

	return codes, nil
}

// checkCircularReference checks if setting parentID would create a circular reference
func (s *DepartmentService) checkCircularReference(departmentID, parentID string) error {
	// Business rule: Cannot set department as its own parent
	if departmentID == parentID {
		return errors.New("tidak dapat membuat referensi circular dalam hierarki departemen")
	}

	// Load all departments for circular reference check
	var allDepartments []models.Department
	if err := s.db.Find(&allDepartments).Error; err != nil {
		return fmt.Errorf("gagal memeriksa referensi circular: %w", err)
	}

	// Build department map
	deptMap := make(map[string]*models.Department)
	for i := range allDepartments {
		deptMap[allDepartments[i].ID] = &allDepartments[i]
	}

	// Get the department being updated
	dept, exists := deptMap[departmentID]
	if !exists {
		return errors.New("departemen tidak ditemukan")
	}

	// Check using the model's circular reference method
	if dept.HasCircularReference(parentID, deptMap) {
		return errors.New("tidak dapat membuat referensi circular dalam hierarki departemen")
	}

	return nil
}
