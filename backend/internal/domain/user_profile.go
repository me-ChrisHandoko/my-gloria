package domain

import (
	"time"

	"gorm.io/datatypes"
)

// UserProfile represents a user profile linked to Clerk authentication and employee data
type UserProfile struct {
	ID          string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	ClerkUserID string          `json:"clerk_user_id" gorm:"column:clerk_user_id;type:varchar(100);uniqueIndex;not null"`
	NIP         string          `json:"nip" gorm:"column:nip;type:varchar(15);uniqueIndex;not null"`
	IsActive    bool            `json:"is_active" gorm:"column:is_active;default:true"`
	LastActive  *time.Time      `json:"last_active,omitempty" gorm:"column:last_active"`
	Preferences *datatypes.JSON `json:"preferences,omitempty" gorm:"type:jsonb"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	CreatedBy   *string         `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`

	// Relations
	DataKaryawan           *DataKaryawan      `json:"data_karyawan,omitempty" gorm:"foreignKey:NIP;references:NIP"`
	ApiKeys                []ApiKey           `json:"-" gorm:"foreignKey:UserID"`
	ActorAuditLogs         []AuditLog         `json:"-" gorm:"foreignKey:ActorProfileID"`
	TargetAuditLogs        []AuditLog         `json:"-" gorm:"foreignKey:TargetUserID"`
	DelegationsAsDelegate  []Delegation       `json:"-" gorm:"foreignKey:DelegateID"`
	DelegationsAsDelegator []Delegation       `json:"-" gorm:"foreignKey:DelegatorID"`
	UserModuleAccess       []UserModuleAccess `json:"-" gorm:"foreignKey:UserProfileID"`
	UserPermissions        []UserPermission   `json:"-" gorm:"foreignKey:UserProfileID"`
	UserPositions          []UserPosition     `json:"-" gorm:"foreignKey:UserProfileID"`
	UserRoles              []UserRole         `json:"-" gorm:"foreignKey:UserProfileID"`
}

// TableName specifies the table name for UserProfile
func (UserProfile) TableName() string {
	return "gloria_ops.user_profiles"
}

// UserRole represents the assignment of roles to users
type UserRole struct {
	ID             string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserProfileID  string     `json:"user_profile_id" gorm:"column:user_profile_id;type:varchar(36);not null;index"`
	RoleID         string     `json:"role_id" gorm:"column:role_id;type:varchar(36);not null;index"`
	AssignedAt     time.Time  `json:"assigned_at" gorm:"column:assigned_at;default:CURRENT_TIMESTAMP"`
	AssignedBy     *string    `json:"assigned_by,omitempty" gorm:"column:assigned_by;type:varchar(36)"`
	IsActive       bool       `json:"is_active" gorm:"column:is_active;default:true"`
	EffectiveFrom  time.Time  `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty" gorm:"column:effective_until"`

	// Relations
	UserProfile *UserProfile `json:"user_profile,omitempty" gorm:"foreignKey:UserProfileID;constraint:OnDelete:CASCADE"`
	Role        *Role        `json:"role,omitempty" gorm:"foreignKey:RoleID"`
}

// TableName specifies the table name for UserRole
func (UserRole) TableName() string {
	return "gloria_ops.user_roles"
}

