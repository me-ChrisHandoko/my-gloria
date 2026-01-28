package services

import (
	"backend/internal/models"
	"errors"
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"
)

// PermissionResolverService handles multi-layer permission resolution
// Priority: UserPermission (highest) → Position → Role (lowest)
type PermissionResolverService struct {
	db *gorm.DB
}

// NewPermissionResolverService creates a new permission resolver service
func NewPermissionResolverService(db *gorm.DB) *PermissionResolverService {
	return &PermissionResolverService{db: db}
}

// PermissionCheckRequest represents a permission check request
type PermissionCheckRequest struct {
	Resource string
	Action   models.PermissionAction
	Scope    *models.PermissionScope
}

// PermissionCheckResult represents the result of a permission check
type PermissionCheckResult struct {
	Allowed    bool   `json:"allowed"`
	Source     string `json:"source"`      // "user_permission", "position", "role", "denied"
	SourceID   string `json:"source_id"`   // ID of the source (permission, position, or role)
	SourceName string `json:"source_name"` // Name for display
}

// ResolvedPermission represents a resolved permission with its source
type ResolvedPermission struct {
	Permission *models.Permission
	IsGranted  bool
	Source     string // "user_permission", "position", "role"
	SourceID   string
	SourceName string
	Priority   int
	Scope      *models.PermissionScope
}

// scopeHierarchy defines the scope hierarchy (higher value = broader scope)
var scopeHierarchy = map[models.PermissionScope]int{
	models.PermissionScopeOwn:        1,
	models.PermissionScopeDepartment: 2,
	models.PermissionScopeSchool:     3,
	models.PermissionScopeAll:        4,
}

// CheckPermission checks if a user has a specific permission
// Resolution order: UserPermission (explicit deny wins) → Position → Role
func (s *PermissionResolverService) CheckPermission(userID string, req PermissionCheckRequest) (*PermissionCheckResult, error) {
	// Step 1: Check UserPermission (highest priority)
	userPermResult, err := s.checkUserPermission(userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to check user permission: %w", err)
	}
	if userPermResult != nil {
		return userPermResult, nil
	}

	// Step 2: Check Position-based permissions
	positionResult, err := s.checkPositionPermission(userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to check position permission: %w", err)
	}
	if positionResult != nil {
		return positionResult, nil
	}

	// Step 3: Check Role permissions (with hierarchy)
	roleResult, err := s.checkRolePermission(userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to check role permission: %w", err)
	}
	if roleResult != nil {
		return roleResult, nil
	}

	// No permission found
	return &PermissionCheckResult{
		Allowed:    false,
		Source:     "denied",
		SourceID:   "",
		SourceName: "No matching permission found",
	}, nil
}

// CheckPermissionBatch checks multiple permissions at once
func (s *PermissionResolverService) CheckPermissionBatch(userID string, requests []PermissionCheckRequest) (map[string]*PermissionCheckResult, error) {
	results := make(map[string]*PermissionCheckResult)

	for _, req := range requests {
		key := buildPermissionKey(req)
		result, err := s.CheckPermission(userID, req)
		if err != nil {
			return nil, fmt.Errorf("failed to check permission %s: %w", key, err)
		}
		results[key] = result
	}

	return results, nil
}

// buildPermissionKey creates a unique key for a permission check request
func buildPermissionKey(req PermissionCheckRequest) string {
	key := fmt.Sprintf("%s:%s", req.Resource, req.Action)
	if req.Scope != nil {
		key += ":" + string(*req.Scope)
	}
	return key
}

// checkUserPermission checks direct user permissions (highest priority)
func (s *PermissionResolverService) checkUserPermission(userID string, req PermissionCheckRequest) (*PermissionCheckResult, error) {
	now := time.Now()

	var userPermissions []models.UserPermission
	query := s.db.Preload("Permission").
		Where("user_id = ?", userID).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now)

	if err := query.Find(&userPermissions).Error; err != nil {
		return nil, err
	}

	// Sort by priority (lower number = higher priority)
	sort.Slice(userPermissions, func(i, j int) bool {
		return userPermissions[i].Priority < userPermissions[j].Priority
	})

	for _, up := range userPermissions {
		if up.Permission == nil || !up.Permission.IsActive {
			continue
		}

		// Check if permission matches the request
		if !s.permissionMatches(up.Permission, req) {
			continue
		}

		// Check scope compatibility
		if req.Scope != nil && !s.isScopeCompatible(up.Permission.Scope, req.Scope) {
			continue
		}

		// Found matching permission
		return &PermissionCheckResult{
			Allowed:    up.IsGranted,
			Source:     "user_permission",
			SourceID:   up.ID,
			SourceName: fmt.Sprintf("Direct: %s", up.Permission.Name),
		}, nil
	}

	return nil, nil
}

