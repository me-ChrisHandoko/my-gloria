package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Module represents a system module with hierarchical structure
type Module struct {
	ID                string           `json:"id" gorm:"type:varchar(36);primaryKey"`
	Code              string           `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"`
	Name              string           `json:"name" gorm:"type:varchar(255);not null"`
	Category          ModuleCategory   `json:"category" gorm:"type:varchar(20);not null;index"`
	Description       *string          `json:"description,omitempty" gorm:"type:text"`
	Icon              *string          `json:"icon,omitempty" gorm:"type:varchar(50)"`
	Path              *string          `json:"path,omitempty" gorm:"type:varchar(255)"`
	ParentID          *string          `json:"parent_id,omitempty" gorm:"column:parent_id;type:varchar(36)"`
	SortOrder         int              `json:"sort_order" gorm:"column:sort_order;default:0"`
	IsActive          bool             `json:"is_active" gorm:"column:is_active;default:true;index"`
	IsVisible         bool             `json:"is_visible" gorm:"column:is_visible;default:true"`
	Version           int              `json:"version" gorm:"default:0"`
	DeletedAt         gorm.DeletedAt   `json:"-" gorm:"column:deleted_at;index"`
	DeletedBy         *string          `json:"-" gorm:"column:deleted_by;type:varchar(36)"`
	DeleteReason      *string          `json:"-" gorm:"column:delete_reason;type:text"`
	CreatedAt         time.Time        `json:"created_at"`
	UpdatedAt         time.Time        `json:"updated_at"`
	CreatedBy         *string          `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`
	UpdatedBy         *string          `json:"updated_by,omitempty" gorm:"column:updated_by;type:varchar(36)"`

	// Relations
	ModulePermissions []ModulePermission `json:"-" gorm:"foreignKey:ModuleID"`
	Parent            *Module            `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children          []Module           `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	RoleModuleAccess  []RoleModuleAccess `json:"-" gorm:"foreignKey:ModuleID"`
	UserModuleAccess  []UserModuleAccess `json:"-" gorm:"foreignKey:ModuleID"`
}

// TableName specifies the table name for Module
func (Module) TableName() string {
	return "public.modules"
}

// RoleModuleAccess represents module access permissions for roles
type RoleModuleAccess struct {
	ID          string         `json:"id" gorm:"type:varchar(36);primaryKey"`
	RoleID      string         `json:"role_id" gorm:"column:role_id;type:varchar(36);not null;index"`
	ModuleID    string         `json:"module_id" gorm:"column:module_id;type:varchar(36);not null;index"`
	PositionID  *string        `json:"position_id,omitempty" gorm:"column:position_id;type:varchar(36)"`
	Permissions datatypes.JSON `json:"permissions" gorm:"type:jsonb;not null"`
	IsActive    bool           `json:"is_active" gorm:"column:is_active;default:true;index"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	CreatedBy   *string        `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`
	Version     int            `json:"version" gorm:"default:0"`

	// Relations
	Role     *Role     `json:"role,omitempty" gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE"`
	Module   *Module   `json:"module,omitempty" gorm:"foreignKey:ModuleID;constraint:OnDelete:CASCADE"`
	Position *Position `json:"position,omitempty" gorm:"foreignKey:PositionID"`
}

// TableName specifies the table name for RoleModuleAccess
func (RoleModuleAccess) TableName() string {
	return "public.role_module_access"
}

