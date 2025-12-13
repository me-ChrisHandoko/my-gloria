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
// If not found, it attempts to auto-register by matching any of the provided emails with data_karyawan.
func (a *AuthLookupAdapter) GetOrCreateByClerkUserID(clerkUserID string, emails []string) (*middleware.UserProfileInfo, error) {
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
	if len(emails) == 0 {
		return nil, ErrEmailRequired
	}

	fmt.Printf("🔍 [AuthLookup] Attempting to find employee with %d email(s)\n", len(emails))
	fmt.Printf("   Emails to check: %v\n", emails)

	// Use optimized FindByEmails - single WHERE IN query (efficient even with 100 emails)
	employee, matchedEmail, err := a.employeeRepo.FindByEmails(emails)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			fmt.Printf("🚫 [AuthLookup] No employee found with any of the provided emails\n")
			return nil, ErrEmployeeNotRegistered
		}
		return nil, fmt.Errorf("gagal mencari data karyawan: %w", err)
	}

	fmt.Printf("✅ [AuthLookup] Match found with email: %s (NIP: %s)\n", matchedEmail, employee.NIP)

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
// IMPORTANT: gloria_master.data_karyawan.status_aktif is the authoritative source for user status (HR data)
// This function ensures that HR data takes precedence over user_profiles.is_active
func (a *AuthLookupAdapter) buildUserProfileInfo(profile *domain.UserProfile) (*middleware.UserProfileInfo, error) {
	// Load full details to get roles and permissions
	profileWithDetails, err := a.userProfileRepo.FindWithFullDetails(profile.ID)
	if err != nil {
		// If we can't load full details, try to check basic employee status from HR
		employee, empErr := a.employeeRepo.FindByNIP(profile.NIP)
		if empErr != nil {
			// Cannot verify employee status - deny access for safety
			return nil, fmt.Errorf("tidak dapat memverifikasi status karyawan dari data HR")
		}

		// Check employee status from HR data (authoritative source)
		isEmployeeActive := employee.StatusAktif != nil && *employee.StatusAktif == "Aktif"

		return &middleware.UserProfileInfo{
			ID:          profile.ID,
			ClerkUserID: profile.ClerkUserID,
			NIP:         profile.NIP,
			IsActive:    isEmployeeActive, // ✅ Use HR data as authoritative source
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

	// 🔑 CRITICAL: Always check data_karyawan.status_aktif as authoritative source
	// HR data (gloria_master.data_karyawan) takes precedence over user_profiles.is_active
	isActive := profile.IsActive // Default from user_profiles (fallback)

	if profileWithDetails.DataKaryawan != nil {
		// HR data is authoritative - check status_aktif from data_karyawan table
		if profileWithDetails.DataKaryawan.StatusAktif == nil {
			// No status info in HR data - deny access for safety
			fmt.Printf("⚠️  [Auth] No status_aktif for NIP %s - denying access\n", profile.NIP)
			isActive = false
		} else if *profileWithDetails.DataKaryawan.StatusAktif != "Aktif" {
			// HR marked as inactive - immediate denial regardless of user_profiles.is_active
			fmt.Printf("🚫 [Auth] Employee NIP %s marked as inactive by HR: status_aktif='%s'\n",
				profile.NIP, *profileWithDetails.DataKaryawan.StatusAktif)
			isActive = false
		} else {
			// HR data shows Aktif - allow access
			isActive = true
		}
	} else {
		// No employee record found in HR data - deny access for safety
		fmt.Printf("⚠️  [Auth] No data_karyawan record for NIP %s - denying access\n", profile.NIP)
		isActive = false
	}

	return &middleware.UserProfileInfo{
		ID:          profile.ID,
		ClerkUserID: profile.ClerkUserID,
		NIP:         profile.NIP,
		IsActive:    isActive, // ✅ Based on HR data (data_karyawan.status_aktif)
		Permissions: permissions,
		Roles:       roles,
	}, nil
}
