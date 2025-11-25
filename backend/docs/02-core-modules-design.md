# Gloria Backend - Core Modules Design

## 1. Module Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Core Modules                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    Auth      │  │ Authorization│  │   User Management    │  │
│  │   Module     │  │    Module    │  │       Module         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Organization │  │   API Key    │  │       Audit          │  │
│  │   Module     │  │   Module     │  │       Module         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Authorization Module

### 2.1 Permission System

**Permission Format:** `resource:action:scope`
- **Resource**: Entity yang diakses (employee, department, role, dll)
- **Action**: CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT, dll
- **Scope**: OWN, DEPARTMENT, SCHOOL, ALL

**Contoh Permission:**
```
employee:read:own        → Baca data sendiri
employee:read:department → Baca data di departemen sendiri
employee:read:all        → Baca semua data
role:assign:school       → Assign role di sekolah sendiri
```

### 2.2 Permission Resolution

```
┌─────────────────────────────────────────────────────────┐
│              Permission Resolution Order                 │
│                                                          │
│  1. User Direct Permission (highest priority)            │
│     └─ user_permissions table                            │
│                                                          │
│  2. User Role Permissions                                │
│     └─ user_roles → role_permissions                     │
│                                                          │
│  3. Role Hierarchy (inherited)                           │
│     └─ role_hierarchy → parent role permissions          │
│                                                          │
│  4. Position-based Permissions                           │
│     └─ user_positions → role_module_access               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Permission Service Interface

```go
// internal/service/permission_service.go

type PermissionService interface {
    // Check permissions
    HasPermission(userID string, permission string) bool
    HasAnyPermission(userID string, permissions []string) bool
    HasAllPermissions(userID string, permissions []string) bool

    // Get user permissions
    GetUserPermissions(userID string) ([]string, error)
    GetEffectivePermissions(userID string) (*EffectivePermissions, error)

    // Permission scope
    GetPermissionScope(userID string, resource string) (PermissionScope, error)
    FilterByScope(userID string, resource string, query *gorm.DB) *gorm.DB
}

type EffectivePermissions struct {
    Direct    []PermissionDetail `json:"direct"`
    FromRoles []PermissionDetail `json:"from_roles"`
    Inherited []PermissionDetail `json:"inherited"`
}
```

### 2.4 Permission Middleware

```go
// internal/middleware/permission.go

// RequirePermission checks if user has specific permission
func RequirePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authCtx := GetAuthContext(c)
        if authCtx == nil {
            ErrorResponse(c, 401, "unauthorized")
            c.Abort()
            return
        }

        if !hasPermission(authCtx.Permissions, permission) {
            ErrorResponse(c, 403, "insufficient permissions")
            c.Abort()
            return
        }

        c.Next()
    }
}

// RequireAnyPermission checks if user has any of the permissions
func RequireAnyPermission(permissions ...string) gin.HandlerFunc

// RequireAllPermissions checks if user has all permissions
func RequireAllPermissions(permissions ...string) gin.HandlerFunc
```

## 3. User Management Module

### 3.1 Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /user-profiles | user:read | List semua user |
| GET | /user-profiles/:id | user:read | Get user by ID |
| POST | /user-profiles | user:create | Create user profile |
| PUT | /user-profiles/:id | user:update | Update user profile |
| DELETE | /user-profiles/:id | user:delete | Delete user profile |
| POST | /user-profiles/:id/roles | role:assign | Assign role ke user |
| DELETE | /user-profiles/:id/roles/:roleId | role:assign | Remove role dari user |
| POST | /user-profiles/:id/positions | position:assign | Assign position ke user |
| POST | /user-profiles/:id/permissions | permission:grant | Grant direct permission |

### 3.2 Service Interface

```go
// internal/service/user_profile_service.go (extended)

type UserProfileService interface {
    // Basic CRUD (existing)
    GetAll() ([]UserProfileListResponse, error)
    GetByID(id string) (*UserProfileResponse, error)
    Create(req *CreateUserProfileRequest, createdBy *string) (*UserProfileResponse, error)
    Update(id string, req *UpdateUserProfileRequest) (*UserProfileResponse, error)
    Delete(id string) error

    // Role management
    AssignRole(userID string, req *AssignRoleToUserRequest, assignedBy string) error
    RemoveRole(userID string, roleID string) error
    GetUserRoles(userID string) ([]UserRoleResponse, error)

    // Position management
    AssignPosition(userID string, req *AssignPositionToUserRequest, appointedBy string) error
    RemovePosition(userID string, positionID string) error
    GetUserPositions(userID string) ([]UserPositionResponse, error)

    // Direct permission management
    GrantPermission(userID string, req *AssignPermissionToUserRequest, grantedBy string) error
    RevokePermission(userID string, permissionID string) error
    GetUserDirectPermissions(userID string) ([]UserPermissionResponse, error)
}
```

## 4. Organization Module

### 4.1 School Service

```go
// internal/service/school_service.go

