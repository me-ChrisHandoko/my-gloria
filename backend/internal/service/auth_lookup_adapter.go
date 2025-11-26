package service

import (
	"errors"
	"fmt"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	// ErrEmployeeNotRegistered indicates that the email is not found in data_karyawan
	ErrEmployeeNotRegistered = errors.New("email tidak terdaftar sebagai karyawan")
	// ErrEmailRequired indicates that email is required for auto-registration
	ErrEmailRequired = errors.New("email diperlukan untuk registrasi otomatis")
)

// AuthLookupAdapter adapts AuthService to middleware.UserProfileLookup interface
// It also handles auto-registration of new users by matching email with data_karyawan
type AuthLookupAdapter struct {
	userProfileRepo repository.UserProfileRepository
	employeeRepo    repository.EmployeeRepository
}

// NewAuthLookupAdapter creates a new auth lookup adapter
func NewAuthLookupAdapter(
	userProfileRepo repository.UserProfileRepository,
	employeeRepo repository.EmployeeRepository,
) middleware.UserProfileLookup {
	return &AuthLookupAdapter{
		userProfileRepo: userProfileRepo,
		employeeRepo:    employeeRepo,
	}
}

// GetOrCreateByClerkUserID implements middleware.UserProfileLookup
// It first tries to find an existing user profile by Clerk user ID.
// If not found, it attempts to auto-register by matching email with data_karyawan.
func (a *AuthLookupAdapter) GetOrCreateByClerkUserID(clerkUserID string, email string) (*middleware.UserProfileInfo, error) {
	// Try to find existing user profile by Clerk user ID
	profile, err := a.userProfileRepo.FindByClerkUserID(clerkUserID)
	if err == nil {
		// User exists, return profile info
		return a.buildUserProfileInfo(profile)
	}

	// Check if error is "not found" - if not, return the error
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// User not found - attempt auto-registration
	if email == "" {
		return nil, ErrEmailRequired
	}

	// Find employee by email in data_karyawan
	employee, err := a.employeeRepo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotRegistered
		}
		return nil, fmt.Errorf("gagal mencari data karyawan: %w", err)
	}

	// Check if NIP is already used by another user_profile
	existingByNIP, err := a.userProfileRepo.FindByNIP(employee.NIP)
	if err == nil && existingByNIP != nil {
		// NIP already exists - update the clerk_user_id instead of creating new
		// This handles the case where admin pre-created the profile
		existingByNIP.ClerkUserID = clerkUserID
		if err := a.userProfileRepo.Update(existingByNIP); err != nil {
			return nil, fmt.Errorf("gagal memperbarui user profile: %w", err)
		}
		return a.buildUserProfileInfo(existingByNIP)
	}

	// Create new user profile linked to the employee
	newProfile := &domain.UserProfile{
		ID:          uuid.New().String(),
		ClerkUserID: clerkUserID,
		NIP:         employee.NIP,
		IsActive:    true,
	}

	if err := a.userProfileRepo.Create(newProfile); err != nil {
		return nil, fmt.Errorf("gagal membuat user profile: %w", err)
	}

	// Return the newly created profile info
	return &middleware.UserProfileInfo{
		ID:          newProfile.ID,
		ClerkUserID: newProfile.ClerkUserID,
		NIP:         newProfile.NIP,
		IsActive:    newProfile.IsActive,
		Permissions: []string{},
		Roles:       []string{},
	}, nil
}

// buildUserProfileInfo loads full details and builds UserProfileInfo
func (a *AuthLookupAdapter) buildUserProfileInfo(profile *domain.UserProfile) (*middleware.UserProfileInfo, error) {
	// Load full details to get roles and permissions
	profileWithDetails, err := a.userProfileRepo.FindWithFullDetails(profile.ID)
	if err != nil {
		// If we can't load full details, return basic info
		return &middleware.UserProfileInfo{
			ID:          profile.ID,
			ClerkUserID: profile.ClerkUserID,
			NIP:         profile.NIP,
			IsActive:    profile.IsActive,
			Permissions: []string{},
			Roles:       []string{},
		}, nil
	}

	// Extract roles and permissions
	permissions := make([]string, 0)
	roles := make([]string, 0)

	for _, ur := range profileWithDetails.UserRoles {
		if ur.IsActive && ur.Role != nil {
			roles = append(roles, ur.Role.Code)
		}
	}

	for _, up := range profileWithDetails.UserPermissions {
		if up.IsGranted && up.Permission != nil {
			permissions = append(permissions, up.Permission.Code)
		}
	}

	return &middleware.UserProfileInfo{
		ID:          profile.ID,
		ClerkUserID: profile.ClerkUserID,
		NIP:         profile.NIP,
		IsActive:    profile.IsActive,
		Permissions: permissions,
		Roles:       roles,
	}, nil
}
