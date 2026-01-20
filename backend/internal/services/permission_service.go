package services

import (
	"errors"
	"fmt"
	"strings"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PermissionService handles business logic for permissions
type PermissionService struct {
	db *gorm.DB
}

// NewPermissionService creates a new PermissionService instance
func NewPermissionService(db *gorm.DB) *PermissionService {
	return &PermissionService{db: db}
}

// PermissionListParams represents parameters for listing permissions
type PermissionListParams struct {
	Page               int
	PageSize           int
	Search             string
	Resource           string
	Action             string
	Scope              string
	Category           string
	IsActive           *bool
	IsSystemPermission *bool
	SortBy             string
	SortOrder          string
}

// PermissionListResult represents the result of listing permissions
type PermissionListResult struct {
	Data       []*models.PermissionListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// getUsername retrieves user's username for storing in created_by
func (s *PermissionService) getUsername(userID string) string {
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

// GetPermissions retrieves permissions with pagination, filtering, and sorting
func (s *PermissionService) GetPermissions(params PermissionListParams) (*PermissionListResult, error) {
	var permissions []models.Permission
	var total int64

	// Build query
	query := s.db.Model(&models.Permission{})

	// Apply filters
	if params.Search != "" {
		searchPattern := "%" + strings.ToLower(params.Search) + "%"
		query = query.Where(
			"LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(resource) LIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	if params.Resource != "" {
		query = query.Where("resource = ?", params.Resource)
	}

	if params.Action != "" {
		query = query.Where("action = ?", params.Action)
	}

	if params.Scope != "" {
		query = query.Where("scope = ?", params.Scope)
	}

	if params.Category != "" {
		query = query.Where("category = ?", params.Category)
	}

	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	if params.IsSystemPermission != nil {
		query = query.Where("is_system_permission = ?", *params.IsSystemPermission)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total permissions: %w", err)
	}

	// Apply sorting
	orderClause := "code ASC" // default
	if params.SortBy != "" {
		allowedSorts := map[string]bool{
			"code": true, "name": true, "resource": true,
			"created_at": true, "is_active": true,
		}
		if allowedSorts[params.SortBy] {
			direction := "ASC"
			if strings.ToUpper(params.SortOrder) == "DESC" {
				direction = "DESC"
			}
			orderClause = fmt.Sprintf("%s %s", params.SortBy, direction)
		}
	}
	query = query.Order(orderClause)

	// Apply pagination
	if params.Page > 0 && params.PageSize > 0 {
		offset := (params.Page - 1) * params.PageSize
		query = query.Offset(offset).Limit(params.PageSize)
	}

	// Execute query
	if err := query.Find(&permissions).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data permissions: %w", err)
	}

	// Convert to list response
	permissionList := make([]*models.PermissionListResponse, len(permissions))
	for i, p := range permissions {
		permissionList[i] = p.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &PermissionListResult{
		Data:       permissionList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetPermissionByID retrieves a permission by ID
func (s *PermissionService) GetPermissionByID(id string) (*models.Permission, error) {
	var permission models.Permission
	if err := s.db.Where("id = ?", id).First(&permission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("permission tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil permission: %w", err)
	}
	return &permission, nil
}

// GetPermissionByCode retrieves a permission by code
func (s *PermissionService) GetPermissionByCode(code string) (*models.Permission, error) {
	var permission models.Permission
	if err := s.db.Where("code = ?", code).First(&permission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("permission tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil permission: %w", err)
	}
	return &permission, nil
}

// CreatePermission creates a new permission with validation
func (s *PermissionService) CreatePermission(req models.CreatePermissionRequest, userID string) (*models.Permission, error) {
	// Business rule: Check if code already exists
	var existing models.Permission
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode permission sudah digunakan")
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Determine if system permission (default to false if not provided)
	isSystemPermission := false
	if req.IsSystemPermission != nil {
		isSystemPermission = *req.IsSystemPermission
	}

	// Create permission entity
	permission := models.Permission{
		ID:                 uuid.New().String(),
		Code:               req.Code,
		Name:               req.Name,
		Description:        req.Description,
		Resource:           req.Resource,
		Action:             req.Action,
		Scope:              req.Scope,
		Conditions:         req.Conditions,
		Metadata:           req.Metadata,
		IsSystemPermission: isSystemPermission,
		IsActive:           true,
		CreatedBy:          &username,
		Category:           req.Category,
		GroupIcon:          req.GroupIcon,
		GroupName:          req.GroupName,
		GroupSortOrder:     req.GroupSortOrder,
	}

	// Persist to database
	if err := s.db.Create(&permission).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat permission: %w", err)
	}

	return &permission, nil
}

// UpdatePermission updates an existing permission with validation
func (s *PermissionService) UpdatePermission(id string, req models.UpdatePermissionRequest) (*models.Permission, error) {
	// Get existing permission
	permission, err := s.GetPermissionByID(id)
	if err != nil {
		return nil, err
	}

	// Business rule: Cannot update system permission
	if permission.IsSystemPermission {
		return nil, errors.New("tidak dapat mengubah system permission")
	}

	// Check if code already exists (if being updated)
	if req.Code != nil && *req.Code != permission.Code {
		var existing models.Permission
		if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
			return nil, errors.New("kode permission sudah digunakan")
		}
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.Code != nil {
		updates["code"] = *req.Code
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = req.Description
	}
	if req.Resource != nil {
		updates["resource"] = *req.Resource
	}
	if req.Action != nil {
		updates["action"] = *req.Action
	}
	if req.Scope != nil {
		updates["scope"] = req.Scope
	}
	if req.Conditions != nil {
		updates["conditions"] = req.Conditions
	}
	if req.Metadata != nil {
		updates["metadata"] = req.Metadata
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Category != nil {
		updates["category"] = req.Category
	}
	if req.GroupIcon != nil {
		updates["group_icon"] = req.GroupIcon
	}
	if req.GroupName != nil {
		updates["group_name"] = req.GroupName
	}
	if req.GroupSortOrder != nil {
		updates["group_sort_order"] = req.GroupSortOrder
	}

	// Execute update
	if err := s.db.Model(&permission).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("gagal mengupdate permission: %w", err)
	}

	// Reload permission to get updated data
	if err := s.db.First(&permission, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil permission yang diupdate: %w", err)
	}

	return permission, nil
}

// DeletePermission deletes a permission with validation
func (s *PermissionService) DeletePermission(id string) error {
	// Get existing permission
	permission, err := s.GetPermissionByID(id)
	if err != nil {
		return err
	}

	// Business rule: Cannot delete system permission
	if permission.IsSystemPermission {
		return errors.New("tidak dapat menghapus system permission")
	}

	// Business rule: Check if permission is used by roles or users
	var roleCount, userCount int64
	s.db.Model(&models.RolePermission{}).Where("permission_id = ?", id).Count(&roleCount)
	s.db.Model(&models.UserPermission{}).Where("permission_id = ?", id).Count(&userCount)

	if roleCount > 0 || userCount > 0 {
		return fmt.Errorf("tidak dapat menghapus permission: masih digunakan oleh %d role(s) dan %d user(s)", roleCount, userCount)
	}

	// Delete permission
	if err := s.db.Delete(&permission).Error; err != nil {
		return fmt.Errorf("gagal menghapus permission: %w", err)
	}

	return nil
}

// GetPermissionGroups retrieves permissions grouped by group_name
func (s *PermissionService) GetPermissionGroups() ([]models.PermissionGroupResponse, error) {
	var permissions []models.Permission
	if err := s.db.Where("is_active = ?", true).
		Order("group_sort_order ASC, group_name ASC, code ASC").
		Find(&permissions).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil permission groups: %w", err)
	}

	// Group permissions by group_name
	groupMap := make(map[string]*models.PermissionGroupResponse)
	for _, p := range permissions {
		groupName := "Uncategorized"
		if p.GroupName != nil && *p.GroupName != "" {
			groupName = *p.GroupName
		}

		if _, exists := groupMap[groupName]; !exists {
			sortOrder := 999
			if p.GroupSortOrder != nil {
				sortOrder = *p.GroupSortOrder
			}
			groupMap[groupName] = &models.PermissionGroupResponse{
				GroupName:   groupName,
				GroupIcon:   p.GroupIcon,
				SortOrder:   sortOrder,
				Permissions: []models.PermissionListResponse{},
			}
		}

		groupMap[groupName].Permissions = append(
			groupMap[groupName].Permissions,
			*p.ToListResponse(),
		)
	}

	// Convert map to slice
	var groups []models.PermissionGroupResponse
	for _, group := range groupMap {
		groups = append(groups, *group)
	}

	return groups, nil
}
