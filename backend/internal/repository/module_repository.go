package repository

import (
	"errors"

	"backend/internal/domain"

	"gorm.io/gorm"
)

var (
	ErrModuleNotFound      = errors.New("module not found")
	ErrModuleCodeExists    = errors.New("module code already exists")
	ErrModuleHasChildren   = errors.New("module has child modules")
	ErrCircularReference   = errors.New("circular reference detected")
)

// ModuleRepository defines the interface for module data operations
type ModuleRepository interface {
	// Basic CRUD
	Create(module *domain.Module) error
	FindByID(id string) (*domain.Module, error)
	FindByCode(code string) (*domain.Module, error)
	FindAll(page, limit int, search string) ([]domain.Module, int64, error)
	Update(module *domain.Module) error
	Delete(id string, deletedBy string, reason string) error
	Count() (int64, error)
	CountActive() (int64, error)

	// Queries
	FindActive() ([]domain.Module, error)
	FindByCategory(category domain.ModuleCategory) ([]domain.Module, error)
	FindByParentID(parentID *string) ([]domain.Module, error)
	FindRootModules() ([]domain.Module, error)
	FindWithChildren(id string) (*domain.Module, error)
	GetModuleTree() ([]domain.Module, error)

	// Module Access
	GetRoleModuleAccess(roleID string) ([]domain.RoleModuleAccess, error)
	GetUserModuleAccess(userID string) ([]domain.UserModuleAccess, error)
	AssignRoleModuleAccess(access *domain.RoleModuleAccess) error
	AssignUserModuleAccess(access *domain.UserModuleAccess) error
	RemoveRoleModuleAccess(roleID, moduleID string) error
	RemoveUserModuleAccess(userID, moduleID string) error
	GetUserEffectiveModules(userID string) ([]domain.Module, error)
}

// moduleRepository implements ModuleRepository
type moduleRepository struct {
	db *gorm.DB
}

// NewModuleRepository creates a new module repository instance
func NewModuleRepository(db *gorm.DB) ModuleRepository {
	return &moduleRepository{db: db}
}

// Create creates a new module
func (r *moduleRepository) Create(module *domain.Module) error {
	// Check for duplicate code
	var existing domain.Module
	if err := r.db.Where("code = ?", module.Code).First(&existing).Error; err == nil {
		return ErrModuleCodeExists
	}

	return r.db.Create(module).Error
}

// FindByID finds a module by ID
func (r *moduleRepository) FindByID(id string) (*domain.Module, error) {
	var module domain.Module
	if err := r.db.Preload("Parent").First(&module, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrModuleNotFound
		}
		return nil, err
	}
	return &module, nil
}

// FindByCode finds a module by code
func (r *moduleRepository) FindByCode(code string) (*domain.Module, error) {
	var module domain.Module
	if err := r.db.Preload("Parent").First(&module, "code = ?", code).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrModuleNotFound
		}
		return nil, err
	}
	return &module, nil
}

