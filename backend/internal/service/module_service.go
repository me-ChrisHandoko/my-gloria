package service

import (
	"errors"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrModuleNotFound           = errors.New("module not found")
	ErrModuleCodeExists         = errors.New("module code already exists")
	ErrModuleHasChildren        = errors.New("cannot delete module with children")
	ErrModuleCircularReference  = errors.New("circular reference detected in module hierarchy")
	ErrInvalidCategory          = errors.New("invalid module category")
)

// ModuleService defines the interface for module business operations
type ModuleService interface {
	// Basic CRUD
	Create(req *domain.CreateModuleRequest, createdBy string) (*domain.ModuleResponse, error)
	GetByID(id string) (*domain.ModuleResponse, error)
	GetByCode(code string) (*domain.ModuleResponse, error)
	GetAll(page, limit int, search string) ([]domain.ModuleListResponse, int64, error)
	Update(id string, req *domain.UpdateModuleRequest, updatedBy string) (*domain.ModuleResponse, error)
	Delete(id string, deletedBy string, reason string) error

	// Queries
	GetActive() ([]domain.ModuleListResponse, error)
	GetByCategory(category domain.ModuleCategory) ([]domain.ModuleListResponse, error)
	GetByParentID(parentID *string) ([]domain.ModuleListResponse, error)
	GetTree() ([]domain.ModuleTreeResponse, error)
	GetCategories() []domain.ModuleCategory

	// Module Access
	GetRoleModuleAccess(roleID string) ([]domain.RoleModuleAccessResponse, error)
	GetUserModuleAccess(userID string) ([]domain.UserModuleAccessResponse, error)
	AssignRoleModuleAccess(roleID string, req *domain.AssignModuleAccessToRoleRequest, assignedBy string) error
	AssignUserModuleAccess(userID string, req *domain.AssignModuleAccessToUserRequest, assignedBy string) error
	RemoveRoleModuleAccess(roleID, moduleID string) error
	RemoveUserModuleAccess(userID, moduleID string) error
	GetUserEffectiveModules(userID string) ([]domain.ModuleListResponse, error)
}

// moduleService implements ModuleService
type moduleService struct {
	moduleRepo repository.ModuleRepository
}

// NewModuleService creates a new module service instance
func NewModuleService(moduleRepo repository.ModuleRepository) ModuleService {
	return &moduleService{moduleRepo: moduleRepo}
}

// Create creates a new module
func (s *moduleService) Create(req *domain.CreateModuleRequest, createdBy string) (*domain.ModuleResponse, error) {
	// Validate category
	if !req.Category.IsValid() {
		return nil, ErrInvalidCategory
	}

	module := &domain.Module{
		ID:          uuid.New().String(),
		Code:        req.Code,
		Name:        req.Name,
		Category:    req.Category,
		Description: req.Description,
		Icon:        req.Icon,
		Path:        req.Path,
		ParentID:    req.ParentID,
		IsActive:    true,
		IsVisible:   true,
		CreatedBy:   &createdBy,
	}

	if req.SortOrder != nil {
		module.SortOrder = *req.SortOrder
	}

	if req.IsVisible != nil {
		module.IsVisible = *req.IsVisible
	}

	if err := s.moduleRepo.Create(module); err != nil {
		if errors.Is(err, repository.ErrModuleCodeExists) {
			return nil, ErrModuleCodeExists
		}
		return nil, err
	}

	return module.ToResponse(), nil
}

// GetByID gets a module by ID
func (s *moduleService) GetByID(id string) (*domain.ModuleResponse, error) {
	module, err := s.moduleRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrModuleNotFound) {
			return nil, ErrModuleNotFound
		}
		return nil, err
	}
	return module.ToResponse(), nil
}

// GetByCode gets a module by code
func (s *moduleService) GetByCode(code string) (*domain.ModuleResponse, error) {
	module, err := s.moduleRepo.FindByCode(code)
	if err != nil {
		if errors.Is(err, repository.ErrModuleNotFound) {
			return nil, ErrModuleNotFound
		}
		return nil, err
	}
	return module.ToResponse(), nil
}

// GetAll gets all modules with pagination
func (s *moduleService) GetAll(page, limit int, search string) ([]domain.ModuleListResponse, int64, error) {
	modules, total, err := s.moduleRepo.FindAll(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.ModuleListResponse, len(modules))
	for i, m := range modules {
		responses[i] = *m.ToListResponse()
	}

	return responses, total, nil
}

// Update updates an existing module
func (s *moduleService) Update(id string, req *domain.UpdateModuleRequest, updatedBy string) (*domain.ModuleResponse, error) {
	module, err := s.moduleRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrModuleNotFound) {
			return nil, ErrModuleNotFound
		}
		return nil, err
	}

	// Apply updates
	if req.Code != nil {
		module.Code = *req.Code
	}
	if req.Name != nil {
		module.Name = *req.Name
	}
	if req.Category != nil {
		if !req.Category.IsValid() {
			return nil, ErrInvalidCategory
		}
		module.Category = *req.Category
	}
	if req.Description != nil {
		module.Description = req.Description
	}
	if req.Icon != nil {
		module.Icon = req.Icon
	}
	if req.Path != nil {
		module.Path = req.Path
	}
	if req.ParentID != nil {
		module.ParentID = req.ParentID
	}
	if req.SortOrder != nil {
		module.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		module.IsActive = *req.IsActive
	}
	if req.IsVisible != nil {
		module.IsVisible = *req.IsVisible
	}

	module.UpdatedBy = &updatedBy
	module.Version++

	if err := s.moduleRepo.Update(module); err != nil {
		if errors.Is(err, repository.ErrModuleCodeExists) {
			return nil, ErrModuleCodeExists
		}
		if errors.Is(err, repository.ErrCircularReference) {
			return nil, ErrModuleCircularReference
		}
		return nil, err
	}

	return module.ToResponse(), nil
}