// UserPosition represents the assignment of positions to users
type UserPosition struct {
	ID              string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserProfileID   string     `json:"user_profile_id" gorm:"column:user_profile_id;type:varchar(36);not null"`
	PositionID      string     `json:"position_id" gorm:"column:position_id;type:varchar(36);not null"`
	StartDate       time.Time  `json:"start_date" gorm:"column:start_date;not null"`
	EndDate         *time.Time `json:"end_date,omitempty" gorm:"column:end_date"`
	IsActive        bool       `json:"is_active" gorm:"column:is_active;default:true"`
	IsPlt           bool       `json:"is_plt" gorm:"column:is_plt;default:false"`
	AppointedBy     *string    `json:"appointed_by,omitempty" gorm:"column:appointed_by;type:varchar(36)"`
	SKNumber        *string    `json:"sk_number,omitempty" gorm:"column:sk_number;type:varchar(100)"`
	Notes           *string    `json:"notes,omitempty" gorm:"type:text"`
	PermissionScope *string    `json:"permission_scope,omitempty" gorm:"column:permission_scope;type:varchar(50)"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Relations
	UserProfile *UserProfile `json:"user_profile,omitempty" gorm:"foreignKey:UserProfileID;constraint:OnDelete:CASCADE"`
	Position    *Position    `json:"position,omitempty" gorm:"foreignKey:PositionID"`
}

// TableName specifies the table name for UserPosition
func (UserPosition) TableName() string {
	return "gloria_ops.user_positions"
}

// UserPermission represents direct permission assignments to users
type UserPermission struct {
	ID             string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserProfileID  string     `json:"user_profile_id" gorm:"column:user_profile_id;type:varchar(36);not null;index"`
	PermissionID   string     `json:"permission_id" gorm:"column:permission_id;type:varchar(36);not null;index"`
	IsGranted      bool       `json:"is_granted" gorm:"column:is_granted;default:true"`
	Conditions     *string    `json:"conditions,omitempty" gorm:"type:jsonb"`
	GrantedBy      string     `json:"granted_by" gorm:"column:granted_by;type:varchar(36);not null"`
	GrantReason    string     `json:"grant_reason" gorm:"column:grant_reason;type:text;not null"`
	Priority       int        `json:"priority" gorm:"default:100"`
	IsTemporary    bool       `json:"is_temporary" gorm:"column:is_temporary;default:false"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	ResourceID     *string    `json:"resource_id,omitempty" gorm:"column:resource_id;type:varchar(36)"`
	ResourceType   *string    `json:"resource_type,omitempty" gorm:"column:resource_type;type:varchar(50)"`
	EffectiveFrom  time.Time  `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty" gorm:"column:effective_until"`

	// Relations
	UserProfile *UserProfile `json:"user_profile,omitempty" gorm:"foreignKey:UserProfileID;constraint:OnDelete:CASCADE"`
	Permission  *Permission  `json:"permission,omitempty" gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for UserPermission
func (UserPermission) TableName() string {
	return "gloria_ops.user_permissions"
}

// CreateUserProfileRequest represents the request body for creating a user profile
type CreateUserProfileRequest struct {
	ClerkUserID string          `json:"clerk_user_id" binding:"required,min=1,max=100"`
	NIP         string          `json:"nip" binding:"required,len=15"`
	Preferences *datatypes.JSON `json:"preferences,omitempty"`
}

// UpdateUserProfileRequest represents the request body for updating a user profile
type UpdateUserProfileRequest struct {
	IsActive    *bool           `json:"is_active,omitempty"`
	Preferences *datatypes.JSON `json:"preferences,omitempty"`
}

// UserProfileResponse represents the response body for user profile data
type UserProfileResponse struct {
	ID                    string                    `json:"id"`
	ClerkUserID           string                    `json:"clerk_user_id"`
	NIP                   string                    `json:"nip"`
	IsActive              bool                      `json:"is_active"`
	LastActive            *time.Time                `json:"last_active,omitempty"`
	Preferences           *datatypes.JSON           `json:"preferences,omitempty"`
	CreatedAt             time.Time                 `json:"created_at"`
	UpdatedAt             time.Time                 `json:"updated_at"`
	CreatedBy             *string                   `json:"created_by,omitempty"`
	DataKaryawan          *DataKaryawanResponse     `json:"data_karyawan,omitempty"`
	Roles                 []RoleListResponse        `json:"roles,omitempty"`
	Positions             []UserPositionResponse    `json:"positions,omitempty"`
}

// UserProfileListResponse represents the response for listing user profiles
type UserProfileListResponse struct {
	ID          string     `json:"id"`
	ClerkUserID string     `json:"clerk_user_id"`
	NIP         string     `json:"nip"`
	Name        *string    `json:"name,omitempty"`
	Email       *string    `json:"email,omitempty"`
	IsActive    bool       `json:"is_active"`
	LastActive  *time.Time `json:"last_active,omitempty"`
}

// UserRoleResponse represents the response for user role assignment
type UserRoleResponse struct {
	ID             string            `json:"id"`
	RoleID         string            `json:"role_id"`
	Role           *RoleListResponse `json:"role,omitempty"`
	AssignedAt     time.Time         `json:"assigned_at"`
	AssignedBy     *string           `json:"assigned_by,omitempty"`
	IsActive       bool              `json:"is_active"`
	EffectiveFrom  time.Time         `json:"effective_from"`
	EffectiveUntil *time.Time        `json:"effective_until,omitempty"`
}

// UserPositionResponse represents the response for user position assignment
type UserPositionResponse struct {
	ID              string                `json:"id"`
	PositionID      string                `json:"position_id"`
	Position        *PositionListResponse `json:"position,omitempty"`
	StartDate       time.Time             `json:"start_date"`
	EndDate         *time.Time            `json:"end_date,omitempty"`
	IsActive        bool                  `json:"is_active"`
	IsPlt           bool                  `json:"is_plt"`
	SKNumber        *string               `json:"sk_number,omitempty"`
	PermissionScope *string               `json:"permission_scope,omitempty"`
}

// AssignRoleToUserRequest represents the request for assigning role to user
type AssignRoleToUserRequest struct {
	RoleID         string     `json:"role_id" binding:"required,len=36"`
	EffectiveFrom  *time.Time `json:"effective_from,omitempty"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty"`
}

