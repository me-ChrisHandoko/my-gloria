package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

// UserProfileRepository defines the interface for user profile data access
type UserProfileRepository interface {
	FindAll() ([]domain.UserProfile, error)
	FindByID(id string) (*domain.UserProfile, error)
	FindByClerkUserID(clerkUserID string) (*domain.UserProfile, error)
	FindByNIP(nip string) (*domain.UserProfile, error)
	Create(profile *domain.UserProfile) error
	Update(profile *domain.UserProfile) error
	Delete(id string) error
	FindWithRoles(id string) (*domain.UserProfile, error)
	FindWithPositions(id string) (*domain.UserProfile, error)
	FindWithFullDetails(id string) (*domain.UserProfile, error)
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
