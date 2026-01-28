# Panduan Implementasi RBAC - Gloria Ops Backend

## Daftar Isi

1. [Arsitektur RBAC](#1-arsitektur-rbac)
2. [Database Models](#2-database-models)
3. [Permission Resolution Algorithm](#3-permission-resolution-algorithm)
4. [Implementation Components](#4-implementation-components)
5. [API Endpoints](#5-api-endpoints)
6. [Use Cases & Examples](#6-use-cases--examples)
7. [Best Practices & Security](#7-best-practices--security)

---

## 1. Arsitektur RBAC

### 1.1 Overview Sistem

Gloria Ops mengimplementasikan **Multi-Layered Role-Based Access Control (RBAC)** dengan fitur:

- ✅ **Hierarchical Roles** - Role dengan parent-child relationship dan permission inheritance
- ✅ **Position-Based Permissions** - Permissions berdasarkan jabatan dalam organisasi
- ✅ **Direct User Permissions** - Override permissions langsung ke user dengan priority
- ✅ **Time-Bound Assignments** - Semua assignments memiliki effective date range
- ✅ **Resource-Level Permissions** - Permissions dapat di-scope ke resource spesifik
- ✅ **Conditional Permissions** - Dynamic permission evaluation dengan JSONB conditions
- ✅ **Module Access Control** - Granular control untuk system modules
- ✅ **Temporary Assignments** - Support untuk PLT (Pelaksana Tugas) dan temporary permissions

### 1.2 Permission Resolution Priority

```
┌─────────────────────────────────────────┐
│  1. USER PERMISSION (Highest Priority)  │
│     - Direct grants/denials             │
│     - Priority-based resolution         │
│     - Resource-specific permissions     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. POSITION PERMISSIONS                │
│     - Based on UserPosition             │
│     - Includes PLT assignments          │
│     - Department/School scoped          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. ROLE PERMISSIONS (Lowest Priority)  │
│     - Based on UserRole                 │
│     - Includes inherited permissions    │
│     - Role hierarchy support            │
└─────────────────────────────────────────┘
```

### 1.3 Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│     USER     │────────>│  USER_ROLE   │<────────│     ROLE     │
└──────────────┘         └──────────────┘         └──────────────┘
       │                                                    │
       │                                                    │
       ↓                                                    ↓
┌──────────────┐                                  ┌──────────────┐
│USER_POSITION │                                  │ROLE_HIERARCHY│
└──────────────┘                                  └──────────────┘
       │                                                    │
       ↓                                                    ↓
┌──────────────┐                                  ┌──────────────┐
│   POSITION   │                                  │ROLE_PERMISSION│
└──────────────┘                                  └──────────────┘
                                                           │
┌──────────────┐                                          │
│USER_PERMISSION│──────────────────────────────────────>  │
└──────────────┘                                          ↓
                                                  ┌──────────────┐
                                                  │  PERMISSION  │
                                                  └──────────────┘
                                                           │
                                                           ↓
                                                  ┌──────────────┐
                                                  │    MODULE    │
                                                  └──────────────┘
```

---

## 2. Database Models

### 2.1 Core Models

#### User
**Table:** `public.users`

```go
type User struct {
    ID                     string    // UUID primary key
    Email                  string    // Unique, not null
    Username               *string   // Unique, optional
    PasswordHash           string    // Argon2id hash
    PasswordResetToken     *string
    PasswordResetExpiresAt *time.Time
    LastPasswordChange     *time.Time
    FailedLoginAttempts    int       // Default: 0
    LockedUntil            *time.Time
    IsActive               bool      // Default: true
    LastActive             *time.Time
    Preferences            *datatypes.JSON // JSONB
    CreatedAt              time.Time
    UpdatedAt              time.Time
    CreatedBy              *string
}
```

**Relations:**
- `UserRoles []UserRole` - Assigned roles
- `UserPositions []UserPosition` - Assigned positions
- `UserPermissions []UserPermission` - Direct permissions
- `UserModuleAccess []UserModuleAccess` - Module access
- `DataKaryawan *DataKaryawan` - Employee data (via email)

#### Role
**Table:** `public.roles`

```go
type Role struct {
    ID             string    // UUID primary key
    Code           string    // Unique, not null (e.g., "ADMIN", "TEACHER")
    Name           string    // Display name
    Description    *string
    HierarchyLevel int       // 1-10, lower = higher authority
    IsSystemRole   bool      // Protected system roles
    IsActive       bool      // Default: true
    CreatedAt      time.Time
    UpdatedAt      time.Time
    CreatedBy      *string
}
```

**Relations:**
- `ParentRoles []RoleHierarchy` - Parent roles in hierarchy
- `ChildRoles []RoleHierarchy` - Child roles in hierarchy
- `RolePermissions []RolePermission` - Assigned permissions
- `RoleModuleAccess []RoleModuleAccess` - Module access
- `UserRoles []UserRole` - Users with this role

**Business Rules:**
- Code must be unique and uppercase (e.g., "ADMIN", "TEACHER")
- HierarchyLevel: 1 = highest authority, 10 = lowest
- IsSystemRole=true roles cannot be deleted
- Role hierarchy determines permission inheritance

#### Permission
**Table:** `public.permissions`

```go
type Permission struct {
    ID                 string           // UUID primary key
    Code               string           // Unique (e.g., "users:read:all")
    Name               string           // Display name
    Description        *string
    Resource           string           // Resource name (e.g., "users")
    Action             PermissionAction // CREATE, READ, UPDATE, DELETE, etc.
    Scope              *PermissionScope // OWN, DEPARTMENT, SCHOOL, ALL
    Conditions         *string          // JSONB for dynamic conditions
    Metadata           *string          // JSONB for additional data
    IsSystemPermission bool             // Protected system permissions
    IsActive           bool             // Default: true
    Category           *ModuleCategory  // For grouping
    GroupIcon          *string          // UI icon
    GroupName          *string          // UI group name
    GroupSortOrder     *int             // UI sorting
    CreatedAt          time.Time
    UpdatedAt          time.Time
    CreatedBy          *string
}
```

**Enums:**

```go
// PermissionAction
type PermissionAction string
const (
    PermissionActionCreate  = "CREATE"
    PermissionActionRead    = "READ"
    PermissionActionUpdate  = "UPDATE"
    PermissionActionDelete  = "DELETE"
    PermissionActionApprove = "APPROVE"
    PermissionActionExport  = "EXPORT"
    PermissionActionImport  = "IMPORT"
    PermissionActionPrint   = "PRINT"
    PermissionActionAssign  = "ASSIGN"
    PermissionActionClose   = "CLOSE"
)

// PermissionScope
type PermissionScope string
const (
    PermissionScopeOwn        = "OWN"        // Hanya data sendiri
    PermissionScopeDepartment = "DEPARTMENT" // Data dalam department
    PermissionScopeSchool     = "SCHOOL"     // Data dalam school
    PermissionScopeAll        = "ALL"        // Semua data
)
```

**Permission Code Format:**
```
{resource}:{action}:{scope}

Examples:
- users:read:all       → Read all users
- users:update:own     → Update own user data
- teachers:delete:department → Delete teachers in department
- reports:export:school → Export reports for school
```

**Relations:**
- `RolePermissions []RolePermission` - Roles with this permission
- `UserPermissions []UserPermission` - Users with this permission

**Business Rules:**
- Code must follow format: `{resource}:{action}:{scope}`
- Code must be unique
- IsSystemPermission=true permissions cannot be deleted
- Conditions field allows dynamic permission evaluation

#### Position
**Table:** `public.positions`

```go
type Position struct {
    ID             string    // UUID primary key
    Code           string    // Unique (e.g., "HEAD_TEACHER")
    Name           string    // Display name
    DepartmentID   *string   // Optional department
    SchoolID       *string   // Optional school
    HierarchyLevel int       // Position level in organization
    MaxHolders     int       // Max users (default: 1)
    IsUnique       bool      // Only one holder allowed
    IsActive       bool      // Default: true
    CreatedAt      time.Time
    UpdatedAt      time.Time
    CreatedBy      *string
    ModifiedBy     *string
}
```

**Relations:**
- `Department *Department` - Parent department
- `School *School` - Parent school
- `UserPositions []UserPosition` - Users with this position
- `RoleModuleAccess []RoleModuleAccess` - Module access for position

**Business Rules:**
- Code must be unique
- If IsUnique=true, MaxHolders must be 1
- Position can be department-scoped, school-scoped, or global
- HierarchyLevel determines organizational authority

#### Module
**Table:** `public.modules`

```go
type Module struct {
    ID          string         // UUID primary key
    Code        string         // Unique (e.g., "USER_MGMT")
    Name        string         // Display name
    Category    ModuleCategory // SERVICE, PERFORMANCE, QUALITY, etc.
    Description *string
    Icon        *string        // UI icon name
    Path        *string        // Frontend route path
    ParentID    *string        // Parent module for hierarchy
    SortOrder   int            // Display order
    IsActive    bool           // Module enabled
    IsVisible   bool           // Visible in UI
    Version     int            // Optimistic locking
    DeletedAt   gorm.DeletedAt // Soft delete
    DeletedBy   *string
    DeleteReason *string
    CreatedAt   time.Time
    UpdatedAt   time.Time
    CreatedBy   *string
    UpdatedBy   *string
}
```

**Enums:**
```go
type ModuleCategory string
const (
    ModuleCategoryService     = "SERVICE"
    ModuleCategoryPerformance = "PERFORMANCE"
    ModuleCategoryQuality     = "QUALITY"
    ModuleCategoryFeedback    = "FEEDBACK"
    ModuleCategoryTraining    = "TRAINING"
    ModuleCategorySystem      = "SYSTEM"
)
```

**Relations:**
- `Parent *Module` - Parent module
- `Children []Module` - Child modules
- `ModulePermissions []ModulePermission` - Associated permissions
- `RoleModuleAccess []RoleModuleAccess` - Role access
- `UserModuleAccess []UserModuleAccess` - User access

### 2.2 Junction Tables (Assignments)

#### UserRole
**Table:** `public.user_roles`

```go
type UserRole struct {
    ID             string     // UUID primary key
    UserID         string     // Foreign key to users
    RoleID         string     // Foreign key to roles
    AssignedAt     time.Time  // Assignment timestamp
    AssignedBy     *string    // User who assigned
    IsActive       bool       // Assignment active
    EffectiveFrom  time.Time  // Start date
    EffectiveUntil *time.Time // End date (optional)
}
```

**Business Rules:**
- User can have multiple roles simultaneously
- Each role assignment has effective date range
- Inactive or expired assignments don't grant permissions
- Check `IsEffective()` method for validity

**IsEffective() Logic:**
```go
func (ur *UserRole) IsEffective() bool {
    if !ur.IsActive {
        return false
    }
    now := time.Now()
    if now.Before(ur.EffectiveFrom) {
        return false // Not started yet
    }
    if ur.EffectiveUntil != nil && now.After(*ur.EffectiveUntil) {
        return false // Already expired
    }
    return true
}
```

#### UserPosition
**Table:** `public.user_positions`

```go
type UserPosition struct {
    ID              string     // UUID primary key
    UserID          string     // Foreign key to users
    PositionID      string     // Foreign key to positions
    StartDate       time.Time  // Position start date
    EndDate         *time.Time // Position end date (optional)
    IsActive        bool       // Assignment active
    IsPlt           bool       // Pelaksana Tugas (Acting)
    AppointedBy     *string    // Who appointed
    SKNumber        *string    // SK (Surat Keputusan) number
    Notes           *string    // Additional notes
    PermissionScope *string    // Optional scope restriction
    CreatedAt       time.Time
    UpdatedAt       time.Time
}
```

**Business Rules:**
- User can hold multiple positions simultaneously
- IsPlt=true indicates temporary/acting position
- SKNumber required for official appointments
- PermissionScope can restrict position permissions (e.g., "DEPARTMENT_A")
- Check `IsEffective()` method for validity

**Special Features:**
- **PLT Support**: IsPlt flag untuk jabatan sementara
- **SK Number**: Nomor surat keputusan untuk audit trail
- **Scope Restriction**: Permission scope dapat dibatasi per assignment

#### UserPermission
**Table:** `public.user_permissions`

```go
type UserPermission struct {
    ID             string     // UUID primary key
    UserID         string     // Foreign key to users
    PermissionID   string     // Foreign key to permissions
    IsGranted      bool       // true=grant, false=deny
    Conditions     *string    // JSONB conditions
    GrantedBy      string     // Who granted (required)
    GrantReason    string     // Reason for grant (required)
    Priority       int        // Resolution priority (default: 100)
    IsTemporary    bool       // Temporary permission
    ResourceID     *string    // Specific resource ID
    ResourceType   *string    // Resource type
    EffectiveFrom  time.Time  // Start date
    EffectiveUntil *time.Time // End date (optional)
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```

**Business Rules:**
- Highest priority in permission resolution
- IsGranted=false is EXPLICIT DENY (blocks all lower permissions)
- Lower Priority number = higher precedence
- ResourceID/ResourceType for resource-specific permissions
- GrantReason required for audit trail

**Priority Resolution:**
```
Priority 1-50:   High priority overrides
Priority 51-100: Normal user permissions (default: 100)
Priority 101+:   Low priority fallbacks
```

**Example Scenarios:**
```json
// Grant specific permission
{
  "user_id": "uuid",
  "permission_id": "users:update:all",
  "is_granted": true,
  "priority": 100,
  "grant_reason": "Temporary admin access for migration"
}

// Deny specific permission (overrides role permissions)
{
  "user_id": "uuid",
  "permission_id": "users:delete:all",
  "is_granted": false,
  "priority": 50,
  "grant_reason": "Security restriction - prevent accidental deletions"
}

// Resource-specific permission
{
  "user_id": "uuid",
  "permission_id": "reports:read:all",
  "is_granted": true,
  "resource_id": "report-123",
  "resource_type": "annual_report",
  "grant_reason": "Access to specific annual report"
}
```

#### RolePermission
**Table:** `public.role_permissions`

```go
type RolePermission struct {
    ID             string     // UUID primary key
    RoleID         string     // Foreign key to roles
    PermissionID   string     // Foreign key to permissions
    IsGranted      bool       // true=grant, false=deny
    Conditions     *string    // JSONB conditions
    GrantedBy      *string    // Who granted
    GrantReason    *string    // Reason for grant
    EffectiveFrom  time.Time  // Start date
    EffectiveUntil *time.Time // End date (optional)
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```

**Business Rules:**
- Defines permissions for a role
- Can be time-bound with EffectiveFrom/Until
- IsGranted=false can deny specific permissions for a role
- Check `IsEffective()` method for validity

#### RoleHierarchy
**Table:** `public.role_hierarchy`

```go
type RoleHierarchy struct {
    ID                 string    // UUID primary key
    RoleID             string    // Child role
    ParentRoleID       string    // Parent role
    InheritPermissions bool      // Inherit parent permissions
    CreatedAt          time.Time
    UpdatedAt          time.Time
}
```

**Business Rules:**
- Defines parent-child relationship between roles
- InheritPermissions=true means child inherits parent's permissions
- Prevents circular dependencies
- Used for permission aggregation

**Example Hierarchy:**
```
SUPER_ADMIN (Level 1)
    └─> ADMIN (Level 2, inherits SUPER_ADMIN permissions)
            └─> TEACHER (Level 3, inherits ADMIN permissions)
                    └─> ASSISTANT (Level 4, inherits TEACHER permissions)
```

### 2.3 Module Access Models

#### RoleModuleAccess
**Table:** `public.role_module_access`

```go
type RoleModuleAccess struct {
    ID          string         // UUID primary key
    RoleID      string         // Foreign key to roles
    ModuleID    string         // Foreign key to modules
    PositionID  *string        // Optional position restriction
    Permissions datatypes.JSON // JSONB permissions array
    IsActive    bool           // Access active
    Version     int            // Optimistic locking
    CreatedAt   time.Time
    UpdatedAt   time.Time
    CreatedBy   *string
}
```

**Permissions JSONB Format:**
```json
{
  "read": true,
  "create": true,
  "update": true,
  "delete": false,
  "approve": false,
  "export": true
}
```

**Business Rules:**
- Grants module access to role
- Optional position restriction (only users with specific position get access)
- Permissions is JSONB object with action flags

#### UserModuleAccess
**Table:** `public.user_module_access`

```go
type UserModuleAccess struct {
    ID             string         // UUID primary key
    UserID         string         // Foreign key to users
    ModuleID       string         // Foreign key to modules
    Permissions    datatypes.JSON // JSONB permissions array
    GrantedBy      string         // Who granted (required)
    Reason         *string        // Grant reason
    IsActive       bool           // Access active
    EffectiveFrom  time.Time      // Start date
    EffectiveUntil *time.Time     // End date (optional)
    Version        int            // Optimistic locking
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```

**Business Rules:**
- Direct module access for user (overrides role access)
- Time-bound with EffectiveFrom/Until
- GrantedBy and Reason for audit trail
- Check `IsEffective()` method for validity

---

## 3. Permission Resolution Algorithm

### 3.1 Complete Permission Check Flow

```go
// Pseudocode for permission checking
func CheckUserPermission(userID, resource, action, scope string, resourceID *string) (bool, error) {
    // Step 1: Check UserPermission (Highest Priority)
    userPerms := GetEffectiveUserPermissions(userID, resource, action, resourceID)
    if len(userPerms) > 0 {
        // Sort by priority (lower number = higher priority)
        sort.Slice(userPerms, func(i, j int) bool {
            return userPerms[i].Priority < userPerms[j].Priority
        })

        // Check highest priority permission
        topPerm := userPerms[0]

        // Check conditions if present
        if topPerm.Conditions != nil {
            if !EvaluateConditions(topPerm.Conditions) {
                // Condition failed, check next
                continue
            }
        }

        // Explicit deny blocks everything
        if !topPerm.IsGranted {
            return false, nil
        }

        // Check scope compatibility
        if IsScopeCompatible(topPerm.Scope, scope) {
            return true, nil
        }
    }

    // Step 2: Check Position Permissions
    userPositions := GetEffectiveUserPositions(userID)
    for _, userPos := range userPositions {
        positionPerms := GetPositionPermissions(userPos.PositionID)

        if HasPermission(positionPerms, resource, action, scope) {
            // Apply PermissionScope restriction if set
            if userPos.PermissionScope != nil {
                if !MatchesScope(userPos.PermissionScope, scope) {
                    continue
                }
            }
            return true, nil
        }
    }

    // Step 3: Check Role Permissions (Including Hierarchy)
    userRoles := GetEffectiveUserRoles(userID)

    // Build complete role set with hierarchy
    allRoles := []string{}
    for _, userRole := range userRoles {
        allRoles = append(allRoles, userRole.RoleID)

        // Add parent roles if inheritance enabled
        // CRITICAL: Pass new visited map to prevent circular dependency issues
        visited := make(map[string]bool)
        parentRoles := GetParentRolesRecursive(userRole.RoleID, true, visited)
        allRoles = append(allRoles, parentRoles...)
    }

    // Check permissions from all roles
    for _, roleID := range allRoles {
        rolePerms := GetEffectiveRolePermissions(roleID)

        if HasPermission(rolePerms, resource, action, scope) {
            return true, nil
        }
    }

    // No permission found
    return false, nil
}
```

### 3.2 Helper Functions

#### GetEffectiveUserPermissions
```go
func GetEffectiveUserPermissions(userID, resource, action string, resourceID *string) []UserPermission {
    now := time.Now()

    query := db.Where("user_id = ?", userID).
        Where("effective_from <= ?", now).
        Where("effective_until IS NULL OR effective_until > ?", now)

    // Match permission by resource and action
    query = query.Joins("JOIN permissions ON permissions.id = user_permissions.permission_id").
        Where("permissions.resource = ?", resource).
        Where("permissions.action = ?", action).
        Where("permissions.is_active = ?", true)

    // If resourceID provided, check resource-specific permissions
    if resourceID != nil {
        query = query.Where("user_permissions.resource_id = ? OR user_permissions.resource_id IS NULL", *resourceID)
    }

    var perms []UserPermission
    query.Order("priority ASC").Find(&perms)

    return perms
}
```

#### GetEffectiveUserPositions
```go
func GetEffectiveUserPositions(userID string) []UserPosition {
    now := time.Now()

    var positions []UserPosition
    db.Where("user_id = ?", userID).
        Where("is_active = ?", true).
        Where("start_date <= ?", now).
        Where("end_date IS NULL OR end_date > ?", now).
        Preload("Position").
        Find(&positions)

    return positions
}
```

#### GetEffectiveUserRoles
```go
func GetEffectiveUserRoles(userID string) []UserRole {
    now := time.Now()

    var roles []UserRole
    db.Where("user_id = ?", userID).
        Where("is_active = ?", true).
        Where("effective_from <= ?", now).
        Where("effective_until IS NULL OR effective_until > ?", now).
        Preload("Role").
        Find(&roles)

    return roles
}
```

#### GetParentRolesRecursive

**⚠️ CRITICAL: Harus menggunakan visited map untuk mencegah infinite loop pada circular references!**

```go
// GetParentRolesRecursive retrieves all parent roles with cycle detection
// IMPORTANT: Always pass a new map on first call: GetParentRolesRecursive(roleID, true, make(map[string]bool))
func GetParentRolesRecursive(roleID string, inheritOnly bool, visited map[string]bool) []string {
    // CRITICAL: Cycle detection to prevent infinite loop
    if visited[roleID] {
        return []string{} // Cycle detected, stop recursion
    }
    visited[roleID] = true

    var parentIDs []string
    var hierarchies []RoleHierarchy

    query := db.Where("role_id = ?", roleID)
    if inheritOnly {
        query = query.Where("inherit_permissions = ?", true)
    }
    query.Find(&hierarchies)

    for _, h := range hierarchies {
        // Skip if parent already visited (additional safety)
        if visited[h.ParentRoleID] {
            continue
        }

        parentIDs = append(parentIDs, h.ParentRoleID)

        // Recursive call for grandparents (pass same visited map)
        grandparents := GetParentRolesRecursive(h.ParentRoleID, inheritOnly, visited)
        parentIDs = append(parentIDs, grandparents...)
    }

    return parentIDs
}
```

**Alternative: PostgreSQL WITH RECURSIVE (Recommended for Performance)**

```go
// GetParentRolesWithCTE uses PostgreSQL recursive CTE for better performance
// Single query instead of N recursive queries
func GetParentRolesWithCTE(db *gorm.DB, roleID string, inheritOnly bool, maxDepth int) ([]string, error) {
    var parentIDs []string

    inheritCondition := ""
    if inheritOnly {
        inheritCondition = "AND rh.inherit_permissions = true"
    }

    query := fmt.Sprintf(`
        WITH RECURSIVE role_tree AS (
            -- Base case: direct parents
            SELECT
                rh.parent_role_id,
                1 as depth
            FROM role_hierarchy rh
            WHERE rh.role_id = $1
            %s

            UNION ALL

            -- Recursive case: grandparents and beyond
            SELECT
                rh.parent_role_id,
                rt.depth + 1
            FROM role_hierarchy rh
            INNER JOIN role_tree rt ON rh.role_id = rt.parent_role_id
            WHERE rt.depth < $2
            %s
        )
        SELECT DISTINCT parent_role_id FROM role_tree
    `, inheritCondition, inheritCondition)

    err := db.Raw(query, roleID, maxDepth).Pluck("parent_role_id", &parentIDs).Error
    return parentIDs, err
}
```

#### EvaluateConditions
```go
func EvaluateConditions(conditionsJSON string) bool {
    var conditions map[string]interface{}
    json.Unmarshal([]byte(conditionsJSON), &conditions)

    // Example conditions:
    // {
    //   "department_id": "dept-123",
    //   "time_range": {"start": "09:00", "end": "17:00"},
    //   "ip_whitelist": ["192.168.1.0/24"]
    // }

    // Implement your condition evaluation logic here
    // This is application-specific

    return true
}
```

### 3.3 Scope Compatibility Check

```go
func IsScopeCompatible(grantedScope, requestedScope string) bool {
    // Scope hierarchy: ALL > SCHOOL > DEPARTMENT > OWN
    scopeLevel := map[string]int{
        "ALL":        4,
        "SCHOOL":     3,
        "DEPARTMENT": 2,
        "OWN":        1,
    }

    granted := scopeLevel[grantedScope]
    requested := scopeLevel[requestedScope]

    // Granted scope must be >= requested scope
    return granted >= requested
}
```

### 3.4 Module Access Check

```go
func CheckModuleAccess(userID, moduleID, action string) (bool, error) {
    // Step 1: Check UserModuleAccess (Highest Priority)
    var userModuleAccess UserModuleAccess
    err := db.Where("user_id = ?", userID).
        Where("module_id = ?", moduleID).
        Where("is_active = ?", true).
        Where("effective_from <= ?", time.Now()).
        Where("effective_until IS NULL OR effective_until > ?", time.Now()).
        First(&userModuleAccess).Error

    if err == nil {
        // Parse permissions JSON
        var perms map[string]bool
        json.Unmarshal(userModuleAccess.Permissions, &perms)

        if allowed, exists := perms[action]; exists {
            return allowed, nil
        }
    }

    // Step 2: Check RoleModuleAccess
    userRoles := GetEffectiveUserRoles(userID)
    userPositions := GetEffectiveUserPositions(userID)

    for _, userRole := range userRoles {
        var roleModuleAccess []RoleModuleAccess
        query := db.Where("role_id = ?", userRole.RoleID).
            Where("module_id = ?", moduleID).
            Where("is_active = ?", true)

        // Check position restriction
        for _, userPos := range userPositions {
            query = query.Where("position_id IS NULL OR position_id = ?", userPos.PositionID)
        }

        query.Find(&roleModuleAccess)

        for _, rma := range roleModuleAccess {
            var perms map[string]bool
            json.Unmarshal(rma.Permissions, &perms)

            if allowed, exists := perms[action]; exists && allowed {
                return true, nil
            }
        }
    }

    // No access found
    return false, nil
}
```

---

## 4. Implementation Components

### 4.1 Services yang Perlu Dibuat

#### PermissionResolverService
**File:** `internal/services/permission_resolver_service.go`

```go
package services

import (
    "backend/internal/models"
    "gorm.io/gorm"
)

type PermissionResolverService struct {
    db *gorm.DB
}

func NewPermissionResolverService(db *gorm.DB) *PermissionResolverService {
    return &PermissionResolverService{db: db}
}

// CheckPermission - Main permission checking method
func (s *PermissionResolverService) CheckPermission(
    userID string,
    resource string,
    action models.PermissionAction,
    scope models.PermissionScope,
    resourceID *string,
) (bool, error) {
    // Implementation dari algorithm di section 3.1
}

// GetUserPermissions - Get all effective permissions for user
func (s *PermissionResolverService) GetUserPermissions(userID string) ([]models.Permission, error) {
    // Return aggregated permissions from all sources
}

// CheckModuleAccess - Check module access permission
func (s *PermissionResolverService) CheckModuleAccess(
    userID string,
    moduleID string,
    action string,
) (bool, error) {
    // Implementation dari algorithm di section 3.4
}

// GetUserModules - Get all accessible modules for user
func (s *PermissionResolverService) GetUserModules(userID string) ([]models.Module, error) {
    // Return modules user has access to
}
```

#### UserPermissionService
**File:** `internal/services/user_permission_service.go`

```go
package services

import (
    "backend/internal/models"
    "github.com/google/uuid"
    "gorm.io/gorm"
    "time"
)

type UserPermissionService struct {
    db *gorm.DB
}

func NewUserPermissionService(db *gorm.DB) *UserPermissionService {
    return &UserPermissionService{db: db}
}

// AssignRoleToUser - Assign role to user with effective dates
func (s *UserPermissionService) AssignRoleToUser(
    userID string,
    roleID string,
    assignedBy string,
    effectiveFrom time.Time,
    effectiveUntil *time.Time,
) (*models.UserRole, error) {
    // Validate user exists
    // Validate role exists
    // Create UserRole assignment
    // Return created assignment
}

// RevokeRoleFromUser - Revoke role from user
func (s *UserPermissionService) RevokeRoleFromUser(
    userID string,
    roleID string,
) error {
    // Set IsActive = false or delete record
}

// AssignPositionToUser - Assign position to user
func (s *UserPermissionService) AssignPositionToUser(
    userID string,
    positionID string,
    startDate time.Time,
    endDate *time.Time,
    isPlt bool,
    skNumber *string,
    appointedBy string,
) (*models.UserPosition, error) {
    // Validate position capacity (MaxHolders)
    // Create UserPosition assignment
    // Return created assignment
}

// GrantPermissionToUser - Grant direct permission to user
func (s *UserPermissionService) GrantPermissionToUser(
    userID string,
    permissionID string,
    grantedBy string,
    grantReason string,
    priority int,
    isTemporary bool,
    resourceID *string,
    resourceType *string,
    effectiveFrom time.Time,
    effectiveUntil *time.Time,
) (*models.UserPermission, error) {
    // Create UserPermission record
    // Return created permission
}

// DenyPermissionToUser - Explicitly deny permission (IsGranted=false)
func (s *UserPermissionService) DenyPermissionToUser(
    userID string,
    permissionID string,
    deniedBy string,
    denyReason string,
    priority int,
) (*models.UserPermission, error) {
    // Create UserPermission with IsGranted=false
}

// GetUserRoles - Get all effective roles for user
func (s *UserPermissionService) GetUserRoles(userID string) ([]models.UserRole, error) {
    // Return active and effective roles
}

// GetUserPositions - Get all effective positions for user
func (s *UserPermissionService) GetUserPositions(userID string) ([]models.UserPosition, error) {
    // Return active and effective positions
}

// GetUserDirectPermissions - Get all direct permissions for user
func (s *UserPermissionService) GetUserDirectPermissions(userID string) ([]models.UserPermission, error) {
    // Return active and effective user permissions
}
```

#### RolePermissionService (Enhancement)
**File:** `internal/services/role_permission_service.go`

```go
package services

type RolePermissionService struct {
    db *gorm.DB
}

func NewRolePermissionService(db *gorm.DB) *RolePermissionService {
    return &RolePermissionService{db: db}
}

// AssignPermissionToRole - Assign permission to role
func (s *RolePermissionService) AssignPermissionToRole(
    roleID string,
    permissionID string,
    grantedBy string,
    grantReason *string,
    effectiveFrom time.Time,
    effectiveUntil *time.Time,
) (*models.RolePermission, error) {
    // Create RolePermission record
}

// RemovePermissionFromRole - Remove permission from role
func (s *RolePermissionService) RemovePermissionFromRole(
    roleID string,
    permissionID string,
) error {
    // Delete or set inactive
}

// GetRolePermissions - Get all permissions for role
func (s *RolePermissionService) GetRolePermissions(
    roleID string,
    includeInherited bool,
) ([]models.Permission, error) {
    // If includeInherited, aggregate from parent roles
}

// CreateRoleHierarchy - Create parent-child relationship
func (s *RolePermissionService) CreateRoleHierarchy(
    childRoleID string,
    parentRoleID string,
    inheritPermissions bool,
) (*models.RoleHierarchy, error) {
    // Validate no circular dependency
    // Create hierarchy record
}
```

### 4.2 Middleware untuk Authorization

#### Permission Middleware
**File:** `internal/middleware/permission.go`

```go
package middleware

import (
    "backend/internal/models"
    "backend/internal/services"
    "github.com/gin-gonic/gin"
    "net/http"
)

// RequirePermission - Middleware untuk check permission
func RequirePermission(
    resource string,
    action models.PermissionAction,
    scope models.PermissionScope,
) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get user ID from context (set by AuthRequired middleware)
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "authentication required",
            })
            c.Abort()
            return
        }

        // Get permission resolver service
        resolver := services.NewPermissionResolverService(database.GetDB())

        // Check permission
        hasPermission, err := resolver.CheckPermission(
            userID.(string),
            resource,
            action,
            scope,
            nil, // resourceID from context if needed
        )

        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": "failed to check permission",
            })
            c.Abort()
            return
        }

        if !hasPermission {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "insufficient permissions",
                "required": map[string]string{
                    "resource": resource,
                    "action":   string(action),
                    "scope":    string(scope),
                },
            })
            c.Abort()
            return
        }

        // Permission granted, continue
        c.Next()
    }
}