// Delete deletes a module
func (s *moduleService) Delete(id string, deletedBy string, reason string) error {
	if err := s.moduleRepo.Delete(id, deletedBy, reason); err != nil {
		if errors.Is(err, repository.ErrModuleHasChildren) {
			return ErrModuleHasChildren
		}
		return err
	}
	return nil
}

// GetActive gets all active modules
func (s *moduleService) GetActive() ([]domain.ModuleListResponse, error) {
	modules, err := s.moduleRepo.FindActive()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ModuleListResponse, len(modules))
	for i, m := range modules {
		responses[i] = *m.ToListResponse()
	}

	return responses, nil
}

// GetByCategory gets modules by category
func (s *moduleService) GetByCategory(category domain.ModuleCategory) ([]domain.ModuleListResponse, error) {
	modules, err := s.moduleRepo.FindByCategory(category)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ModuleListResponse, len(modules))
	for i, m := range modules {
		responses[i] = *m.ToListResponse()
	}

	return responses, nil
}

// GetByParentID gets modules by parent ID
func (s *moduleService) GetByParentID(parentID *string) ([]domain.ModuleListResponse, error) {
	modules, err := s.moduleRepo.FindByParentID(parentID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ModuleListResponse, len(modules))
	for i, m := range modules {
		responses[i] = *m.ToListResponse()
	}

	return responses, nil
}

// GetTree gets the module tree structure
func (s *moduleService) GetTree() ([]domain.ModuleTreeResponse, error) {
	modules, err := s.moduleRepo.GetModuleTree()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ModuleTreeResponse, len(modules))
	for i, m := range modules {
		responses[i] = *m.ToTreeResponse()
	}

	return responses, nil
}

// GetCategories returns all valid module categories
func (s *moduleService) GetCategories() []domain.ModuleCategory {
	return domain.AllModuleCategories()
}

// GetRoleModuleAccess gets module access for a role
func (s *moduleService) GetRoleModuleAccess(roleID string) ([]domain.RoleModuleAccessResponse, error) {
	access, err := s.moduleRepo.GetRoleModuleAccess(roleID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.RoleModuleAccessResponse, len(access))
	for i, a := range access {
		responses[i] = domain.RoleModuleAccessResponse{
			ID:          a.ID,
			ModuleID:    a.ModuleID,
			PositionID:  a.PositionID,
			Permissions: a.Permissions,
			IsActive:    a.IsActive,
		}
		if a.Module != nil {
			responses[i].Module = a.Module.ToListResponse()
		}
	}

	return responses, nil
}

// GetUserModuleAccess gets module access for a user
func (s *moduleService) GetUserModuleAccess(userID string) ([]domain.UserModuleAccessResponse, error) {
	access, err := s.moduleRepo.GetUserModuleAccess(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.UserModuleAccessResponse, len(access))
	for i, a := range access {
		responses[i] = domain.UserModuleAccessResponse{
			ID:             a.ID,
			ModuleID:       a.ModuleID,
			Permissions:    a.Permissions,
			Reason:         a.Reason,
			IsActive:       a.IsActive,
			EffectiveFrom:  a.EffectiveFrom,
			EffectiveUntil: a.EffectiveUntil,
		}
		if a.Module != nil {
			responses[i].Module = a.Module.ToListResponse()
		}
	}

	return responses, nil
}

// AssignRoleModuleAccess assigns module access to a role
func (s *moduleService) AssignRoleModuleAccess(roleID string, req *domain.AssignModuleAccessToRoleRequest, assignedBy string) error {
	access := &domain.RoleModuleAccess{
		ID:          uuid.New().String(),
		RoleID:      roleID,
		ModuleID:    req.ModuleID,
		PositionID:  req.PositionID,
		Permissions: req.Permissions,
		IsActive:    true,
		CreatedBy:   &assignedBy,
	}

	return s.moduleRepo.AssignRoleModuleAccess(access)
}

// AssignUserModuleAccess assigns module access to a user
func (s *moduleService) AssignUserModuleAccess(userID string, req *domain.AssignModuleAccessToUserRequest, assignedBy string) error {
	effectiveFrom := time.Now()
	if req.EffectiveFrom != nil {
		effectiveFrom = *req.EffectiveFrom
	}

	access := &domain.UserModuleAccess{
		ID:             uuid.New().String(),
		UserProfileID:  userID,
		ModuleID:       req.ModuleID,
		Permissions:    req.Permissions,
		Reason:         req.Reason,
		GrantedBy:      assignedBy,
		IsActive:       true,
		EffectiveFrom:  effectiveFrom,
		EffectiveUntil: req.EffectiveUntil,
	}

	return s.moduleRepo.AssignUserModuleAccess(access)
}

// RemoveRoleModuleAccess removes module access from a role
func (s *moduleService) RemoveRoleModuleAccess(roleID, moduleID string) error {
	return s.moduleRepo.RemoveRoleModuleAccess(roleID, moduleID)
}

// RemoveUserModuleAccess removes module access from a user
func (s *moduleService) RemoveUserModuleAccess(userID, moduleID string) error {
	return s.moduleRepo.RemoveUserModuleAccess(userID, moduleID)
}

// GetUserEffectiveModules gets all modules a user has access to
func (s *moduleService) GetUserEffectiveModules(userID string) ([]domain.ModuleListResponse, error) {
	modules, err := s.moduleRepo.GetUserEffectiveModules(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ModuleListResponse, len(modules))
	for i, m := range modules {
		responses[i] = *m.ToListResponse()
	}

	return responses, nil
}

