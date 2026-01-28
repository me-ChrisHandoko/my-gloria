package models

import (
	"time"

	"gorm.io/datatypes"
)

// User represents a user with custom JWT authentication and employee data
type User struct {
	ID string `json:"id" gorm:"type:varchar(36);primaryKey"`

	// Authentication fields
	Email                  string     `json:"email" gorm:"column:email;type:varchar(255);uniqueIndex;not null"`
	Username               *string    `json:"username,omitempty" gorm:"column:username;type:varchar(50);uniqueIndex"`
	PasswordHash           string     `json:"-" gorm:"column:password_hash;type:varchar(255);not null"`
	PasswordResetToken     *string    `json:"-" gorm:"column:password_reset_token;type:varchar(255)"`
	PasswordResetExpiresAt *time.Time `json:"-" gorm:"column:password_reset_expires_at"`
	LastPasswordChange     *time.Time `json:"last_password_change,omitempty" gorm:"column:last_password_change"`

	// Security fields
	FailedLoginAttempts int        `json:"-" gorm:"column:failed_login_attempts;default:0"`
	LockedUntil         *time.Time `json:"locked_until,omitempty" gorm:"column:locked_until"`

	IsActive    bool            `json:"is_active" gorm:"column:is_active;default:true"`
	LastActive  *time.Time      `json:"last_active,omitempty" gorm:"column:last_active"`
	Preferences *datatypes.JSON `json:"preferences,omitempty" gorm:"type:jsonb"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	CreatedBy   *string         `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`

	// Relations
	ApiKeys                []ApiKey           `json:"-" gorm:"foreignKey:UserID"`
	RefreshTokens          []RefreshToken     `json:"-" gorm:"foreignKey:UserID"`
	ActorAuditLogs         []AuditLog         `json:"-" gorm:"foreignKey:ActorProfileID"`
	TargetAuditLogs        []AuditLog         `json:"-" gorm:"foreignKey:TargetUserID"`
	DelegationsAsDelegate  []Delegation       `json:"-" gorm:"foreignKey:DelegateID"`
	DelegationsAsDelegator []Delegation       `json:"-" gorm:"foreignKey:DelegatorID"`
	UserModuleAccess       []UserModuleAccess `json:"-" gorm:"foreignKey:UserID"`
	UserPermissions        []UserPermission   `json:"-" gorm:"foreignKey:UserID"`
	UserPositions          []UserPosition     `json:"-" gorm:"foreignKey:UserID"`
	UserRoles              []UserRole         `json:"-" gorm:"foreignKey:UserID"`
	DataKaryawan           *DataKaryawan      `json:"data_karyawan,omitempty" gorm:"foreignKey:Email;references:Email;constraint:-"`
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "public.users"
}

// UserRole represents the assignment of roles to users
type UserRole struct {
	ID             string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserID  string     `json:"user_id" gorm:"column:user_id;type:varchar(36);not null;index"`
	RoleID         string     `json:"role_id" gorm:"column:role_id;type:varchar(36);not null;index"`
	AssignedAt     time.Time  `json:"assigned_at" gorm:"column:assigned_at;default:CURRENT_TIMESTAMP"`
	AssignedBy     *string    `json:"assigned_by,omitempty" gorm:"column:assigned_by;type:varchar(36)"`
	IsActive       bool       `json:"is_active" gorm:"column:is_active;default:true"`
	EffectiveFrom  time.Time  `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty" gorm:"column:effective_until"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Role *Role `json:"role,omitempty" gorm:"foreignKey:RoleID"`
}

// TableName specifies the table name for UserRole
func (UserRole) TableName() string {
	return "public.user_roles"
}

