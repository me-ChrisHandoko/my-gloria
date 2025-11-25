# Gloria Backend - Implementation Guide

## 1. File Implementation Checklist

### Phase 1: Authentication Foundation ✅ COMPLETED

```
[x] internal/response/response.go
    - Response struct
    - Success() helper
    - Error() helper

[x] internal/middleware/auth_context.go
    - AuthContext struct
    - AuthType enum (Clerk, JWT, APIKey)
    - Context helpers (Get/Set)
    - GetCurrentUserID helper
    - Permission check helpers (HasPermission, HasAnyPermission, HasAllPermissions)

[x] internal/middleware/auth_clerk.go
    - ClerkAuth() middleware
    - ClerkAuthOptional() middleware
    - Token extraction from header
    - Clerk SDK validation
    - User profile lookup via interface
    - Auth context setup
    - InitClerk() initialization

[x] internal/middleware/auth_jwt.go
    - JWTAuth() middleware
    - JWTClaims struct
    - JWTConfig struct
    - GenerateJWT()
    - ValidateJWT()
    - GenerateRefreshToken()
    - ValidateRefreshToken()
    - Stateless auth context setup

[x] internal/middleware/rate_limit.go
    - RateLimiter struct with cleanup goroutine
    - RateLimit() middleware (per user/API key)
    - RateLimitByIP() middleware
    - RateLimitStrict() middleware (for auth endpoints)
    - Rate limit headers (X-RateLimit-*, Retry-After)

[x] internal/repository/api_key_repository.go
    - ApiKeyRepository interface
    - FindAll(), FindByID(), FindByPrefix()
    - FindActiveByUserID()
    - Create(), Update(), Delete()
    - Revoke(), RecordUsage()

[x] internal/service/auth_service.go
    - AuthService interface
    - Argon2id password hashing
    - API key generation (prefix + random + last4)
    - ValidateAPIKey(), ValidateAPIKeyWithIP()
    - ExchangeAPIKeyForJWT()
    - IP whitelist validation
    - Domain-specific errors

[x] internal/service/auth_lookup_adapter.go
    - AuthLookupAdapter struct
    - Implements middleware.UserProfileLookup interface
    - GetByClerkUserID() with role/permission loading

[x] internal/handler/auth_handler.go
    - AuthHandler struct
    - ExchangeToken endpoint (POST /public/auth/token)
    - RefreshToken endpoint (placeholder)
    - ValidateToken endpoint (debug)
    - Error handling with specific messages

[x] internal/handler/response.go (updated)
    - Wrapper functions for backward compatibility
    - Uses internal/response package

[x] internal/config/config.go (updated)
    - ClerkSecretKey
    - JWTSecretKey, JWTIssuer, JWTExpiryHours
    - RateLimitDefault, RateLimitStrict

[x] cmd/api/main.go (updated)
    - Route groups: public, web, external, legacy
    - Middleware wiring
    - JWT config initialization
    - Auth components initialization
```

### Phase 2: Authorization ✅ COMPLETED

```
[x] internal/middleware/permission.go
    - RequirePermission() middleware
    - RequireAnyPermission() middleware
    - RequireAllPermissions() middleware
    - RequireRole() middleware
    - RequireAnyRole() middleware
    - SetPermissionChecker() for DB-based checks
    - Wildcard permission matching (user:*, admin:*)
    - Permission parsing helpers (GetPermissionScope, GetPermissionResource, GetPermissionAction)

[x] internal/repository/permission_repository.go
    - PermissionRepository interface
    - FindAll(), FindByID(), FindByCode(), FindByResource()
    - GetUserDirectPermissions() - direct user_permissions
    - GetUserRolePermissions() - from user_roles → role_permissions
    - GetUserAllPermissions() - unified query with role hierarchy
    - GetRolePermissions(), GetRoleHierarchyPermissions()

[x] internal/service/permission_service.go
    - PermissionService interface
    - HasPermission(), HasAnyPermission(), HasAllPermissions()
    - GetUserPermissions() with caching (5 min TTL)
    - GetEffectivePermissions() with source tracking (direct, role, inherited)
    - GetPermissionScope() - highest scope resolution
    - Wildcard matching support (user:*, *:read, admin:*)
    - In-memory permission cache with TTL

[x] internal/handler/permission_handler.go
    - GetAll() - list all permissions
    - GetByID() - get permission by ID
    - GetByResource() - get permissions by resource
    - GetMyPermissions() - current user's effective permissions
    - CheckPermission() - check specific permission
    - GetUserPermissions() - get user permissions (admin)

[x] cmd/api/main.go (updated)
    - Permission repository, service, handler initialization
    - SetPermissionChecker() for middleware integration
    - Permission routes under /api/v1/web/permissions/*
    - Protected routes with RequirePermission() middleware
```

