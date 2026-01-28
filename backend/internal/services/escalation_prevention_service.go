package services

import (
	"backend/internal/models"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// EscalationPreventionService prevents privilege escalation attacks
// Ensures users can only assign permissions/roles they have at the same or lower level
type EscalationPreventionService struct {
	db       *gorm.DB
	resolver *PermissionResolverService
}

// NewEscalationPreventionService creates a new escalation prevention service
func NewEscalationPreventionService(db *gorm.DB, resolver *PermissionResolverService) *EscalationPreventionService {
	return &EscalationPreventionService{
		db:       db,
		resolver: resolver,
	}
}

// EscalationError represents an escalation prevention error
type EscalationError struct {
	Message  string
	UserID   string
	TargetID string
	Action   string
}

func (e *EscalationError) Error() string {
	return e.Message
}

// ValidateRoleAssignment validates if assigner can assign a role to target user
// Rules:
// 1. Assigner must have ASSIGN permission on roles resource
// 2. Assigner can only assign roles at same level or lower (higher hierarchy_level number)
// 3. Cannot assign system roles unless assigner has system admin privileges
func (s *EscalationPreventionService) ValidateRoleAssignment(assignerID, targetUserID, roleID string) error {
	// 1. Check ASSIGN permission
	hasPermission, err := s.resolver.HasPermission(assignerID, "roles", models.PermissionActionAssign)
	if err != nil {
		return fmt.Errorf("failed to check assign permission: %w", err)
	}
	if !hasPermission {
		return &EscalationError{
			Message:  "insufficient permission: cannot assign roles",
			UserID:   assignerID,
			TargetID: targetUserID,
			Action:   "role_assignment",
		}
	}

	// 2. Get role being assigned
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("role not found: %s", roleID)
		}
		return err
	}

	// 3. Check system role restriction
	if role.IsSystemRole {
		// Check if assigner has system admin permission
		hasSystemAdmin, err := s.resolver.HasPermission(assignerID, "system", models.PermissionActionAssign)
		if err != nil {
			return fmt.Errorf("failed to check system admin permission: %w", err)
		}
		if !hasSystemAdmin {
			return &EscalationError{
				Message:  "cannot assign system role without system admin privileges",
				UserID:   assignerID,
				TargetID: targetUserID,
				Action:   "system_role_assignment",
			}
		}
	}

	// 4. Check hierarchy level
	assignerLevel, err := s.resolver.GetUserHighestRoleLevel(assignerID)
	if err != nil {
		return fmt.Errorf("failed to get assigner role level: %w", err)
	}

	if role.HierarchyLevel < assignerLevel {
		return &EscalationError{
			Message:  fmt.Sprintf("privilege escalation denied: cannot assign role with hierarchy level %d (your level: %d)", role.HierarchyLevel, assignerLevel),
			UserID:   assignerID,
			TargetID: targetUserID,
			Action:   "hierarchy_violation",
		}
	}

	return nil
}

// ValidatePermissionGrant validates if granter can grant a permission to target user
// Rules:
// 1. Granter must have the permission themselves
// 2. Granter must have ASSIGN permission on permissions resource
// 3. Cannot grant permissions with higher scope than granter has
func (s *EscalationPreventionService) ValidatePermissionGrant(granterID, targetUserID, permissionID string) error {
	// 1. Get permission being granted
	var permission models.Permission
	if err := s.db.First(&permission, "id = ?", permissionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("permission not found: %s", permissionID)
		}
		return err
	}

	// 2. Check if granter can assign permissions
	hasAssignPermission, err := s.resolver.HasPermission(granterID, "permissions", models.PermissionActionAssign)
	if err != nil {
		return fmt.Errorf("failed to check assign permission: %w", err)
	}
	if !hasAssignPermission {
		return &EscalationError{
			Message:  "insufficient permission: cannot grant permissions",
			UserID:   granterID,
			TargetID: targetUserID,
			Action:   "permission_grant",
		}
	}

	// 3. Check if granter has the permission themselves
	granterHasPermission, err := s.resolver.HasPermission(granterID, permission.Resource, permission.Action)
	if err != nil {
		return fmt.Errorf("failed to check granter permission: %w", err)
	}
	if !granterHasPermission {
		return &EscalationError{
			Message:  fmt.Sprintf("privilege escalation denied: cannot grant permission '%s' that you don't have", permission.Code),
			UserID:   granterID,
			TargetID: targetUserID,
			Action:   "permission_escalation",
		}
	}

	// 4. Check scope escalation if permission has scope
	if permission.Scope != nil {
		err := s.validateScopeEscalation(granterID, permission)
		if err != nil {
			return err
		}
	}

	return nil
}

