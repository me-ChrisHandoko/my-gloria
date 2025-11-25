package service

import (
	"errors"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrRoleNotFound      = errors.New("role not found")
	ErrRoleCodeExists    = errors.New("role code already exists")
	ErrCannotDeleteSystem = errors.New("cannot delete system role")
)

// RoleService defines the interface for role business logic
type RoleService interface {
	GetAll() ([]domain.RoleListResponse, error)
	GetAllPaginated(page, limit int, search string) ([]domain.RoleListResponse, int64, error)
	GetActive() ([]domain.RoleListResponse, error)
	GetByID(id string) (*domain.RoleResponse, error)
	GetByCode(code string) (*domain.RoleResponse, error)
	GetWithPermissions(id string) (*domain.RoleWithPermissionsResponse, error)
	Create(req *domain.CreateRoleRequest, createdBy *string) (*domain.RoleResponse, error)
	Update(id string, req *domain.UpdateRoleRequest) (*domain.RoleResponse, error)
	Delete(id string) error

	// Permission management
	AssignPermission(roleID string, req *domain.AssignPermissionToRoleRequest, grantedBy string) error
	RemovePermission(roleID, permissionID string) error
	GetRolePermissions(roleID string) ([]domain.PermissionListResponse, error)
}

type roleService struct {
	roleRepo       repository.RoleRepository
	permissionRepo repository.PermissionRepository
}

// NewRoleService creates a new role service instance
func NewRoleService(roleRepo repository.RoleRepository, permissionRepo repository.PermissionRepository) RoleService {
	return &roleService{
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
	}
}

func (s *roleService) GetAll() ([]domain.RoleListResponse, error) {
	roles, err := s.roleRepo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.RoleListResponse, len(roles))
	for i, r := range roles {
		responses[i] = *r.ToListResponse()
	}
	return responses, nil
}

func (s *roleService) GetAllPaginated(page, limit int, search string) ([]domain.RoleListResponse, int64, error) {
	roles, total, err := s.roleRepo.FindAllPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.RoleListResponse, len(roles))
	for i, r := range roles {
		responses[i] = *r.ToListResponse()
	}
	return responses, total, nil
}

func (s *roleService) GetActive() ([]domain.RoleListResponse, error) {
	roles, err := s.roleRepo.FindActive()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.RoleListResponse, len(roles))
	for i, r := range roles {
		responses[i] = *r.ToListResponse()
	}
	return responses, nil
}

func (s *roleService) GetByID(id string) (*domain.RoleResponse, error) {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return role.ToResponse(), nil
}

func (s *roleService) GetByCode(code string) (*domain.RoleResponse, error) {
	role, err := s.roleRepo.FindByCode(code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return role.ToResponse(), nil
}

func (s *roleService) GetWithPermissions(id string) (*domain.RoleWithPermissionsResponse, error) {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	rolePerms, err := s.roleRepo.GetRolePermissions(id)
	if err != nil {
		return nil, err
	}

	permissions := make([]domain.PermissionListResponse, 0)
	for _, rp := range rolePerms {
		if rp.Permission != nil && rp.IsEffective() {
			permissions = append(permissions, *rp.Permission.ToListResponse())
		}
	}

	return &domain.RoleWithPermissionsResponse{
		RoleResponse: *role.ToResponse(),
		Permissions:  permissions,
	}, nil
}

func (s *roleService) Create(req *domain.CreateRoleRequest, createdBy *string) (*domain.RoleResponse, error) {
	existing, _ := s.roleRepo.FindByCode(req.Code)
	if existing != nil {
		return nil, ErrRoleCodeExists
	}

	role := &domain.Role{
		ID:             uuid.New().String(),
		Code:           req.Code,
		Name:           req.Name,
		Description:    req.Description,
		HierarchyLevel: req.HierarchyLevel,
		IsSystemRole:   false,
		IsActive:       true,
		CreatedBy:      createdBy,
	}

	if req.IsSystemRole != nil {
		role.IsSystemRole = *req.IsSystemRole
	}

	if err := s.roleRepo.Create(role); err != nil {
		return nil, err
	}

	return role.ToResponse(), nil
}

func (s *roleService) Update(id string, req *domain.UpdateRoleRequest) (*domain.RoleResponse, error) {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	if req.Code != nil && *req.Code != role.Code {
		existing, _ := s.roleRepo.FindByCode(*req.Code)
		if existing != nil {
			return nil, ErrRoleCodeExists
		}
		role.Code = *req.Code
	}

	if req.Name != nil {
		role.Name = *req.Name
	}
	if req.Description != nil {
		role.Description = req.Description
	}
	if req.HierarchyLevel != nil {
		role.HierarchyLevel = *req.HierarchyLevel
	}
	if req.IsActive != nil {
		role.IsActive = *req.IsActive
	}

	if err := s.roleRepo.Update(role); err != nil {
		return nil, err
	}

	return role.ToResponse(), nil
}

func (s *roleService) Delete(id string) error {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	if role.IsSystemRole {
		return ErrCannotDeleteSystem
	}

	return s.roleRepo.Delete(id)
}

func (s *roleService) AssignPermission(roleID string, req *domain.AssignPermissionToRoleRequest, grantedBy string) error {
	_, err := s.roleRepo.FindByID(roleID)
	if err != nil {
		return ErrRoleNotFound
	}

	_, err = s.permissionRepo.FindByID(req.PermissionID)
	if err != nil {
		return ErrPermissionNotFound
	}

	rp := &domain.RolePermission{
		ID:           uuid.New().String(),
		RoleID:       roleID,
		PermissionID: req.PermissionID,
		IsGranted:    true,
		GrantedBy:    &grantedBy,
		GrantReason:  req.GrantReason,
		Conditions:   req.Conditions,
		EffectiveFrom: time.Now(),
	}

	if req.IsGranted != nil {
		rp.IsGranted = *req.IsGranted
	}
	if req.EffectiveFrom != nil {
		rp.EffectiveFrom = *req.EffectiveFrom
	}
	if req.EffectiveUntil != nil {
		rp.EffectiveUntil = req.EffectiveUntil
	}

	return s.roleRepo.AssignPermission(rp)
}

func (s *roleService) RemovePermission(roleID, permissionID string) error {
	return s.roleRepo.RemovePermission(roleID, permissionID)
}

func (s *roleService) GetRolePermissions(roleID string) ([]domain.PermissionListResponse, error) {
	rolePerms, err := s.roleRepo.GetRolePermissions(roleID)
	if err != nil {
		return nil, err
	}

	permissions := make([]domain.PermissionListResponse, 0)
	for _, rp := range rolePerms {
		if rp.Permission != nil && rp.IsEffective() {
			permissions = append(permissions, *rp.Permission.ToListResponse())
		}
	}

	return permissions, nil
}