### Phase 3: Core Services ✅ COMPLETED

```
[x] internal/repository/role_repository.go
    - RoleRepository interface
    - FindAll(), FindByID(), FindByCode(), FindActive()
    - FindByHierarchyLevel()
    - Create(), Update(), Delete()
    - GetRolePermissions(), AssignPermission(), RemovePermission()
    - GetParentRoles(), GetChildRoles(), AddParentRole(), RemoveParentRole()

[x] internal/service/role_service.go
    - RoleService interface
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - GetWithPermissions() - role with effective permissions
    - Create(), Update(), Delete() with system role protection
    - AssignPermission(), RemovePermission(), GetRolePermissions()

[x] internal/handler/role_handler.go
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - GetWithPermissions(), GetRolePermissions()
    - Create(), Update(), Delete()
    - AssignPermission(), RemovePermission()

[x] internal/repository/school_repository.go
    - SchoolRepository interface
    - FindAll(), FindByID(), FindByCode(), FindActive()
    - FindWithDepartments()
    - Create(), Update(), Delete()

[x] internal/service/school_service.go
    - SchoolService interface
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - Create(), Update(), Delete()
    - Duplicate code validation

[x] internal/handler/school_handler.go
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - Create(), Update(), Delete()

[x] internal/repository/department_repository.go
    - DepartmentRepository interface
    - FindAll(), FindByID(), FindByCode(), FindActive()
    - FindBySchoolID(), FindByParentID(), FindRootDepartments()
    - FindWithPositions(), FindWithChildren()
    - Create(), Update(), Delete()
    - GetAllAsMap() for circular reference checking

[x] internal/service/department_service.go
    - DepartmentService interface
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - GetBySchoolID(), GetByParentID()
    - GetTree() - hierarchical tree view
    - Create(), Update(), Delete()
    - Circular reference detection

[x] internal/handler/department_handler.go
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - GetBySchoolID(), GetByParentID(), GetTree()
    - Create(), Update(), Delete()

[x] internal/repository/position_repository.go
    - PositionRepository interface
    - FindAll(), FindByID(), FindByCode(), FindActive()
    - FindByDepartmentID(), FindBySchoolID(), FindByHierarchyLevel()
    - FindWithHierarchy()
    - Create(), Update(), Delete()
    - CreateHierarchy(), UpdateHierarchy(), DeleteHierarchy(), GetHierarchy()

[x] internal/service/position_service.go
    - PositionService interface
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - GetByDepartmentID(), GetBySchoolID(), GetByHierarchyLevel()
    - GetWithHierarchy()
    - Create(), Update(), Delete()
    - Automatic hierarchy management on create/update

[x] internal/handler/position_handler.go
    - GetAll(), GetActive(), GetByID(), GetByCode()
    - GetByDepartmentID(), GetBySchoolID(), GetByHierarchyLevel()
    - GetWithHierarchy()
    - Create(), Update(), Delete()

[x] internal/service/apikey_service.go
    - ApiKeyService interface
    - GetAll(), GetByID(), GetActive()
    - Create() with secure key generation (SHA256 hash)
    - Revoke(), Delete()
    - ValidateKey() with IP whitelist check
    - RecordUsage()

[x] internal/handler/apikey_handler.go
    - GetAll(), GetActive(), GetByID()
    - Create() - returns plain key only once
    - Revoke(), Delete()

[x] cmd/api/main.go (updated)
    - Role, School, Department, Position, ApiKey repositories
    - Role, School, Department, Position, ApiKey services
    - Role, School, Department, Position, ApiKey handlers
    - Routes under /api/v1/web/*
```

### Phase 4: Audit & Utils ✅ COMPLETED

