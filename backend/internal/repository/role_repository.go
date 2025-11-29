package repository

import (
	"backend/internal/domain"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RoleRepository defines the interface for role data access
type RoleRepository interface {
	FindAll() ([]domain.Role, error)
	FindAllPaginated(page, limit int, search string) ([]domain.Role, int64, error)
	FindByID(id string) (*domain.Role, error)
	FindByCode(code string) (*domain.Role, error)
	FindActive() ([]domain.Role, error)
	FindByHierarchyLevel(level int) ([]domain.Role, error)
	Create(role *domain.Role) error
	Update(role *domain.Role) error
	Delete(id string) error
	Count() (int64, error)

	// Role permissions
	GetRolePermissions(roleID string) ([]domain.RolePermission, error)
	AssignPermission(rp *domain.RolePermission) error
	RemovePermission(roleID, permissionID string) error

	// Role hierarchy
	GetParentRoles(roleID string) ([]domain.Role, error)
	GetChildRoles(roleID string) ([]domain.Role, error)
	AddParentRole(roleID, parentRoleID string, inheritPermissions bool) error
	RemoveParentRole(roleID, parentRoleID string) error
}

type roleRepository struct {
	db *gorm.DB
}

// NewRoleRepository creates a new role repository instance
func NewRoleRepository(db *gorm.DB) RoleRepository {
	return &roleRepository{db: db}
}

func (r *roleRepository) FindAll() ([]domain.Role, error) {
	var roles []domain.Role
	if err := r.db.Order("hierarchy_level, name").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *roleRepository) FindAllPaginated(page, limit int, search string) ([]domain.Role, int64, error) {
	var roles []domain.Role
	var total int64

	query := r.db.Model(&domain.Role{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name LIKE ? OR code LIKE ? OR description LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := r.db.Where(query).Offset(offset).Limit(limit).Order("hierarchy_level, name").Find(&roles).Error; err != nil {
		return nil, 0, err
	}

	return roles, total, nil
}

func (r *roleRepository) FindByID(id string) (*domain.Role, error) {
	var role domain.Role
	if err := r.db.First(&role, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) FindByCode(code string) (*domain.Role, error) {
	var role domain.Role
	if err := r.db.First(&role, "code = ?", code).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *roleRepository) FindActive() ([]domain.Role, error) {
	var roles []domain.Role
	if err := r.db.Where("is_active = true").Order("hierarchy_level, name").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *roleRepository) FindByHierarchyLevel(level int) ([]domain.Role, error) {
	var roles []domain.Role
	if err := r.db.Where("hierarchy_level = ? AND is_active = true", level).Order("name").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *roleRepository) Create(role *domain.Role) error {
	return r.db.Create(role).Error
}

func (r *roleRepository) Update(role *domain.Role) error {
	return r.db.Save(role).Error
}

func (r *roleRepository) Delete(id string) error {
	return r.db.Delete(&domain.Role{}, "id = ?", id).Error
}

func (r *roleRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&domain.Role{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *roleRepository) GetRolePermissions(roleID string) ([]domain.RolePermission, error) {
	var perms []domain.RolePermission
	if err := r.db.Preload("Permission").
		Where("role_id = ?", roleID).
		Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

func (r *roleRepository) AssignPermission(rp *domain.RolePermission) error {
	return r.db.Create(rp).Error
}

func (r *roleRepository) RemovePermission(roleID, permissionID string) error {
	return r.db.Delete(&domain.RolePermission{}, "role_id = ? AND permission_id = ?", roleID, permissionID).Error
}

func (r *roleRepository) GetParentRoles(roleID string) ([]domain.Role, error) {
	var roles []domain.Role
	err := r.db.
		Joins("JOIN gloria_ops.role_hierarchy rh ON rh.parent_role_id = gloria_ops.roles.id").
		Where("rh.role_id = ?", roleID).
		Find(&roles).Error
	return roles, err
}

func (r *roleRepository) GetChildRoles(roleID string) ([]domain.Role, error) {
	var roles []domain.Role
	err := r.db.
		Joins("JOIN gloria_ops.role_hierarchy rh ON rh.role_id = gloria_ops.roles.id").
		Where("rh.parent_role_id = ?", roleID).
		Find(&roles).Error
	return roles, err
}

func (r *roleRepository) AddParentRole(roleID, parentRoleID string, inheritPermissions bool) error {
	hierarchy := &domain.RoleHierarchy{
		ID:                 generateUUID(),
		RoleID:             roleID,
		ParentRoleID:       parentRoleID,
		InheritPermissions: inheritPermissions,
	}
	return r.db.Create(hierarchy).Error
}

func (r *roleRepository) RemoveParentRole(roleID, parentRoleID string) error {
	return r.db.Delete(&domain.RoleHierarchy{}, "role_id = ? AND parent_role_id = ?", roleID, parentRoleID).Error
}

func generateUUID() string {
	return uuid.New().String()
}