// UserModuleAccess represents module access permissions for individual users
type UserModuleAccess struct {
	ID             string         `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserProfileID  string         `json:"user_profile_id" gorm:"column:user_profile_id;type:varchar(36);not null"`
	ModuleID       string         `json:"module_id" gorm:"column:module_id;type:varchar(36);not null"`
	Permissions    datatypes.JSON `json:"permissions" gorm:"type:jsonb;not null"`
	GrantedBy      string         `json:"granted_by" gorm:"column:granted_by;type:varchar(36);not null"`
	Reason         *string        `json:"reason,omitempty" gorm:"type:text"`
	IsActive       bool           `json:"is_active" gorm:"column:is_active;default:true;index"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	Version        int            `json:"version" gorm:"default:0"`
	EffectiveFrom  time.Time      `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time     `json:"effective_until,omitempty" gorm:"column:effective_until"`

	// Relations
	UserProfile *User `json:"user_profile,omitempty" gorm:"foreignKey:UserProfileID;constraint:OnDelete:CASCADE"`
	Module      *Module      `json:"module,omitempty" gorm:"foreignKey:ModuleID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for UserModuleAccess
func (UserModuleAccess) TableName() string {
	return "public.user_module_access"
}

// CreateModuleRequest represents the request body for creating a module
type CreateModuleRequest struct {
	Code        string         `json:"code" binding:"required,min=2,max=50"`
	Name        string         `json:"name" binding:"required,min=2,max=255"`
	Category    ModuleCategory `json:"category" binding:"required"`
	Description *string        `json:"description,omitempty"`
	Icon        *string        `json:"icon,omitempty"`
	Path        *string        `json:"path,omitempty"`
	ParentID    *string        `json:"parent_id,omitempty" binding:"omitempty,len=36"`
	SortOrder   *int           `json:"sort_order,omitempty"`
	IsVisible   *bool          `json:"is_visible,omitempty"`
}

// UpdateModuleRequest represents the request body for updating a module
type UpdateModuleRequest struct {
	Code        *string         `json:"code,omitempty" binding:"omitempty,min=2,max=50"`
	Name        *string         `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	Category    *ModuleCategory `json:"category,omitempty"`
	Description *string         `json:"description,omitempty"`
	Icon        *string         `json:"icon,omitempty"`
	Path        *string         `json:"path,omitempty"`
	ParentID    *string         `json:"parent_id,omitempty" binding:"omitempty,len=36"`
	SortOrder   *int            `json:"sort_order,omitempty"`
	IsActive    *bool           `json:"is_active,omitempty"`
	IsVisible   *bool           `json:"is_visible,omitempty"`
}

// ModuleResponse represents the response body for module data
type ModuleResponse struct {
	ID          string              `json:"id"`
	Code        string              `json:"code"`
	Name        string              `json:"name"`
	Category    ModuleCategory      `json:"category"`
	Description *string             `json:"description,omitempty"`
	Icon        *string             `json:"icon,omitempty"`
	Path        *string             `json:"path,omitempty"`
	ParentID    *string             `json:"parent_id,omitempty"`
	SortOrder   int                 `json:"sort_order"`
	IsActive    bool                `json:"is_active"`
	IsVisible   bool                `json:"is_visible"`
	Version     int                 `json:"version"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	CreatedBy   *string             `json:"created_by,omitempty"`
	UpdatedBy   *string             `json:"updated_by,omitempty"`
	Parent      *ModuleListResponse `json:"parent,omitempty"`
}

// ModuleListResponse represents the response for listing modules
type ModuleListResponse struct {
	ID        string         `json:"id"`
	Code      string         `json:"code"`
	Name      string         `json:"name"`
	Category  ModuleCategory `json:"category"`
	Icon      *string        `json:"icon,omitempty"`
	Path      *string        `json:"path,omitempty"`
	ParentID  *string        `json:"parent_id,omitempty"`
	SortOrder int            `json:"sort_order"`
	IsActive  bool           `json:"is_active"`
	IsVisible bool           `json:"is_visible"`
}

// ModuleTreeResponse represents a module in a tree structure
type ModuleTreeResponse struct {
	ID          string                `json:"id"`
	Code        string                `json:"code"`
	Name        string                `json:"name"`
	Category    ModuleCategory        `json:"category"`
	Icon        *string               `json:"icon,omitempty"`
	Path        *string               `json:"path,omitempty"`
	Description *string               `json:"description,omitempty"`
	SortOrder   int                   `json:"sort_order"`
	IsActive    bool                  `json:"is_active"`
	IsVisible   bool                  `json:"is_visible"`
	Children    []*ModuleTreeResponse `json:"children,omitempty"`
}

// AssignModuleAccessToRoleRequest represents the request for assigning module access to role
type AssignModuleAccessToRoleRequest struct {
	ModuleID    string         `json:"module_id" binding:"required,len=36"`
	PositionID  *string        `json:"position_id,omitempty" binding:"omitempty,len=36"`
	Permissions datatypes.JSON `json:"permissions" binding:"required"`
}

// AssignModuleAccessToUserRequest represents the request for assigning module access to user
type AssignModuleAccessToUserRequest struct {
	ModuleID       string         `json:"module_id" binding:"required,len=36"`
	Permissions    datatypes.JSON `json:"permissions" binding:"required"`
	Reason         *string        `json:"reason,omitempty"`
	EffectiveFrom  *time.Time     `json:"effective_from,omitempty"`
	EffectiveUntil *time.Time     `json:"effective_until,omitempty"`
}

// RoleModuleAccessResponse represents module access response for roles
type RoleModuleAccessResponse struct {
	ID          string              `json:"id"`
	ModuleID    string              `json:"module_id"`
	Module      *ModuleListResponse `json:"module,omitempty"`
	PositionID  *string             `json:"position_id,omitempty"`
	Permissions datatypes.JSON      `json:"permissions"`
	IsActive    bool                `json:"is_active"`
}

// UserModuleAccessResponse represents module access response for users
type UserModuleAccessResponse struct {
	ID             string              `json:"id"`
	ModuleID       string              `json:"module_id"`
	Module         *ModuleListResponse `json:"module,omitempty"`
	Permissions    datatypes.JSON      `json:"permissions"`
	Reason         *string             `json:"reason,omitempty"`
	IsActive       bool                `json:"is_active"`
	EffectiveFrom  time.Time           `json:"effective_from"`
	EffectiveUntil *time.Time          `json:"effective_until,omitempty"`
}

// ToResponse converts Module to ModuleResponse
func (m *Module) ToResponse() *ModuleResponse {
	resp := &ModuleResponse{
		ID:          m.ID,
		Code:        m.Code,
		Name:        m.Name,
		Category:    m.Category,
		Description: m.Description,
		Icon:        m.Icon,
		Path:        m.Path,
		ParentID:    m.ParentID,
		SortOrder:   m.SortOrder,
		IsActive:    m.IsActive,
		IsVisible:   m.IsVisible,
		Version:     m.Version,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
		CreatedBy:   m.CreatedBy,
		UpdatedBy:   m.UpdatedBy,
	}

	if m.Parent != nil {
		resp.Parent = m.Parent.ToListResponse()
	}

	return resp
}

// ToListResponse converts Module to ModuleListResponse
func (m *Module) ToListResponse() *ModuleListResponse {
	return &ModuleListResponse{
		ID:        m.ID,
		Code:      m.Code,
		Name:      m.Name,
		Category:  m.Category,
		Icon:      m.Icon,
		Path:      m.Path,
		ParentID:  m.ParentID,
		SortOrder: m.SortOrder,
		IsActive:  m.IsActive,
		IsVisible: m.IsVisible,
	}
}

// ToTreeResponse converts Module to ModuleTreeResponse
func (m *Module) ToTreeResponse() *ModuleTreeResponse {
	resp := &ModuleTreeResponse{
		ID:          m.ID,
		Code:        m.Code,
		Name:        m.Name,
		Category:    m.Category,
		Icon:        m.Icon,
		Path:        m.Path,
		Description: m.Description,
		SortOrder:   m.SortOrder,
		IsActive:    m.IsActive,
		IsVisible:   m.IsVisible,
	}

	if len(m.Children) > 0 {
		resp.Children = make([]*ModuleTreeResponse, len(m.Children))
		for i, child := range m.Children {
			resp.Children[i] = child.ToTreeResponse()
		}
	}

	return resp
}

// IsEffective checks if the user module access is currently effective
func (uma *UserModuleAccess) IsEffective() bool {
	if !uma.IsActive {
		return false
	}
	now := time.Now()
	if now.Before(uma.EffectiveFrom) {
		return false
	}
	if uma.EffectiveUntil != nil && now.After(*uma.EffectiveUntil) {
		return false
	}
	return true
}