```
[x] internal/repository/audit_repository.go
    - AuditRepository interface
    - FindAll() with filtering and pagination
    - FindByID(), FindByActorID(), FindByEntityID(), FindByModule()
    - FindByDateRange()
    - Create() for logging new entries
    - GetModules(), GetEntityTypes() for dropdown lists
    - Count() for statistics

[x] internal/service/audit_service.go
    - AuditService interface
    - GetAll(), GetByID(), GetByActorID(), GetByEntityID(), GetByModule()
    - GetMyAuditLogs() for current user's activity
    - GetModules(), GetEntityTypes(), GetActions(), GetCategories()
    - Log() generic audit entry creation
    - LogCreate(), LogUpdate(), LogDelete() convenience methods
    - LogAction() for custom actions
    - Automatic changed fields calculation
    - JSON conversion helpers

[x] internal/handler/audit_handler.go
    - GetAll() with filtering and pagination response
    - GetByID(), GetByActorID(), GetByEntity(), GetByModule()
    - GetMyAuditLogs() for current user
    - GetModules(), GetEntityTypes(), GetActions(), GetCategories()
    - Pagination metadata in response

[x] cmd/api/main.go (updated)
    - Audit repository, service, handler initialization
    - Routes under /api/v1/web/audit-logs/*
    - Permission-protected routes (audit:read)
```

## 2. Code Templates

### Repository Template
```go
// internal/repository/school_repository.go

package repository

import (
    "backend/internal/domain"
    "gorm.io/gorm"
)

type SchoolRepository interface {
    FindAll() ([]domain.School, error)
    FindByID(id string) (*domain.School, error)
    FindByCode(code string) (*domain.School, error)
    Create(school *domain.School) error
    Update(school *domain.School) error
    Delete(id string) error
}

type schoolRepository struct {
    db *gorm.DB
}

func NewSchoolRepository(db *gorm.DB) SchoolRepository {
    return &schoolRepository{db: db}
}

func (r *schoolRepository) FindAll() ([]domain.School, error) {
    var schools []domain.School
    if err := r.db.Find(&schools).Error; err != nil {
        return nil, err
    }
    return schools, nil
}

func (r *schoolRepository) FindByID(id string) (*domain.School, error) {
    var school domain.School
    if err := r.db.First(&school, "id = ?", id).Error; err != nil {
        return nil, err
    }
    return &school, nil
}

// ... implement other methods
```

### Service Template
```go
// internal/service/school_service.go

package service

import (
    "errors"
    "backend/internal/domain"
    "backend/internal/repository"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

var (
    ErrSchoolNotFound = errors.New("school not found")
    ErrSchoolCodeExists = errors.New("school code already exists")
)

type SchoolService interface {
    GetAll() ([]domain.SchoolListResponse, error)
    GetByID(id string) (*domain.SchoolResponse, error)
    Create(req *domain.CreateSchoolRequest, createdBy *string) (*domain.SchoolResponse, error)
    Update(id string, req *domain.UpdateSchoolRequest, modifiedBy *string) (*domain.SchoolResponse, error)
    Delete(id string) error
}

type schoolService struct {
    repo repository.SchoolRepository
}

func NewSchoolService(repo repository.SchoolRepository) SchoolService {
    return &schoolService{repo: repo}
}

func (s *schoolService) GetAll() ([]domain.SchoolListResponse, error) {
    schools, err := s.repo.FindAll()
    if err != nil {
        return nil, err
    }

    responses := make([]domain.SchoolListResponse, len(schools))
    for i, school := range schools {
        responses[i] = *school.ToListResponse()
    }
    return responses, nil
}

func (s *schoolService) GetByID(id string) (*domain.SchoolResponse, error) {
    school, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrSchoolNotFound
        }
        return nil, err
    }
    return school.ToResponse(), nil
}

func (s *schoolService) Create(req *domain.CreateSchoolRequest, createdBy *string) (*domain.SchoolResponse, error) {
    // Check for duplicate code
    existing, _ := s.repo.FindByCode(req.Code)
    if existing != nil {
        return nil, ErrSchoolCodeExists
    }

    school := &domain.School{
        ID:        uuid.New().String(),
        Code:      req.Code,
        Name:      req.Name,
        Lokasi:    req.Lokasi,
        Address:   req.Address,
        Phone:     req.Phone,
        Email:     req.Email,
        Principal: req.Principal,
        IsActive:  true,
        CreatedBy: createdBy,
    }

    if err := s.repo.Create(school); err != nil {
        return nil, err
    }

    return school.ToResponse(), nil
}

// ... implement other methods
```

