package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

// PermissionRepository defines the interface for permission data access
type PermissionRepository interface {
	// Basic CRUD
	FindAll() ([]domain.Permission, error)
	FindByID(id string) (*domain.Permission, error)
	FindByCode(code string) (*domain.Permission, error)
	FindByResource(resource string) ([]domain.Permission, error)
	FindActive() ([]domain.Permission, error)
	Create(permission *domain.Permission) error
	Update(permission *domain.Permission) error
	Delete(id string) error

	// User permissions
	GetUserDirectPermissions(userID string) ([]domain.Permission, error)
	GetUserRolePermissions(userID string) ([]domain.Permission, error)
	GetUserAllPermissions(userID string) ([]domain.Permission, error)

	// Role permissions
	GetRolePermissions(roleID string) ([]domain.Permission, error)
	GetRoleHierarchyPermissions(roleID string) ([]domain.Permission, error)
}

type permissionRepository struct {
	db *gorm.DB
}

// NewPermissionRepository creates a new permission repository instance
func NewPermissionRepository(db *gorm.DB) PermissionRepository {
	return &permissionRepository{db: db}
}

// FindAll returns all permissions
func (r *permissionRepository) FindAll() ([]domain.Permission, error) {
	var permissions []domain.Permission
	if err := r.db.Order("resource, action").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// FindByID finds a permission by ID
func (r *permissionRepository) FindByID(id string) (*domain.Permission, error) {
	var permission domain.Permission
	if err := r.db.First(&permission, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &permission, nil
}

// FindByCode finds a permission by code
func (r *permissionRepository) FindByCode(code string) (*domain.Permission, error) {
	var permission domain.Permission
	if err := r.db.First(&permission, "code = ?", code).Error; err != nil {
		return nil, err
	}
	return &permission, nil
}

// FindByResource returns all permissions for a resource
func (r *permissionRepository) FindByResource(resource string) ([]domain.Permission, error) {
	var permissions []domain.Permission
	if err := r.db.Where("resource = ? AND is_active = true", resource).
		Order("action").
		Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// FindActive returns all active permissions
func (r *permissionRepository) FindActive() ([]domain.Permission, error) {
	var permissions []domain.Permission
	if err := r.db.Where("is_active = true").
		Order("resource, action").
		Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// Create creates a new permission
func (r *permissionRepository) Create(permission *domain.Permission) error {
	return r.db.Create(permission).Error
}

// Update updates an existing permission
func (r *permissionRepository) Update(permission *domain.Permission) error {
	return r.db.Save(permission).Error
}

// Delete soft deletes a permission
func (r *permissionRepository) Delete(id string) error {
	return r.db.Delete(&domain.Permission{}, "id = ?", id).Error
}

// GetUserDirectPermissions returns permissions directly assigned to a user
// Checks effective dates to ensure only currently valid permissions are returned
func (r *permissionRepository) GetUserDirectPermissions(userID string) ([]domain.Permission, error) {
	var permissions []domain.Permission
	err := r.db.
		Joins("JOIN gloria_ops.user_permissions up ON up.permission_id = gloria_ops.permissions.id").
		Where("up.user_profile_id = ? AND up.is_granted = true", userID).
		Where("up.effective_from <= NOW()").
		Where("up.effective_until IS NULL OR up.effective_until > NOW()").
		Where("gloria_ops.permissions.is_active = true").
		Find(&permissions).Error
	if err != nil {
		return nil, err
	}
	return permissions, nil
}

// GetUserRolePermissions returns permissions from user's roles (direct roles only, no hierarchy)
// Checks effective dates for both user_roles and role_permissions
func (r *permissionRepository) GetUserRolePermissions(userID string) ([]domain.Permission, error) {
	var permissions []domain.Permission
	err := r.db.
		Distinct().
		Joins("JOIN gloria_ops.role_permissions rp ON rp.permission_id = gloria_ops.permissions.id").
		Joins("JOIN gloria_ops.user_roles ur ON ur.role_id = rp.role_id").
		Where("ur.user_profile_id = ? AND ur.is_active = true AND rp.is_granted = true", userID).
		Where("ur.effective_from <= NOW()").
		Where("ur.effective_until IS NULL OR ur.effective_until > NOW()").
		Where("rp.effective_from <= NOW()").
		Where("rp.effective_until IS NULL OR rp.effective_until > NOW()").
		Where("gloria_ops.permissions.is_active = true").
		Find(&permissions).Error
	if err != nil {
		return nil, err
	}
	return permissions, nil
}

// GetUserAllPermissions returns all effective permissions for a user
// This includes direct permissions, role permissions, and inherited role permissions via hierarchy
// All temporal validations (effective_from/effective_until) are enforced
func (r *permissionRepository) GetUserAllPermissions(userID string) ([]domain.Permission, error) {
	var permissions []domain.Permission

	// Use recursive CTE to properly traverse role hierarchy
	// This ensures users inherit permissions from parent roles
	// All effective dates are validated for user_roles, user_permissions, and role_permissions
	query := `
		WITH RECURSIVE user_role_tree AS (
			-- Base: user's direct roles (with temporal validation)
			SELECT r.id as role_id
			FROM gloria_ops.roles r
			JOIN gloria_ops.user_roles ur ON ur.role_id = r.id
			WHERE ur.user_profile_id = ?
				AND ur.is_active = true
				AND r.is_active = true
				AND ur.effective_from <= NOW()
				AND (ur.effective_until IS NULL OR ur.effective_until > NOW())

			UNION

			-- Recursive: parent roles (roles that child roles inherit from)
			-- rh.role_id is the child, rh.parent_role_id is the parent
			SELECT rh.parent_role_id as role_id
			FROM gloria_ops.role_hierarchy rh
			JOIN user_role_tree urt ON urt.role_id = rh.role_id
			JOIN gloria_ops.roles r ON r.id = rh.parent_role_id
			WHERE rh.inherit_permissions = true AND r.is_active = true
		)
		SELECT DISTINCT p.* FROM gloria_ops.permissions p
		WHERE p.is_active = true AND (
			-- Direct user permissions (with temporal validation)
			p.id IN (
				SELECT permission_id FROM gloria_ops.user_permissions
				WHERE user_profile_id = ?
					AND is_granted = true
					AND effective_from <= NOW()
					AND (effective_until IS NULL OR effective_until > NOW())
			)
			OR
			-- All role permissions (direct + inherited via hierarchy, with temporal validation)
			p.id IN (
				SELECT rp.permission_id
				FROM gloria_ops.role_permissions rp
				JOIN user_role_tree urt ON urt.role_id = rp.role_id
				WHERE rp.is_granted = true
					AND rp.effective_from <= NOW()
					AND (rp.effective_until IS NULL OR rp.effective_until > NOW())
			)
		)
		ORDER BY p.resource, p.action
	`

	if err := r.db.Raw(query, userID, userID).Scan(&permissions).Error; err != nil {
		return nil, err
	}

	return permissions, nil
}

// GetRolePermissions returns permissions for a specific role
func (r *permissionRepository) GetRolePermissions(roleID string) ([]domain.Permission, error) {
	var permissions []domain.Permission
	err := r.db.
		Joins("JOIN gloria_ops.role_permissions rp ON rp.permission_id = gloria_ops.permissions.id").
		Where("rp.role_id = ? AND rp.is_granted = true", roleID).
		Where("gloria_ops.permissions.is_active = true").
		Find(&permissions).Error
	if err != nil {
		return nil, err
	}
	return permissions, nil
}

// GetRoleHierarchyPermissions returns permissions including inherited from parent roles
// Uses recursive CTE to traverse role hierarchy and collect all inherited permissions
func (r *permissionRepository) GetRoleHierarchyPermissions(roleID string) ([]domain.Permission, error) {
	var permissions []domain.Permission

	query := `
		WITH RECURSIVE role_tree AS (
			-- Base: the role itself
			SELECT id FROM gloria_ops.roles WHERE id = ? AND is_active = true
			UNION
			-- Recursive: parent roles (traverse from child to parent)
			-- rh.role_id is the child, rh.parent_role_id is the parent
			SELECT rh.parent_role_id as id
			FROM gloria_ops.role_hierarchy rh
			JOIN role_tree rt ON rt.id = rh.role_id
			JOIN gloria_ops.roles r ON r.id = rh.parent_role_id
			WHERE rh.inherit_permissions = true AND r.is_active = true
		)
		SELECT DISTINCT p.*
		FROM gloria_ops.permissions p
		JOIN gloria_ops.role_permissions rp ON rp.permission_id = p.id
		JOIN role_tree rt ON rt.id = rp.role_id
		WHERE p.is_active = true AND rp.is_granted = true
		ORDER BY p.resource, p.action
	`

	if err := r.db.Raw(query, roleID).Scan(&permissions).Error; err != nil {
		return nil, err
	}

	return permissions, nil
}