// RequireModuleAccess - Middleware untuk check module access
func RequireModuleAccess(moduleCode string, action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "authentication required",
            })
            c.Abort()
            return
        }

        // Get module by code
        var module models.Module
        db := database.GetDB()
        if err := db.Where("code = ?", moduleCode).First(&module).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": "module not found",
            })
            c.Abort()
            return
        }

        // Check module access
        resolver := services.NewPermissionResolverService(db)
        hasAccess, err := resolver.CheckModuleAccess(
            userID.(string),
            module.ID,
            action,
        )

        if err != nil || !hasAccess {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "module access denied",
            })
            c.Abort()
            return
        }

        c.Next()
    }
}

// RequireAnyPermission - Check if user has ANY of the specified permissions (OR logic)
func RequireAnyPermission(permissions []PermissionCheck) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, _ := c.Get("user_id")
        resolver := services.NewPermissionResolverService(database.GetDB())

        for _, perm := range permissions {
            hasPermission, _ := resolver.CheckPermission(
                userID.(string),
                perm.Resource,
                perm.Action,
                perm.Scope,
                nil,
            )

            if hasPermission {
                c.Next()
                return
            }
        }

        c.JSON(http.StatusForbidden, gin.H{
            "error": "insufficient permissions",
        })
        c.Abort()
    }
}

