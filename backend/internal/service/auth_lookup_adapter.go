package service

import (
	"backend/internal/middleware"
	"backend/internal/repository"
)

// AuthLookupAdapter adapts AuthService to middleware.UserProfileLookup interface
type AuthLookupAdapter struct {
	userProfileRepo repository.UserProfileRepository
}

// NewAuthLookupAdapter creates a new auth lookup adapter
func NewAuthLookupAdapter(userProfileRepo repository.UserProfileRepository) middleware.UserProfileLookup {
	return &AuthLookupAdapter{
		userProfileRepo: userProfileRepo,
	}
}

// GetByClerkUserID implements middleware.UserProfileLookup
func (a *AuthLookupAdapter) GetByClerkUserID(clerkUserID string) (*middleware.UserProfileInfo, error) {
	profile, err := a.userProfileRepo.FindByClerkUserID(clerkUserID)
	if err != nil {
		return nil, err
	}

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