// checkPositionPermission checks permissions via user's positions
func (s *PermissionResolverService) checkPositionPermission(userID string, req PermissionCheckRequest) (*PermissionCheckResult, error) {
	// Get user's effective positions
	positions, err := s.GetEffectiveUserPositions(userID)
	if err != nil {
		return nil, err
	}

	for _, up := range positions {
		// Check RoleModuleAccess with this position
		var roleModuleAccess []models.RoleModuleAccess
		if err := s.db.Preload("Module").
			Where("position_id = ?", up.PositionID).
			Where("is_active = ?", true).
			Find(&roleModuleAccess).Error; err != nil {
			return nil, err
		}

		// Check if any module access grants the requested permission
		for _, rma := range roleModuleAccess {
			if rma.Module == nil || !rma.Module.IsActive {
				continue
			}

			// Check if module code matches the resource
			if rma.Module.Code != req.Resource {
				continue
			}

			// Check permissions in JSONB field
			hasPermission, err := s.checkModulePermissions(rma.Permissions, req.Action)
			if err != nil {
				continue
			}

			if hasPermission {
				return &PermissionCheckResult{
					Allowed:    true,
					Source:     "position",
					SourceID:   up.PositionID,
					SourceName: fmt.Sprintf("Position: %s", up.Position.Name),
				}, nil
			}
		}
	}

	return nil, nil
}

// checkModulePermissions checks if a JSONB permissions field contains the required action
func (s *PermissionResolverService) checkModulePermissions(permissions interface{}, action models.PermissionAction) (bool, error) {
	// Permissions is stored as JSONB, typically as an array of strings or object
	// Example: ["READ", "UPDATE"] or {"read": true, "update": true}
	switch p := permissions.(type) {
	case []interface{}:
		for _, perm := range p {
			if permStr, ok := perm.(string); ok {
				if models.PermissionAction(permStr) == action {
					return true, nil
				}
			}
		}
	case map[string]interface{}:
		if val, ok := p[string(action)]; ok {
			if boolVal, isBool := val.(bool); isBool && boolVal {
				return true, nil
			}
		}
	}
	return false, nil
}

// checkRolePermission checks permissions via user's roles with hierarchy
func (s *PermissionResolverService) checkRolePermission(userID string, req PermissionCheckRequest) (*PermissionCheckResult, error) {
	// Get all role IDs (including inherited) for the user
	allRoleIDs, err := s.getAllUserRoleIDs(userID)
	if err != nil {
		return nil, err
	}

	if len(allRoleIDs) == 0 {
		return nil, nil
	}

	now := time.Now()

	// Find matching role permissions
	var rolePermissions []models.RolePermission
	if err := s.db.Preload("Permission").Preload("Role").
		Where("role_id IN ?", allRoleIDs).
		Where("is_granted = ?", true).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now).
		Find(&rolePermissions).Error; err != nil {
		return nil, err
	}

	for _, rp := range rolePermissions {
		if rp.Permission == nil || !rp.Permission.IsActive {
			continue
		}

		if !s.permissionMatches(rp.Permission, req) {
			continue
		}

		if req.Scope != nil && !s.isScopeCompatible(rp.Permission.Scope, req.Scope) {
			continue
		}

		roleName := "Unknown Role"
		if rp.Role != nil {
			roleName = rp.Role.Name
		}

		return &PermissionCheckResult{
			Allowed:    true,
			Source:     "role",
			SourceID:   rp.RoleID,
			SourceName: fmt.Sprintf("Role: %s", roleName),
		}, nil
	}

	return nil, nil
}