// validateScopeEscalation ensures granter has equal or broader scope
func (s *EscalationPreventionService) validateScopeEscalation(granterID string, permission models.Permission) error {
	// Get granter's effective permissions for this resource/action
	result, err := s.resolver.CheckPermission(granterID, PermissionCheckRequest{
		Resource: permission.Resource,
		Action:   permission.Action,
		Scope:    permission.Scope,
	})
	if err != nil {
		return fmt.Errorf("failed to check granter scope: %w", err)
	}

	if !result.Allowed {
		return &EscalationError{
			Message:  fmt.Sprintf("scope escalation denied: cannot grant %s scope permission when you don't have it", *permission.Scope),
			UserID:   granterID,
			TargetID: "",
			Action:   "scope_escalation",
		}
	}

	return nil
}

// ValidatePositionAssignment validates if assigner can assign a position to target user
// Rules:
// 1. Assigner must have ASSIGN permission on positions resource
// 2. Assigner's hierarchy level must be higher (lower number) than position's level
// 3. Cannot assign positions in departments/schools without appropriate scope
func (s *EscalationPreventionService) ValidatePositionAssignment(assignerID, targetUserID, positionID string) error {
	// 1. Check ASSIGN permission
	hasPermission, err := s.resolver.HasPermission(assignerID, "positions", models.PermissionActionAssign)
	if err != nil {
		return fmt.Errorf("failed to check assign permission: %w", err)
	}
	if !hasPermission {
		return &EscalationError{
			Message:  "insufficient permission: cannot assign positions",
			UserID:   assignerID,
			TargetID: targetUserID,
			Action:   "position_assignment",
		}
	}

	// 2. Get position being assigned
	var position models.Position
	if err := s.db.Preload("Department").Preload("School").First(&position, "id = ?", positionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("position not found: %s", positionID)
		}
		return err
	}

	// 3. Check if assigner has appropriate scope for the position's department/school
	if position.SchoolID != nil {
		err := s.validateSchoolScope(assignerID, *position.SchoolID)
		if err != nil {
			return err
		}
	}

	if position.DepartmentID != nil {
		err := s.validateDepartmentScope(assignerID, *position.DepartmentID)
		if err != nil {
			return err
		}
	}

	return nil
}

// validateSchoolScope checks if user has permission scope for the school
func (s *EscalationPreventionService) validateSchoolScope(userID, schoolID string) error {
	// Check if user has ALL scope or SCHOOL scope for the specific school
	result, err := s.resolver.CheckPermission(userID, PermissionCheckRequest{
		Resource: "positions",
		Action:   models.PermissionActionAssign,
		Scope:    ptr(models.PermissionScopeSchool),
	})
	if err != nil {
		return fmt.Errorf("failed to check school scope: %w", err)
	}

	if !result.Allowed {
		// Check if user has ALL scope
		allResult, err := s.resolver.CheckPermission(userID, PermissionCheckRequest{
			Resource: "positions",
			Action:   models.PermissionActionAssign,
			Scope:    ptr(models.PermissionScopeAll),
		})
		if err != nil {
			return fmt.Errorf("failed to check all scope: %w", err)
		}

		if !allResult.Allowed {
			return &EscalationError{
				Message:  "insufficient scope: cannot assign position in this school",
				UserID:   userID,
				TargetID: schoolID,
				Action:   "school_scope_violation",
			}
		}
	}

	return nil
}

// validateDepartmentScope checks if user has permission scope for the department
func (s *EscalationPreventionService) validateDepartmentScope(userID, departmentID string) error {
	// Check if user has DEPARTMENT scope or higher
	result, err := s.resolver.CheckPermission(userID, PermissionCheckRequest{
		Resource: "positions",
		Action:   models.PermissionActionAssign,
		Scope:    ptr(models.PermissionScopeDepartment),
	})
	if err != nil {
		return fmt.Errorf("failed to check department scope: %w", err)
	}

	if !result.Allowed {
		return &EscalationError{
			Message:  "insufficient scope: cannot assign position in this department",
			UserID:   userID,
			TargetID: departmentID,
			Action:   "department_scope_violation",
		}
	}

	return nil
}