type SchoolService interface {
    GetAll() ([]SchoolListResponse, error)
    GetByID(id string) (*SchoolResponse, error)
    GetByCode(code string) (*SchoolResponse, error)
    Create(req *CreateSchoolRequest, createdBy *string) (*SchoolResponse, error)
    Update(id string, req *UpdateSchoolRequest, modifiedBy *string) (*SchoolResponse, error)
    Delete(id string) error
    GetDepartments(schoolID string) ([]DepartmentListResponse, error)
    GetPositions(schoolID string) ([]PositionListResponse, error)
}
```

### 4.2 Department Service

```go
// internal/service/department_service.go

type DepartmentService interface {
    GetAll() ([]DepartmentListResponse, error)
    GetByID(id string) (*DepartmentResponse, error)
    GetByCode(code string) (*DepartmentResponse, error)
    Create(req *CreateDepartmentRequest, createdBy *string) (*DepartmentResponse, error)
    Update(id string, req *UpdateDepartmentRequest, modifiedBy *string) (*DepartmentResponse, error)
    Delete(id string) error

    // Tree operations
    GetTree(schoolID *string) ([]*DepartmentTreeResponse, error)
    GetChildren(departmentID string) ([]DepartmentListResponse, error)
    GetAncestors(departmentID string) ([]DepartmentListResponse, error)

    // Validation
    ValidateHierarchy(departmentID string, newParentID string) error
}
```

### 4.3 Position Service

```go
// internal/service/position_service.go

type PositionService interface {
    GetAll() ([]PositionListResponse, error)
    GetByID(id string) (*PositionResponse, error)
    GetByCode(code string) (*PositionResponse, error)
    Create(req *CreatePositionRequest, createdBy *string) (*PositionResponse, error)
    Update(id string, req *UpdatePositionRequest, modifiedBy *string) (*PositionResponse, error)
    Delete(id string) error

    // Hierarchy
    GetHierarchy(positionID string) (*PositionHierarchyResponse, error)
    UpdateHierarchy(positionID string, reportsToID *string, coordinatorID *string) error
    GetSubordinates(positionID string) ([]PositionListResponse, error)

    // Holders
    GetHolders(positionID string) ([]UserProfileListResponse, error)
    CheckAvailability(positionID string) (bool, error)
}
```

## 5. Role Module

### 5.1 Role Service

```go
// internal/service/role_service.go

type RoleService interface {
    GetAll() ([]RoleListResponse, error)
    GetByID(id string) (*RoleResponse, error)
    GetByCode(code string) (*RoleResponse, error)
    Create(req *CreateRoleRequest, createdBy *string) (*RoleResponse, error)
    Update(id string, req *UpdateRoleRequest) (*RoleResponse, error)
    Delete(id string) error

    // Permission management
    GetPermissions(roleID string) ([]PermissionListResponse, error)
    AssignPermission(roleID string, req *AssignPermissionToRoleRequest, grantedBy *string) error
    RemovePermission(roleID string, permissionID string) error

    // Role hierarchy
    GetParentRoles(roleID string) ([]RoleListResponse, error)
    GetChildRoles(roleID string) ([]RoleListResponse, error)
    SetParentRole(roleID string, parentRoleID string) error

    // Users with role
    GetUsers(roleID string) ([]UserProfileListResponse, error)
}
```

## 6. API Key Module

### 6.1 API Key Service

```go
// internal/service/api_key_service.go

type ApiKeyService interface {
    // CRUD
    GetAll(userID string) ([]ApiKeyListResponse, error)
    GetByID(id string) (*ApiKeyResponse, error)
    Create(req *CreateApiKeyRequest, userID string) (*ApiKeyCreatedResponse, error)
    Revoke(id string) error

    // Validation
    ValidateKey(plainKey string) (*ApiKey, error)
    ValidateKeyWithIP(plainKey string, clientIP string) (*ApiKey, error)

    // Usage tracking
    RecordUsage(apiKeyID string, ip string) error
    GetUsageStats(apiKeyID string) (*ApiKeyUsageStats, error)

    // JWT operations
    GenerateJWT(apiKey *ApiKey) (*TokenResponse, error)
}