// getAllUserRoleIDs returns all role IDs for a user including inherited roles
func (s *PermissionResolverService) getAllUserRoleIDs(userID string) ([]string, error) {
	// Get direct effective roles
	directRoleIDs, err := s.getEffectiveUserRoleIDs(userID)
	if err != nil {
		return nil, err
	}

	if len(directRoleIDs) == 0 {
		return []string{}, nil
	}

	// Get inherited roles using WITH RECURSIVE
	allRoleIDs, err := s.GetParentRolesWithCTE(directRoleIDs, true, 10)
	if err != nil {
		// Fallback to recursive method if CTE fails
		allRoleIDs = s.getParentRolesRecursive(directRoleIDs, true, make(map[string]bool))
	}

	// Combine direct and inherited roles
	roleIDSet := make(map[string]bool)
	for _, id := range directRoleIDs {
		roleIDSet[id] = true
	}
	for _, id := range allRoleIDs {
		roleIDSet[id] = true
	}

	result := make([]string, 0, len(roleIDSet))
	for id := range roleIDSet {
		result = append(result, id)
	}

	return result, nil
}

// getEffectiveUserRoleIDs returns IDs of user's effective direct roles
func (s *PermissionResolverService) getEffectiveUserRoleIDs(userID string) ([]string, error) {
	now := time.Now()

	var userRoles []models.UserRole
	if err := s.db.Where("user_id = ?", userID).
		Where("is_active = ?", true).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now).
		Find(&userRoles).Error; err != nil {
		return nil, err
	}

	roleIDs := make([]string, len(userRoles))
	for i, ur := range userRoles {
		roleIDs[i] = ur.RoleID
	}

	return roleIDs, nil
}

// GetParentRolesWithCTE uses PostgreSQL WITH RECURSIVE for efficient hierarchy traversal
func (s *PermissionResolverService) GetParentRolesWithCTE(roleIDs []string, inheritOnly bool, maxDepth int) ([]string, error) {
	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	var query string
	var args []interface{}

	if inheritOnly {
		query = `
			WITH RECURSIVE role_tree AS (
				SELECT rh.parent_role_id, rh.role_id, 1 as depth
				FROM public.role_hierarchy rh
				WHERE rh.role_id = ANY($1)
				AND rh.inherit_permissions = true

				UNION ALL

				SELECT rh.parent_role_id, rh.role_id, rt.depth + 1
				FROM public.role_hierarchy rh
				INNER JOIN role_tree rt ON rh.role_id = rt.parent_role_id
				WHERE rt.depth < $2
				AND rh.inherit_permissions = true
			)
			SELECT DISTINCT parent_role_id FROM role_tree
		`
	} else {
		query = `
			WITH RECURSIVE role_tree AS (
				SELECT rh.parent_role_id, rh.role_id, 1 as depth
				FROM public.role_hierarchy rh
				WHERE rh.role_id = ANY($1)

				UNION ALL

				SELECT rh.parent_role_id, rh.role_id, rt.depth + 1
				FROM public.role_hierarchy rh
				INNER JOIN role_tree rt ON rh.role_id = rt.parent_role_id
				WHERE rt.depth < $2
			)
			SELECT DISTINCT parent_role_id FROM role_tree
		`
	}

	args = append(args, roleIDs, maxDepth)

	var parentRoleIDs []string
	if err := s.db.Raw(query, args...).Scan(&parentRoleIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to get parent roles with CTE: %w", err)
	}

	return parentRoleIDs, nil
}

// getParentRolesRecursive is a fallback method with cycle detection
func (s *PermissionResolverService) getParentRolesRecursive(roleIDs []string, inheritOnly bool, visited map[string]bool) []string {
	var result []string

	for _, roleID := range roleIDs {
		// Cycle detection
		if visited[roleID] {
			continue
		}
		visited[roleID] = true

		// Get parent roles
		var hierarchies []models.RoleHierarchy
		query := s.db.Where("role_id = ?", roleID)
		if inheritOnly {
			query = query.Where("inherit_permissions = ?", true)
		}
		if err := query.Find(&hierarchies).Error; err != nil {
			continue
		}

		for _, h := range hierarchies {
			if !visited[h.ParentRoleID] {
				result = append(result, h.ParentRoleID)
				// Recursively get parents of parent
				parentRoleIDs := s.getParentRolesRecursive([]string{h.ParentRoleID}, inheritOnly, visited)
				result = append(result, parentRoleIDs...)
			}
		}
	}

	return result
}

// permissionMatches checks if a permission matches the request
func (s *PermissionResolverService) permissionMatches(perm *models.Permission, req PermissionCheckRequest) bool {
	if perm.Resource != req.Resource {
		return false
	}
	if perm.Action != req.Action {
		return false
	}
	return true
}

