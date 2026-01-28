package services

import (
	"errors"
	"fmt"
	"strings"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserService handles business logic for users
type UserService struct {
	db                   *gorm.DB
	escalationPrevention *EscalationPreventionService
	permissionCache      *PermissionCacheService
}

// NewUserService creates a new UserService instance
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// NewUserServiceWithRBAC creates a new UserService instance with RBAC services
func NewUserServiceWithRBAC(db *gorm.DB, escalation *EscalationPreventionService, cache *PermissionCacheService) *UserService {
	return &UserService{
		db:                   db,
		escalationPrevention: escalation,
		permissionCache:      cache,
	}
}

// SetRBACServices sets the RBAC services (for dependency injection after creation)
func (s *UserService) SetRBACServices(escalation *EscalationPreventionService, cache *PermissionCacheService) {
	s.escalationPrevention = escalation
	s.permissionCache = cache
}

// UserListParams represents parameters for listing users
type UserListParams struct {
	Page      int
	PageSize  int
	Search    string
	RoleID    string
	IsActive  *bool
	SortBy    string
	SortOrder string
}

// UserListResult represents the result of listing users
type UserListResult struct {
	Data       []*models.UserListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// GetUsers retrieves list of users with pagination and filters
func (s *UserService) GetUsers(params UserListParams) (*UserListResult, error) {
	query := s.db.Model(&models.User{})

	// Apply search filter (email and username)
	if params.Search != "" {
		query = query.Where("email ILIKE ? OR username ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply role filter (join with user_roles)
	if params.RoleID != "" {
		query = query.Joins("JOIN public.user_roles ON users.id = user_roles.user_id").
			Where("user_roles.role_id = ? AND user_roles.is_active = true", params.RoleID)
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total pengguna: %w", err)
	}

	// Apply sorting
	if params.SortBy != "" {
		// Validate sort column to prevent SQL injection
		validSortColumns := map[string]bool{
			"email":       true,
			"username":    true,
			"created_at":  true,
			"last_active": true,
			"is_active":   true,
		}
		if validSortColumns[params.SortBy] {
			order := params.SortBy + " " + params.SortOrder
			query = query.Order(order)
		}
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch users with DataKaryawan relation for name field
	var users []models.User
	if err := query.Preload("DataKaryawan").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Convert to list response
	userList := make([]*models.UserListResponse, len(users))
	for i, user := range users {
		listResp := user.ToListResponse()

		// Add name from DataKaryawan if available
		if user.DataKaryawan != nil && user.DataKaryawan.Nama != nil {
			listResp.Name = user.DataKaryawan.Nama
		}

		userList[i] = listResp
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &UserListResult{
		Data:       userList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetUserByID retrieves a user by ID with relations
func (s *UserService) GetUserByID(id string) (*models.User, error) {
	var user models.User
	if err := s.db.
		Preload("UserRoles.Role").
		Preload("UserPositions.Position.Department").
		Preload("DataKaryawan").
		First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	return &user, nil
}

// UpdateUser updates a user with validation
func (s *UserService) UpdateUser(id string, req models.UpdateUserRequest, userID string) (*models.User, error) {
	// Find existing user
	user, err := s.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.Preferences != nil {
		user.Preferences = req.Preferences
	}

	// Build update map
	updateMap := make(map[string]interface{})
	if req.IsActive != nil {
		updateMap["is_active"] = *req.IsActive
	}
	if req.Preferences != nil {
		updateMap["preferences"] = req.Preferences
	}

	// Only update if there are changes
	if len(updateMap) == 0 {
		return user, nil
	}

	// Execute update
	if err := s.db.Model(&user).Updates(updateMap).Error; err != nil {
		return nil, fmt.Errorf("gagal memperbarui pengguna: %w", err)
	}

	// Reload user with relations
	user, err = s.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteUser deletes a user with validation
func (s *UserService) DeleteUser(id string) error {
	// Check if user exists
	user, err := s.GetUserByID(id)
	if err != nil {
		return err
	}

	// Business rule: Cannot delete yourself
	// This check should be done at handler level with authenticated user context
	// For now, we'll just proceed with deletion

	// Business rule: Check if user has active roles
	var activeRoleCount int64
	if err := s.db.Model(&models.UserRole{}).
		Where("user_id = ? AND is_active = true", id).
		Count(&activeRoleCount).Error; err != nil {
		return fmt.Errorf("gagal memeriksa role aktif pengguna: %w", err)
	}

	if activeRoleCount > 0 {
		return errors.New("tidak dapat menghapus pengguna yang memiliki role aktif")
	}

	// Business rule: Check if user has active positions
	var activePositionCount int64
	if err := s.db.Model(&models.UserPosition{}).
		Where("user_id = ? AND is_active = true", id).
		Count(&activePositionCount).Error; err != nil {
		return fmt.Errorf("gagal memeriksa posisi aktif pengguna: %w", err)
	}

	if activePositionCount > 0 {
		return errors.New("tidak dapat menghapus pengguna yang memiliki posisi aktif")
	}

	// Delete user (cascade will handle related records)
	if err := s.db.Delete(&user).Error; err != nil {
		return fmt.Errorf("gagal menghapus pengguna: %w", err)
	}

	return nil
}

// getUsername retrieves user's username for storing in audit fields
// Returns username if available, otherwise formats email (removes @domain, replaces _ with space)
func (s *UserService) getUsername(userID string) string {
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

// GetUserRoles retrieves all roles assigned to a user
func (s *UserService) GetUserRoles(userID string) ([]*models.UserRoleResponse, error) {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Get user roles with role details
	var userRoles []models.UserRole
	if err := s.db.
		Preload("Role").
		Where("user_id = ?", userID).
		Order("assigned_at DESC").
		Find(&userRoles).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil roles pengguna: %w", err)
	}

	// Convert to response
	roleResponses := make([]*models.UserRoleResponse, len(userRoles))
	for i, ur := range userRoles {
		roleResponses[i] = ur.ToResponse()
	}

	return roleResponses, nil
}

// AssignRoleToUser assigns a role to a user
func (s *UserService) AssignRoleToUser(userID string, req models.AssignRoleToUserRequest, assignedBy string) (*models.UserRoleResponse, error) {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Check if role exists
	var role models.Role
	if err := s.db.First(&role, "id = ?", req.RoleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data role: %w", err)
	}

	// Check if role already assigned and active
	var existingAssignment models.UserRole
	err := s.db.Where("user_id = ? AND role_id = ? AND is_active = true", userID, req.RoleID).
		First(&existingAssignment).Error
	if err == nil {
		return nil, errors.New("role sudah di-assign ke pengguna ini")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("gagal memeriksa role assignment: %w", err)
	}

	// Self-Escalation Prevention: Users cannot assign roles to themselves
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidateSelfEscalation(assignedBy, userID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Escalation Prevention: Validate that assignedBy user can assign this role
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidateRoleAssignment(assignedBy, userID, req.RoleID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Create user role assignment
	userRole := models.UserRole{
		ID:         generateID(),
		UserID:     userID,
		RoleID:     req.RoleID,
		AssignedBy: &assignedBy,
		IsActive:   true,
	}

	// Set effective dates
	if req.EffectiveFrom != nil {
		userRole.EffectiveFrom = *req.EffectiveFrom
	}
	userRole.EffectiveUntil = req.EffectiveUntil

	// Save to database
	if err := s.db.Create(&userRole).Error; err != nil {
		return nil, fmt.Errorf("gagal assign role ke pengguna: %w", err)
	}

	// Invalidate permission cache for the user
	if s.permissionCache != nil {
		s.permissionCache.InvalidateUser(userID)
	}

	// Reload with role details
	if err := s.db.Preload("Role").First(&userRole, "id = ?", userRole.ID).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data role assignment: %w", err)
	}

	return userRole.ToResponse(), nil
}

// RevokeRoleFromUser revokes a role from a user
func (s *UserService) RevokeRoleFromUser(userID string, roleAssignmentID string) error {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("pengguna tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Find the role assignment
	var userRole models.UserRole
	if err := s.db.Where("id = ? AND user_id = ?", roleAssignmentID, userID).
		First(&userRole).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role assignment tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data role assignment: %w", err)
	}

	// Delete the role assignment
	if err := s.db.Delete(&userRole).Error; err != nil {
		return fmt.Errorf("gagal revoke role dari pengguna: %w", err)
	}

	// Invalidate permission cache for the user
	if s.permissionCache != nil {
		s.permissionCache.InvalidateUser(userID)
	}

	return nil
}

// GetUserPositions retrieves all positions assigned to a user
func (s *UserService) GetUserPositions(userID string) ([]*models.UserPositionResponse, error) {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Get user positions with position details
	var userPositions []models.UserPosition
	if err := s.db.
		Preload("Position.Department").
		Where("user_id = ?", userID).
		Order("start_date DESC").
		Find(&userPositions).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil posisi pengguna: %w", err)
	}

	// Convert to response
	positionResponses := make([]*models.UserPositionResponse, len(userPositions))
	for i, up := range userPositions {
		positionResponses[i] = up.ToResponse()
	}

	return positionResponses, nil
}

// AssignPositionToUser assigns a position to a user
func (s *UserService) AssignPositionToUser(userID string, req models.AssignPositionToUserRequest, appointedBy string) (*models.UserPositionResponse, error) {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Check if position exists
	var position models.Position
	if err := s.db.First(&position, "id = ?", req.PositionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("posisi tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data posisi: %w", err)
	}

	// Check if position already assigned and active
	var existingAssignment models.UserPosition
	err := s.db.Where("user_id = ? AND position_id = ? AND is_active = true", userID, req.PositionID).
		First(&existingAssignment).Error
	if err == nil {
		return nil, errors.New("posisi sudah di-assign ke pengguna ini")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("gagal memeriksa position assignment: %w", err)
	}

	// Self-Escalation Prevention: Users cannot assign positions to themselves
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidateSelfEscalation(appointedBy, userID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Escalation Prevention: Validate that appointedBy user can assign this position
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidatePositionAssignment(appointedBy, userID, req.PositionID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Create user position assignment
	userPosition := models.UserPosition{
		ID:          uuid.New().String(),
		UserID:      userID,
		PositionID:  req.PositionID,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		IsActive:    true,
		AppointedBy: &appointedBy,
	}

	// Set optional fields
	if req.IsPlt != nil {
		userPosition.IsPlt = *req.IsPlt
	}
	userPosition.SKNumber = req.SKNumber
	userPosition.Notes = req.Notes
	userPosition.PermissionScope = req.PermissionScope

	// Save to database
	if err := s.db.Create(&userPosition).Error; err != nil {
		return nil, fmt.Errorf("gagal assign posisi ke pengguna: %w", err)
	}

	// Invalidate permission cache for the user
	if s.permissionCache != nil {
		s.permissionCache.InvalidateUser(userID)
	}

	// Reload with position details
	if err := s.db.Preload("Position.Department").First(&userPosition, "id = ?", userPosition.ID).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data position assignment: %w", err)
	}

	return userPosition.ToResponse(), nil
}

// RevokePositionFromUser revokes a position from a user
func (s *UserService) RevokePositionFromUser(userID string, positionAssignmentID string) error {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("pengguna tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Find the position assignment
	var userPosition models.UserPosition
	if err := s.db.Where("id = ? AND user_id = ?", positionAssignmentID, userID).
		First(&userPosition).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("position assignment tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data position assignment: %w", err)
	}

	// Delete the position assignment
	if err := s.db.Delete(&userPosition).Error; err != nil {
		return fmt.Errorf("gagal revoke posisi dari pengguna: %w", err)
	}

	// Invalidate permission cache for the user
	if s.permissionCache != nil {
		s.permissionCache.InvalidateUser(userID)
	}

	return nil
}

// GetUserPermissions retrieves all direct permissions assigned to a user
func (s *UserService) GetUserPermissions(userID string) ([]*models.UserPermissionResponse, error) {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Get user permissions with permission details
	var userPermissions []models.UserPermission
	if err := s.db.
		Preload("Permission").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&userPermissions).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil permissions pengguna: %w", err)
	}

	// Convert to response
	permissionResponses := make([]*models.UserPermissionResponse, len(userPermissions))
	for i, up := range userPermissions {
		permissionResponses[i] = up.ToResponse()
	}

	return permissionResponses, nil
}

// AssignPermissionToUser assigns a direct permission to a user
func (s *UserService) AssignPermissionToUser(userID string, req models.AssignPermissionToUserRequest, grantedBy string) (*models.UserPermissionResponse, error) {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("pengguna tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Check if permission exists
	var permission models.Permission
	if err := s.db.First(&permission, "id = ?", req.PermissionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("permission tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data permission: %w", err)
	}

	// Self-Escalation Prevention: Users cannot assign permissions to themselves
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidateSelfEscalation(grantedBy, userID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Escalation Prevention: Validate that grantedBy user can grant this permission
	if s.escalationPrevention != nil {
		if err := s.escalationPrevention.ValidatePermissionGrant(grantedBy, userID, req.PermissionID); err != nil {
			return nil, fmt.Errorf("escalation prevention: %w", err)
		}
	}

	// Check for existing assignment
	var existingAssignment models.UserPermission
	err := s.db.Where("user_id = ? AND permission_id = ?", userID, req.PermissionID).
		First(&existingAssignment).Error
	if err == nil {
		// Update existing assignment
		if req.IsGranted != nil {
			existingAssignment.IsGranted = *req.IsGranted
		}
		if req.Conditions != nil {
			existingAssignment.Conditions = req.Conditions
		}
		existingAssignment.GrantReason = req.GrantReason
		if req.Priority != nil {
			existingAssignment.Priority = *req.Priority
		}
		if req.IsTemporary != nil {
			existingAssignment.IsTemporary = *req.IsTemporary
		}
		if req.ResourceID != nil {
			existingAssignment.ResourceID = req.ResourceID
		}
		if req.ResourceType != nil {
			existingAssignment.ResourceType = req.ResourceType
		}
		if req.EffectiveFrom != nil {
			existingAssignment.EffectiveFrom = *req.EffectiveFrom
		}
		if req.EffectiveUntil != nil {
			existingAssignment.EffectiveUntil = req.EffectiveUntil
		}

		if err := s.db.Save(&existingAssignment).Error; err != nil {
			return nil, fmt.Errorf("gagal mengupdate permission pengguna: %w", err)
		}

		// Invalidate permission cache
		if s.permissionCache != nil {
			s.permissionCache.InvalidateUser(userID)
		}

		// Reload with permission details
		if err := s.db.Preload("Permission").First(&existingAssignment, "id = ?", existingAssignment.ID).Error; err != nil {
			return nil, fmt.Errorf("gagal mengambil data permission assignment: %w", err)
		}

		return existingAssignment.ToResponse(), nil
	}

	// Create new user permission assignment
	// Note: Escalation prevention checks already performed above (applies to both update and create)
	isGranted := true
	if req.IsGranted != nil {
		isGranted = *req.IsGranted
	}

	priority := 100
	if req.Priority != nil {
		priority = *req.Priority
	}

	isTemporary := false
	if req.IsTemporary != nil {
		isTemporary = *req.IsTemporary
	}

	userPermission := models.UserPermission{
		ID:             uuid.New().String(),
		UserID:         userID,
		PermissionID:   req.PermissionID,
		IsGranted:      isGranted,
		Conditions:     req.Conditions,
		GrantedBy:      grantedBy,
		GrantReason:    req.GrantReason,
		Priority:       priority,
		IsTemporary:    isTemporary,
		ResourceID:     req.ResourceID,
		ResourceType:   req.ResourceType,
	}

	// Set effective dates
	if req.EffectiveFrom != nil {
		userPermission.EffectiveFrom = *req.EffectiveFrom
	}
	userPermission.EffectiveUntil = req.EffectiveUntil

	// Save to database
	if err := s.db.Create(&userPermission).Error; err != nil {
		return nil, fmt.Errorf("gagal assign permission ke pengguna: %w", err)
	}

	// Invalidate permission cache
	if s.permissionCache != nil {
		s.permissionCache.InvalidateUser(userID)
	}

	// Reload with permission details
	if err := s.db.Preload("Permission").First(&userPermission, "id = ?", userPermission.ID).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data permission assignment: %w", err)
	}

	return userPermission.ToResponse(), nil
}

// RevokePermissionFromUser revokes a direct permission from a user
func (s *UserService) RevokePermissionFromUser(userID string, permissionAssignmentID string) error {
	// Check if user exists
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("pengguna tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data pengguna: %w", err)
	}

	// Find the permission assignment
	var userPermission models.UserPermission
	if err := s.db.Where("id = ? AND user_id = ?", permissionAssignmentID, userID).
		First(&userPermission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("permission assignment tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data permission assignment: %w", err)
	}

	// Delete the permission assignment
	if err := s.db.Delete(&userPermission).Error; err != nil {
		return fmt.Errorf("gagal revoke permission dari pengguna: %w", err)
	}

	// Invalidate permission cache
	if s.permissionCache != nil {
		s.permissionCache.InvalidateUser(userID)
	}

	return nil
}

// generateID generates a new UUID (helper function)
func generateID() string {
	return uuid.New().String()
}