// RequireAllPermissions - Check if user has ALL of the specified permissions (AND logic)
func RequireAllPermissions(permissions []PermissionCheck) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "authentication required",
            })
            c.Abort()
            return
        }

        resolver := services.NewPermissionResolverService(database.GetDB())
        missingPermissions := []PermissionCheck{}

        for _, perm := range permissions {
            hasPermission, err := resolver.CheckPermission(
                userID.(string),
                perm.Resource,
                perm.Action,
                perm.Scope,
                nil,
            )

            if err != nil || !hasPermission {
                missingPermissions = append(missingPermissions, perm)
            }
        }

        if len(missingPermissions) > 0 {
            // Build list of missing permissions for error response
            missing := make([]map[string]string, len(missingPermissions))
            for i, perm := range missingPermissions {
                missing[i] = map[string]string{
                    "resource": perm.Resource,
                    "action":   string(perm.Action),
                    "scope":    string(perm.Scope),
                }
            }

            c.JSON(http.StatusForbidden, gin.H{
                "error":               "insufficient permissions",
                "missing_permissions": missing,
            })
            c.Abort()
            return
        }

        c.Next()
    }
}

type PermissionCheck struct {
    Resource string
    Action   models.PermissionAction
    Scope    models.PermissionScope
}
```

### 4.3 Utility Functions

#### Permission Helper
**File:** `internal/utils/permission_helper.go`

```go
package utils