// FindAll finds all modules with pagination and search
func (r *moduleRepository) FindAll(page, limit int, search string) ([]domain.Module, int64, error) {
	var modules []domain.Module
	var total int64

	query := r.db.Model(&domain.Module{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Preload("Parent").
		Order("sort_order ASC, name ASC").
		Offset(offset).
		Limit(limit).
		Find(&modules).Error; err != nil {
		return nil, 0, err
	}

	return modules, total, nil
}

// Update updates an existing module
func (r *moduleRepository) Update(module *domain.Module) error {
	// Check for duplicate code (excluding current module)
	var existing domain.Module
	if err := r.db.Where("code = ? AND id != ?", module.Code, module.ID).First(&existing).Error; err == nil {
		return ErrModuleCodeExists
	}

	// Check for circular reference if parent is being changed
	if module.ParentID != nil {
		if err := r.checkCircularReference(module.ID, *module.ParentID); err != nil {
			return err
		}
	}

	return r.db.Save(module).Error
}

// Delete soft-deletes a module
func (r *moduleRepository) Delete(id string, deletedBy string, reason string) error {
	// Check if module has children
	var childCount int64
	if err := r.db.Model(&domain.Module{}).Where("parent_id = ?", id).Count(&childCount).Error; err != nil {
		return err
	}
	if childCount > 0 {
		return ErrModuleHasChildren
	}

	// Soft delete with metadata
	return r.db.Model(&domain.Module{}).Where("id = ?", id).Updates(map[string]interface{}{
		"deleted_by":    deletedBy,
		"delete_reason": reason,
	}).Delete(&domain.Module{}).Error
}

// Count returns the total number of modules
func (r *moduleRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&domain.Module{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// CountActive returns the number of active modules
func (r *moduleRepository) CountActive() (int64, error) {
	var count int64
	if err := r.db.Model(&domain.Module{}).Where("is_active = ?", true).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// FindActive finds all active modules
func (r *moduleRepository) FindActive() ([]domain.Module, error) {
	var modules []domain.Module
	if err := r.db.Where("is_active = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&modules).Error; err != nil {
		return nil, err
	}
	return modules, nil
}

// FindByCategory finds modules by category
func (r *moduleRepository) FindByCategory(category domain.ModuleCategory) ([]domain.Module, error) {
	var modules []domain.Module
	if err := r.db.Where("category = ?", category).
		Order("sort_order ASC, name ASC").
		Find(&modules).Error; err != nil {
		return nil, err
	}
	return modules, nil
}

// FindByParentID finds modules by parent ID
func (r *moduleRepository) FindByParentID(parentID *string) ([]domain.Module, error) {
	var modules []domain.Module
	query := r.db.Order("sort_order ASC, name ASC")

	if parentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}

	if err := query.Find(&modules).Error; err != nil {
		return nil, err
	}
	return modules, nil
}

// FindRootModules finds all root modules (no parent)
func (r *moduleRepository) FindRootModules() ([]domain.Module, error) {
	return r.FindByParentID(nil)
}

// FindWithChildren finds a module with all its children loaded
func (r *moduleRepository) FindWithChildren(id string) (*domain.Module, error) {
	var module domain.Module
	if err := r.db.Preload("Children", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC, name ASC")
	}).First(&module, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrModuleNotFound
		}
		return nil, err
	}
	return &module, nil
}

// GetModuleTree returns all modules structured as a tree
func (r *moduleRepository) GetModuleTree() ([]domain.Module, error) {
	var modules []domain.Module

	// Get all modules ordered properly
	if err := r.db.Where("is_active = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&modules).Error; err != nil {
		return nil, err
	}

	// Build tree structure
	moduleMap := make(map[string]*domain.Module)
	for i := range modules {
		moduleMap[modules[i].ID] = &modules[i]
	}

	var rootModules []domain.Module
	for i := range modules {
		if modules[i].ParentID == nil {
			rootModules = append(rootModules, modules[i])
		} else if parent, ok := moduleMap[*modules[i].ParentID]; ok {
			parent.Children = append(parent.Children, modules[i])
		}
	}

	return rootModules, nil
}

// GetRoleModuleAccess gets module access for a role
func (r *moduleRepository) GetRoleModuleAccess(roleID string) ([]domain.RoleModuleAccess, error) {
	var access []domain.RoleModuleAccess
	if err := r.db.Preload("Module").Preload("Position").
		Where("role_id = ? AND is_active = ?", roleID, true).
		Find(&access).Error; err != nil {
		return nil, err
	}
	return access, nil
}

// GetUserModuleAccess gets module access for a user
func (r *moduleRepository) GetUserModuleAccess(userID string) ([]domain.UserModuleAccess, error) {
	var access []domain.UserModuleAccess
	if err := r.db.Preload("Module").
		Where("user_profile_id = ? AND is_active = ?", userID, true).
		Find(&access).Error; err != nil {
		return nil, err
	}
	return access, nil
}

// AssignRoleModuleAccess assigns module access to a role
func (r *moduleRepository) AssignRoleModuleAccess(access *domain.RoleModuleAccess) error {
	// Check for existing access
	var existing domain.RoleModuleAccess
	err := r.db.Where("role_id = ? AND module_id = ?", access.RoleID, access.ModuleID).First(&existing).Error
	if err == nil {
		// Update existing
		existing.Permissions = access.Permissions
		existing.PositionID = access.PositionID
		existing.IsActive = true
		existing.Version++
		return r.db.Save(&existing).Error
	}

	return r.db.Create(access).Error
}

// AssignUserModuleAccess assigns module access to a user
func (r *moduleRepository) AssignUserModuleAccess(access *domain.UserModuleAccess) error {
	// Check for existing access
	var existing domain.UserModuleAccess
	err := r.db.Where("user_profile_id = ? AND module_id = ?", access.UserProfileID, access.ModuleID).First(&existing).Error
	if err == nil {
		// Update existing
		existing.Permissions = access.Permissions
		existing.Reason = access.Reason
		existing.IsActive = true
		existing.EffectiveFrom = access.EffectiveFrom
		existing.EffectiveUntil = access.EffectiveUntil
		existing.Version++
		return r.db.Save(&existing).Error
	}

	return r.db.Create(access).Error
}

// RemoveRoleModuleAccess removes module access from a role
func (r *moduleRepository) RemoveRoleModuleAccess(roleID, moduleID string) error {
	return r.db.Model(&domain.RoleModuleAccess{}).
		Where("role_id = ? AND module_id = ?", roleID, moduleID).
		Update("is_active", false).Error
}

// RemoveUserModuleAccess removes module access from a user
func (r *moduleRepository) RemoveUserModuleAccess(userID, moduleID string) error {
	return r.db.Model(&domain.UserModuleAccess{}).
		Where("user_profile_id = ? AND module_id = ?", userID, moduleID).
		Update("is_active", false).Error
}

// GetUserEffectiveModules gets all modules a user has access to (via roles and direct assignment)
func (r *moduleRepository) GetUserEffectiveModules(userID string) ([]domain.Module, error) {
	var modules []domain.Module

	// Get modules via direct user assignment
	directQuery := `
		SELECT DISTINCT m.* FROM gloria_ops.modules m
		INNER JOIN gloria_ops.user_module_access uma ON m.id = uma.module_id
		WHERE uma.user_profile_id = ?
		AND uma.is_active = true
		AND m.is_active = true
		AND m.deleted_at IS NULL
		AND (uma.effective_until IS NULL OR uma.effective_until > NOW())
	`

	// Get modules via role assignment
	roleQuery := `
		SELECT DISTINCT m.* FROM gloria_ops.modules m
		INNER JOIN gloria_ops.role_module_access rma ON m.id = rma.module_id
		INNER JOIN gloria_ops.user_roles ur ON rma.role_id = ur.role_id
		WHERE ur.user_profile_id = ?
		AND ur.is_active = true
		AND rma.is_active = true
		AND m.is_active = true
		AND m.deleted_at IS NULL
		AND (ur.effective_until IS NULL OR ur.effective_until > NOW())
	`

	// Combine both queries
	combinedQuery := `
		SELECT * FROM (
			(` + directQuery + `)
			UNION
			(` + roleQuery + `)
		) combined
		ORDER BY sort_order ASC, name ASC
	`

	if err := r.db.Raw(combinedQuery, userID, userID).Scan(&modules).Error; err != nil {
		return nil, err
	}

	return modules, nil
}

// checkCircularReference checks if setting parentID would create a circular reference
func (r *moduleRepository) checkCircularReference(moduleID, parentID string) error {
	if moduleID == parentID {
		return ErrCircularReference
	}

	visited := make(map[string]bool)
	currentID := parentID

	for currentID != "" {
		if visited[currentID] {
			return ErrCircularReference
		}
		if currentID == moduleID {
			return ErrCircularReference
		}
		visited[currentID] = true

		var parent domain.Module
		if err := r.db.Select("id", "parent_id").First(&parent, "id = ?", currentID).Error; err != nil {
			break
		}
		if parent.ParentID == nil {
			break
		}
		currentID = *parent.ParentID
	}

	return nil
}
