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
	GetByID(id string) (*domain.UserProfileResponse, error)
	GetByClerkUserID(clerkUserID string) (*domain.UserProfileResponse, error)
	GetByNIP(nip string) (*domain.UserProfileResponse, error)
	Create(req *domain.CreateUserProfileRequest, createdBy *string) (*domain.UserProfileResponse, error)
	Update(id string, req *domain.UpdateUserProfileRequest) (*domain.UserProfileResponse, error)
	Delete(id string) error
	GetWithFullDetails(id string) (*domain.UserProfileResponse, error)
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
