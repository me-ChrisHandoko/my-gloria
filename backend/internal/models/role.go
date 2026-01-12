package models

import (
	"time"
)

// Role represents a user role with hierarchical structure
type Role struct {
	ID             string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	Code           string    `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"`
	Name           string    `json:"name" gorm:"type:varchar(255);not null"`
	Description    *string   `json:"description,omitempty" gorm:"type:text"`
	HierarchyLevel int       `json:"hierarchy_level" gorm:"column:hierarchy_level;not null;index"`
	IsSystemRole   bool      `json:"is_system_role" gorm:"column:is_system_role;default:false"`
	IsActive       bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	CreatedBy      *string   `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`

	// Relations
	ParentRoles      []RoleHierarchy    `json:"-" gorm:"foreignKey:ParentRoleID"`
	ChildRoles       []RoleHierarchy    `json:"-" gorm:"foreignKey:RoleID"`
	RoleModuleAccess []RoleModuleAccess `json:"-" gorm:"foreignKey:RoleID"`
	RolePermissions  []RolePermission   `json:"-" gorm:"foreignKey:RoleID"`
	UserRoles        []UserRole         `json:"-" gorm:"foreignKey:RoleID"`
}

// TableName specifies the table name for Role
func (Role) TableName() string {
	return "public.roles"
}

// RoleHierarchy represents the parent-child relationship between roles
type RoleHierarchy struct {
	ID                 string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	RoleID             string    `json:"role_id" gorm:"column:role_id;type:varchar(36);not null"`
	ParentRoleID       string    `json:"parent_role_id" gorm:"column:parent_role_id;type:varchar(36);not null;index"`
	InheritPermissions bool      `json:"inherit_permissions" gorm:"column:inherit_permissions;default:true"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	// Relations
	Role       *Role `json:"role,omitempty" gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE"`
	ParentRole *Role `json:"parent_role,omitempty" gorm:"foreignKey:ParentRoleID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for RoleHierarchy
func (RoleHierarchy) TableName() string {
	return "public.role_hierarchy"
}

// RolePermission represents the assignment of permissions to roles
type RolePermission struct {
	ID             string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	RoleID         string     `json:"role_id" gorm:"column:role_id;type:varchar(36);not null;index"`
	PermissionID   string     `json:"permission_id" gorm:"column:permission_id;type:varchar(36);not null;index"`
	IsGranted      bool       `json:"is_granted" gorm:"column:is_granted;default:true"`
	Conditions     *string    `json:"conditions,omitempty" gorm:"type:jsonb"`
	GrantedBy      *string    `json:"granted_by,omitempty" gorm:"column:granted_by;type:varchar(36)"`
	GrantReason    *string    `json:"grant_reason,omitempty" gorm:"column:grant_reason;type:text"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	EffectiveFrom  time.Time  `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty" gorm:"column:effective_until"`

	// Relations
	Role       *Role       `json:"role,omitempty" gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE"`
	Permission *Permission `json:"permission,omitempty" gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for RolePermission
func (RolePermission) TableName() string {
	return "public.role_permissions"
}

// CreateRoleRequest represents the request body for creating a role
type CreateRoleRequest struct {
	Code           string  `json:"code" binding:"required,min=2,max=50"`
	Name           string  `json:"name" binding:"required,min=2,max=255"`
	Description    *string `json:"description,omitempty"`
	HierarchyLevel int     `json:"hierarchy_level" binding:"required,min=0"`
	IsSystemRole   *bool   `json:"is_system_role,omitempty"`
}

// UpdateRoleRequest represents the request body for updating a role
type UpdateRoleRequest struct {
	Code           *string `json:"code,omitempty" binding:"omitempty,min=2,max=50"`
	Name           *string `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	Description    *string `json:"description,omitempty"`
	HierarchyLevel *int    `json:"hierarchy_level,omitempty" binding:"omitempty,min=0"`
	IsActive       *bool   `json:"is_active,omitempty"`
}

// RoleResponse represents the response body for role data
type RoleResponse struct {
	ID             string    `json:"id"`
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	Description    *string   `json:"description,omitempty"`
	HierarchyLevel int       `json:"hierarchy_level"`
	IsSystemRole   bool      `json:"is_system_role"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	CreatedBy      *string   `json:"created_by,omitempty"`
}

// RoleListResponse represents the response for listing roles
type RoleListResponse struct {
	ID             string `json:"id"`
	Code           string `json:"code"`
	Name           string `json:"name"`
	HierarchyLevel int    `json:"hierarchy_level"`
	IsSystemRole   bool   `json:"is_system_role"`
	IsActive       bool   `json:"is_active"`
}

// RoleWithPermissionsResponse represents a role with its permissions
type RoleWithPermissionsResponse struct {
	RoleResponse
	Permissions []PermissionListResponse `json:"permissions,omitempty"`
}

// AssignPermissionToRoleRequest represents the request for assigning permission to role
type AssignPermissionToRoleRequest struct {
	PermissionID   string     `json:"permission_id" binding:"required,len=36"`
	IsGranted      *bool      `json:"is_granted,omitempty"`
	Conditions     *string    `json:"conditions,omitempty"`
	GrantReason    *string    `json:"grant_reason,omitempty"`
	EffectiveFrom  *time.Time `json:"effective_from,omitempty"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty"`
}

// ToResponse converts Role to RoleResponse
func (r *Role) ToResponse() *RoleResponse {
	return &RoleResponse{
		ID:             r.ID,
		Code:           r.Code,
		Name:           r.Name,
		Description:    r.Description,
		HierarchyLevel: r.HierarchyLevel,
		IsSystemRole:   r.IsSystemRole,
		IsActive:       r.IsActive,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
		CreatedBy:      r.CreatedBy,
	}
}

// ToListResponse converts Role to RoleListResponse
func (r *Role) ToListResponse() *RoleListResponse {
	return &RoleListResponse{
		ID:             r.ID,
		Code:           r.Code,
		Name:           r.Name,
		HierarchyLevel: r.HierarchyLevel,
		IsSystemRole:   r.IsSystemRole,
		IsActive:       r.IsActive,
	}
}

// IsEffective checks if the role permission is currently effective
func (rp *RolePermission) IsEffective() bool {
	now := time.Now()
	if now.Before(rp.EffectiveFrom) {
		return false
	}
	if rp.EffectiveUntil != nil && now.After(*rp.EffectiveUntil) {
		return false
	}
	return rp.IsGranted
}