import "backend/internal/models"

// CanAccessResource - Check if user can access specific resource based on scope
func CanAccessResource(
    userScope models.PermissionScope,
    userDepartmentID *string,
    userSchoolID *string,
    resourceOwnerID string,
    resourceDepartmentID *string,
    resourceSchoolID *string,
    currentUserID string,
) bool {
    switch userScope {
    case models.PermissionScopeAll:
        return true

    case models.PermissionScopeSchool:
        if userSchoolID == nil || resourceSchoolID == nil {
            return false
        }
        return *userSchoolID == *resourceSchoolID

    case models.PermissionScopeDepartment:
        if userDepartmentID == nil || resourceDepartmentID == nil {
            return false
        }
        return *userDepartmentID == *resourceDepartmentID

    case models.PermissionScopeOwn:
        return resourceOwnerID == currentUserID

    default:
        return false
    }
}

// GeneratePermissionCode - Generate standard permission code
func GeneratePermissionCode(
    resource string,
    action models.PermissionAction,
    scope *models.PermissionScope,
) string {
    code := resource + ":" + string(action)
    if scope != nil {
        code += ":" + string(*scope)
    }
    return code
}
```

---

## 5. API Endpoints

### 5.1 Role Management

#### Create Role
```
POST /api/roles
Authorization: Bearer {token}
Permission: roles:create:all

Request Body:
{
  "code": "TEACHER",
  "name": "Teacher",
  "description": "Teacher role with basic permissions",
  "hierarchy_level": 3,
  "is_system_role": false
}

