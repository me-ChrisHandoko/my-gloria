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
	db                   *gorm.DB
	permissionCache      *PermissionCacheService
	escalationPrevention *EscalationPreventionService
}

// NewModuleService creates a new ModuleService instance
func NewModuleService(db *gorm.DB) *ModuleService {
	return &ModuleService{db: db}
}

// NewModuleServiceWithRBAC creates a new ModuleService with RBAC services
func NewModuleServiceWithRBAC(db *gorm.DB, cache *PermissionCacheService, escalation *EscalationPreventionService) *ModuleService {
	return &ModuleService{
		db:                   db,
		permissionCache:      cache,
		escalationPrevention: escalation,
	}
}

// SetRBACServices sets the RBAC services (for dependency injection after creation)
func (s *ModuleService) SetRBACServices(cache *PermissionCacheService, escalation *EscalationPreventionService) {
	s.permissionCache = cache
	s.escalationPrevention = escalation
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

// normalizePath ensures path starts with / to prevent relative URL issues
func normalizePath(path *string) *string {
	if path == nil || *path == "" {
		return path
	}
	normalized := *path
	if !strings.HasPrefix(normalized, "/") {
		normalized = "/" + normalized
	}
	return &normalized
}

// CreateModule creates a new module with validation
func (s *ModuleService) CreateModule(req models.CreateModuleRequest, userID string) (*models.Module, error) {
	// Business rule: Check if code already exists
	var existing models.Module
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode module sudah digunakan")
	}

	// Validate parent_id if provided and not empty
	// Empty string means "no parent" (set to null)
	var parentID *string
	if req.ParentID != nil && *req.ParentID != "" {
		if err := s.validateModuleExists(*req.ParentID); err != nil {
			return nil, errors.New("parent module tidak ditemukan")
		}
		parentID = req.ParentID
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
		Path:        normalizePath(req.Path),
		ParentID:    parentID,
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
	if err := s.db.Preload("Parent").First(&module, "id = ?", module.ID).Error; err != nil {
		// Module was created successfully, but failed to reload with relations
		// Return the module as-is without parent relation
		return &module, nil
	}

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

	// Apply sorting with validation to prevent SQL injection
	if params.SortBy != "" {
		validSortColumns := map[string]bool{
			"code":       true,
			"name":       true,
			"category":   true,
			"sort_order": true,
			"created_at": true,
			"is_active":  true,
			"is_visible": true,
		}
		if validSortColumns[params.SortBy] {
			direction := "ASC"
			if strings.ToUpper(params.SortOrder) == "DESC" {
				direction = "DESC"
			}
			query = query.Order(fmt.Sprintf("%s %s", params.SortBy, direction))
		}
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

	// Validate parent_id if provided and not empty
	// Empty string means "remove parent" (set to null)
	if req.ParentID != nil && *req.ParentID != "" {
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
		module.Path = normalizePath(req.Path)
	}
	if req.ParentID != nil {
		// Empty string means "remove parent" (set to null)
		if *req.ParentID == "" {
			module.ParentID = nil
		} else {
			module.ParentID = req.ParentID
		}
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

	// Invalidate cache for all users who have access to this module
	if s.permissionCache != nil {
		s.invalidateCacheForModuleUsers(id)
	}

	// Load relations for response
	if err := s.db.Preload("Parent").First(&module, "id = ?", module.ID).Error; err != nil {
		// Module was updated successfully, but failed to reload with relations
		// Return the module as-is without parent relation
		return &module, nil
	}

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

	// Invalidate cache for all users who have access to this module before deletion
	if s.permissionCache != nil {
		s.invalidateCacheForModuleUsers(id)
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
	// Filter out modules where is_active = false
	var accesses []models.RoleModuleAccess
	if err := s.db.Preload("Module").
		Joins("JOIN modules ON modules.id = role_module_access.module_id").
		Where("role_module_access.role_id = ?", roleID).
		Where("modules.is_active = ?", true).
		Order("role_module_access.created_at DESC").
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

	// Validate module exists and is active
	var module models.Module
	if err := s.db.First(&module, "id = ?", req.ModuleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("module tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data module: %w", err)
	}
	if !module.IsActive {
		return nil, errors.New("module tidak aktif, tidak dapat di-assign")
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

	// Escalation Prevention: Validate that userID can modify this role's module access
	// User must have at least the same hierarchy level or higher to assign modules to a role
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidateRoleModification(userID, roleID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
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

	// Invalidate cache for all users with this role
	if s.permissionCache != nil {
		s.invalidateCacheForRoleUsers(roleID)
	}

	// Load module relation for response
	s.db.Preload("Module").First(&access, "id = ?", access.ID)

	return &access, nil
}

// RevokeModuleFromRole revokes a module access from a role
func (s *ModuleService) RevokeModuleFromRole(roleID string, accessID string, userID string) error {
	// Find the access
	var access models.RoleModuleAccess
	if err := s.db.Where("id = ? AND role_id = ?", accessID, roleID).First(&access).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("module access tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data module access: %w", err)
	}

	// Escalation Prevention: Validate that userID can modify this role's module access
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidateRoleModification(userID, roleID); err != nil {
			return fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Delete the access
	if err := s.db.Delete(&access).Error; err != nil {
		return fmt.Errorf("gagal mencabut module dari role: %w", err)
	}

	// Invalidate cache for all users with this role
	if s.permissionCache != nil {
		s.invalidateCacheForRoleUsers(roleID)
	}

	return nil
}

// invalidateCacheForRoleUsers invalidates permission cache for all users who have a specific role
func (s *ModuleService) invalidateCacheForRoleUsers(roleID string) {
	// Find all users with this role
	var userRoles []models.UserRole
	if err := s.db.Where("role_id = ? AND is_active = true", roleID).Find(&userRoles).Error; err != nil {
		return // Silently fail - cache will eventually expire
	}

	// Invalidate cache for each user
	for _, ur := range userRoles {
		s.permissionCache.InvalidateUser(ur.UserID)
	}
}

// invalidateCacheForModuleUsers invalidates permission cache for all users who have access to a specific module
func (s *ModuleService) invalidateCacheForModuleUsers(moduleID string) {
	// Find all roles that have access to this module
	var moduleAccesses []models.RoleModuleAccess
	if err := s.db.Where("module_id = ? AND is_active = true", moduleID).Find(&moduleAccesses).Error; err != nil {
		return // Silently fail - cache will eventually expire
	}

	// For each role, invalidate cache for all users with that role
	for _, ma := range moduleAccesses {
		s.invalidateCacheForRoleUsers(ma.RoleID)
	}
}
