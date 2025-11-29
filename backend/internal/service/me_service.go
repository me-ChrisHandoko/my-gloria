package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// CurrentUserContext represents the complete context for the currently logged-in user
type CurrentUserContext struct {
	ID          string                      `json:"id"`
	ClerkUserID string                      `json:"clerk_user_id"`
	NIP         string                      `json:"nip"`
	IsActive    bool                        `json:"is_active"`
	Employee    *domain.DataKaryawanResponse `json:"employee,omitempty"`
	Roles       []RoleInfo                  `json:"roles"`
	Permissions []string                    `json:"permissions"`
	Modules     []ModuleInfo                `json:"modules"`
}

// RoleInfo represents simplified role information for the current user context
type RoleInfo struct {
	ID             string  `json:"id"`
	Code           string  `json:"code"`
	Name           string  `json:"name"`
	HierarchyLevel int     `json:"hierarchy_level"`
	Description    *string `json:"description,omitempty"`
}

// ModuleInfo represents simplified module information for the current user context
type ModuleInfo struct {
	ID          string              `json:"id"`
	Code        string              `json:"code"`
	Name        string              `json:"name"`
	Icon        *string             `json:"icon,omitempty"`
	Path        *string             `json:"path,omitempty"`
	Category    domain.ModuleCategory `json:"category"`
	ParentID    *string             `json:"parent_id,omitempty"`
	SortOrder   int                 `json:"sort_order"`
	Permissions []string            `json:"permissions,omitempty"`
}

// MeService defines the interface for current user context operations
type MeService interface {
	GetCurrentUserContext(userID string) (*CurrentUserContext, error)
	GetCurrentUserPermissions(userID string) ([]string, error)
	GetCurrentUserModules(userID string) ([]ModuleInfo, error)
}

type meService struct {
	userProfileRepo repository.UserProfileRepository
	permissionRepo  repository.PermissionRepository
	moduleRepo      repository.ModuleRepository
	employeeRepo    repository.EmployeeRepository
}

// NewMeService creates a new me service instance
func NewMeService(
	userProfileRepo repository.UserProfileRepository,
	permissionRepo repository.PermissionRepository,
	moduleRepo repository.ModuleRepository,
	employeeRepo repository.EmployeeRepository,
) MeService {
	return &meService{
		userProfileRepo: userProfileRepo,
		permissionRepo:  permissionRepo,
		moduleRepo:      moduleRepo,
		employeeRepo:    employeeRepo,
	}
}

// GetCurrentUserContext retrieves the complete context for the current user
func (s *meService) GetCurrentUserContext(userID string) (*CurrentUserContext, error) {
	// Get user profile with full details
	profile, err := s.userProfileRepo.FindWithFullDetails(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserProfileNotFound
		}
		return nil, err
	}

	// Build context
	ctx := &CurrentUserContext{
		ID:          profile.ID,
		ClerkUserID: profile.ClerkUserID,
		NIP:         profile.NIP,
		IsActive:    profile.IsActive,
		Roles:       make([]RoleInfo, 0),
		Permissions: make([]string, 0),
		Modules:     make([]ModuleInfo, 0),
	}

	// Add employee data if available
	if profile.DataKaryawan != nil {
		ctx.Employee = profile.DataKaryawan.ToResponse()
	} else {
		// Try to fetch employee data by NIP
		employee, err := s.employeeRepo.FindByNIP(profile.NIP)
		if err == nil && employee != nil {
			ctx.Employee = employee.ToResponse()
		}
	}

	// Extract roles from UserRoles
	for _, ur := range profile.UserRoles {
		if ur.IsActive && ur.Role != nil {
			ctx.Roles = append(ctx.Roles, RoleInfo{
				ID:             ur.Role.ID,
				Code:           ur.Role.Code,
				Name:           ur.Role.Name,
				HierarchyLevel: ur.Role.HierarchyLevel,
				Description:    ur.Role.Description,
			})
		}
	}

	// Get all permissions (includes role permissions and direct permissions)
	allPermissions, err := s.permissionRepo.GetUserAllPermissions(userID)
	if err == nil {
		for _, p := range allPermissions {
			ctx.Permissions = append(ctx.Permissions, p.Code)
		}
	}

	// Get accessible modules
	modules, err := s.moduleRepo.GetUserEffectiveModules(userID)
	if err == nil {
		for _, m := range modules {
			moduleInfo := ModuleInfo{
				ID:        m.ID,
				Code:      m.Code,
				Name:      m.Name,
				Icon:      m.Icon,
				Path:      m.Path,
				Category:  m.Category,
				ParentID:  m.ParentID,
				SortOrder: m.SortOrder,
			}
			ctx.Modules = append(ctx.Modules, moduleInfo)
		}
	}

	return ctx, nil
}

// GetCurrentUserPermissions retrieves all permissions for the current user
func (s *meService) GetCurrentUserPermissions(userID string) ([]string, error) {
	permissions, err := s.permissionRepo.GetUserAllPermissions(userID)
	if err != nil {
		return nil, err
	}

	codes := make([]string, len(permissions))
	for i, p := range permissions {
		codes[i] = p.Code
	}
	return codes, nil
}

// GetCurrentUserModules retrieves all accessible modules for the current user
func (s *meService) GetCurrentUserModules(userID string) ([]ModuleInfo, error) {
	modules, err := s.moduleRepo.GetUserEffectiveModules(userID)
	if err != nil {
		return nil, err
	}

	result := make([]ModuleInfo, len(modules))
	for i, m := range modules {
		result[i] = ModuleInfo{
			ID:        m.ID,
			Code:      m.Code,
			Name:      m.Name,
			Icon:      m.Icon,
			Path:      m.Path,
			Category:  m.Category,
			ParentID:  m.ParentID,
			SortOrder: m.SortOrder,
		}
	}
	return result, nil
}