Response: 201 Created
{
  "id": "uuid",
  "code": "TEACHER",
  "name": "Teacher",
  "hierarchy_level": 3,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### List Roles
```
GET /api/roles?page=1&page_size=20&search=teacher&is_active=true
Authorization: Bearer {token}
Permission: roles:read:all

Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "code": "TEACHER",
      "name": "Teacher",
      "hierarchy_level": 3,
      "is_system_role": false,
      "is_active": true
    }
  ],
  "total": 10,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

#### Get Role Detail
```
GET /api/roles/{id}
Authorization: Bearer {token}
Permission: roles:read:all

Response: 200 OK
{
  "id": "uuid",
  "code": "TEACHER",
  "name": "Teacher",
  "description": "Teacher role",
  "hierarchy_level": 3,
  "is_system_role": false,
  "is_active": true,
  "permissions": [
    {
      "assignment_id": "uuid",
      "id": "perm-uuid",
      "code": "students:read:department",
      "name": "Read Students in Department",
      "resource": "students",
      "action": "READ",
      "scope": "DEPARTMENT"
    }
  ]
}
```

#### Update Role
```
PUT /api/roles/{id}
Authorization: Bearer {token}
Permission: roles:update:all

Request Body:
{
  "name": "Senior Teacher",
  "description": "Updated description",
  "is_active": true
}

Response: 200 OK
{
  "id": "uuid",
  "code": "TEACHER",
  "name": "Senior Teacher",
  "hierarchy_level": 3,
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Delete Role
```
DELETE /api/roles/{id}
Authorization: Bearer {token}
Permission: roles:delete:all

Response: 204 No Content
```

### 5.2 Permission Management

#### Create Permission
```
POST /api/permissions
Authorization: Bearer {token}
Permission: permissions:create:all

Request Body:
{
  "code": "students:read:department",
  "name": "Read Students in Department",
  "description": "View student data within department",
  "resource": "students",
  "action": "READ",
  "scope": "DEPARTMENT",
  "category": "SERVICE",
  "group_name": "Student Management",
  "group_icon": "users",
  "group_sort_order": 1
}

Response: 201 Created
{
  "id": "uuid",
  "code": "students:read:department",
  "name": "Read Students in Department",
  "resource": "students",
  "action": "READ",
  "scope": "DEPARTMENT",
  "is_active": true
}
```

#### List Permissions
```
GET /api/permissions?page=1&page_size=20&resource=students&action=READ
Authorization: Bearer {token}
Permission: permissions:read:all

Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "code": "students:read:department",
      "name": "Read Students",
      "resource": "students",
      "action": "READ",
      "scope": "DEPARTMENT",
      "is_active": true
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20
}
```

#### List Permissions Grouped
```
GET /api/permissions/grouped?category=SERVICE
Authorization: Bearer {token}
Permission: permissions:read:all

Response: 200 OK
[
  {
    "group_name": "Student Management",
    "group_icon": "users",
    "sort_order": 1,
    "permissions": [
      {
        "id": "uuid",
        "code": "students:read:all",
        "name": "Read All Students",
        "resource": "students",
        "action": "READ",
        "scope": "ALL"
      }
    ]
  }
]
```

### 5.3 Role-Permission Assignment

#### Assign Permission to Role
```
POST /api/roles/{roleId}/permissions
Authorization: Bearer {token}
Permission: roles:assign:all

Request Body:
{
  "permission_id": "perm-uuid",
  "is_granted": true,
  "grant_reason": "Required for teacher duties",
  "effective_from": "2024-01-01T00:00:00Z",
  "effective_until": "2024-12-31T23:59:59Z"
}

Response: 201 Created
{
  "id": "assignment-uuid",
  "role_id": "role-uuid",
  "permission_id": "perm-uuid",
  "is_granted": true,
  "effective_from": "2024-01-01T00:00:00Z",
  "effective_until": "2024-12-31T23:59:59Z"
}
```

#### Remove Permission from Role
```
DELETE /api/roles/{roleId}/permissions/{assignmentId}
Authorization: Bearer {token}
Permission: roles:assign:all

Response: 204 No Content
```

#### Get Role Permissions
```
GET /api/roles/{roleId}/permissions?include_inherited=true
Authorization: Bearer {token}
Permission: roles:read:all

Response: 200 OK
{
  "role_permissions": [
    {
      "assignment_id": "uuid",
      "id": "perm-uuid",
      "code": "students:read:department",
      "name": "Read Students",
      "source": "direct"
    }
  ],
  "inherited_permissions": [
    {
      "id": "perm-uuid",
      "code": "users:read:own",
      "name": "Read Own Profile",
      "source": "parent_role",
      "parent_role_id": "parent-uuid",
      "parent_role_name": "Base User"
    }
  ]
}
```

### 5.4 User-Role Assignment

#### Assign Role to User
```
POST /api/users/{userId}/roles
Authorization: Bearer {token}
Permission: users:assign:all

Request Body:
{
  "role_id": "role-uuid",
  "effective_from": "2024-01-01T00:00:00Z",
  "effective_until": "2024-12-31T23:59:59Z"
}

Response: 201 Created
{
  "id": "assignment-uuid",
  "user_id": "user-uuid",
  "role_id": "role-uuid",
  "role": {
    "id": "role-uuid",
    "code": "TEACHER",
    "name": "Teacher"
  },
  "assigned_at": "2024-01-01T00:00:00Z",
  "assigned_by": "admin-uuid",
  "effective_from": "2024-01-01T00:00:00Z",
  "effective_until": "2024-12-31T23:59:59Z",
  "is_active": true
}
```

#### Revoke Role from User
```
DELETE /api/users/{userId}/roles/{assignmentId}
Authorization: Bearer {token}
Permission: users:assign:all

Response: 204 No Content
```

#### Get User Roles
```
GET /api/users/{userId}/roles?include_inactive=false
Authorization: Bearer {token}
Permission: users:read:all OR users:read:own (if own user)

Response: 200 OK
{
  "data": [
    {
      "id": "assignment-uuid",
      "role_id": "role-uuid",
      "role": {
        "code": "TEACHER",
        "name": "Teacher",
        "hierarchy_level": 3
      },
      "assigned_at": "2024-01-01T00:00:00Z",
      "effective_from": "2024-01-01T00:00:00Z",
      "effective_until": "2024-12-31T23:59:59Z",
      "is_active": true
    }
  ]
}
```

### 5.5 User-Position Assignment

#### Assign Position to User
```
POST /api/users/{userId}/positions
Authorization: Bearer {token}
Permission: users:assign:all

Request Body:
{
  "position_id": "pos-uuid",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "is_plt": false,
  "sk_number": "SK/001/2024",
  "notes": "Permanent appointment",
  "permission_scope": null
}

Response: 201 Created
{
  "id": "assignment-uuid",
  "user_id": "user-uuid",
  "position_id": "pos-uuid",
  "position": {
    "code": "HEAD_TEACHER",
    "name": "Head Teacher",
    "department_id": "dept-uuid"
  },
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z",
  "is_active": true,
  "is_plt": false,
  "sk_number": "SK/001/2024"
}
```

#### Revoke Position from User
```
DELETE /api/users/{userId}/positions/{assignmentId}
Authorization: Bearer {token}
Permission: users:assign:all

Response: 204 No Content
```

### 5.6 User-Permission Direct Assignment

#### Grant Permission to User
```
POST /api/users/{userId}/permissions
Authorization: Bearer {token}
Permission: permissions:grant:all

Request Body:
{
  "permission_id": "perm-uuid",
  "is_granted": true,
  "grant_reason": "Temporary admin access for system maintenance",
  "priority": 50,
  "is_temporary": true,
  "resource_id": null,
  "resource_type": null,
  "effective_from": "2024-01-01T00:00:00Z",
  "effective_until": "2024-01-07T23:59:59Z"
}

Response: 201 Created
{
  "id": "assignment-uuid",
  "user_id": "user-uuid",
  "permission_id": "perm-uuid",
  "permission": {
    "code": "system:update:all",
    "name": "System Update",
    "resource": "system",
    "action": "UPDATE",
    "scope": "ALL"
  },
  "is_granted": true,
  "priority": 50,
  "is_temporary": true,
  "grant_reason": "Temporary admin access",
  "effective_from": "2024-01-01T00:00:00Z",
  "effective_until": "2024-01-07T23:59:59Z"
}
```

#### Revoke Direct Permission from User
```
DELETE /api/users/{userId}/permissions/{assignmentId}
Authorization: Bearer {token}
Permission: permissions:grant:all

Response: 204 No Content
```

#### Get User Direct Permissions
```
GET /api/users/{userId}/permissions?include_expired=false
Authorization: Bearer {token}
Permission: users:read:all OR users:read:own

Response: 200 OK
{
  "data": [
    {
      "id": "assignment-uuid",
      "permission": {
        "code": "reports:export:all",
        "name": "Export All Reports"
      },
      "is_granted": true,
      "priority": 100,
      "is_temporary": true,
      "grant_reason": "Special report access",
      "effective_from": "2024-01-01T00:00:00Z",
      "effective_until": "2024-01-31T23:59:59Z"
    }
  ]
}
```

### 5.7 Permission Checking

#### Check User Permission
```
POST /api/access/check
Authorization: Bearer {token}
Permission: Open to authenticated users (check own permissions)

Request Body:
{
  "user_id": "user-uuid",  // Optional, defaults to current user
  "resource": "students",
  "action": "READ",
  "scope": "DEPARTMENT",
  "resource_id": null
}

Response: 200 OK
{
  "allowed": true,
  "source": "role",  // "user_permission", "position", or "role"
  "details": {
    "matched_permission": {
      "code": "students:read:department",
      "name": "Read Students in Department"
    },
    "via": "TEACHER role"
  }
}
```

#### Get User All Permissions
```
GET /api/users/{userId}/permissions/effective
Authorization: Bearer {token}
Permission: users:read:all OR users:read:own

Response: 200 OK
{
  "user_id": "user-uuid",
  "permissions": [
    {
      "code": "students:read:department",
      "name": "Read Students",
      "resource": "students",
      "action": "READ",
      "scope": "DEPARTMENT",
      "source": "role",
      "source_details": {
        "role_id": "role-uuid",
        "role_name": "Teacher"
      }
    },
    {
      "code": "reports:export:all",
      "name": "Export Reports",
      "resource": "reports",
      "action": "EXPORT",
      "scope": "ALL",
      "source": "user_permission",
      "source_details": {
        "assignment_id": "assignment-uuid",
        "priority": 50,
        "is_temporary": true,
        "expires_at": "2024-12-31T23:59:59Z"
      }
    }
  ],
  "roles": [
    {
      "id": "role-uuid",
      "code": "TEACHER",
      "name": "Teacher"
    }
  ],
  "positions": [
    {
      "id": "pos-uuid",
      "code": "HEAD_TEACHER",
      "name": "Head Teacher"
    }
  ]
}
```

#### Batch Permission Check (Recommended for Frontend)

**⚠️ IMPORTANT: Gunakan endpoint ini untuk mengurangi N requests menjadi 1 request!**

```
POST /api/access/check-batch
Authorization: Bearer {token}
Permission: Open to authenticated users (check own permissions)

Request Body:
{
  "user_id": "user-uuid",  // Optional, defaults to current user
  "checks": [
    {
      "resource": "students",
      "action": "READ",
      "scope": "DEPARTMENT"
    },
    {
      "resource": "students",
      "action": "CREATE",
      "scope": "DEPARTMENT"
    },
    {
      "resource": "reports",
      "action": "EXPORT",
      "scope": "ALL"
    },
    {
      "resource": "grades",
      "action": "UPDATE",
      "scope": "OWN"
    }
  ]
}

Response: 200 OK
{
  "user_id": "user-uuid",
  "results": {
    "students:READ:DEPARTMENT": {
      "allowed": true,
      "source": "role",
      "matched_permission": "students:read:department"
    },
    "students:CREATE:DEPARTMENT": {
      "allowed": true,
      "source": "position",
      "matched_permission": "students:create:department"
    },
    "reports:EXPORT:ALL": {
      "allowed": false,
      "source": null,
      "matched_permission": null
    },
    "grades:UPDATE:OWN": {
      "allowed": true,
      "source": "user_permission",
      "matched_permission": "grades:update:own"
    }
  },
  "checked_at": "2024-01-26T10:30:00Z"
}
```

**Handler Implementation:**

```go
type BatchCheckRequest struct {
    UserID string                 `json:"user_id"`
    Checks []PermissionCheckItem  `json:"checks" binding:"required,min=1,max=50"`
}

type PermissionCheckItem struct {
    Resource   string `json:"resource" binding:"required"`
    Action     string `json:"action" binding:"required"`
    Scope      string `json:"scope" binding:"required"`
    ResourceID string `json:"resource_id,omitempty"`
}

func (h *AccessHandler) BatchCheckPermissions(c *gin.Context) {
    var req BatchCheckRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Default to current user
    userID := req.UserID
    if userID == "" {
        userID = c.GetString("user_id")
    }

    // Load permission context once (optimized - single DB round trip)
    ctx, err := h.resolver.LoadUserPermissionsContext(userID)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to load permissions"})
        return
    }

    // Check all permissions from context (no additional DB queries)
    results := make(map[string]PermissionCheckResult)
    for _, check := range req.Checks {
        key := fmt.Sprintf("%s:%s:%s", check.Resource, check.Action, check.Scope)
        allowed, source, matched := ctx.CheckPermission(check.Resource, check.Action, check.Scope)
        results[key] = PermissionCheckResult{
            Allowed:           allowed,
            Source:            source,
            MatchedPermission: matched,
        }
    }

    c.JSON(200, gin.H{
        "user_id":    userID,
        "results":    results,
        "checked_at": time.Now(),
    })
}
```

#### Check Module Access
```
POST /api/access/modules
Authorization: Bearer {token}

Request Body:
{
  "user_id": "user-uuid",  // Optional
  "module_code": "STUDENT_MGMT",
  "action": "read"
}

Response: 200 OK
{
  "allowed": true,
  "module": {
    "id": "module-uuid",
    "code": "STUDENT_MGMT",
    "name": "Student Management"
  },
  "permissions": {
    "read": true,
    "create": true,
    "update": true,
    "delete": false,
    "approve": false,
    "export": true
  }
}
```

#### Get User Accessible Modules
```
GET /api/users/{userId}/modules
Authorization: Bearer {token}
Permission: users:read:all OR users:read:own

Response: 200 OK
{
  "modules": [
    {
      "id": "module-uuid",
      "code": "STUDENT_MGMT",
      "name": "Student Management",
      "icon": "users",
      "path": "/students",
      "category": "SERVICE",
      "permissions": {
        "read": true,
        "create": true,
        "update": true,
        "delete": false
      },
      "children": [
        {
          "id": "submodule-uuid",
          "code": "STUDENT_GRADES",
          "name": "Student Grades",
          "permissions": {
            "read": true,
            "update": true
          }
        }
      ]
    }
  ]
}
```

### 5.8 Role Hierarchy

#### Create Role Hierarchy
```
POST /api/roles/{childRoleId}/parents
Authorization: Bearer {token}
Permission: roles:update:all

Request Body:
{
  "parent_role_id": "parent-uuid",
  "inherit_permissions": true
}

Response: 201 Created
{
  "id": "hierarchy-uuid",
  "role_id": "child-uuid",
  "parent_role_id": "parent-uuid",
  "inherit_permissions": true
}
```

#### Delete Role Hierarchy
```
DELETE /api/roles/{childRoleId}/parents/{hierarchyId}
Authorization: Bearer {token}
Permission: roles:update:all

Response: 204 No Content
```

---

## 6. Use Cases & Examples

### 6.1 Basic Role Assignment

**Scenario:** Assign "Teacher" role to a new user

```go
// Service call
userPermService := services.NewUserPermissionService(db)

userRole, err := userPermService.AssignRoleToUser(
    "user-123",              // userID
    "teacher-role-uuid",     // roleID
    "admin-uuid",            // assignedBy
    time.Now(),              // effectiveFrom
    nil,                     // effectiveUntil (permanent)
)

if err != nil {
    return err
}

// User now has all permissions from Teacher role
```

**API Call:**
```bash
curl -X POST http://localhost:8080/api/users/user-123/roles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "teacher-role-uuid",
    "effective_from": "2024-01-01T00:00:00Z"
  }'
```

### 6.2 Temporary Permission Grant

**Scenario:** Grant temporary admin access for system maintenance

```go
userPermService := services.NewUserPermissionService(db)

// Grant system:update:all permission for 7 days
effectiveUntil := time.Now().AddDate(0, 0, 7)

userPerm, err := userPermService.GrantPermissionToUser(
    "user-123",
    "system-update-all-perm-uuid",
    "super-admin-uuid",
    "System maintenance window",
    50,                    // High priority
    true,                  // IsTemporary
    nil,                   // resourceID
    nil,                   // resourceType
    time.Now(),
    &effectiveUntil,
)
```

**API Call:**
```bash
curl -X POST http://localhost:8080/api/users/user-123/permissions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": "system-update-all-perm-uuid",
    "is_granted": true,
    "grant_reason": "System maintenance window",
    "priority": 50,
    "is_temporary": true,
    "effective_from": "2024-01-01T00:00:00Z",
    "effective_until": "2024-01-07T23:59:59Z"
  }'
```

### 6.3 Explicit Permission Denial

**Scenario:** Block a specific user from deleting data (even if role allows it)

```go
userPermService := services.NewUserPermissionService(db)

// Deny users:delete:all permission
userPerm, err := userPermService.DenyPermissionToUser(
    "user-123",
    "users-delete-all-perm-uuid",
    "admin-uuid",
    "Security restriction - prevent accidental deletions",
    10, // Very high priority (overrides all role permissions)
)
```

**Result:** User cannot delete users even if their role has this permission, because UserPermission with IsGranted=false takes highest priority.

### 6.4 PLT (Acting Position) Assignment

**Scenario:** Assign temporary "Head Teacher" position while permanent holder is on leave

```go
userPermService := services.NewUserPermissionService(db)

endDate := time.Now().AddDate(0, 1, 0) // 1 month

userPosition, err := userPermService.AssignPositionToUser(
    "user-123",
    "head-teacher-pos-uuid",
    time.Now(),
    &endDate,
    true,                              // IsPlt = true (acting)
    stringPtr("SK/PLT/001/2024"),     // SK Number
    "admin-uuid",
)
```

**API Call:**
```bash
curl -X POST http://localhost:8080/api/users/user-123/positions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "position_id": "head-teacher-pos-uuid",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-31T23:59:59Z",
    "is_plt": true,
    "sk_number": "SK/PLT/001/2024",
    "notes": "Acting Head Teacher during leave period"
  }'
```

### 6.5 Resource-Specific Permission

**Scenario:** Grant access to a specific report only

```go
userPermService := services.NewUserPermissionService(db)

userPerm, err := userPermService.GrantPermissionToUser(
    "user-123",
    "reports-read-all-perm-uuid",
    "manager-uuid",
    "Access to Q1 financial report",
    100,
    false,
    stringPtr("report-q1-2024"),      // Specific resource ID
    stringPtr("financial_report"),     // Resource type
    time.Now(),
    nil,
)
```

**Permission Check:**
```go
resolver := services.NewPermissionResolverService(db)

// Check access to specific report
reportID := "report-q1-2024"
hasAccess, err := resolver.CheckPermission(
    "user-123",
    "reports",
    models.PermissionActionRead,
    models.PermissionScopeAll,
    &reportID,  // Pass resource ID
)

// Returns true only for report-q1-2024
```

### 6.6 Role Hierarchy with Inheritance

**Scenario:** Create role hierarchy where TEACHER inherits from BASE_USER

```go
rolePermService := services.NewRolePermissionService(db)

// Create hierarchy
hierarchy, err := rolePermService.CreateRoleHierarchy(
    "teacher-role-uuid",    // Child role
    "base-user-role-uuid",  // Parent role
    true,                    // Inherit permissions
)

// Now TEACHER has:
// 1. Its own permissions (direct)
// 2. BASE_USER permissions (inherited)
```

**Permission Resolution:**
```
User with TEACHER role gets:
├── Direct TEACHER permissions
│   ├── students:read:department
│   ├── students:update:department
│   └── grades:create:own
└── Inherited BASE_USER permissions
    ├── profile:read:own
    ├── profile:update:own
    └── notifications:read:own
```

### 6.7 Middleware Usage in Routes

**Example route protection:**

```go
package main

import (
    "backend/internal/middleware"
    "backend/internal/models"
    "github.com/gin-gonic/gin"
)

func setupRoutes(r *gin.Engine) {
    // Public routes
    r.POST("/api/auth/login", handlers.Login)

    // Protected routes
    api := r.Group("/api")
    api.Use(middleware.AuthRequired())  // JWT authentication

    // User management routes
    users := api.Group("/users")
    {
        // List users - requires users:read:all
        users.GET("",
            middleware.RequirePermission(
                "users",
                models.PermissionActionRead,
                models.PermissionScopeAll,
            ),
            handlers.ListUsers,
        )

        // Create user - requires users:create:all
        users.POST("",
            middleware.RequirePermission(
                "users",
                models.PermissionActionCreate,
                models.PermissionScopeAll,
            ),
            handlers.CreateUser,
        )

        // Update user - requires users:update:all OR users:update:own
        users.PUT("/:id",
            middleware.RequireAnyPermission([]middleware.PermissionCheck{
                {
                    Resource: "users",
                    Action:   models.PermissionActionUpdate,
                    Scope:    models.PermissionScopeAll,
                },
                {
                    Resource: "users",
                    Action:   models.PermissionActionUpdate,
                    Scope:    models.PermissionScopeOwn,
                },
            }),
            handlers.UpdateUser,
        )
    }

    // Module-based protection
    students := api.Group("/students")
    students.Use(middleware.RequireModuleAccess("STUDENT_MGMT", "read"))
    {
        students.GET("", handlers.ListStudents)

        // Additional permission for create
        students.POST("",
            middleware.RequireModuleAccess("STUDENT_MGMT", "create"),
            handlers.CreateStudent,
        )
    }
}
```

### 6.8 Dynamic Permission Check in Handler

**Example: Check permission based on resource ownership**

```go
func UpdateStudentGrade(c *gin.Context) {
    userID := c.GetString("user_id")
    studentID := c.Param("id")

    // Get student
    var student models.Student
    if err := db.First(&student, "id = ?", studentID).Error; err != nil {
        c.JSON(404, gin.H{"error": "student not found"})
        return
    }

    // Get user's department
    var user models.User
    db.Preload("DataKaryawan").First(&user, "id = ?", userID)

    // Check permission with dynamic scope
    resolver := services.NewPermissionResolverService(db)

    hasPermission, err := resolver.CheckPermission(
        userID,
        "grades",
        models.PermissionActionUpdate,
        models.PermissionScopeDepartment,
        nil,
    )

    if !hasPermission {
        c.JSON(403, gin.H{"error": "insufficient permissions"})
        return
    }

    // Additional scope check
    canAccess := utils.CanAccessResource(
        models.PermissionScopeDepartment,
        user.DataKaryawan.DepartmentID,
        user.DataKaryawan.SchoolID,
        student.CreatedBy,
        student.DepartmentID,
        student.SchoolID,
        userID,
    )

    if !canAccess {
        c.JSON(403, gin.H{"error": "cannot access student from different department"})
        return
    }

    // Proceed with update
    // ...
}
```

### 6.9 Conditional Permissions

**Scenario:** Grant permission only during business hours

**Create Permission with Conditions:**
```json
{
  "code": "finance:approve:all",
  "name": "Approve Financial Transactions",
  "resource": "finance",
  "action": "APPROVE",
  "scope": "ALL",
  "conditions": {
    "time_range": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "Asia/Jakarta"
    },
    "weekdays_only": true,
    "ip_whitelist": ["192.168.1.0/24"],
    "require_2fa": true
  }
}
```

**Evaluation in PermissionResolverService:**
```go
func (s *PermissionResolverService) EvaluateConditions(
    conditionsJSON string,
    context map[string]interface{},
) bool {
    var conditions map[string]interface{}
    json.Unmarshal([]byte(conditionsJSON), &conditions)

    // Check time range
    if timeRange, ok := conditions["time_range"].(map[string]interface{}); ok {
        now := time.Now()
        startTime := parseTime(timeRange["start"].(string))
        endTime := parseTime(timeRange["end"].(string))

        currentTime := now.Format("15:04")
        if currentTime < startTime || currentTime > endTime {
            return false
        }
    }

    // Check weekdays only
    if weekdaysOnly, ok := conditions["weekdays_only"].(bool); ok && weekdaysOnly {
        if time.Now().Weekday() == time.Saturday || time.Now().Weekday() == time.Sunday {
            return false
        }
    }

    // Check IP whitelist
    if ipWhitelist, ok := conditions["ip_whitelist"].([]interface{}); ok {
        clientIP := context["client_ip"].(string)
        if !isIPInWhitelist(clientIP, ipWhitelist) {
            return false
        }
    }

    // Check 2FA
    if require2FA, ok := conditions["require_2fa"].(bool); ok && require2FA {
        if !context["has_2fa"].(bool) {
            return false
        }
    }

    return true
}
```

---

## 7. Best Practices & Security

### 7.1 Security Considerations

#### 1. Principle of Least Privilege
```
✅ DO:
- Grant minimum permissions needed for tasks
- Use scope restrictions (OWN, DEPARTMENT before ALL)
- Set expiration dates for temporary permissions
- Regular audit of permission assignments

❌ DON'T:
- Grant ALL scope by default
- Create super-admin roles without oversight
- Leave temporary permissions without expiration
- Ignore permission inheritance implications
```

#### 2. Audit Trail
```
All permission changes must be logged:
- Who granted/revoked (GrantedBy, AssignedBy)
- Why (GrantReason, Notes)
- When (timestamps, effective dates)
- What changed (AuditLog model)
```

**Implement Audit Logging:**
```go
type AuditLog struct {
    ID             string
    ActorUserID    string       // Who performed action
    Action         AuditAction  // GRANT, REVOKE, ASSIGN, etc.
    TargetUserID   *string      // Affected user
    ResourceType   string       // "role", "permission", "position"
    ResourceID     string       // ID of affected resource
    Changes        *string      // JSONB of what changed
    Reason         *string      // Why this action was taken
    IPAddress      string
    UserAgent      string
    Timestamp      time.Time
}
```

#### 3. Sensitive Permissions Protection
```go
// Mark critical permissions as system permissions
const (
    SystemPermissionManageRoles       = "roles:*:all"
    SystemPermissionManagePermissions = "permissions:*:all"
    SystemPermissionManageUsers       = "users:*:all"
    SystemPermissionAccessAuditLogs   = "audit_logs:*:all"
)

// Prevent deletion of system permissions
func (s *PermissionService) DeletePermission(permID string) error {
    var perm models.Permission
    if err := s.db.First(&perm, "id = ?", permID).Error; err != nil {
        return err
    }

    if perm.IsSystemPermission {
        return errors.New("cannot delete system permission")
    }

    // Proceed with deletion
    return s.db.Delete(&perm).Error
}
```

#### 4. Permission Escalation Prevention (CRITICAL)

**⚠️ IMPORTANT: Mencegah user dengan privilege rendah memberikan privilege lebih tinggi!**

**Hierarchy Level Concept:**
```
HierarchyLevel 1: Super Admin     ← Tertinggi (hanya bisa di-assign oleh Super Admin)
HierarchyLevel 2: Admin           ← Bisa di-assign oleh Level 1-2
HierarchyLevel 3: Manager         ← Bisa di-assign oleh Level 1-3
HierarchyLevel 4: Supervisor      ← Bisa di-assign oleh Level 1-4
HierarchyLevel 5: Staff           ← Bisa di-assign oleh Level 1-5

RULE: User hanya bisa assign role dengan HierarchyLevel >= level mereka sendiri
      (Lower number = Higher privilege)
```

**Implementation:**

```go
// EscalationPreventionService prevents privilege escalation attacks
type EscalationPreventionService struct {
    db *gorm.DB
}

func NewEscalationPreventionService(db *gorm.DB) *EscalationPreventionService {
    return &EscalationPreventionService{db: db}
}

// GetUserHighestRoleLevel returns the highest privilege level (lowest number) for a user
func (s *EscalationPreventionService) GetUserHighestRoleLevel(userID string) int {
    var minLevel sql.NullInt64

    s.db.Model(&models.UserRole{}).
        Joins("JOIN roles ON roles.id = user_roles.role_id").
        Where("user_roles.user_id = ?", userID).
        Where("user_roles.is_active = true").
        Where("user_roles.effective_from <= ?", time.Now()).
        Where("user_roles.effective_until IS NULL OR user_roles.effective_until > ?", time.Now()).
        Select("MIN(roles.hierarchy_level)").
        Scan(&minLevel)

    if !minLevel.Valid || minLevel.Int64 == 0 {
        return 999 // No role = lowest privilege
    }
    return int(minLevel.Int64)
}

// ValidateRoleAssignment checks if assigner can assign the target role
func (s *EscalationPreventionService) ValidateRoleAssignment(
    assignerID string,
    targetUserID string,
    roleID string,
) error {
    // 1. Get assigner's highest role level
    assignerLevel := s.GetUserHighestRoleLevel(assignerID)

    // 2. Get role being assigned
    var roleToAssign models.Role
    if err := s.db.First(&roleToAssign, "id = ?", roleID).Error; err != nil {
        return fmt.Errorf("role not found: %w", err)
    }

    // 3. ESCALATION CHECK: Cannot assign role with higher privilege
    if roleToAssign.HierarchyLevel < assignerLevel {
        return fmt.Errorf(
            "escalation denied: cannot assign role '%s' (level %d) - your highest level is %d",
            roleToAssign.Name,
            roleToAssign.HierarchyLevel,
            assignerLevel,
        )
    }

    // 4. SELF-ESCALATION CHECK: Cannot escalate own privileges
    if assignerID == targetUserID {
        currentLevel := s.GetUserHighestRoleLevel(assignerID)
        if roleToAssign.HierarchyLevel < currentLevel {
            return errors.New("self-escalation denied: cannot assign higher privilege role to yourself")
        }
    }

    // 5. SYSTEM ROLE CHECK: Only system admins can assign system roles
    if roleToAssign.IsSystemRole {
        if assignerLevel > 1 { // Only level 1 (Super Admin) can assign system roles
            return errors.New("only Super Admin can assign system roles")
        }
    }

    return nil
}

// ValidatePermissionGrant checks if granter can grant the permission
func (s *EscalationPreventionService) ValidatePermissionGrant(
    granterID string,
    targetUserID string,
    permissionID string,
    resolver *PermissionResolverService,
) error {
    // Get the permission being granted
    var perm models.Permission
    if err := s.db.First(&perm, "id = ?", permissionID).Error; err != nil {
        return fmt.Errorf("permission not found: %w", err)
    }

    // RULE: Cannot grant permission you don't have yourself
    hasPermission, err := resolver.CheckPermission(
        granterID,
        perm.Resource,
        perm.Action,
        models.PermissionScopeAll, // Check if granter has it at ALL scope
        nil,
    )

    if err != nil {
        return fmt.Errorf("failed to check granter permission: %w", err)
    }

    if !hasPermission {
        return fmt.Errorf(
            "grant denied: you don't have permission '%s' - cannot grant what you don't have",
            perm.Code,
        )
    }

    // SYSTEM PERMISSION CHECK
    if perm.IsSystemPermission {
        granterLevel := s.GetUserHighestRoleLevel(granterID)
        if granterLevel > 1 {
            return errors.New("only Super Admin can grant system permissions")
        }
    }

    return nil
}
```

**Integration with UserRoleService:**

```go
func (s *UserRoleService) AssignRoleToUser(
    assignerID string,
    targetUserID string,
    roleID string,
    effectiveFrom time.Time,
    effectiveUntil *time.Time,
) (*models.UserRole, error) {
    // CRITICAL: Validate escalation before assignment
    if err := s.escalationPrevention.ValidateRoleAssignment(assignerID, targetUserID, roleID); err != nil {
        return nil, err
    }

    // Proceed with assignment...
    userRole := &models.UserRole{
        ID:             uuid.New().String(),
        UserID:         targetUserID,
        RoleID:         roleID,
        AssignedBy:     &assignerID,
        AssignedAt:     time.Now(),
        IsActive:       true,
        EffectiveFrom:  effectiveFrom,
        EffectiveUntil: effectiveUntil,
    }

    if err := s.db.Create(userRole).Error; err != nil {
        return nil, err
    }

    // Invalidate cache
    s.cacheInvalidator.InvalidateOnUserPermissionChange(targetUserID)

    return userRole, nil
}
```

**Integration with UserPermissionService:**

```go
func (s *UserPermissionService) GrantPermissionToUser(
    granterID string,
    targetUserID string,
    permissionID string,
    grantReason string,
    priority int,
    effectiveFrom time.Time,
    effectiveUntil *time.Time,
) (*models.UserPermission, error) {
    // CRITICAL: Validate escalation before grant
    if err := s.escalationPrevention.ValidatePermissionGrant(
        granterID,
        targetUserID,
        permissionID,
        s.resolver,
    ); err != nil {
        return nil, err
    }

    // Proceed with grant...
    userPerm := &models.UserPermission{
        ID:             uuid.New().String(),
        UserID:         targetUserID,
        PermissionID:   permissionID,
        IsGranted:      true,
        GrantedBy:      granterID,
        GrantReason:    grantReason,
        Priority:       priority,
        EffectiveFrom:  effectiveFrom,
        EffectiveUntil: effectiveUntil,
    }

    if err := s.db.Create(userPerm).Error; err != nil {
        return nil, err
    }

    // Invalidate cache
    s.cacheInvalidator.InvalidateOnUserPermissionChange(targetUserID)

    return userPerm, nil
}
```

**Escalation Prevention Summary:**

| Scenario | Check | Error Message |
|----------|-------|---------------|
| Assign higher role | `roleLevel < assignerLevel` | "escalation denied: cannot assign role with higher privilege" |
| Self-escalation | `assignerID == targetUserID && newLevel < currentLevel` | "self-escalation denied" |
| Assign system role | `role.IsSystemRole && assignerLevel > 1` | "only Super Admin can assign system roles" |
| Grant permission not owned | `!hasPermission` | "cannot grant permission you don't have" |
| Grant system permission | `perm.IsSystemPermission && level > 1` | "only Super Admin can grant system permissions" |

#### 5. Rate Limiting & Permission Caching
```go
// Cache permission check results
type PermissionCache struct {
    cache *sync.Map
    ttl   time.Duration
}

func (pc *PermissionCache) CheckPermission(
    userID, resource, action string,
) (bool, bool) {
    key := fmt.Sprintf("%s:%s:%s", userID, resource, action)

    if cached, ok := pc.cache.Load(key); ok {
        entry := cached.(CacheEntry)
        if time.Now().Before(entry.ExpiresAt) {
            return entry.Allowed, true
        }
    }

    return false, false
}

func (pc *PermissionCache) SetPermission(
    userID, resource, action string,
    allowed bool,
) {
    key := fmt.Sprintf("%s:%s:%s", userID, resource, action)

    pc.cache.Store(key, CacheEntry{
        Allowed:   allowed,
        ExpiresAt: time.Now().Add(pc.ttl),
    })
}

// InvalidateUserCache clears all cached permissions for a user
func (pc *PermissionCache) InvalidateUserCache(userID string) {
    // Iterate through cache and delete user's entries
    pc.cache.Range(func(key, value interface{}) bool {
        if strings.HasPrefix(key.(string), userID+":") {
            pc.cache.Delete(key)
        }
        return true
    })
}
```

#### 6. Cache Invalidation Strategy (CRITICAL)

**⚠️ IMPORTANT: Cache invalidation HARUS diimplementasi untuk menjaga konsistensi data!**

```go
// CacheInvalidationService handles permission cache invalidation
type CacheInvalidationService struct {
    cache *PermissionCache
    db    *gorm.DB
}

// InvalidateOnRoleChange invalidates cache for all users with the role
func (s *CacheInvalidationService) InvalidateOnRoleChange(roleID string) error {
    var userRoles []models.UserRole
    s.db.Where("role_id = ? AND is_active = true", roleID).Find(&userRoles)

    for _, ur := range userRoles {
        s.cache.InvalidateUserCache(ur.UserID)
    }

    log.Printf("Cache invalidated for %d users after role %s change", len(userRoles), roleID)
    return nil
}

// InvalidateOnRolePermissionChange invalidates when role permissions change
func (s *CacheInvalidationService) InvalidateOnRolePermissionChange(roleID string) error {
    // Invalidate for direct role users
    s.InvalidateOnRoleChange(roleID)

    // Also invalidate for child roles (role hierarchy)
    var childRoles []models.RoleHierarchy
    s.db.Where("parent_role_id = ?", roleID).Find(&childRoles)

    for _, cr := range childRoles {
        s.InvalidateOnRoleChange(cr.RoleID)
    }

    return nil
}

// InvalidateOnPositionChange invalidates cache for all users with the position
func (s *CacheInvalidationService) InvalidateOnPositionChange(positionID string) error {
    var userPositions []models.UserPosition
    s.db.Where("position_id = ? AND is_active = true", positionID).Find(&userPositions)

    for _, up := range userPositions {
        s.cache.InvalidateUserCache(up.UserID)
    }

    return nil
}

// InvalidateOnUserPermissionChange invalidates single user cache
func (s *CacheInvalidationService) InvalidateOnUserPermissionChange(userID string) error {
    s.cache.InvalidateUserCache(userID)
    return nil
}
```

**When to Invalidate Cache:**

| Event | Action |
|-------|--------|
| User permission granted/revoked | `InvalidateOnUserPermissionChange(userID)` |
| Role permission added/removed | `InvalidateOnRolePermissionChange(roleID)` |
| User assigned/removed from role | `InvalidateOnUserPermissionChange(userID)` |
| User assigned/removed from position | `InvalidateOnUserPermissionChange(userID)` |
| Role hierarchy changed | `InvalidateOnRolePermissionChange(parentRoleID)` |
| Position permissions changed | `InvalidateOnPositionChange(positionID)` |

**Integration with Services:**

```go
// Example: RolePermissionService with cache invalidation
func (s *RolePermissionService) AssignPermissionToRole(roleID, permissionID string) error {
    // ... create role_permission record ...

    // CRITICAL: Invalidate cache after change
    s.cacheInvalidator.InvalidateOnRolePermissionChange(roleID)

    return nil
}

func (s *UserRoleService) AssignRoleToUser(userID, roleID string) error {
    // ... create user_role record ...

    // CRITICAL: Invalidate cache after change
    s.cacheInvalidator.InvalidateOnUserPermissionChange(userID)

    return nil
}
```

### 7.2 Performance Optimization

#### 1. Eager Loading
```go
// ❌ N+1 Query Problem
func GetUsersWithRoles(db *gorm.DB) []models.User {
    var users []models.User
    db.Find(&users)

    // This will cause N queries
    for _, user := range users {
        db.Model(&user).Association("UserRoles").Find(&user.UserRoles)
    }
    return users
}

// ✅ Optimized with Preload
func GetUsersWithRoles(db *gorm.DB) []models.User {
    var users []models.User
    db.Preload("UserRoles.Role").
       Preload("UserPositions.Position").
       Preload("UserPermissions.Permission").
       Find(&users)
    return users
}
```

#### 2. Database Indexes
```sql
-- Add indexes for permission lookups
CREATE INDEX idx_user_roles_user_effective ON user_roles(user_id, is_active, effective_from, effective_until);
CREATE INDEX idx_user_positions_user_effective ON user_positions(user_id, is_active, start_date, end_date);
CREATE INDEX idx_user_permissions_user_effective ON user_permissions(user_id, effective_from, effective_until);
CREATE INDEX idx_role_permissions_role_effective ON role_permissions(role_id, is_granted, effective_from, effective_until);

-- Composite indexes for permission checks
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action, is_active);
CREATE INDEX idx_user_permissions_resource ON user_permissions(user_id, permission_id, resource_id);
```

#### 3. Permission Caching Strategy
```go
type PermissionResolverService struct {
    db    *gorm.DB
    cache *PermissionCache
}

func (s *PermissionResolverService) CheckPermission(
    userID, resource string,
    action models.PermissionAction,
    scope models.PermissionScope,
    resourceID *string,
) (bool, error) {
    // Try cache first
    if allowed, found := s.cache.CheckPermission(userID, resource, string(action)); found {
        return allowed, nil
    }

    // Perform actual check
    allowed, err := s.checkPermissionFromDB(userID, resource, action, scope, resourceID)
    if err != nil {
        return false, err
    }

    // Cache result
    s.cache.SetPermission(userID, resource, string(action), allowed)

    return allowed, nil
}
```

#### 4. Batch Permission Loading
```go
// Load all user permissions at once for multiple checks
func (s *PermissionResolverService) LoadUserPermissionsContext(userID string) (*PermissionContext, error) {
    ctx := &PermissionContext{
        UserID:            userID,
        DirectPermissions: make(map[string]bool),
        RolePermissions:   make(map[string]bool),
        PositionPermissions: make(map[string]bool),
    }

    // Load all at once
    userPerms := s.GetEffectiveUserPermissions(userID)
    userRoles := s.GetEffectiveUserRoles(userID)
    userPositions := s.GetEffectiveUserPositions(userID)

    // Build permission maps
    for _, up := range userPerms {
        key := fmt.Sprintf("%s:%s", up.Permission.Resource, up.Permission.Action)
        ctx.DirectPermissions[key] = up.IsGranted
    }

    // ... populate role and position permissions

    return ctx, nil
}

// Fast lookup from context
func (ctx *PermissionContext) HasPermission(resource, action string) bool {
    key := fmt.Sprintf("%s:%s", resource, action)

    // Check direct permissions first
    if allowed, exists := ctx.DirectPermissions[key]; exists {
        return allowed
    }

    // Check position permissions
    if allowed, exists := ctx.PositionPermissions[key]; exists && allowed {
        return true
    }

    // Check role permissions
    if allowed, exists := ctx.RolePermissions[key]; exists && allowed {
        return true
    }

    return false
}
```

### 7.3 Common Pitfalls

#### 1. Forgetting Time-Bound Checks
```go
// ❌ Wrong: Not checking effective dates
func GetUserRoles(userID string) []models.UserRole {
    var roles []models.UserRole
    db.Where("user_id = ? AND is_active = ?", userID, true).Find(&roles)
    return roles
}

// ✅ Correct: Check effective dates
func GetUserRoles(userID string) []models.UserRole {
    var roles []models.UserRole
    now := time.Now()
    db.Where("user_id = ? AND is_active = ?", userID, true).
       Where("effective_from <= ?", now).
       Where("effective_until IS NULL OR effective_until > ?", now).
       Find(&roles)
    return roles
}
```

#### 2. Ignoring Explicit Denials
```go
// ❌ Wrong: Only checking if permission exists
func HasPermission(userPerms []UserPermission) bool {
    return len(userPerms) > 0
}

// ✅ Correct: Check IsGranted flag
func HasPermission(userPerms []UserPermission) bool {
    if len(userPerms) == 0 {
        return false
    }

    // Sort by priority
    sort.Slice(userPerms, func(i, j int) bool {
        return userPerms[i].Priority < userPerms[j].Priority
    })

    // Explicit deny blocks access
    if !userPerms[0].IsGranted {
        return false
    }

    return true
}
```

#### 3. Not Handling Resource-Specific Permissions
```go
// ❌ Wrong: Ignoring resource ID in check
func CheckReportAccess(userID, reportID string) bool {
    return CheckPermission(userID, "reports", "READ", "ALL", nil)
}

// ✅ Correct: Pass resource ID for specific checks
func CheckReportAccess(userID, reportID string) bool {
    // First check if user has general access
    hasGeneral := CheckPermission(userID, "reports", "READ", "ALL", nil)
    if hasGeneral {
        return true
    }

    // Then check resource-specific permission
    return CheckPermission(userID, "reports", "READ", "ALL", &reportID)
}
```

### 7.4 Testing Recommendations

#### Unit Tests
```go
func TestPermissionResolution(t *testing.T) {
    // Test 1: Direct user permission takes priority
    t.Run("UserPermission_OverridesRole", func(t *testing.T) {
        // Setup: User has role with permission, but explicit deny
        // Assert: Access is denied
    })

    // Test 2: Time-bound permissions expire
    t.Run("ExpiredPermission_NoAccess", func(t *testing.T) {
        // Setup: Permission expired yesterday
        // Assert: Access is denied
    })

    // Test 3: Priority resolution
    t.Run("HigherPriority_TakesPrecedence", func(t *testing.T) {
        // Setup: Two user permissions, different priorities
        // Assert: Higher priority (lower number) wins
    })

    // Test 4: Role hierarchy
    t.Run("RoleHierarchy_InheritsPermissions", func(t *testing.T) {
        // Setup: Child role inherits from parent
        // Assert: User has parent's permissions
    })
}
```

#### Integration Tests
```go
func TestPermissionMiddleware(t *testing.T) {
    router := setupTestRouter()

    t.Run("UnauthorizedUser_Denied", func(t *testing.T) {
        req := httptest.NewRequest("GET", "/api/users", nil)
        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)

        assert.Equal(t, 401, w.Code)
    })

    t.Run("AuthorizedUser_WithPermission_Allowed", func(t *testing.T) {
        token := createTestToken(userWithPermission)
        req := httptest.NewRequest("GET", "/api/users", nil)
        req.Header.Set("Authorization", "Bearer "+token)
        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)

        assert.Equal(t, 200, w.Code)
    })
}
```

---

## Kesimpulan

Sistem RBAC Gloria Ops mengimplementasikan multi-layered access control yang komprehensif dengan fitur:

1. **Flexible Permission Model** - Resource-based dengan action dan scope granular
2. **Hierarchical Roles** - Role inheritance untuk DRY permission management
3. **Position-Based Access** - Organizational structure integration dengan PLT support
4. **Time-Bound Assignments** - Semua assignments dapat dibatasi waktu
5. **Priority Resolution** - Clear precedence rules untuk conflict resolution
6. **Resource-Level Permissions** - Fine-grained control untuk specific resources
7. **Conditional Permissions** - Dynamic evaluation dengan JSONB conditions
8. **Module Access Control** - Additional layer untuk UI feature toggling
9. **Comprehensive Audit Trail** - Full logging untuk compliance dan security

### ⚠️ Critical Implementation Notes

**HARUS diimplementasi untuk production:**

| Item | Alasan | Impact jika tidak |
|------|--------|-------------------|
| Visited map di `GetParentRolesRecursive` | Mencegah infinite loop | Application crash/hang |
| Cache Invalidation | Menjaga konsistensi data | Stale permission data |
| Batch Permission Check | Mengurangi API calls | N+1 request problem di frontend |
| WITH RECURSIVE query | Single DB query vs N queries | Performance degradation |
| Permission Escalation Prevention | Mencegah privilege escalation | Security vulnerability |

**Implementation Priority:**
1. ✅ Database models (Complete)
2. ✅ Database indexes (Create early untuk performance)
3. 🔄 PermissionResolverService (Core algorithm dengan cycle detection)
4. 🔄 Cache + Invalidation (MANDATORY untuk production)
5. 🔄 Permission middleware (Authorization layer)
6. 🔄 API endpoints (Include batch check)
7. 🔄 Audit logging (Compliance)
8. 🔄 Testing suite (Include hierarchy cycle tests)

Implementasi step-by-step harus mengikuti panduan ini dengan fokus pada **security-first approach**, **cycle detection**, dan **cache consistency**.

---

---

## Changelog

### Version 1.1 (2025-01-27)
**Critical Fixes:**
1. ✅ **Circular Dependency Prevention** - Added `visited` map parameter to `GetParentRolesRecursive()` to prevent infinite loops
2. ✅ **PostgreSQL WITH RECURSIVE** - Added optimized CTE query alternative for role hierarchy (single query vs N queries)
3. ✅ **Cache Invalidation Strategy** - Added `CacheInvalidationService` with proper invalidation triggers
4. ✅ **Batch Permission Check** - Added `POST /api/access/check-batch` endpoint for frontend optimization
5. ✅ **RequireAllPermissions Middleware** - Added AND logic middleware (complement to existing OR logic)
6. ✅ **Permission Escalation Prevention** - Added `EscalationPreventionService` to prevent privilege escalation attacks

### Version 1.0 (2024-01-26)
- Initial comprehensive implementation guide

---

**Dokumen ini dibuat:** 2024-01-26
**Last Updated:** 2025-01-27
**Author:** Claude Code Analysis
**Version:** 1.1
**Status:** Production-Ready Implementation Guide