### Handler Template
```go
// internal/handler/school_handler.go

package handler

import (
    "net/http"
    "backend/internal/service"
    "backend/internal/domain"
    "backend/internal/middleware"
    "github.com/gin-gonic/gin"
    "errors"
)

type SchoolHandler struct {
    service service.SchoolService
}

func NewSchoolHandler(service service.SchoolService) *SchoolHandler {
    return &SchoolHandler{service: service}
}

func (h *SchoolHandler) GetAll(c *gin.Context) {
    schools, err := h.service.GetAll()
    if err != nil {
        ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    SuccessResponse(c, http.StatusOK, "", schools)
}

func (h *SchoolHandler) GetByID(c *gin.Context) {
    id := c.Param("id")
    school, err := h.service.GetByID(id)
    if err != nil {
        if errors.Is(err, service.ErrSchoolNotFound) {
            ErrorResponse(c, http.StatusNotFound, err.Error())
            return
        }
        ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    SuccessResponse(c, http.StatusOK, "", school)
}

func (h *SchoolHandler) Create(c *gin.Context) {
    var req domain.CreateSchoolRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        ErrorResponse(c, http.StatusBadRequest, err.Error())
        return
    }

    createdBy := middleware.GetCurrentUserID(c) // from auth context
    school, err := h.service.Create(&req, &createdBy)
    if err != nil {
        if errors.Is(err, service.ErrSchoolCodeExists) {
            ErrorResponse(c, http.StatusConflict, err.Error())
            return
        }
        ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }

    SuccessResponse(c, http.StatusCreated, "School created successfully", school)
}

// ... implement other methods
```

## 3. Current Route Structure (Phase 1, 2, 3 & 4)

```go
// cmd/api/main.go - Current Implementation

// Route Groups:
// ├── /api/v1/public/*     → No auth, strict rate limit
// │   └── POST /auth/token → Exchange API key for JWT
// │
// ├── /api/v1/web/*        → Clerk authentication
// │   ├── GET /me          → Current user profile
// │   │
// │   ├── /user-profiles/* → User CRUD
// │   │   ├── GET /        → List all
// │   │   ├── POST /       → Create (requires: user:create)
// │   │   ├── PUT /:id     → Update (requires: user:update)
// │   │   └── DELETE /:id  → Delete (requires: user:delete)
// │   │
// │   ├── /permissions/*   → Permission management
// │   │   ├── GET /        → List all permissions
// │   │   ├── GET /me      → Current user's effective permissions
// │   │   ├── GET /check   → Check specific permission
// │   │   ├── GET /resource/:resource → Get by resource
// │   │   ├── GET /user/:userId → Get user permissions (requires: permission:read)
// │   │   └── GET /:id     → Get permission by ID
// │   │
// │   ├── /roles/*         → Role management
// │   │   ├── GET /        → List all roles
// │   │   ├── GET /active  → List active roles
// │   │   ├── GET /code/:code → Get role by code
// │   │   ├── GET /:id     → Get role by ID
// │   │   ├── GET /:id/permissions → Get role with permissions
// │   │   ├── POST /       → Create role (requires: role:create)
// │   │   ├── PUT /:id     → Update role (requires: role:update)
// │   │   ├── DELETE /:id  → Delete role (requires: role:delete)
// │   │   ├── POST /:id/permissions → Assign permission (requires: role:update)
// │   │   └── DELETE /:id/permissions/:permissionId → Remove permission (requires: role:update)
// │   │
// │   ├── /schools/*       → School management
// │   │   ├── GET /        → List all schools
// │   │   ├── GET /active  → List active schools
// │   │   ├── GET /code/:code → Get school by code
// │   │   ├── GET /:id     → Get school by ID
// │   │   ├── POST /       → Create school (requires: school:create)
// │   │   ├── PUT /:id     → Update school (requires: school:update)
// │   │   └── DELETE /:id  → Delete school (requires: school:delete)
// │   │
// │   ├── /departments/*   → Department management
// │   │   ├── GET /        → List all departments
// │   │   ├── GET /active  → List active departments
// │   │   ├── GET /tree    → Get department hierarchy tree
// │   │   ├── GET /code/:code → Get department by code
// │   │   ├── GET /school/:schoolId → Get departments by school
// │   │   ├── GET /parent/:parentId → Get child departments
// │   │   ├── GET /:id     → Get department by ID
// │   │   ├── POST /       → Create department (requires: department:create)
// │   │   ├── PUT /:id     → Update department (requires: department:update)
// │   │   └── DELETE /:id  → Delete department (requires: department:delete)
// │   │
// │   ├── /positions/*     → Position management
// │   │   ├── GET /        → List all positions
// │   │   ├── GET /active  → List active positions
// │   │   ├── GET /code/:code → Get position by code
// │   │   ├── GET /department/:departmentId → Get positions by department
// │   │   ├── GET /school/:schoolId → Get positions by school
// │   │   ├── GET /level/:level → Get positions by hierarchy level
// │   │   ├── GET /:id     → Get position by ID
// │   │   ├── GET /:id/hierarchy → Get position with hierarchy
// │   │   ├── POST /       → Create position (requires: position:create)
// │   │   ├── PUT /:id     → Update position (requires: position:update)
// │   │   └── DELETE /:id  → Delete position (requires: position:delete)
// │   │
// │   ├── /api-keys/*      → API Key management
// │   │   ├── GET /        → List user's API keys
// │   │   ├── GET /active  → List active API keys
// │   │   ├── GET /:id     → Get API key by ID
// │   │   ├── POST /       → Create new API key
// │   │   ├── POST /:id/revoke → Revoke API key
// │   │   └── DELETE /:id  → Delete API key
// │   │
// │   └── /audit-logs/*    → Audit log management
// │       ├── GET /        → List all audit logs (requires: audit:read)
// │       ├── GET /me      → Current user's audit logs
// │       ├── GET /modules → List available modules
// │       ├── GET /entity-types → List entity types
// │       ├── GET /actions → List available actions
// │       ├── GET /categories → List categories
// │       ├── GET /actor/:actorId → Get by actor (requires: audit:read)
// │       ├── GET /module/:module → Get by module (requires: audit:read)
// │       ├── GET /entity/:entityType/:entityId → Get entity history (requires: audit:read)
// │       └── GET /:id     → Get audit log by ID (requires: audit:read)
// │
// ├── /api/v1/external/*   → JWT authentication + rate limit
// │   ├── GET /employees   → List employees (requires: employee:read)
// │   └── GET /employees/:nip → Get employee (requires: employee:read)
// │
// └── /api/v1/user-profiles/* → Legacy (no auth, backward compatible)
```

