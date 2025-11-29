package repository

import (
	"time"

	"backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserProfileRepository defines the interface for user profile data access
type UserProfileRepository interface {
	FindAll() ([]domain.UserProfile, error)
	FindAllPaginated(page, limit int, search string) ([]domain.UserProfile, int64, error)
	FindByID(id string) (*domain.UserProfile, error)
	FindByClerkUserID(clerkUserID string) (*domain.UserProfile, error)
	FindByNIP(nip string) (*domain.UserProfile, error)
	Create(profile *domain.UserProfile) error
	Update(profile *domain.UserProfile) error
	Delete(id string) error
	FindWithRoles(id string) (*domain.UserProfile, error)
	FindWithPositions(id string) (*domain.UserProfile, error)
	FindWithFullDetails(id string) (*domain.UserProfile, error)
	Count() (int64, error)

	// Role management
	AssignRole(userID string, req *domain.AssignRoleToUserRequest, assignedBy *string) (*domain.UserRole, error)
	RemoveRole(userID string, roleID string) error
	GetUserRoles(userID string) ([]domain.UserRole, error)

	// Position management
	AssignPosition(userID string, req *domain.AssignPositionToUserRequest, appointedBy *string) (*domain.UserPosition, error)
	RemovePosition(userID string, positionID string) error
	GetUserPositions(userID string) ([]domain.UserPosition, error)

	// Permission management
	GrantPermission(userID string, req *domain.AssignPermissionToUserRequest, grantedBy string) error
	RevokePermission(userID string, permissionID string) error
	GetUserDirectPermissions(userID string) ([]domain.UserPermission, error)
}

// userProfileRepository implements UserProfileRepository
type userProfileRepository struct {
	db *gorm.DB
}

// NewUserProfileRepository creates a new user profile repository instance
func NewUserProfileRepository(db *gorm.DB) UserProfileRepository {
	return &userProfileRepository{db: db}
}

// FindAll retrieves all user profiles
func (r *userProfileRepository) FindAll() ([]domain.UserProfile, error) {
	var profiles []domain.UserProfile
	if err := r.db.Preload("DataKaryawan").Find(&profiles).Error; err != nil {
		return nil, err
	}
	return profiles, nil
}

// FindAllPaginated retrieves user profiles with pagination and optional search
func (r *userProfileRepository) FindAllPaginated(page, limit int, search string) ([]domain.UserProfile, int64, error) {
	var profiles []domain.UserProfile
	var total int64

	query := r.db.Model(&domain.UserProfile{})

	// Apply search filter if provided
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Joins("LEFT JOIN gloria_master.data_karyawan dk ON dk.nip = gloria_ops.user_profiles.nip").
			Where("gloria_ops.user_profiles.nip LIKE ? OR dk.nama LIKE ? OR dk.email LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated records
	offset := (page - 1) * limit
	if err := r.db.Preload("DataKaryawan").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&profiles).Error; err != nil {
		return nil, 0, err
	}

	return profiles, total, nil
}

// FindByID retrieves a user profile by ID
func (r *userProfileRepository) FindByID(id string) (*domain.UserProfile, error) {
	var profile domain.UserProfile
	if err := r.db.Preload("DataKaryawan").First(&profile, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindByClerkUserID retrieves a user profile by Clerk user ID
func (r *userProfileRepository) FindByClerkUserID(clerkUserID string) (*domain.UserProfile, error) {
	var profile domain.UserProfile
	if err := r.db.Preload("DataKaryawan").Where("clerk_user_id = ?", clerkUserID).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindByNIP retrieves a user profile by NIP
func (r *userProfileRepository) FindByNIP(nip string) (*domain.UserProfile, error) {
	var profile domain.UserProfile
	if err := r.db.Preload("DataKaryawan").Where("nip = ?", nip).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

// Create creates a new user profile
func (r *userProfileRepository) Create(profile *domain.UserProfile) error {
	return r.db.Create(profile).Error
}

// Update updates an existing user profile
func (r *userProfileRepository) Update(profile *domain.UserProfile) error {
	return r.db.Save(profile).Error
}

// Delete deletes a user profile by ID (hard delete since UserProfile doesn't have soft delete)
func (r *userProfileRepository) Delete(id string) error {
	return r.db.Delete(&domain.UserProfile{}, "id = ?", id).Error
}

// FindWithRoles retrieves a user profile with their roles preloaded
func (r *userProfileRepository) FindWithRoles(id string) (*domain.UserProfile, error) {
	var profile domain.UserProfile
	if err := r.db.
		Preload("DataKaryawan").
		Preload("UserRoles", "is_active = ?", true).
		Preload("UserRoles.Role").
		First(&profile, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindWithPositions retrieves a user profile with their positions preloaded
func (r *userProfileRepository) FindWithPositions(id string) (*domain.UserProfile, error) {
	var profile domain.UserProfile
	if err := r.db.
		Preload("DataKaryawan").
		Preload("UserPositions", "is_active = ?", true).
		Preload("UserPositions.Position").
		Preload("UserPositions.Position.Department").
		First(&profile, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

// FindWithFullDetails retrieves a user profile with all related data preloaded
func (r *userProfileRepository) FindWithFullDetails(id string) (*domain.UserProfile, error) {
	var profile domain.UserProfile
	if err := r.db.
		Preload("DataKaryawan").
		Preload("UserRoles", "is_active = ?", true).
		Preload("UserRoles.Role").
		Preload("UserRoles.Role.RolePermissions", "is_granted = ?", true).
		Preload("UserRoles.Role.RolePermissions.Permission").
		Preload("UserPositions", "is_active = ?", true).
		Preload("UserPositions.Position").
		Preload("UserPositions.Position.Department").
		Preload("UserPermissions", "is_granted = ?", true).
		Preload("UserPermissions.Permission").
		First(&profile, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

// Count returns the total number of user profiles
func (r *userProfileRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&domain.UserProfile{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// AssignRole assigns a role to a user
func (r *userProfileRepository) AssignRole(userID string, req *domain.AssignRoleToUserRequest, assignedBy *string) (*domain.UserRole, error) {
	now := time.Now()
	effectiveFrom := now
	if req.EffectiveFrom != nil {
		effectiveFrom = *req.EffectiveFrom
	}

	userRole := &domain.UserRole{
		ID:             uuid.New().String(),
		UserProfileID:  userID,
		RoleID:         req.RoleID,
		AssignedAt:     now,
		AssignedBy:     assignedBy,
		IsActive:       true,
		EffectiveFrom:  effectiveFrom,
		EffectiveUntil: req.EffectiveUntil,
	}

	if err := r.db.Create(userRole).Error; err != nil {
		return nil, err
	}

	// Load the role relation
	if err := r.db.Preload("Role").First(userRole, "id = ?", userRole.ID).Error; err != nil {
		return nil, err
	}

	return userRole, nil
}

// RemoveRole removes a role from a user (soft delete by setting is_active = false)
func (r *userProfileRepository) RemoveRole(userID string, roleID string) error {
	return r.db.Model(&domain.UserRole{}).
		Where("user_profile_id = ? AND role_id = ? AND is_active = ?", userID, roleID, true).
		Update("is_active", false).Error
}

// GetUserRoles returns all active roles for a user
func (r *userProfileRepository) GetUserRoles(userID string) ([]domain.UserRole, error) {
	var roles []domain.UserRole
	if err := r.db.Preload("Role").
		Where("user_profile_id = ? AND is_active = ?", userID, true).
		Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// AssignPosition assigns a position to a user
func (r *userProfileRepository) AssignPosition(userID string, req *domain.AssignPositionToUserRequest, appointedBy *string) (*domain.UserPosition, error) {
	isPlt := false
	if req.IsPlt != nil {
		isPlt = *req.IsPlt
	}

	userPosition := &domain.UserPosition{
		ID:              uuid.New().String(),
		UserProfileID:   userID,
		PositionID:      req.PositionID,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
		IsActive:        true,
		IsPlt:           isPlt,
		AppointedBy:     appointedBy,
		SKNumber:        req.SKNumber,
		Notes:           req.Notes,
		PermissionScope: req.PermissionScope,
	}

	if err := r.db.Create(userPosition).Error; err != nil {
		return nil, err
	}

	// Load the position relation
	if err := r.db.Preload("Position").Preload("Position.Department").First(userPosition, "id = ?", userPosition.ID).Error; err != nil {
		return nil, err
	}

	return userPosition, nil
}

// RemovePosition removes a position from a user (soft delete by setting is_active = false)
func (r *userProfileRepository) RemovePosition(userID string, positionID string) error {
	return r.db.Model(&domain.UserPosition{}).
		Where("user_profile_id = ? AND position_id = ? AND is_active = ?", userID, positionID, true).
		Update("is_active", false).Error
}

// GetUserPositions returns all active positions for a user
func (r *userProfileRepository) GetUserPositions(userID string) ([]domain.UserPosition, error) {
	var positions []domain.UserPosition
	if err := r.db.Preload("Position").Preload("Position.Department").
		Where("user_profile_id = ? AND is_active = ?", userID, true).
		Find(&positions).Error; err != nil {
		return nil, err
	}
	return positions, nil
}

// GrantPermission grants a permission directly to a user
func (r *userProfileRepository) GrantPermission(userID string, req *domain.AssignPermissionToUserRequest, grantedBy string) error {
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

	now := time.Now()
	effectiveFrom := now
	if req.EffectiveFrom != nil {
		effectiveFrom = *req.EffectiveFrom
	}

	userPermission := &domain.UserPermission{
		ID:             uuid.New().String(),
		UserProfileID:  userID,
		PermissionID:   req.PermissionID,
		IsGranted:      isGranted,
		Conditions:     req.Conditions,
		GrantedBy:      grantedBy,
		GrantReason:    req.GrantReason,
		Priority:       priority,
		IsTemporary:    isTemporary,
		ResourceID:     req.ResourceID,
		ResourceType:   req.ResourceType,
		EffectiveFrom:  effectiveFrom,
		EffectiveUntil: req.EffectiveUntil,
	}

	return r.db.Create(userPermission).Error
}

// RevokePermission revokes a permission from a user
func (r *userProfileRepository) RevokePermission(userID string, permissionID string) error {
	return r.db.Where("user_profile_id = ? AND permission_id = ?", userID, permissionID).
		Delete(&domain.UserPermission{}).Error
}

// GetUserDirectPermissions returns all direct permissions for a user
func (r *userProfileRepository) GetUserDirectPermissions(userID string) ([]domain.UserPermission, error) {
	var permissions []domain.UserPermission
	if err := r.db.Preload("Permission").
		Where("user_profile_id = ? AND is_granted = ?", userID, true).
		Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}