// isScopeCompatible checks if the granted scope is compatible with the requested scope
// A broader scope (e.g., ALL) can satisfy a narrower scope request (e.g., OWN)
func (s *PermissionResolverService) isScopeCompatible(grantedScope, requestedScope *models.PermissionScope) bool {
	if grantedScope == nil || requestedScope == nil {
		return true // If either is nil, treat as compatible
	}

	grantedLevel := scopeHierarchy[*grantedScope]
	requestedLevel := scopeHierarchy[*requestedScope]

	// Granted scope must be >= requested scope
	return grantedLevel >= requestedLevel
}

// GetEffectiveUserPermissions returns all effective permissions for a user
func (s *PermissionResolverService) GetEffectiveUserPermissions(userID string) ([]ResolvedPermission, error) {
	var resolved []ResolvedPermission

	// 1. Get direct user permissions
	userPerms, err := s.getUserPermissions(userID)
	if err != nil {
		return nil, err
	}
	resolved = append(resolved, userPerms...)

	// 2. Get position-based permissions
	positionPerms, err := s.getPositionPermissions(userID)
	if err != nil {
		return nil, err
	}
	resolved = append(resolved, positionPerms...)

	// 3. Get role permissions
	rolePerms, err := s.getRolePermissions(userID)
	if err != nil {
		return nil, err
	}
	resolved = append(resolved, rolePerms...)

	return resolved, nil
}

// getUserPermissions retrieves direct user permissions
func (s *PermissionResolverService) getUserPermissions(userID string) ([]ResolvedPermission, error) {
	now := time.Now()

	var userPermissions []models.UserPermission
	if err := s.db.Preload("Permission").
		Where("user_id = ?", userID).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now).
		Find(&userPermissions).Error; err != nil {
		return nil, err
	}

	resolved := make([]ResolvedPermission, 0, len(userPermissions))
	for _, up := range userPermissions {
		if up.Permission == nil || !up.Permission.IsActive {
			continue
		}

		resolved = append(resolved, ResolvedPermission{
			Permission: up.Permission,
			IsGranted:  up.IsGranted,
			Source:     "user_permission",
			SourceID:   up.ID,
			SourceName: "Direct Permission",
			Priority:   up.Priority,
			Scope:      up.Permission.Scope,
		})
	}

	return resolved, nil
}

// getPositionPermissions retrieves permissions from user's positions
func (s *PermissionResolverService) getPositionPermissions(userID string) ([]ResolvedPermission, error) {
	positions, err := s.GetEffectiveUserPositions(userID)
	if err != nil {
		return nil, err
	}

	var resolved []ResolvedPermission

	for _, up := range positions {
		// Get permissions linked to this position via RoleModuleAccess
		var roleModuleAccess []models.RoleModuleAccess
		if err := s.db.Preload("Module").
			Where("position_id = ?", up.PositionID).
			Where("is_active = ?", true).
			Find(&roleModuleAccess).Error; err != nil {
			continue
		}

		for _, rma := range roleModuleAccess {
			if rma.Module == nil || !rma.Module.IsActive {
				continue
			}

			positionName := "Unknown Position"
			if up.Position != nil {
				positionName = up.Position.Name
			}

			// Create a synthetic permission for module access
			resolved = append(resolved, ResolvedPermission{
				Permission: &models.Permission{
					ID:       rma.ModuleID,
					Code:     rma.Module.Code,
					Name:     fmt.Sprintf("%s Module Access", rma.Module.Name),
					Resource: rma.Module.Code,
				},
				IsGranted:  true,
				Source:     "position",
				SourceID:   up.PositionID,
				SourceName: positionName,
				Priority:   50, // Position priority between user (higher) and role (lower)
			})
		}
	}

	return resolved, nil
}

// getRolePermissions retrieves permissions from user's roles
func (s *PermissionResolverService) getRolePermissions(userID string) ([]ResolvedPermission, error) {
	allRoleIDs, err := s.getAllUserRoleIDs(userID)
	if err != nil {
		return nil, err
	}

	if len(allRoleIDs) == 0 {
		return []ResolvedPermission{}, nil
	}

	now := time.Now()

	var rolePermissions []models.RolePermission
	if err := s.db.Preload("Permission").Preload("Role").
		Where("role_id IN ?", allRoleIDs).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now).
		Find(&rolePermissions).Error; err != nil {
		return nil, err
	}

	resolved := make([]ResolvedPermission, 0, len(rolePermissions))
	for _, rp := range rolePermissions {
		if rp.Permission == nil || !rp.Permission.IsActive {
			continue
		}

		roleName := "Unknown Role"
		if rp.Role != nil {
			roleName = rp.Role.Name
		}

		resolved = append(resolved, ResolvedPermission{
			Permission: rp.Permission,
			IsGranted:  rp.IsGranted,
			Source:     "role",
			SourceID:   rp.RoleID,
			SourceName: roleName,
			Priority:   100, // Role has lowest priority
			Scope:      rp.Permission.Scope,
		})
	}

	return resolved, nil
}

