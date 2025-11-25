package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrUserProfileNotFound = errors.New("user profile not found")
	ErrNIPExists           = errors.New("NIP already exists")
	ErrClerkUserIDExists   = errors.New("clerk user ID already exists")
)

// UserProfileService defines the interface for user profile business logic
type UserProfileService interface {
	GetAll() ([]domain.UserProfileListResponse, error)
	GetAllPaginated(page, limit int, search string) ([]domain.UserProfileListResponse, int64, error)
	GetByID(id string) (*domain.UserProfileResponse, error)
	GetByClerkUserID(clerkUserID string) (*domain.UserProfileResponse, error)
	GetByNIP(nip string) (*domain.UserProfileResponse, error)
	Create(req *domain.CreateUserProfileRequest, createdBy *string) (*domain.UserProfileResponse, error)
	Update(id string, req *domain.UpdateUserProfileRequest) (*domain.UserProfileResponse, error)
	Delete(id string) error
	GetWithFullDetails(id string) (*domain.UserProfileResponse, error)

	// Role management
	AssignRole(userID string, req *domain.AssignRoleToUserRequest, assignedBy *string) (*domain.UserRoleResponse, error)
	RemoveRole(userID string, roleID string) error
	GetUserRoles(userID string) ([]domain.UserRoleResponse, error)

	// Position management
	AssignPosition(userID string, req *domain.AssignPositionToUserRequest, appointedBy *string) (*domain.UserPositionResponse, error)
	RemovePosition(userID string, positionID string) error
	GetUserPositions(userID string) ([]domain.UserPositionResponse, error)

	// Permission management
	GrantPermission(userID string, req *domain.AssignPermissionToUserRequest, grantedBy string) error
	RevokePermission(userID string, permissionID string) error
	GetUserDirectPermissions(userID string) ([]domain.UserPermission, error)
}

// userProfileService implements UserProfileService
type userProfileService struct {
	repo repository.UserProfileRepository
}

// NewUserProfileService creates a new user profile service instance
func NewUserProfileService(repo repository.UserProfileRepository) UserProfileService {
	return &userProfileService{repo: repo}
}

// GetAll retrieves all user profiles
func (s *userProfileService) GetAll() ([]domain.UserProfileListResponse, error) {
	profiles, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.UserProfileListResponse, len(profiles))
	for i, profile := range profiles {
		responses[i] = *profile.ToListResponse()
	}
	return responses, nil
}

// GetAllPaginated retrieves user profiles with pagination
func (s *userProfileService) GetAllPaginated(page, limit int, search string) ([]domain.UserProfileListResponse, int64, error) {
	profiles, total, err := s.repo.FindAllPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.UserProfileListResponse, len(profiles))
	for i, profile := range profiles {
		responses[i] = *profile.ToListResponse()
	}
	return responses, total, nil
}

// GetByID retrieves a user profile by ID
func (s *userProfileService) GetByID(id string) (*domain.UserProfileResponse, error) {
	profile, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}
	return profile.ToResponse(), nil
}

// GetByClerkUserID retrieves a user profile by Clerk user ID
func (s *userProfileService) GetByClerkUserID(clerkUserID string) (*domain.UserProfileResponse, error) {
	profile, err := s.repo.FindByClerkUserID(clerkUserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}
	return profile.ToResponse(), nil
}

// GetByNIP retrieves a user profile by NIP
func (s *userProfileService) GetByNIP(nip string) (*domain.UserProfileResponse, error) {
	profile, err := s.repo.FindByNIP(nip)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}
	return profile.ToResponse(), nil
}

// Create creates a new user profile
func (s *userProfileService) Create(req *domain.CreateUserProfileRequest, createdBy *string) (*domain.UserProfileResponse, error) {
	// Check if NIP already exists
	existing, err := s.repo.FindByNIP(req.NIP)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrNIPExists
	}

	// Check if Clerk user ID already exists
	existing, err = s.repo.FindByClerkUserID(req.ClerkUserID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrClerkUserIDExists
	}

	profile := &domain.UserProfile{
		ID:          uuid.New().String(),
		ClerkUserID: req.ClerkUserID,
		NIP:         req.NIP,
		IsActive:    true,
		Preferences: req.Preferences,
		CreatedBy:   createdBy,
	}

	if err := s.repo.Create(profile); err != nil {
		return nil, err
	}

	// Fetch the created profile with relations
	created, err := s.repo.FindByID(profile.ID)
	if err != nil {
		return nil, err
	}

	return created.ToResponse(), nil
}

