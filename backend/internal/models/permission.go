package models

import (
	"time"
)

// Permission represents a system permission
type Permission struct {
	ID                 string           `json:"id" gorm:"type:varchar(36);primaryKey"`
	Code               string           `json:"code" gorm:"type:varchar(100);uniqueIndex;not null"`
	Name               string           `json:"name" gorm:"type:varchar(255);not null"`
	Description        *string          `json:"description,omitempty" gorm:"type:text"`
	Resource           string           `json:"resource" gorm:"type:varchar(100);not null;index"`
	Action             PermissionAction `json:"action" gorm:"type:varchar(20);not null;index"`
	Scope              *PermissionScope `json:"scope,omitempty" gorm:"type:varchar(20)"`
	Conditions         *string          `json:"conditions,omitempty" gorm:"type:jsonb"`
	Metadata           *string          `json:"metadata,omitempty" gorm:"type:jsonb"`
	IsSystemPermission bool             `json:"is_system_permission" gorm:"column:is_system_permission;default:false"`
	IsActive           bool             `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
	CreatedBy          *string          `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`
	Category           *ModuleCategory  `json:"category,omitempty" gorm:"type:varchar(20)"`
	GroupIcon          *string          `json:"group_icon,omitempty" gorm:"column:group_icon;type:varchar(50)"`
	GroupName          *string          `json:"group_name,omitempty" gorm:"column:group_name;type:varchar(100)"`
	GroupSortOrder     *int             `json:"group_sort_order,omitempty" gorm:"column:group_sort_order;default:0"`

	// Relations
	RolePermissions []RolePermission `json:"-" gorm:"foreignKey:PermissionID"`
	UserPermissions []UserPermission `json:"-" gorm:"foreignKey:PermissionID"`
}

// TableName specifies the table name for Permission
func (Permission) TableName() string {
	return "public.permissions"
}

// ModulePermission represents permissions associated with a module
type ModulePermission struct {
	ID          string           `json:"id" gorm:"type:varchar(36);primaryKey"`
	ModuleID    string           `json:"module_id" gorm:"column:module_id;type:varchar(36);not null"`
	Action      PermissionAction `json:"action" gorm:"type:varchar(20);not null"`
	Scope       PermissionScope  `json:"scope" gorm:"type:varchar(20);not null"`
	Description *string          `json:"description,omitempty" gorm:"type:text"`

	// Relations
	Module *Module `json:"module,omitempty" gorm:"foreignKey:ModuleID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for ModulePermission
func (ModulePermission) TableName() string {
	return "public.module_permissions"
}

// CreatePermissionRequest represents the request body for creating a permission
type CreatePermissionRequest struct {
	Code               string           `json:"code" binding:"required,min=2,max=100"`
	Name               string           `json:"name" binding:"required,min=2,max=255"`
	Description        *string          `json:"description,omitempty"`
	Resource           string           `json:"resource" binding:"required,min=2,max=100"`
	Action             PermissionAction `json:"action" binding:"required"`
	Scope              *PermissionScope `json:"scope,omitempty"`
	Conditions         *string          `json:"conditions,omitempty"`
	Metadata           *string          `json:"metadata,omitempty"`
	IsSystemPermission *bool            `json:"is_system_permission,omitempty"`
	Category           *ModuleCategory  `json:"category,omitempty"`
	GroupIcon          *string          `json:"group_icon,omitempty"`
	GroupName          *string          `json:"group_name,omitempty"`
	GroupSortOrder     *int             `json:"group_sort_order,omitempty"`
}

// UpdatePermissionRequest represents the request body for updating a permission
type UpdatePermissionRequest struct {
	Code           *string          `json:"code,omitempty" binding:"omitempty,min=2,max=100"`
	Name           *string          `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	Description    *string          `json:"description,omitempty"`
	Resource       *string          `json:"resource,omitempty" binding:"omitempty,min=2,max=100"`
	Action         *PermissionAction `json:"action,omitempty"`
	Scope          *PermissionScope `json:"scope,omitempty"`
	Conditions     *string          `json:"conditions,omitempty"`
	Metadata       *string          `json:"metadata,omitempty"`
	IsActive       *bool            `json:"is_active,omitempty"`
	Category       *ModuleCategory  `json:"category,omitempty"`
	GroupIcon      *string          `json:"group_icon,omitempty"`
	GroupName      *string          `json:"group_name,omitempty"`
	GroupSortOrder *int             `json:"group_sort_order,omitempty"`
}

// PermissionResponse represents the response body for permission data
type PermissionResponse struct {
	ID                 string           `json:"id"`
	Code               string           `json:"code"`
	Name               string           `json:"name"`
	Description        *string          `json:"description,omitempty"`
	Resource           string           `json:"resource"`
	Action             PermissionAction `json:"action"`
	Scope              *PermissionScope `json:"scope,omitempty"`
	Conditions         *string          `json:"conditions,omitempty"`
	Metadata           *string          `json:"metadata,omitempty"`
	IsSystemPermission bool             `json:"is_system_permission"`
	IsActive           bool             `json:"is_active"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
	CreatedBy          *string          `json:"created_by,omitempty"`
	Category           *ModuleCategory  `json:"category,omitempty"`
	GroupIcon          *string          `json:"group_icon,omitempty"`
	GroupName          *string          `json:"group_name,omitempty"`
	GroupSortOrder     *int             `json:"group_sort_order,omitempty"`
}

// PermissionListResponse represents the response for listing permissions
type PermissionListResponse struct {
	ID                 string           `json:"id"`
	Code               string           `json:"code"`
	Name               string           `json:"name"`
	Resource           string           `json:"resource"`
	Action             PermissionAction `json:"action"`
	Scope              *PermissionScope `json:"scope,omitempty"`
	IsSystemPermission bool             `json:"is_system_permission"`
	IsActive           bool             `json:"is_active"`
}

// PermissionGroupResponse represents permissions grouped by group_name
type PermissionGroupResponse struct {
	GroupName  string                   `json:"group_name"`
	GroupIcon  *string                  `json:"group_icon,omitempty"`
	SortOrder  int                      `json:"sort_order"`
	Permissions []PermissionListResponse `json:"permissions"`
}

// ToResponse converts Permission to PermissionResponse
func (p *Permission) ToResponse() *PermissionResponse {
	return &PermissionResponse{
		ID:                 p.ID,
		Code:               p.Code,
		Name:               p.Name,
		Description:        p.Description,
		Resource:           p.Resource,
		Action:             p.Action,
		Scope:              p.Scope,
		Conditions:         p.Conditions,
		Metadata:           p.Metadata,
		IsSystemPermission: p.IsSystemPermission,
		IsActive:           p.IsActive,
		CreatedAt:          p.CreatedAt,
		UpdatedAt:          p.UpdatedAt,
		CreatedBy:          p.CreatedBy,
		Category:           p.Category,
		GroupIcon:          p.GroupIcon,
		GroupName:          p.GroupName,
		GroupSortOrder:     p.GroupSortOrder,
	}
}

// ToListResponse converts Permission to PermissionListResponse
func (p *Permission) ToListResponse() *PermissionListResponse {
	return &PermissionListResponse{
		ID:                 p.ID,
		Code:               p.Code,
		Name:               p.Name,
		Resource:           p.Resource,
		Action:             p.Action,
		Scope:              p.Scope,
		IsSystemPermission: p.IsSystemPermission,
		IsActive:           p.IsActive,
	}
}

// GetPermissionCode generates a standard permission code
func GetPermissionCode(resource string, action PermissionAction, scope *PermissionScope) string {
	code := resource + ":" + string(action)
	if scope != nil {
		code += ":" + string(*scope)
	}
	return code
}