// ValidateModuleAccessGrant validates if granter can grant module access to target
func (s *EscalationPreventionService) ValidateModuleAccessGrant(granterID, targetUserID, moduleID string, permissions []string) error {
	// 1. Get module
	var module models.Module
	if err := s.db.First(&module, "id = ?", moduleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("module not found: %s", moduleID)
		}
		return err
	}

	// 2. Check if granter has module access
	// Granter must have at least the same permissions they're granting
	for _, perm := range permissions {
		action := models.PermissionAction(perm)
		hasPermission, err := s.resolver.HasPermission(granterID, module.Code, action)
		if err != nil {
			return fmt.Errorf("failed to check granter module permission: %w", err)
		}
		if !hasPermission {
			return &EscalationError{
				Message:  fmt.Sprintf("privilege escalation denied: cannot grant '%s' permission on module '%s' that you don't have", perm, module.Code),
				UserID:   granterID,
				TargetID: targetUserID,
				Action:   "module_permission_escalation",
			}
		}
	}

	return nil
}

// ValidateRolePermissionAssignment validates if user can assign a permission to a role
func (s *EscalationPreventionService) ValidateRolePermissionAssignment(assignerID, roleID, permissionID string) error {
	// 1. Get the role
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("role not found: %s", roleID)
		}
		return err
	}

	// 2. Check if assigner can modify roles
	hasPermission, err := s.resolver.HasPermission(assignerID, "roles", models.PermissionActionUpdate)
	if err != nil {
		return fmt.Errorf("failed to check update permission: %w", err)
	}
	if !hasPermission {
		return &EscalationError{
			Message:  "insufficient permission: cannot modify role permissions",
			UserID:   assignerID,
			TargetID: roleID,
			Action:   "role_permission_modification",
		}
	}

	// 3. Check hierarchy - cannot modify roles with higher privilege
	assignerLevel, err := s.resolver.GetUserHighestRoleLevel(assignerID)
	if err != nil {
		return fmt.Errorf("failed to get assigner role level: %w", err)
	}

	if role.HierarchyLevel < assignerLevel {
		return &EscalationError{
			Message:  fmt.Sprintf("privilege escalation denied: cannot modify role with hierarchy level %d (your level: %d)", role.HierarchyLevel, assignerLevel),
			UserID:   assignerID,
			TargetID: roleID,
			Action:   "role_hierarchy_violation",
		}
	}

	// 4. Check if assigner has the permission they're assigning
	var permission models.Permission
	if err := s.db.First(&permission, "id = ?", permissionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("permission not found: %s", permissionID)
		}
		return err
	}

	granterHasPermission, err := s.resolver.HasPermission(assignerID, permission.Resource, permission.Action)
	if err != nil {
		return fmt.Errorf("failed to check assigner permission: %w", err)
	}
	if !granterHasPermission {
		return &EscalationError{
			Message:  fmt.Sprintf("privilege escalation denied: cannot assign permission '%s' to role that you don't have", permission.Code),
			UserID:   assignerID,
			TargetID: roleID,
			Action:   "role_permission_escalation",
		}
	}

	return nil
}

// ValidateRoleModification validates if user can modify a role (e.g., assign modules)
func (s *EscalationPreventionService) ValidateRoleModification(modifierID, roleID string) error {
	// 1. Get the role
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("role not found: %s", roleID)
		}
		return err
	}

	// 2. Check if modifier can modify roles
	hasPermission, err := s.resolver.HasPermission(modifierID, "roles", models.PermissionActionUpdate)
	if err != nil {
		return fmt.Errorf("failed to check update permission: %w", err)
	}
	if !hasPermission {
		return &EscalationError{
			Message:  "insufficient permission: cannot modify role",
			UserID:   modifierID,
			TargetID: roleID,
			Action:   "role_modification",
		}
	}

	// 3. Check hierarchy - cannot modify roles with higher privilege
	modifierLevel, err := s.resolver.GetUserHighestRoleLevel(modifierID)
	if err != nil {
		return fmt.Errorf("failed to get modifier role level: %w", err)
	}

	if role.HierarchyLevel < modifierLevel {
		return &EscalationError{
			Message:  fmt.Sprintf("privilege escalation denied: cannot modify role with hierarchy level %d (your level: %d)", role.HierarchyLevel, modifierLevel),
			UserID:   modifierID,
			TargetID: roleID,
			Action:   "role_hierarchy_violation",
		}
	}

	return nil
}

// ValidateSelfEscalation checks if a user is trying to escalate their own privileges
func (s *EscalationPreventionService) ValidateSelfEscalation(userID, targetUserID string) error {
	if userID == targetUserID {
		return &EscalationError{
			Message:  "self-escalation denied: cannot modify your own permissions/roles",
			UserID:   userID,
			TargetID: targetUserID,
			Action:   "self_escalation",
		}
	}
	return nil
}

// IsEscalationError checks if an error is an escalation error
func IsEscalationError(err error) bool {
	var escErr *EscalationError
	return errors.As(err, &escErr)
}

// Helper function to create pointer to PermissionScope
func ptr(scope models.PermissionScope) *models.PermissionScope {
	return &scope
}
