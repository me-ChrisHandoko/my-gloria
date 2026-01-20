package services

import (
	"errors"
	"fmt"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PositionService handles business logic for positions
type PositionService struct {
	db *gorm.DB
}

// NewPositionService creates a new PositionService instance
func NewPositionService(db *gorm.DB) *PositionService {
	return &PositionService{db: db}
}

// PositionListParams represents parameters for listing positions
type PositionListParams struct {
	Page           int
	PageSize       int
	Search         string
	DepartmentID   string
	SchoolID       string
	HierarchyLevel *int
	IsActive       *bool
	SortBy         string
	SortOrder      string
}

// PositionListResult represents the result of listing positions
type PositionListResult struct {
	Data       []*models.PositionListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// CreatePosition creates a new position with validation
func (s *PositionService) CreatePosition(req models.CreatePositionRequest, userID string) (*models.Position, error) {
	// Business rule: Check if code already exists
	var existing models.Position
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode posisi sudah digunakan")
	}

	// Validate department_id if provided (skip validation if empty)
	if req.DepartmentID != nil && *req.DepartmentID != "" {
		if err := s.validateDepartmentExists(*req.DepartmentID); err != nil {
			return nil, err
		}
	}

	// Validate school_id if provided (skip validation if empty)
	if req.SchoolID != nil && *req.SchoolID != "" {
		if err := s.validateSchoolExists(*req.SchoolID); err != nil {
			return nil, err
		}
	}

	// Set defaults
	maxHolders := 1
	if req.MaxHolders != nil {
		maxHolders = *req.MaxHolders
	}

	isUnique := true
	if req.IsUnique != nil {
		isUnique = *req.IsUnique
	}

	// Create position entity
	position := models.Position{
		ID:             uuid.New().String(),
		Code:           req.Code,
		Name:           req.Name,
		DepartmentID:   req.DepartmentID,
		SchoolID:       req.SchoolID,
		HierarchyLevel: req.HierarchyLevel,
		MaxHolders:     maxHolders,
		IsUnique:       isUnique,
		IsActive:       true,
		CreatedBy:      &userID,
		ModifiedBy:     &userID,
	}

	if err := s.db.Create(&position).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat posisi: %w", err)
	}

	// Load relations for response
	s.db.Preload("Department").Preload("School").
		First(&position, "id = ?", position.ID)

	return &position, nil
}