## 4. Environment Configuration

### Development (.env.development)
```env
# Server
SERVER_PORT=8080

# Database
DB_HOST=localhost
DB_PORT=3479
DB_USER=postgres
DB_PASSWORD=mydevelopment
DB_NAME=new_gloria_db
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

# Migrations
RUN_MIGRATIONS=true

# Clerk
CLERK_SECRET_KEY=sk_test_xxxxx

# JWT
JWT_SECRET_KEY=your-256-bit-secret-key-change-in-production
JWT_ISSUER=gloria-api
JWT_EXPIRY_HOURS=1

# Rate Limiting
RATE_LIMIT_DEFAULT=1000
RATE_LIMIT_STRICT=10
```

### Production (.env.production)
```env
# Server
SERVER_PORT=8080
GIN_MODE=release

# Database
DB_HOST=production-db-host
DB_PORT=5432
DB_USER=gloria_user
DB_PASSWORD=<secure-password>
DB_NAME=gloria_db
DB_SSLMODE=require
DB_TIMEZONE=Asia/Jakarta

# Migrations
RUN_MIGRATIONS=false

# Clerk
CLERK_SECRET_KEY=sk_live_xxxxx

# JWT
JWT_SECRET_KEY=<256-bit-secure-random-string>
JWT_ISSUER=gloria-api
JWT_EXPIRY_HOURS=1

# Rate Limiting
RATE_LIMIT_DEFAULT=1000
RATE_LIMIT_STRICT=10

# CORS
CORS_ALLOWED_ORIGINS=https://app.gloria.edu
```

## 5. Testing Checklist

### Unit Tests
```
[ ] Service layer tests with mocked repositories
[ ] Permission resolution tests
[ ] JWT generation/validation tests
[ ] API key hashing tests (Argon2id)
```

### Integration Tests
```
[ ] Authentication flow (Clerk)
[ ] Authentication flow (JWT)
[ ] Permission middleware
[ ] Rate limiting
[ ] CRUD operations
```

### E2E Tests
```
[ ] Complete user journey (web)
[ ] External API access flow
[ ] Error handling scenarios
```

## 6. Implementation Notes

### Phase 1 Key Decisions

1. **Import Cycle Resolution**: Created separate `internal/response` package to break cycle between handler and middleware packages.

2. **Argon2id for API Keys**: Using Argon2id (winner of Password Hashing Competition) instead of bcrypt for API key hashing. More resistant to GPU attacks.

3. **Stateless JWT**: JWT contains all necessary claims (user_id, api_key_id, nip, permissions) to avoid database lookups on every request.

4. **Rate Limiting Architecture**:
   - Per-user/per-API-key limiting for authenticated requests
   - IP-based limiting as fallback
   - Strict limiting for auth endpoints (per minute vs per hour)
   - Automatic cleanup of stale limiters