type ApiKeyUsageStats struct {
    TotalUsage     int       `json:"total_usage"`
    UsageToday     int       `json:"usage_today"`
    LastUsedAt     time.Time `json:"last_used_at"`
    LastUsedIP     string    `json:"last_used_ip"`
    RemainingQuota int       `json:"remaining_quota"`
}
```

### 6.2 API Key Security

```go
// Key generation
func generateAPIKey() (plainKey string, keyHash string, prefix string, lastFour string) {
    // Format: glr_{env}_{random32chars}
    // Example: glr_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

    env := "live" // or "test"
    random := generateSecureRandom(32)
    plainKey = fmt.Sprintf("glr_%s_%s", env, random)

    // Hash with Argon2id
    keyHash = hashWithArgon2id(plainKey)

    prefix = "glr_" + env
    lastFour = plainKey[len(plainKey)-4:]

    return
}
```

## 7. Audit Module

### 7.1 Audit Service

```go
// internal/service/audit_service.go

type AuditService interface {
    // Logging
    Log(entry *AuditLogEntry) error
    LogAction(actorID string, action AuditAction, module string, entityType string, entityID string, metadata map[string]interface{}) error

    // Querying
    GetLogs(filter *AuditLogFilter) ([]AuditLogListResponse, int64, error)
    GetByID(id string) (*AuditLogResponse, error)
    GetUserActivity(userID string, limit int) ([]AuditLogListResponse, error)
    GetEntityHistory(entityType string, entityID string) ([]AuditLogResponse, error)

    // Export
    ExportLogs(filter *AuditLogFilter, format string) ([]byte, error)
}

type AuditLogEntry struct {
    ActorID        string
    ActorProfileID *string
    Action         AuditAction
    Module         string
    EntityType     string
    EntityID       string
    EntityDisplay  string
    OldValues      interface{}
    NewValues      interface{}
    TargetUserID   *string
    IPAddress      string
    UserAgent      string
    Category       AuditCategory
    Metadata       map[string]interface{}
}
```

### 7.2 Automatic Audit Logging

```go
// Helper untuk logging otomatis di service layer
func (s *userProfileService) Update(id string, req *UpdateUserProfileRequest) (*UserProfileResponse, error) {
    // Get current state
    oldProfile, _ := s.repo.FindByID(id)
    oldValues := toMap(oldProfile)

    // Perform update
    // ...

    // Get new state
    newProfile, _ := s.repo.FindByID(id)
    newValues := toMap(newProfile)

    // Log audit
    s.auditService.Log(&AuditLogEntry{
        Action:     AuditActionUpdate,
        Module:     "user_management",
        EntityType: "user_profile",
        EntityID:   id,
        OldValues:  oldValues,
        NewValues:  newValues,
        Category:   AuditCategoryUserManagement,
    })

    return newProfile.ToResponse(), nil
}
```

## 8. File Structure

```
internal/
├── repository/
│   ├── user_repository.go       # (exists)
│   ├── role_repository.go       # NEW
│   ├── permission_repository.go # NEW
│   ├── school_repository.go     # NEW
│   ├── department_repository.go # NEW
│   ├── position_repository.go   # NEW
│   ├── api_key_repository.go    # NEW
│   └── audit_repository.go      # NEW
│
├── service/
│   ├── user_service.go          # (exists, extend)
│   ├── auth_service.go          # NEW
│   ├── permission_service.go    # NEW
│   ├── role_service.go          # NEW
│   ├── school_service.go        # NEW
│   ├── department_service.go    # NEW
│   ├── position_service.go      # NEW
│   ├── api_key_service.go       # NEW
│   └── audit_service.go         # NEW
│
├── handler/
│   ├── user_handler.go          # (exists, extend)
│   ├── auth_handler.go          # NEW
│   ├── role_handler.go          # NEW
│   ├── permission_handler.go    # NEW
│   ├── school_handler.go        # NEW
│   ├── department_handler.go    # NEW
│   ├── position_handler.go      # NEW
│   ├── api_key_handler.go       # NEW
│   └── audit_handler.go         # NEW
│
└── middleware/
    ├── cors.go                  # (exists)
    ├── logger.go                # (exists)
    ├── auth_clerk.go            # NEW
    ├── auth_jwt.go              # NEW
    ├── auth_context.go          # NEW
    ├── permission.go            # NEW
    └── rate_limit.go            # NEW
```

## 9. Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. Auth middleware (Clerk + JWT)
2. Auth context helpers
3. API Key service & handler
4. Basic rate limiting

### Phase 2: Authorization (Week 3)
1. Permission service
2. Permission middleware
3. Permission resolver (role hierarchy)

### Phase 3: Core Modules (Week 4-5)
1. Organization services (School, Department, Position)
2. Role service with permission management
3. Extended user management

### Phase 4: Audit & Polish (Week 6)
1. Audit service
2. Audit logging integration
3. Testing & documentation
