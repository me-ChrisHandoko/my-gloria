package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RoleService handles business logic for roles
type RoleService struct {
	db                   *gorm.DB
	escalationPrevention *EscalationPreventionService
	permissionCache      *PermissionCacheService
}

// NewRoleService creates a new RoleService instance
func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{db: db}
}

// NewRoleServiceWithRBAC creates a new RoleService instance with RBAC services
func NewRoleServiceWithRBAC(db *gorm.DB, escalation *EscalationPreventionService, cache *PermissionCacheService) *RoleService {
	return &RoleService{
		db:                   db,
		escalationPrevention: escalation,
		permissionCache:      cache,
	}
}

// SetRBACServices sets the RBAC services (for dependency injection after creation)
func (s *RoleService) SetRBACServices(escalation *EscalationPreventionService, cache *PermissionCacheService) {
	s.escalationPrevention = escalation
	s.permissionCache = cache
}

// RoleListParams represents parameters for listing roles
type RoleListParams struct {
	Page           int
	PageSize       int
	Search         string
	IsActive       *bool
	IsSystemRole   *bool
	HierarchyLevel *int
	SortBy         string
	SortOrder      string
}

// RoleListResult represents the result of listing roles
type RoleListResult struct {
	Data       []*models.RoleListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// getUsername retrieves user's username for storing in created_by
// Returns username if available, otherwise formats email (removes @domain, replaces _ with space)
func (s *RoleService) getUsername(userID string) string {
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

// CreateRole creates a new role with validation
func (s *RoleService) CreateRole(req models.CreateRoleRequest, userID string) (*models.Role, error) {
	// Business rule: Check if code already exists
	var existing models.Role
	if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
		return nil, errors.New("kode role sudah digunakan")
	}

	// Get username for audit trail
	username := s.getUsername(userID)

	// Determine if system role (default to false if not provided)
	isSystemRole := false
	if req.IsSystemRole != nil {
		isSystemRole = *req.IsSystemRole
	}

	// Create role entity
	role := models.Role{
		ID:             uuid.New().String(),
		Code:           req.Code,
		Name:           req.Name,
		Description:    req.Description,
		HierarchyLevel: req.HierarchyLevel,
		IsSystemRole:   isSystemRole,
		IsActive:       true,
		CreatedBy:      &username,
	}

	// Persist to database
	if err := s.db.Create(&role).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat role: %w", err)
	}

	return &role, nil
}