// GetPositions retrieves list of positions with pagination and filters
func (s *PositionService) GetPositions(params PositionListParams) (*PositionListResult, error) {
	query := s.db.Model(&models.Position{})

	// Apply search filter
	if params.Search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply department filter
	if params.DepartmentID != "" {
		query = query.Where("department_id = ?", params.DepartmentID)
	}

	// Apply school filter
	if params.SchoolID != "" {
		query = query.Where("school_id = ?", params.SchoolID)
	}

	// Apply hierarchy level filter
	if params.HierarchyLevel != nil {
		query = query.Where("hierarchy_level = ?", *params.HierarchyLevel)
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total posisi: %w", err)
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy + " " + params.SortOrder
		query = query.Order(order)
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch positions
	var positions []models.Position
	if err := query.Find(&positions).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data posisi: %w", err)
	}

	// Convert to list response
	positionList := make([]*models.PositionListResponse, len(positions))
	for i, pos := range positions {
		positionList[i] = pos.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &PositionListResult{
		Data:       positionList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetPositionByID retrieves a position by ID with relations
func (s *PositionService) GetPositionByID(id string) (*models.Position, error) {
	var position models.Position
	if err := s.db.Preload("Department").Preload("School").
		First(&position, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("posisi tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data posisi: %w", err)
	}

	return &position, nil
}

// UpdatePosition updates a position with validation
func (s *PositionService) UpdatePosition(id string, req models.UpdatePositionRequest, userID string) (*models.Position, error) {
	// Find existing position
	var position models.Position
	if err := s.db.First(&position, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("posisi tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data posisi: %w", err)
	}

	// Business rule: Check if code is being changed and already in use
	if req.Code != nil && *req.Code != position.Code {
		var existing models.Position
		if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
			return nil, errors.New("kode posisi sudah digunakan")
		}
	}

	// Validate department_id if being changed (skip validation if empty - means removing association)
	if req.DepartmentID != nil && *req.DepartmentID != "" {
		if err := s.validateDepartmentExists(*req.DepartmentID); err != nil {
			return nil, err
		}
	}

	// Validate school_id if being changed (skip validation if empty - means removing association)
	if req.SchoolID != nil && *req.SchoolID != "" {
		if err := s.validateSchoolExists(*req.SchoolID); err != nil {
			return nil, err
		}
	}

	// Update position fields
	if req.Code != nil {
		position.Code = *req.Code
	}
	if req.Name != nil {
		position.Name = *req.Name
	}
	// Handle department_id - empty string means clear the field (set to null)
	if req.DepartmentID != nil {
		if *req.DepartmentID == "" {
			position.DepartmentID = nil
		} else {
			position.DepartmentID = req.DepartmentID
		}
	}
	// Handle school_id - empty string means clear the field (set to null)
	if req.SchoolID != nil {
		if *req.SchoolID == "" {
			position.SchoolID = nil
		} else {
			position.SchoolID = req.SchoolID
		}
	}
	if req.HierarchyLevel != nil {
		position.HierarchyLevel = *req.HierarchyLevel
	}
	if req.MaxHolders != nil {
		position.MaxHolders = *req.MaxHolders
	}
	if req.IsUnique != nil {
		position.IsUnique = *req.IsUnique
	}
	if req.IsActive != nil {
		position.IsActive = *req.IsActive
	}
	position.ModifiedBy = &userID

	// Build update map with explicit field values
	// Using map allows us to explicitly set NULL for pointer fields
	updateMap := map[string]interface{}{
		"code":            position.Code,
		"name":            position.Name,
		"hierarchy_level": position.HierarchyLevel,
		"max_holders":     position.MaxHolders,
		"is_unique":       position.IsUnique,
		"is_active":       position.IsActive,
		"modified_by":     position.ModifiedBy,
	}

	// Handle nullable fields explicitly
	if req.DepartmentID != nil {
		if *req.DepartmentID == "" {
			updateMap["department_id"] = nil
		} else {
			updateMap["department_id"] = *req.DepartmentID
		}
	}

	if req.SchoolID != nil {
		if *req.SchoolID == "" {
			updateMap["school_id"] = nil
		} else {
			updateMap["school_id"] = *req.SchoolID
		}
	}

	// Use Select to explicitly specify which fields to update (including NULL values)
	selectFields := []string{"code", "name", "hierarchy_level", "max_holders", "is_unique", "is_active", "modified_by"}

	if req.DepartmentID != nil {
		selectFields = append(selectFields, "department_id")
	}
	if req.SchoolID != nil {
		selectFields = append(selectFields, "school_id")
	}

	// Use Select + Updates to force update of specified fields
	if err := s.db.Model(&position).Select(selectFields).Updates(updateMap).Error; err != nil {
		return nil, fmt.Errorf("gagal memperbarui posisi: %w", err)
	}

	// Load relations for response
	s.db.Preload("Department").Preload("School").
		First(&position, "id = ?", position.ID)

	return &position, nil
}

// DeletePosition deletes a position with validation
func (s *PositionService) DeletePosition(id string) error {
	// Check if position exists
	var position models.Position
	if err := s.db.First(&position, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("posisi tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data posisi: %w", err)
	}

	// Business rule: Check if position has user assignments
	var userPositionCount int64
	s.db.Model(&models.UserPosition{}).Where("position_id = ?", id).Count(&userPositionCount)
	if userPositionCount > 0 {
		return errors.New("tidak dapat menghapus posisi yang masih memiliki pemegang jabatan")
	}

	// Business rule: Check if position is used in workflow rules
	var workflowRuleCount int64
	s.db.Model(&models.WorkflowRule{}).Where("position_id = ? OR creator_position_id = ? OR approver_position_id = ?", id, id, id).Count(&workflowRuleCount)
	if workflowRuleCount > 0 {
		return errors.New("tidak dapat menghapus posisi yang digunakan dalam aturan workflow")
	}

	if err := s.db.Delete(&position).Error; err != nil {
		return fmt.Errorf("gagal menghapus posisi: %w", err)
	}

	return nil
}

// Helper methods for validation

func (s *PositionService) validateDepartmentExists(id string) error {
	var department models.Department
	if err := s.db.First(&department, "id = ?", id).Error; err != nil {
		return errors.New("departemen tidak ditemukan")
	}
	return nil
}

func (s *PositionService) validateSchoolExists(id string) error {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		return errors.New("sekolah tidak ditemukan")
	}
	return nil
}