// AssignPositionToUserRequest represents the request for assigning position to user
type AssignPositionToUserRequest struct {
	PositionID      string     `json:"position_id" binding:"required,len=36"`
	StartDate       time.Time  `json:"start_date" binding:"required"`
	EndDate         *time.Time `json:"end_date,omitempty"`
	IsPlt           *bool      `json:"is_plt,omitempty"`
	SKNumber        *string    `json:"sk_number,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	PermissionScope *string    `json:"permission_scope,omitempty"`
}

// AssignPermissionToUserRequest represents the request for assigning permission to user
type AssignPermissionToUserRequest struct {
	PermissionID   string     `json:"permission_id" binding:"required,len=36"`
	IsGranted      *bool      `json:"is_granted,omitempty"`
	Conditions     *string    `json:"conditions,omitempty"`
	GrantReason    string     `json:"grant_reason" binding:"required,min=5"`
	Priority       *int       `json:"priority,omitempty"`
	IsTemporary    *bool      `json:"is_temporary,omitempty"`
	ResourceID     *string    `json:"resource_id,omitempty"`
	ResourceType   *string    `json:"resource_type,omitempty"`
	EffectiveFrom  *time.Time `json:"effective_from,omitempty"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty"`
}

// ToResponse converts UserProfile to UserProfileResponse
func (u *UserProfile) ToResponse() *UserProfileResponse {
	resp := &UserProfileResponse{
		ID:          u.ID,
		ClerkUserID: u.ClerkUserID,
		NIP:         u.NIP,
		IsActive:    u.IsActive,
		LastActive:  u.LastActive,
		Preferences: u.Preferences,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
		CreatedBy:   u.CreatedBy,
	}

	if u.DataKaryawan != nil {
		resp.DataKaryawan = u.DataKaryawan.ToResponse()
	}

	if len(u.UserRoles) > 0 {
		resp.Roles = make([]RoleListResponse, 0, len(u.UserRoles))
		for _, ur := range u.UserRoles {
			if ur.Role != nil && ur.IsActive {
				resp.Roles = append(resp.Roles, *ur.Role.ToListResponse())
			}
		}
	}

	if len(u.UserPositions) > 0 {
		resp.Positions = make([]UserPositionResponse, 0, len(u.UserPositions))
		for _, up := range u.UserPositions {
			if up.IsActive {
				resp.Positions = append(resp.Positions, *up.ToResponse())
			}
		}
	}

	return resp
}

// ToListResponse converts UserProfile to UserProfileListResponse
func (u *UserProfile) ToListResponse() *UserProfileListResponse {
	resp := &UserProfileListResponse{
		ID:          u.ID,
		ClerkUserID: u.ClerkUserID,
		NIP:         u.NIP,
		IsActive:    u.IsActive,
		LastActive:  u.LastActive,
	}

	if u.DataKaryawan != nil {
		resp.Name = u.DataKaryawan.Nama
		resp.Email = u.DataKaryawan.Email
	}

	return resp
}

// ToResponse converts UserPosition to UserPositionResponse
func (up *UserPosition) ToResponse() *UserPositionResponse {
	resp := &UserPositionResponse{
		ID:              up.ID,
		PositionID:      up.PositionID,
		StartDate:       up.StartDate,
		EndDate:         up.EndDate,
		IsActive:        up.IsActive,
		IsPlt:           up.IsPlt,
		SKNumber:        up.SKNumber,
		PermissionScope: up.PermissionScope,
	}

	if up.Position != nil {
		resp.Position = up.Position.ToListResponse()
	}

	return resp
}

// ToResponse converts UserRole to UserRoleResponse
func (ur *UserRole) ToResponse() *UserRoleResponse {
	resp := &UserRoleResponse{
		ID:             ur.ID,
		RoleID:         ur.RoleID,
		AssignedAt:     ur.AssignedAt,
		AssignedBy:     ur.AssignedBy,
		IsActive:       ur.IsActive,
		EffectiveFrom:  ur.EffectiveFrom,
		EffectiveUntil: ur.EffectiveUntil,
	}

	if ur.Role != nil {
		resp.Role = ur.Role.ToListResponse()
	}

	return resp
}

// IsEffective checks if the user role is currently effective
func (ur *UserRole) IsEffective() bool {
	if !ur.IsActive {
		return false
	}
	now := time.Now()
	if now.Before(ur.EffectiveFrom) {
		return false
	}
	if ur.EffectiveUntil != nil && now.After(*ur.EffectiveUntil) {
		return false
	}
	return true
}

// IsEffective checks if the user position is currently effective
func (up *UserPosition) IsEffective() bool {
	if !up.IsActive {
		return false
	}
	now := time.Now()
	if now.Before(up.StartDate) {
		return false
	}
	if up.EndDate != nil && now.After(*up.EndDate) {
		return false
	}
	return true
}

// IsEffective checks if the user permission is currently effective
func (up *UserPermission) IsEffective() bool {
	now := time.Now()
	if now.Before(up.EffectiveFrom) {
		return false
	}
	if up.EffectiveUntil != nil && now.After(*up.EffectiveUntil) {
		return false
	}
	return up.IsGranted
}