5. **Backward Compatibility**: Legacy routes at `/api/v1/user-profiles/*` kept without auth while new authenticated routes added.

6. **Interface-Based Decoupling**: `UserProfileLookup` interface and `AuthLookupAdapter` pattern to decouple middleware from service layer.

### Phase 2 Key Decisions

1. **Dual Permission Check Strategy**:
   - First check: Auth context permissions (stateless, from JWT claims)
   - Fallback: Database lookup via PermissionChecker interface
   - Best of both: Fast for cached/JWT permissions, accurate for fresh data

2. **Permission Resolution Order**:
   - User direct permissions (highest priority)
   - User role permissions
   - Inherited permissions via role hierarchy (using recursive CTE query)

3. **Wildcard Permission Support**:
   - `user:*` matches `user:read`, `user:create`, etc.
   - `*:read` matches `user:read`, `employee:read`, etc.
   - `*` or `admin:*` grants full access (super admin)

4. **Permission Caching**:
   - In-memory cache with 5-minute TTL
   - Per-user permission codes cached
   - Cache invalidation on permission changes
   - Reduces database queries for repeated checks

5. **Scope-Based Permissions**:
   - `resource:action:scope` format (e.g., `employee:read:department`)
   - Scopes: OWN, DEPARTMENT, SCHOOL, ALL
   - Higher scope includes lower (ALL > SCHOOL > DEPARTMENT > OWN)
   - `GetPermissionScope()` returns highest available scope

6. **Role-Based Access**:
   - `RequireRole()` and `RequireAnyRole()` middleware
   - Checks against auth context roles
   - Useful for admin-only routes

### Phase 3 Key Decisions

1. **Role Management**:
   - Full CRUD with role hierarchy support
   - System roles cannot be deleted (protection flag)
   - Permission assignment with effective date tracking
   - Role inheritance via parent-child relationships

2. **Organization Structure**:
   - School → Department → Position hierarchy
   - Departments support parent-child relationships
   - GetTree() endpoint for hierarchical visualization
   - Circular reference detection in department updates

3. **Position Hierarchy**:
   - Reports-to and coordinator relationships
   - Hierarchy level for organizational ordering
   - Max holders and uniqueness constraints
   - Automatic hierarchy management on CRUD

4. **API Key Management**:
   - SHA256 hashing for API key storage
   - Secure random key generation (32 bytes)
   - IP whitelist validation
   - Usage tracking (last used, usage count)
   - Key revocation without deletion

5. **Error Handling Pattern**:
   - Domain-specific errors (ErrSchoolNotFound, ErrPositionCodeExists)
   - HTTP status code mapping (404 for not found, 409 for conflicts)
   - Validation at service layer, presentation at handler layer

6. **Query Optimization**:
   - FindActive() methods for dropdown lists
   - GetAllAsMap() for efficient lookups
   - Preload for eager loading of relations
   - Ordering by relevant fields (name, hierarchy_level)

### Phase 4 Key Decisions

1. **Audit Log Architecture**:
   - Immutable log entries (no update/delete operations)
   - JSON storage for old/new values and metadata
   - Automatic changed fields calculation
   - Actor and target user tracking with profile preloading

2. **Filtering and Pagination**:
   - Comprehensive filter struct with all common fields
   - Query parameter binding for flexible filtering
   - Pagination with total count for UI components
   - Maximum limit enforcement (100) for performance

3. **Convenience Logging Methods**:
   - `LogCreate()`, `LogUpdate()`, `LogDelete()` for common CRUD
   - `LogAction()` for custom actions (login, logout, grant, revoke)
   - Generic `Log()` for full control over entry structure
   - Category assignment for grouping (permission, workflow, data change)

4. **Audit Categories**:
   - PERMISSION: Role and permission changes
   - MODULE: Module access changes
   - WORKFLOW: Workflow state transitions
   - SYSTEM_CONFIG: System configuration changes
   - USER_MANAGEMENT: User profile and assignment changes
   - DATA_CHANGE: General data modifications

5. **Performance Considerations**:
   - Async logging option for non-blocking operations
   - Selective preloading based on use case
   - Indexed columns for common queries (actor_id, entity_type, entity_id, created_at)
   - Date range queries for time-based analysis

6. **Integration Pattern**:
   - Services can inject AuditService for logging
   - Handlers extract IP address and user agent from request
   - Middleware context provides actor information
   - Non-blocking errors to avoid disrupting main operations