// UserPosition represents the assignment of positions to users
type UserPosition struct {
	ID              string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserID   string     `json:"user_id" gorm:"column:user_id;type:varchar(36);not null"`
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
	User     *User     `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Position *Position `json:"position,omitempty" gorm:"foreignKey:PositionID"`
}

// TableName specifies the table name for UserPosition
func (UserPosition) TableName() string {
	return "public.user_positions"
}

// UserPermission represents direct permission assignments to users
type UserPermission struct {
	ID             string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserID  string     `json:"user_id" gorm:"column:user_id;type:varchar(36);not null;index"`
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
	User       *User       `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Permission *Permission `json:"permission,omitempty" gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for UserPermission
func (UserPermission) TableName() string {
	return "public.user_permissions"
}

// CreateUserRequest represents the request body for creating a user
type CreateUserRequest struct {
	Email       string          `json:"email" binding:"required,email,max=255"`
	Password    string          `json:"password" binding:"required,min=8,max=100"`
	Preferences *datatypes.JSON `json:"preferences,omitempty"`
}

// UpdateUserRequest represents the request body for updating a user
type UpdateUserRequest struct {
	IsActive    *bool           `json:"is_active,omitempty"`
	Preferences *datatypes.JSON `json:"preferences,omitempty"`
}

// UserResponse represents the response body for user data
type UserResponse struct {
	ID           string                    `json:"id"`
	Email        string                    `json:"email"`
	Username     *string                   `json:"username,omitempty"`
	Name         *string                   `json:"name,omitempty"`
	IsActive     bool                      `json:"is_active"`
	LastActive   *time.Time                `json:"last_active,omitempty"`
	Preferences  *datatypes.JSON           `json:"preferences,omitempty"`
	CreatedAt    time.Time                 `json:"created_at"`
	UpdatedAt    time.Time                 `json:"updated_at"`
	CreatedBy    *string                   `json:"created_by,omitempty"`
	Roles        []RoleListResponse        `json:"roles,omitempty"`
	Positions    []UserPositionResponse    `json:"positions,omitempty"`
	DataKaryawan *DataKaryawanInfoResponse `json:"data_karyawan,omitempty"`
}

// UserListResponse represents the response for listing users
type UserListResponse struct {
	ID         string     `json:"id"`
	Email      string     `json:"email"`
	Username   *string    `json:"username,omitempty"`
	Name       *string    `json:"name,omitempty"`
	IsActive   bool       `json:"is_active"`
	LastActive *time.Time `json:"last_active,omitempty"`
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

// UserPermissionResponse represents the response for user permission assignment
type UserPermissionResponse struct {
	ID             string                  `json:"id"`
	PermissionID   string                  `json:"permission_id"`
	Permission     *PermissionListResponse `json:"permission,omitempty"`
	IsGranted      bool                    `json:"is_granted"`
	Conditions     *string                 `json:"conditions,omitempty"`
	GrantedBy      string                  `json:"granted_by"`
	GrantReason    string                  `json:"grant_reason"`
	Priority       int                     `json:"priority"`
	IsTemporary    bool                    `json:"is_temporary"`
	ResourceID     *string                 `json:"resource_id,omitempty"`
	ResourceType   *string                 `json:"resource_type,omitempty"`
	EffectiveFrom  time.Time               `json:"effective_from"`
	EffectiveUntil *time.Time              `json:"effective_until,omitempty"`
	CreatedAt      time.Time               `json:"created_at"`
}

// ToResponse converts UserPermission to UserPermissionResponse
func (up *UserPermission) ToResponse() *UserPermissionResponse {
	resp := &UserPermissionResponse{
		ID:             up.ID,
		PermissionID:   up.PermissionID,
		IsGranted:      up.IsGranted,
		Conditions:     up.Conditions,
		GrantedBy:      up.GrantedBy,
		GrantReason:    up.GrantReason,
		Priority:       up.Priority,
		IsTemporary:    up.IsTemporary,
		ResourceID:     up.ResourceID,
		ResourceType:   up.ResourceType,
		EffectiveFrom:  up.EffectiveFrom,
		EffectiveUntil: up.EffectiveUntil,
		CreatedAt:      up.CreatedAt,
	}

	// Add Permission details if present
	if up.Permission != nil {
		resp.Permission = up.Permission.ToListResponse()
	}

	return resp
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() *UserResponse {
	resp := &UserResponse{
		ID:          u.ID,
		Email:       u.Email,
		Username:    u.Username,
		IsActive:    u.IsActive,
		LastActive:  u.LastActive,
		Preferences: u.Preferences,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
		CreatedBy:   u.CreatedBy,
	}

	// Add DataKaryawan if present
	if u.DataKaryawan != nil {
		firstname, lastname := u.DataKaryawan.SplitName()

		// Get full name directly from database (preserves all parts of name)
		fullName := ""
		if u.DataKaryawan.Nama != nil && *u.DataKaryawan.Nama != "" {
			fullName = *u.DataKaryawan.Nama
		} else {
			// Fallback to NIP if name is empty
			fullName = u.DataKaryawan.NIP
		}

		resp.DataKaryawan = &DataKaryawanInfoResponse{
			NIP:           u.DataKaryawan.NIP,
			Firstname:     firstname,
			Lastname:      lastname,
			FullName:      fullName,
			Departemen:    u.DataKaryawan.BagianKerja,
			Jabatan:       u.DataKaryawan.BidangKerja,
			JenisKaryawan: u.DataKaryawan.JenisKaryawan,
		}

		// Also set Name field for convenience
		resp.Name = &fullName
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

// ToListResponse converts User to UserListResponse
func (u *User) ToListResponse() *UserListResponse {
	return &UserListResponse{
		ID:         u.ID,
		Email:      u.Email,
		Username:   u.Username,
		IsActive:   u.IsActive,
		LastActive: u.LastActive,
	}
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

// ToUserInfo converts User to UserInfo with optional DataKaryawan
func (u *User) ToUserInfo() *UserInfo {
	userInfo := &UserInfo{
		ID:       u.ID,
		Email:    u.Email,
		Username: u.Username,
		IsActive: u.IsActive,
	}

	// Add DataKaryawan if present
	if u.DataKaryawan != nil {
		firstname, lastname := u.DataKaryawan.SplitName()

		// Get full name directly from database (preserves all parts of name)
		fullName := ""
		if u.DataKaryawan.Nama != nil && *u.DataKaryawan.Nama != "" {
			fullName = *u.DataKaryawan.Nama
		} else {
			// Fallback to NIP if name is empty
			fullName = u.DataKaryawan.NIP
		}

		userInfo.DataKaryawan = &DataKaryawanInfoResponse{
			NIP:           u.DataKaryawan.NIP,
			Firstname:     firstname,
			Lastname:      lastname,
			FullName:      fullName,
			Departemen:    u.DataKaryawan.BagianKerja,
			Jabatan:       u.DataKaryawan.BidangKerja,
			JenisKaryawan: u.DataKaryawan.JenisKaryawan,
		}
	}

	return userInfo
}

// RefreshToken represents a refresh token for JWT authentication
type RefreshToken struct {
	ID            string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	UserID string          `json:"user_id" gorm:"column:user_id;type:varchar(36);not null;index"`
	TokenHash     string          `json:"-" gorm:"column:token_hash;type:varchar(255);not null;uniqueIndex"`
	ExpiresAt     time.Time       `json:"expires_at" gorm:"column:expires_at;not null;index"`
	CreatedAt     time.Time       `json:"created_at"`
	LastUsedAt    *time.Time      `json:"last_used_at,omitempty" gorm:"column:last_used_at"`
	RevokedAt     *time.Time      `json:"revoked_at,omitempty" gorm:"column:revoked_at"`
	UserAgent     *string         `json:"user_agent,omitempty" gorm:"type:text"`
	IPAddress     *string         `json:"ip_address,omitempty" gorm:"column:ip_address;type:varchar(45)"`
	DeviceInfo    *datatypes.JSON `json:"device_info,omitempty" gorm:"column:device_info;type:jsonb"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for RefreshToken
func (RefreshToken) TableName() string {
	return "public.refresh_tokens"
}

// IsValid checks if the refresh token is valid and not expired or revoked
func (rt *RefreshToken) IsValid() bool {
	if rt.RevokedAt != nil {
		return false
	}
	return time.Now().Before(rt.ExpiresAt)
}

// LoginAttempt represents a login attempt for security tracking
type LoginAttempt struct {
	ID            string     `json:"id" gorm:"type:varchar(36);primaryKey"`
	Email         string     `json:"email" gorm:"column:email;type:varchar(255);not null;index"`
	IPAddress     string     `json:"ip_address" gorm:"column:ip_address;type:varchar(45);not null"`
	UserAgent     *string    `json:"user_agent,omitempty" gorm:"type:text"`
	Success       bool       `json:"success" gorm:"column:success;not null;index"`
	FailureReason *string    `json:"failure_reason,omitempty" gorm:"column:failure_reason;type:varchar(100)"`
	AttemptedAt   time.Time  `json:"attempted_at" gorm:"column:attempted_at;not null;default:CURRENT_TIMESTAMP;index"`
}

// TableName specifies the table name for LoginAttempt
func (LoginAttempt) TableName() string {
	return "public.login_attempts"
}

// Authentication DTOs

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Email    string  `json:"email" binding:"required,email,max=255"`
	Password string  `json:"password" binding:"required,min=8,max=100"`
	Username *string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshTokenRequest represents the request body for token refresh
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ChangePasswordRequest represents the request body for password change
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8,max=100"`
}

// AuthResponse represents the response body for authentication operations
type AuthResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int64     `json:"expires_in"` // seconds
	User         *UserInfo `json:"user"`
}

// UserInfo represents basic user information in auth response
type UserInfo struct {
	ID           string                    `json:"id"`
	Email        string                    `json:"email"`
	Username     *string                   `json:"username,omitempty"`
	IsActive     bool                      `json:"is_active"`
	DataKaryawan *DataKaryawanInfoResponse `json:"data_karyawan,omitempty"`
}

// DataKaryawanInfoResponse represents simplified employee data for auth response
type DataKaryawanInfoResponse struct {
	NIP           string  `json:"nip"`
	Firstname     string  `json:"firstname"`
	Lastname      string  `json:"lastname"`
	FullName      string  `json:"full_name"`
	Departemen    *string `json:"departemen,omitempty"`
	Jabatan       *string `json:"jabatan,omitempty"`
	JenisKaryawan *string `json:"jenis_karyawan,omitempty"`
}