// GetEffectiveUserRoles returns all effective roles for a user
func (s *PermissionResolverService) GetEffectiveUserRoles(userID string) ([]models.UserRole, error) {
	now := time.Now()

	var userRoles []models.UserRole
	if err := s.db.Preload("Role").
		Where("user_id = ?", userID).
		Where("is_active = ?", true).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now).
		Find(&userRoles).Error; err != nil {
		return nil, err
	}

	return userRoles, nil
}

// GetEffectiveUserPositions returns all effective positions for a user
func (s *PermissionResolverService) GetEffectiveUserPositions(userID string) ([]models.UserPosition, error) {
	now := time.Now()

	var userPositions []models.UserPosition
	if err := s.db.Preload("Position").Preload("Position.Department").Preload("Position.School").
		Where("user_id = ?", userID).
		Where("is_active = ?", true).
		Where("start_date <= ?", now).
		Where("(end_date IS NULL OR end_date >= ?)", now).
		Find(&userPositions).Error; err != nil {
		return nil, err
	}

	return userPositions, nil
}

// HasPermission is a convenience method that returns just a boolean
func (s *PermissionResolverService) HasPermission(userID, resource string, action models.PermissionAction) (bool, error) {
	result, err := s.CheckPermission(userID, PermissionCheckRequest{
		Resource: resource,
		Action:   action,
	})
	if err != nil {
		return false, err
	}
	return result.Allowed, nil
}

// HasPermissionWithScope checks permission with scope
func (s *PermissionResolverService) HasPermissionWithScope(userID, resource string, action models.PermissionAction, scope models.PermissionScope) (bool, error) {
	result, err := s.CheckPermission(userID, PermissionCheckRequest{
		Resource: resource,
		Action:   action,
		Scope:    &scope,
	})
	if err != nil {
		return false, err
	}
	return result.Allowed, nil
}

// GetUserHighestRoleLevel returns the highest (lowest number) hierarchy level of user's roles
func (s *PermissionResolverService) GetUserHighestRoleLevel(userID string) (int, error) {
	userRoles, err := s.GetEffectiveUserRoles(userID)
	if err != nil {
		return 0, err
	}

	if len(userRoles) == 0 {
		return 999, nil // No roles = lowest possible level
	}

	highestLevel := 999
	for _, ur := range userRoles {
		if ur.Role != nil && ur.Role.HierarchyLevel < highestLevel {
			highestLevel = ur.Role.HierarchyLevel
		}
	}

	return highestLevel, nil
}

// CanAssignRole checks if assigner can assign a role to target user
// Rule: Can only assign roles at same level or lower (higher number)
func (s *PermissionResolverService) CanAssignRole(assignerID, targetUserID, roleID string) error {
	// Get assigner's highest level
	assignerLevel, err := s.GetUserHighestRoleLevel(assignerID)
	if err != nil {
		return fmt.Errorf("failed to get assigner role level: %w", err)
	}

	// Get the role being assigned
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("role not found: %s", roleID)
		}
		return err
	}

	// Check if assigner can assign this role
	if role.HierarchyLevel < assignerLevel {
		return fmt.Errorf("cannot assign role with higher privilege (level %d) than own level (%d)", role.HierarchyLevel, assignerLevel)
	}

	return nil
}

// CanGrantPermission checks if granter can grant a permission to target user
func (s *PermissionResolverService) CanGrantPermission(granterID, targetUserID, permissionID string) error {
	// Granter must have the permission themselves
	var permission models.Permission
	if err := s.db.First(&permission, "id = ?", permissionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("permission not found: %s", permissionID)
		}
		return err
	}

	hasPermission, err := s.HasPermission(granterID, permission.Resource, permission.Action)
	if err != nil {
		return fmt.Errorf("failed to check granter permission: %w", err)
	}

	if !hasPermission {
		return fmt.Errorf("cannot grant permission '%s' that you don't have", permission.Code)
	}

	return nil
}
