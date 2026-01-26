package services

import (
	"errors"
	"fmt"
	"strings"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ModuleService handles business logic for modules
type ModuleService struct {
	db *gorm.DB
}

// NewModuleService creates a new ModuleService instance
func NewModuleService(db *gorm.DB) *ModuleService {
	return &ModuleService{db: db}
}

// ModuleListParams represents parameters for listing modules
type ModuleListParams struct {
	Page       int
	PageSize   int
	Search     string
	Category   string
	ParentID   string // "null" for root modules, specific ID for children
	IsActive   *bool
	IsVisible  *bool
	SortBy     string
	SortOrder  string
}

// ModuleListResult represents the result of listing modules
type ModuleListResult struct {
	Data       []*models.ModuleListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// getUsername retrieves user's username for storing in created_by/updated_by
// Returns username if available, otherwise formats email (removes @domain, replaces _ with space)
func (s *ModuleService) getUsername(userID string) string {
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

// validateModuleExists checks if a module exists
func (s *ModuleService) validateModuleExists(moduleID string) error {
	var module models.Module
	if err := s.db.First(&module, "id = ?", moduleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("module tidak ditemukan")
		}
		return err
	}
	return nil
}

// CreateModule creates a new module with validation
func (s *ModuleService) CreateModule(req models.CreateModuleRequest, userID string) (*models.Module, error) {
	// Business rule: Check if code already exists
	var existing models.Module
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode module sudah digunakan")
	}

	// Validate parent_id if provided
	if req.ParentID != nil {
		if err := s.validateModuleExists(*req.ParentID); err != nil {
			return nil, errors.New("parent module tidak ditemukan")
		}
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Set default values
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	isVisible := true
	if req.IsVisible != nil {
		isVisible = *req.IsVisible
	}

	// Create module entity
	module := models.Module{
		ID:          uuid.New().String(),
		Code:        req.Code,
		Name:        req.Name,
		Category:    req.Category,
		Description: req.Description,
		Icon:        req.Icon,
		Path:        req.Path,
		ParentID:    req.ParentID,
		SortOrder:   sortOrder,
		IsActive:    true,
		IsVisible:   isVisible,
		Version:     0,
		CreatedBy:   &username,
		UpdatedBy:   &username,
	}

	// Persist to database
	if err := s.db.Create(&module).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat module: %w", err)
	}

	// Load relations for response
	s.db.Preload("Parent").First(&module, "id = ?", module.ID)

	return &module, nil
}

// GetModules retrieves list of modules with pagination and filters
func (s *ModuleService) GetModules(params ModuleListParams) (*ModuleListResult, error) {
	query := s.db.Model(&models.Module{})

	// Apply search filter
	if params.Search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply category filter
	if params.Category != "" {
		query = query.Where("category = ?", params.Category)
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

	// Apply visible filter
	if params.IsVisible != nil {
		query = query.Where("is_visible = ?", *params.IsVisible)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total module: %w", err)
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy + " " + params.SortOrder
		query = query.Order(order)
	} else {
		// Default sort by sort_order and name
		query = query.Order("sort_order ASC, name ASC")
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch modules
	var modules []models.Module
	if err := query.Find(&modules).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data module: %w", err)
	}

	// Convert to list response
	moduleList := make([]*models.ModuleListResponse, len(modules))
	for i, mod := range modules {
		moduleList[i] = mod.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &ModuleListResult{
		Data:       moduleList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetModuleByID retrieves a module by ID with relations
func (s *ModuleService) GetModuleByID(id string) (*models.Module, error) {
	var module models.Module
	if err := s.db.Preload("Parent").First(&module, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("module tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data module: %w", err)
	}

	return &module, nil
}

// GetModuleTree retrieves module tree structure
func (s *ModuleService) GetModuleTree() ([]*models.ModuleTreeResponse, error) {
	// Fetch all active modules
	var modules []models.Module
	if err := s.db.Where("is_active = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&modules).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data module: %w", err)
	}

	// Build tree structure (only root modules)
	var rootModules []models.Module
	moduleMap := make(map[string]*models.Module)

	// First pass: create map and identify root modules
	for i := range modules {
		moduleMap[modules[i].ID] = &modules[i]
		if modules[i].ParentID == nil {
			rootModules = append(rootModules, modules[i])
		}
	}

	// Second pass: build parent-child relationships
	for i := range modules {
		if modules[i].ParentID != nil {
			if parent, ok := moduleMap[*modules[i].ParentID]; ok {
				parent.Children = append(parent.Children, modules[i])
			}
		}
	}

	// Convert to tree response
	tree := make([]*models.ModuleTreeResponse, len(rootModules))
	for i, root := range rootModules {
		tree[i] = root.ToTreeResponse()
	}

	return tree, nil
}

// UpdateModule updates a module with validation
func (s *ModuleService) UpdateModule(id string, req models.UpdateModuleRequest, userID string) (*models.Module, error) {
	// Find existing module
	var module models.Module
	if err := s.db.First(&module, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("module tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data module: %w", err)
	}

	// Business rule: Check if code already exists (if code is being changed)
	if req.Code != nil && *req.Code != module.Code {
		var existing models.Module
		if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
			return nil, errors.New("kode module sudah digunakan")
		}
	}

	// Validate parent_id if provided
	if req.ParentID != nil {
		// Prevent circular reference
		if *req.ParentID == id {
			return nil, errors.New("module tidak boleh menjadi parent dari dirinya sendiri")
		}
		if err := s.validateModuleExists(*req.ParentID); err != nil {
			return nil, errors.New("parent module tidak ditemukan")
		}
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Update fields
	if req.Code != nil {
		module.Code = *req.Code
	}
	if req.Name != nil {
		module.Name = *req.Name
	}
	if req.Category != nil {
		module.Category = *req.Category
	}
	if req.Description != nil {
		module.Description = req.Description
	}
	if req.Icon != nil {
		module.Icon = req.Icon
	}
	if req.Path != nil {
		module.Path = req.Path
	}
	if req.ParentID != nil {
		module.ParentID = req.ParentID
	}
	if req.SortOrder != nil {
		module.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		module.IsActive = *req.IsActive
	}
	if req.IsVisible != nil {
		module.IsVisible = *req.IsVisible
	}

	module.UpdatedBy = &username

	// Save to database
	if err := s.db.Save(&module).Error; err != nil {
		return nil, fmt.Errorf("gagal memperbarui module: %w", err)
	}

	// Load relations for response
	s.db.Preload("Parent").First(&module, "id = ?", module.ID)

	return &module, nil
}

// DeleteModule soft deletes a module
func (s *ModuleService) DeleteModule(id string) error {
	// Find module
	var module models.Module
	if err := s.db.First(&module, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("module tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data module: %w", err)
	}

	// Business rule: Check if module has children
	var childCount int64
	if err := s.db.Model(&models.Module{}).Where("parent_id = ?", id).Count(&childCount).Error; err != nil {
		return fmt.Errorf("gagal memeriksa child module: %w", err)
	}

	if childCount > 0 {
		return errors.New("tidak dapat menghapus module yang memiliki sub-module")
	}

	// Soft delete
	if err := s.db.Delete(&module).Error; err != nil {
		return fmt.Errorf("gagal menghapus module: %w", err)
	}

	return nil
}

// ==================== Role Module Access Methods ====================

// GetRoleModuleAccesses retrieves all module accesses for a role
func (s *ModuleService) GetRoleModuleAccesses(roleID string) ([]*models.RoleModuleAccessResponse, error) {
	// Validate role exists
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Fetch role module accesses with module relation
	var accesses []models.RoleModuleAccess
	if err := s.db.Preload("Module").
		Where("role_id = ?", roleID).
		Order("created_at DESC").
		Find(&accesses).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data module access: %w", err)
	}

	// Convert to response
	result := make([]*models.RoleModuleAccessResponse, len(accesses))
	for i, access := range accesses {
		result[i] = access.ToResponse()
	}

	return result, nil
}

// AssignModuleToRole assigns a module to a role
func (s *ModuleService) AssignModuleToRole(roleID string, req models.AssignModuleAccessToRoleRequest, userID string) (*models.RoleModuleAccess, error) {
	// Validate role exists
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Validate module exists
	if err := s.validateModuleExists(req.ModuleID); err != nil {
		return nil, err
	}

	// Validate position if provided
	if req.PositionID != nil {
		var position models.Position
		if err := s.db.First(&position, "id = ?", *req.PositionID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("position tidak ditemukan")
			}
			return nil, fmt.Errorf("gagal mengambil data position: %w", err)
		}
	}

	// Check if access already exists
	var existing models.RoleModuleAccess
	query := s.db.Where("role_id = ? AND module_id = ?", roleID, req.ModuleID)
	if req.PositionID != nil {
		query = query.Where("position_id = ?", *req.PositionID)
	} else {
		query = query.Where("position_id IS NULL")
	}
	if err := query.First(&existing).Error; err == nil {
		return nil, errors.New("module sudah di-assign ke role ini")
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Set default is_active to true if not provided
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	// Create access
	access := models.RoleModuleAccess{
		ID:          uuid.New().String(),
		RoleID:      roleID,
		ModuleID:    req.ModuleID,
		PositionID:  req.PositionID,
		Permissions: req.Permissions,
		IsActive:    isActive,
		CreatedBy:   &username,
	}

	if err := s.db.Create(&access).Error; err != nil {
		return nil, fmt.Errorf("gagal assign module ke role: %w", err)
	}

	// Load module relation for response
	s.db.Preload("Module").First(&access, "id = ?", access.ID)

	return &access, nil
}

// RevokeModuleFromRole revokes a module access from a role
func (s *ModuleService) RevokeModuleFromRole(roleID string, accessID string) error {
	// Find the access
	var access models.RoleModuleAccess
	if err := s.db.Where("id = ? AND role_id = ?", accessID, roleID).First(&access).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("module access tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data module access: %w", err)
	}

	// Delete the access
	if err := s.db.Delete(&access).Error; err != nil {
		return fmt.Errorf("gagal mencabut module dari role: %w", err)
	}

	return nil
}