// Update updates an existing user profile
func (s *userProfileService) Update(id string, req *domain.UpdateUserProfileRequest) (*domain.UserProfileResponse, error) {
	profile, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}

	if req.IsActive != nil {
		profile.IsActive = *req.IsActive
	}

	if req.Preferences != nil {
		profile.Preferences = req.Preferences
	}

	if err := s.repo.Update(profile); err != nil {
		return nil, err
	}

	return profile.ToResponse(), nil
}

// Delete deletes a user profile by ID
func (s *userProfileService) Delete(id string) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserProfileNotFound
		}
		return err
	}

	return s.repo.Delete(id)
}

// GetWithFullDetails retrieves a user profile with all related data
func (s *userProfileService) GetWithFullDetails(id string) (*domain.UserProfileResponse, error) {
	profile, err := s.repo.FindWithFullDetails(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}
	return profile.ToResponse(), nil
}

// AssignRole assigns a role to a user
func (s *userProfileService) AssignRole(userID string, req *domain.AssignRoleToUserRequest, assignedBy *string) (*domain.UserRoleResponse, error) {
	// Verify user exists
	_, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}

	userRole, err := s.repo.AssignRole(userID, req, assignedBy)
	if err != nil {
		return nil, err
	}

	return userRole.ToResponse(), nil
}

// RemoveRole removes a role from a user
func (s *userProfileService) RemoveRole(userID string, roleID string) error {
	// Verify user exists
	_, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserProfileNotFound
		}
		return err
	}

	return s.repo.RemoveRole(userID, roleID)
}

// GetUserRoles returns all roles assigned to a user
func (s *userProfileService) GetUserRoles(userID string) ([]domain.UserRoleResponse, error) {
	roles, err := s.repo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.UserRoleResponse, len(roles))
	for i, r := range roles {
		responses[i] = *r.ToResponse()
	}
	return responses, nil
}

// AssignPosition assigns a position to a user
func (s *userProfileService) AssignPosition(userID string, req *domain.AssignPositionToUserRequest, appointedBy *string) (*domain.UserPositionResponse, error) {
	// Verify user exists
	_, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}

	userPosition, err := s.repo.AssignPosition(userID, req, appointedBy)
	if err != nil {
		return nil, err
	}

	return userPosition.ToResponse(), nil
}

// RemovePosition removes a position from a user
func (s *userProfileService) RemovePosition(userID string, positionID string) error {
	// Verify user exists
	_, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserProfileNotFound
		}
		return err
	}

	return s.repo.RemovePosition(userID, positionID)
}

// GetUserPositions returns all positions assigned to a user
func (s *userProfileService) GetUserPositions(userID string) ([]domain.UserPositionResponse, error) {
	positions, err := s.repo.GetUserPositions(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.UserPositionResponse, len(positions))
	for i, p := range positions {
		responses[i] = *p.ToResponse()
	}
	return responses, nil
}

// GrantPermission grants a permission directly to a user
func (s *userProfileService) GrantPermission(userID string, req *domain.AssignPermissionToUserRequest, grantedBy string) error {
	// Verify user exists
	_, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserProfileNotFound
		}
		return err
	}

	return s.repo.GrantPermission(userID, req, grantedBy)
}

// RevokePermission revokes a permission from a user
func (s *userProfileService) RevokePermission(userID string, permissionID string) error {
	// Verify user exists
	_, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserProfileNotFound
		}
		return err
	}

	return s.repo.RevokePermission(userID, permissionID)
}

// GetUserDirectPermissions returns all direct permissions assigned to a user
func (s *userProfileService) GetUserDirectPermissions(userID string) ([]domain.UserPermission, error) {
	return s.repo.GetUserDirectPermissions(userID)
}