// GetRoles retrieves list of roles with pagination and filters
func (s *RoleService) GetRoles(params RoleListParams) (*RoleListResult, error) {
	query := s.db.Model(&models.Role{})

	// Apply search filter
	if params.Search != "" {
		query = query.Where("name ILIKE ? OR code ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Apply system role filter
	if params.IsSystemRole != nil {
		query = query.Where("is_system_role = ?", *params.IsSystemRole)
	}

	// Apply hierarchy level filter
	if params.HierarchyLevel != nil {
		query = query.Where("hierarchy_level = ?", *params.HierarchyLevel)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total role: %w", err)
	}

	// Apply sorting with validation to prevent SQL injection
	if params.SortBy != "" {
		validSortColumns := map[string]bool{
			"code":            true,
			"name":            true,
			"hierarchy_level": true,
			"created_at":      true,
			"is_active":       true,
			"is_system_role":  true,
		}
		if validSortColumns[params.SortBy] {
			direction := "ASC"
			if strings.ToLower(params.SortOrder) == "desc" {
				direction = "DESC"
			}
			query = query.Order(fmt.Sprintf("%s %s", params.SortBy, direction))
		}
	} else {
		query = query.Order("created_at DESC")
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Execute query
	var roles []models.Role
	if err := query.Find(&roles).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Convert to list response
	data := make([]*models.RoleListResponse, len(roles))
	for i, role := range roles {
		data[i] = role.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &RoleListResult{
		Data:       data,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetRoleByID retrieves a single role by ID
func (s *RoleService) GetRoleByID(id string) (*models.Role, error) {
	var role models.Role
	if err := s.db.First(&role, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	return &role, nil
}

// GetRoleWithPermissions retrieves a role with its permissions
func (s *RoleService) GetRoleWithPermissions(id string) (*models.RoleWithPermissionsResponse, error) {
	var role models.Role
	if err := s.db.First(&role, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Get active permissions for this role
	var rolePermissions []models.RolePermission
	if err := s.db.Where("role_id = ? AND is_granted = ?", id, true).
		Preload("Permission").
		Find(&rolePermissions).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil permissions role: %w", err)
	}

	// Convert to assigned permission response with assignment_id
	permissions := make([]models.AssignedPermissionResponse, 0)
	now := time.Now()
	for _, rp := range rolePermissions {
		// Check if permission is currently effective
		if rp.EffectiveFrom.After(now) {
			continue // Not yet effective
		}
		if rp.EffectiveUntil != nil && rp.EffectiveUntil.Before(now) {
			continue // Already expired
		}

		if rp.Permission != nil {
			permissions = append(permissions, models.AssignedPermissionResponse{
				AssignmentID:       rp.ID,                             // role_permission.id for DELETE
				ID:                 rp.Permission.ID,                  // permission.id
				Code:               rp.Permission.Code,
				Name:               rp.Permission.Name,
				Resource:           rp.Permission.Resource,
				Action:             rp.Permission.Action,
				Scope:              rp.Permission.Scope,
				IsSystemPermission: rp.Permission.IsSystemPermission,
				IsActive:           rp.Permission.IsActive,
			})
		}
	}

	response := &models.RoleWithPermissionsResponse{
		RoleResponse: *role.ToResponse(),
		Permissions:  permissions,
	}

	return response, nil
}

// UpdateRole updates an existing role
func (s *RoleService) UpdateRole(id string, req models.UpdateRoleRequest) (*models.Role, error) {
	// Get existing role
	var role models.Role
	if err := s.db.First(&role, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Business rule: System roles cannot be modified in certain ways
	if role.IsSystemRole {
		// Prevent changing code or system role status
		if req.Code != nil {
			return nil, errors.New("kode role sistem tidak dapat diubah")
		}
	}

	// Check if new code already exists (if code is being changed)
	if req.Code != nil && *req.Code != role.Code {
		var existing models.Role
		if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
			return nil, errors.New("kode role sudah digunakan")
		}
	}

	// Update fields
	if req.Code != nil {
		role.Code = *req.Code
	}
	if req.Name != nil {
		role.Name = *req.Name
	}
	if req.Description != nil {
		role.Description = req.Description
	}
	if req.HierarchyLevel != nil {
		role.HierarchyLevel = *req.HierarchyLevel
	}
	if req.IsActive != nil {
		role.IsActive = *req.IsActive
	}

	// Save changes
	if err := s.db.Save(&role).Error; err != nil {
		return nil, fmt.Errorf("gagal mengupdate role: %w", err)
	}

	// Invalidate cache for all users with this role
	if s.permissionCache != nil {
		s.invalidateCacheForRoleUsers(id)
	}

	return &role, nil
}

// DeleteRole deletes a role (soft delete by setting is_active to false)
func (s *RoleService) DeleteRole(id string) error {
	// Get existing role
	var role models.Role
	if err := s.db.First(&role, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Business rule: System roles cannot be deleted
	if role.IsSystemRole {
		return errors.New("role sistem tidak dapat dihapus")
	}

	// Business rule: Check if role is still assigned to users
	var userRoleCount int64
	if err := s.db.Model(&models.UserRole{}).Where("role_id = ?", id).Count(&userRoleCount).Error; err != nil {
		return fmt.Errorf("gagal memeriksa assignment role: %w", err)
	}

	if userRoleCount > 0 {
		return errors.New("role masih digunakan oleh user, tidak dapat dihapus")
	}

	// Business rule: Check if role is a parent in role hierarchy
	var childRoleCount int64
	if err := s.db.Model(&models.RoleHierarchy{}).Where("parent_role_id = ?", id).Count(&childRoleCount).Error; err != nil {
		return fmt.Errorf("gagal memeriksa hierarchy role: %w", err)
	}

	if childRoleCount > 0 {
		return errors.New("role masih memiliki child roles dalam hierarchy, tidak dapat dihapus")
	}

	// Invalidate cache for all users with this role before deletion
	if s.permissionCache != nil {
		s.invalidateCacheForRoleUsers(id)
	}

	// Soft delete: set is_active to false
	if err := s.db.Model(&role).Update("is_active", false).Error; err != nil {
		return fmt.Errorf("gagal menghapus role: %w", err)
	}

	return nil
}

// AssignPermissionToRole assigns a permission to a role
func (s *RoleService) AssignPermissionToRole(roleID string, req models.AssignPermissionToRoleRequest, userID string) (*models.RolePermission, error) {
	fmt.Printf("[DEBUG] RoleService.AssignPermissionToRole: roleID=%s, permissionID=%s, userID=%s\n", roleID, req.PermissionID, userID)

	// Validate role exists
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Printf("[DEBUG] RoleService: role not found\n")
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}
	fmt.Printf("[DEBUG] RoleService: role found, name=%s\n", role.Name)

	// Validate permission exists
	var permission models.Permission
	if err := s.db.First(&permission, "id = ?", req.PermissionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Printf("[DEBUG] RoleService: permission not found\n")
			return nil, errors.New("permission tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data permission: %w", err)
	}
	fmt.Printf("[DEBUG] RoleService: permission found, code=%s\n", permission.Code)

	// Escalation Prevention: Validate that userID can grant this permission to the role
	fmt.Printf("[DEBUG] RoleService: escalationPrevention is nil? %v\n", s.escalationPrevention == nil)
	if s.escalationPrevention != nil {
		fmt.Printf("[DEBUG] RoleService: calling ValidateRolePermissionAssignment\n")
		if err := s.escalationPrevention.ValidateRolePermissionAssignment(userID, roleID, req.PermissionID); err != nil {
			fmt.Printf("[DEBUG] RoleService: escalation prevention error=%v\n", err)
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
		fmt.Printf("[DEBUG] RoleService: escalation prevention passed\n")
	}

	// Check if permission is already assigned
	var existing models.RolePermission
	err := s.db.Where("role_id = ? AND permission_id = ?", roleID, req.PermissionID).First(&existing).Error
	if err == nil {
		// Update existing assignment
		if req.IsGranted != nil {
			existing.IsGranted = *req.IsGranted
		}
		if req.Conditions != nil {
			existing.Conditions = req.Conditions
		}
		if req.GrantReason != nil {
			existing.GrantReason = req.GrantReason
		}
		if req.EffectiveFrom != nil {
			existing.EffectiveFrom = *req.EffectiveFrom
		}
		if req.EffectiveUntil != nil {
			existing.EffectiveUntil = req.EffectiveUntil
		}

		if err := s.db.Save(&existing).Error; err != nil {
			return nil, fmt.Errorf("gagal mengupdate permission role: %w", err)
		}

		// Invalidate cache for all users with this role
		if s.permissionCache != nil {
			s.invalidateCacheForRoleUsers(roleID)
		}

		return &existing, nil
	}

	// Create new assignment
	isGranted := true
	if req.IsGranted != nil {
		isGranted = *req.IsGranted
	}

	effectiveFrom := time.Now()
	if req.EffectiveFrom != nil {
		effectiveFrom = *req.EffectiveFrom
	}

	rolePermission := models.RolePermission{
		ID:             uuid.New().String(),
		RoleID:         roleID,
		PermissionID:   req.PermissionID,
		IsGranted:      isGranted,
		Conditions:     req.Conditions,
		GrantedBy:      &userID,
		GrantReason:    req.GrantReason,
		EffectiveFrom:  effectiveFrom,
		EffectiveUntil: req.EffectiveUntil,
	}

	if err := s.db.Create(&rolePermission).Error; err != nil {
		return nil, fmt.Errorf("gagal menambahkan permission ke role: %w", err)
	}

	// Invalidate cache for all users with this role
	if s.permissionCache != nil {
		s.invalidateCacheForRoleUsers(roleID)
	}

	return &rolePermission, nil
}

// RevokePermissionFromRole removes a permission from a role
func (s *RoleService) RevokePermissionFromRole(roleID, permissionAssignmentID string) error {
	// Get the role permission assignment
	var rolePermission models.RolePermission
	if err := s.db.Where("id = ? AND role_id = ?", permissionAssignmentID, roleID).First(&rolePermission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("permission assignment tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data permission assignment: %w", err)
	}

	// Delete the assignment
	if err := s.db.Delete(&rolePermission).Error; err != nil {
		return fmt.Errorf("gagal menghapus permission dari role: %w", err)
	}

	// Invalidate cache for all users with this role
	if s.permissionCache != nil {
		s.invalidateCacheForRoleUsers(roleID)
	}

	return nil
}

// invalidateCacheForRoleUsers invalidates permission cache for all users who have a specific role
func (s *RoleService) invalidateCacheForRoleUsers(roleID string) {
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
