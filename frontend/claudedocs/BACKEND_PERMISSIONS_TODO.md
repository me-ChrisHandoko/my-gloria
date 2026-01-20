# Backend Permissions Implementation TODO

**Date**: 2026-01-19
**Status**: ⚠️ **INCOMPLETE - Backend NOT Implemented**

---

## 🔍 Current Status Analysis

### ✅ What EXISTS in Backend

#### 1. **Permission Model** (`internal/models/permission.go`)
```go
✅ Permission struct - Complete with all fields
✅ CreatePermissionRequest - Validation ready
✅ UpdatePermissionRequest - Partial update support
✅ PermissionResponse - Full response
✅ PermissionListResponse - List view
✅ PermissionGroupResponse - Grouped view
✅ Helper methods: ToResponse(), ToListResponse()
✅ GetPermissionCode() - Standard code generator
```

**Fields Available:**
- ✅ ID, Code, Name, Description
- ✅ Resource, Action, Scope
- ✅ Conditions (JSONB), Metadata (JSONB)
- ✅ IsSystemPermission, IsActive
- ✅ Category, GroupIcon, GroupName, GroupSortOrder
- ✅ CreatedAt, UpdatedAt, CreatedBy
- ✅ Relations: RolePermissions, UserPermissions

#### 2. **Enums** (`internal/models/enums.go`)
```go
✅ PermissionAction - Likely defined
✅ PermissionScope - Likely defined
✅ ModuleCategory - Likely defined
```

#### 3. **Database Table**
```sql
✅ Table: public.permissions
✅ Relations: role_permissions, user_permissions
```

### ❌ What is MISSING in Backend

#### 1. **Permission Handler** - ❌ NOT IMPLEMENTED
**Missing File**: `internal/handlers/permission.go`

**Required Functions:**
```go
❌ GetPermissions(c *gin.Context)           // List with filters
❌ GetPermissionByID(c *gin.Context)        // Get single permission
❌ CreatePermission(c *gin.Context)         // Create new permission
❌ UpdatePermission(c *gin.Context)         // Update existing
❌ DeletePermission(c *gin.Context)         // Delete permission
❌ GetPermissionGroups(c *gin.Context)      // Get grouped permissions
```

#### 2. **Permission Service** - ❌ NOT IMPLEMENTED
**Missing File**: `internal/services/permission_service.go`

**Required Functions:**
```go
❌ GetPermissions(filters PermissionFilter) ([]Permission, int64, error)
❌ GetPermissionByID(id string) (*Permission, error)
❌ GetPermissionByCode(code string) (*Permission, error)
❌ CreatePermission(req CreatePermissionRequest, userID string) (*Permission, error)
❌ UpdatePermission(id string, req UpdatePermissionRequest) (*Permission, error)
❌ DeletePermission(id string) error
❌ GetPermissionGroups() ([]PermissionGroupResponse, error)
❌ ValidatePermissionCode(code string) error
```

#### 3. **API Routes** - ❌ NOT REGISTERED
**Missing in**: `cmd/server/main.go`

**Required Routes:**
```go
// In setupRouter() function, add:
❌ GET    /api/v1/permissions           - List permissions (with pagination, filters, sorting)
❌ GET    /api/v1/permissions/:id       - Get permission by ID
❌ POST   /api/v1/permissions           - Create permission
❌ PUT    /api/v1/permissions/:id       - Update permission
❌ DELETE /api/v1/permissions/:id       - Delete permission
❌ GET    /api/v1/permissions/groups    - Get grouped permissions
```

#### 4. **Service Initialization** - ❌ NOT ADDED
**Missing in**: `cmd/server/main.go` line ~78

```go
❌ permissionService := services.NewPermissionService(db)
❌ permissionHandler := handlers.NewPermissionHandler(permissionService)
```

---

## 📋 Implementation Checklist

### Phase 1: Permission Service Layer
**File**: `internal/services/permission_service.go` (NEW)

- [ ] Create `PermissionService` struct
- [ ] Implement `NewPermissionService(db *gorm.DB)` constructor
- [ ] Implement CRUD methods:
  - [ ] `GetPermissions()` with filters, pagination, sorting
  - [ ] `GetPermissionByID()`
  - [ ] `GetPermissionByCode()`
  - [ ] `CreatePermission()`
  - [ ] `UpdatePermission()`
  - [ ] `DeletePermission()`
  - [ ] `GetPermissionGroups()`
- [ ] Add validation logic:
  - [ ] Validate permission code uniqueness
  - [ ] Validate resource/action combinations
  - [ ] Check system permission restrictions
- [ ] Add error handling for all operations

**Estimated Lines**: ~400-500 lines

---

### Phase 2: Permission Handler Layer
**File**: `internal/handlers/permission.go` (NEW)

- [ ] Create `PermissionHandler` struct
- [ ] Implement `NewPermissionHandler(service *PermissionService)` constructor
- [ ] Implement HTTP handlers:
  - [ ] `GetPermissions()` - List with query params
  - [ ] `GetPermissionByID()` - Get by ID param
  - [ ] `CreatePermission()` - POST with validation
  - [ ] `UpdatePermission()` - PUT with validation
  - [ ] `DeletePermission()` - DELETE with checks
  - [ ] `GetPermissionGroups()` - Grouped view
- [ ] Add request validation:
  - [ ] Bind and validate JSON requests
  - [ ] Validate URL parameters
  - [ ] Validate query parameters
- [ ] Add response formatting:
  - [ ] Paginated responses
  - [ ] Error responses
  - [ ] Success responses
- [ ] Add middleware integration:
  - [ ] Auth middleware
  - [ ] Permission check middleware (for create/update/delete)

**Estimated Lines**: ~350-400 lines

---

### Phase 3: Route Registration
**File**: `cmd/server/main.go` (UPDATE)

#### 3.1: Initialize Service & Handler (line ~78)
```go
permissionService := services.NewPermissionService(db)
permissionHandler := handlers.NewPermissionHandler(permissionService)
```

#### 3.2: Register Routes (line ~150+)
```go
// Permissions endpoints (protected)
permissions := v1.Group("/permissions")
permissions.Use(middleware.AuthRequired()) // Require authentication
{
    // List permissions (paginated, filtered, sorted)
    permissions.GET("", permissionHandler.GetPermissions)

    // Get single permission by ID
    permissions.GET("/:id", permissionHandler.GetPermissionByID)

    // Get grouped permissions
    permissions.GET("/groups", permissionHandler.GetPermissionGroups)

    // Create permission (admin only)
    permissions.POST("",
        middleware.RequirePermission("permissions", "create"),
        permissionHandler.CreatePermission,
    )

    // Update permission (admin only)
    permissions.PUT("/:id",
        middleware.RequirePermission("permissions", "update"),
        permissionHandler.UpdatePermission,
    )

    // Delete permission (admin only)
    permissions.DELETE("/:id",
        middleware.RequirePermission("permissions", "delete"),
        permissionHandler.DeletePermission,
    )
}
```

**Estimated Lines**: ~30 lines

---

## 📝 Detailed Implementation Guide

### 1. Permission Service Implementation

**File**: `internal/services/permission_service.go`

```go
package services

import (
    "errors"
    "fmt"
    "strings"

    "backend/internal/models"
    "gorm.io/gorm"
)

type PermissionService struct {
    db *gorm.DB
}

func NewPermissionService(db *gorm.DB) *PermissionService {
    return &PermissionService{db: db}
}

// GetPermissions retrieves permissions with pagination, filtering, and sorting
func (s *PermissionService) GetPermissions(
    page, pageSize int,
    search, resource, action, scope, category string,
    isActive, isSystemPermission *bool,
    sortBy, sortOrder string,
) ([]models.Permission, int64, error) {
    var permissions []models.Permission
    var total int64

    // Build query
    query := s.db.Model(&models.Permission{})

    // Apply filters
    if search != "" {
        searchPattern := "%" + strings.ToLower(search) + "%"
        query = query.Where(
            "LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(resource) LIKE ?",
            searchPattern, searchPattern, searchPattern,
        )
    }

    if resource != "" {
        query = query.Where("resource = ?", resource)
    }

    if action != "" {
        query = query.Where("action = ?", action)
    }

    if scope != "" {
        query = query.Where("scope = ?", scope)
    }

    if category != "" {
        query = query.Where("category = ?", category)
    }

    if isActive != nil {
        query = query.Where("is_active = ?", *isActive)
    }

    if isSystemPermission != nil {
        query = query.Where("is_system_permission = ?", *isSystemPermission)
    }

    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Apply sorting
    orderClause := "code ASC" // default
    if sortBy != "" {
        allowedSorts := map[string]bool{
            "code": true, "name": true, "resource": true,
            "created_at": true, "is_active": true,
        }
        if allowedSorts[sortBy] {
            direction := "ASC"
            if strings.ToUpper(sortOrder) == "DESC" {
                direction = "DESC"
            }
            orderClause = fmt.Sprintf("%s %s", sortBy, direction)
        }
    }
    query = query.Order(orderClause)

    // Apply pagination
    if page > 0 && pageSize > 0 {
        offset := (page - 1) * pageSize
        query = query.Offset(offset).Limit(pageSize)
    }

    // Execute query
    if err := query.Find(&permissions).Error; err != nil {
        return nil, 0, err
    }

    return permissions, total, nil
}

// GetPermissionByID retrieves a permission by ID
func (s *PermissionService) GetPermissionByID(id string) (*models.Permission, error) {
    var permission models.Permission
    if err := s.db.Where("id = ?", id).First(&permission).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("permission not found")
        }
        return nil, err
    }
    return &permission, nil
}

// GetPermissionByCode retrieves a permission by code
func (s *PermissionService) GetPermissionByCode(code string) (*models.Permission, error) {
    var permission models.Permission
    if err := s.db.Where("code = ?", code).First(&permission).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("permission not found")
        }
        return nil, err
    }
    return &permission, nil
}

// CreatePermission creates a new permission
func (s *PermissionService) CreatePermission(
    req models.CreatePermissionRequest,
    userID string,
) (*models.Permission, error) {
    // Check if code already exists
    var existing models.Permission
    if err := s.db.Where("code = ?", req.Code).First(&existing).Error; err == nil {
        return nil, fmt.Errorf("permission code already exists")
    }

    // Create permission
    permission := models.Permission{
        ID:                 generateID(), // Use your ID generator
        Code:               req.Code,
        Name:               req.Name,
        Description:        req.Description,
        Resource:           req.Resource,
        Action:             req.Action,
        Scope:              req.Scope,
        Conditions:         req.Conditions,
        Metadata:           req.Metadata,
        IsSystemPermission: req.IsSystemPermission != nil && *req.IsSystemPermission,
        IsActive:           true,
        CreatedBy:          &userID,
        Category:           req.Category,
        GroupIcon:          req.GroupIcon,
        GroupName:          req.GroupName,
        GroupSortOrder:     req.GroupSortOrder,
    }

    if err := s.db.Create(&permission).Error; err != nil {
        return nil, err
    }

    return &permission, nil
}

// UpdatePermission updates an existing permission
func (s *PermissionService) UpdatePermission(
    id string,
    req models.UpdatePermissionRequest,
) (*models.Permission, error) {
    // Get existing permission
    permission, err := s.GetPermissionByID(id)
    if err != nil {
        return nil, err
    }

    // Check if system permission
    if permission.IsSystemPermission {
        return nil, fmt.Errorf("cannot update system permission")
    }

    // Check if code already exists (if being updated)
    if req.Code != nil && *req.Code != permission.Code {
        var existing models.Permission
        if err := s.db.Where("code = ? AND id != ?", *req.Code, id).First(&existing).Error; err == nil {
            return nil, fmt.Errorf("permission code already exists")
        }
    }

    // Update fields
    updates := make(map[string]interface{})
    if req.Code != nil {
        updates["code"] = *req.Code
    }
    if req.Name != nil {
        updates["name"] = *req.Name
    }
    if req.Description != nil {
        updates["description"] = req.Description
    }
    if req.Resource != nil {
        updates["resource"] = *req.Resource
    }
    if req.Action != nil {
        updates["action"] = *req.Action
    }
    if req.Scope != nil {
        updates["scope"] = req.Scope
    }
    if req.Conditions != nil {
        updates["conditions"] = req.Conditions
    }
    if req.Metadata != nil {
        updates["metadata"] = req.Metadata
    }
    if req.IsActive != nil {
        updates["is_active"] = *req.IsActive
    }
    if req.Category != nil {
        updates["category"] = req.Category
    }
    if req.GroupIcon != nil {
        updates["group_icon"] = req.GroupIcon
    }
    if req.GroupName != nil {
        updates["group_name"] = req.GroupName
    }
    if req.GroupSortOrder != nil {
        updates["group_sort_order"] = req.GroupSortOrder
    }

    // Execute update
    if err := s.db.Model(&permission).Updates(updates).Error; err != nil {
        return nil, err
    }

    return permission, nil
}

// DeletePermission deletes a permission
func (s *PermissionService) DeletePermission(id string) error {
    // Get existing permission
    permission, err := s.GetPermissionByID(id)
    if err != nil {
        return err
    }

    // Check if system permission
    if permission.IsSystemPermission {
        return fmt.Errorf("cannot delete system permission")
    }

    // Check if permission is used by roles or users
    var roleCount, userCount int64
    s.db.Model(&models.RolePermission{}).Where("permission_id = ?", id).Count(&roleCount)
    s.db.Model(&models.UserPermission{}).Where("permission_id = ?", id).Count(&userCount)

    if roleCount > 0 || userCount > 0 {
        return fmt.Errorf("cannot delete permission: it is assigned to %d role(s) and %d user(s)", roleCount, userCount)
    }

    // Delete permission
    if err := s.db.Delete(&permission).Error; err != nil {
        return err
    }

    return nil
}

// GetPermissionGroups retrieves permissions grouped by group_name
func (s *PermissionService) GetPermissionGroups() ([]models.PermissionGroupResponse, error) {
    var permissions []models.Permission
    if err := s.db.Where("is_active = ?", true).
        Order("group_sort_order ASC, group_name ASC, code ASC").
        Find(&permissions).Error; err != nil {
        return nil, err
    }

    // Group permissions
    groupMap := make(map[string]*models.PermissionGroupResponse)
    for _, p := range permissions {
        groupName := "Uncategorized"
        if p.GroupName != nil && *p.GroupName != "" {
            groupName = *p.GroupName
        }

        if _, exists := groupMap[groupName]; !exists {
            sortOrder := 999
            if p.GroupSortOrder != nil {
                sortOrder = *p.GroupSortOrder
            }
            groupMap[groupName] = &models.PermissionGroupResponse{
                GroupName:   groupName,
                GroupIcon:   p.GroupIcon,
                SortOrder:   sortOrder,
                Permissions: []models.PermissionListResponse{},
            }
        }

        groupMap[groupName].Permissions = append(
            groupMap[groupName].Permissions,
            *p.ToListResponse(),
        )
    }

    // Convert map to slice
    var groups []models.PermissionGroupResponse
    for _, group := range groupMap {
        groups = append(groups, *group)
    }

    return groups, nil
}

// Helper function (you might already have this in another file)
func generateID() string {
    // Use UUID or your existing ID generation logic
    return "generate-uuid-here"
}
```

---

### 2. Permission Handler Implementation

**File**: `internal/handlers/permission.go`

```go
package handlers

import (
    "net/http"
    "strconv"

    "backend/internal/models"
    "backend/internal/services"

    "github.com/gin-gonic/gin"
)

type PermissionHandler struct {
    service *services.PermissionService
}

func NewPermissionHandler(service *services.PermissionService) *PermissionHandler {
    return &PermissionHandler{service: service}
}

// GetPermissions handles GET /api/v1/permissions
func (h *PermissionHandler) GetPermissions(c *gin.Context) {
    // Parse query parameters
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
    search := c.Query("search")
    resource := c.Query("resource")
    action := c.Query("action")
    scope := c.Query("scope")
    category := c.Query("category")
    sortBy := c.DefaultQuery("sort_by", "code")
    sortOrder := c.DefaultQuery("sort_order", "asc")

    // Parse boolean filters
    var isActive, isSystemPermission *bool
    if activeStr := c.Query("is_active"); activeStr != "" {
        active := activeStr == "true"
        isActive = &active
    }
    if systemStr := c.Query("is_system_permission"); systemStr != "" {
        system := systemStr == "true"
        isSystemPermission = &system
    }

    // Get permissions
    permissions, total, err := h.service.GetPermissions(
        page, pageSize, search, resource, action, scope, category,
        isActive, isSystemPermission, sortBy, sortOrder,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to retrieve permissions",
        })
        return
    }

    // Convert to list response
    permissionList := make([]models.PermissionListResponse, len(permissions))
    for i, p := range permissions {
        permissionList[i] = *p.ToListResponse()
    }

    // Calculate pagination
    totalPages := int(total) / pageSize
    if int(total)%pageSize > 0 {
        totalPages++
    }

    // Return paginated response
    c.JSON(http.StatusOK, gin.H{
        "data":        permissionList,
        "total":       total,
        "page":        page,
        "page_size":   pageSize,
        "total_pages": totalPages,
    })
}

// GetPermissionByID handles GET /api/v1/permissions/:id
func (h *PermissionHandler) GetPermissionByID(c *gin.Context) {
    id := c.Param("id")

    permission, err := h.service.GetPermissionByID(id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{
            "error": "Permission not found",
        })
        return
    }

    c.JSON(http.StatusOK, permission.ToResponse())
}

// CreatePermission handles POST /api/v1/permissions
func (h *PermissionHandler) CreatePermission(c *gin.Context) {
    var req models.CreatePermissionRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Invalid request body",
            "details": err.Error(),
        })
        return
    }

    // Get user ID from context (set by auth middleware)
    userID, _ := c.Get("user_id")

    permission, err := h.service.CreatePermission(req, userID.(string))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusCreated, permission.ToResponse())
}

// UpdatePermission handles PUT /api/v1/permissions/:id
func (h *PermissionHandler) UpdatePermission(c *gin.Context) {
    id := c.Param("id")

    var req models.UpdatePermissionRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Invalid request body",
            "details": err.Error(),
        })
        return
    }

    permission, err := h.service.UpdatePermission(id, req)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, permission.ToResponse())
}

// DeletePermission handles DELETE /api/v1/permissions/:id
func (h *PermissionHandler) DeletePermission(c *gin.Context) {
    id := c.Param("id")

    if err := h.service.DeletePermission(id); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "Permission deleted successfully",
    })
}

// GetPermissionGroups handles GET /api/v1/permissions/groups
func (h *PermissionHandler) GetPermissionGroups(c *gin.Context) {
    groups, err := h.service.GetPermissionGroups()
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to retrieve permission groups",
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "data": groups,
    })
}
```

---

## 🎯 Priority Implementation Order

1. **HIGH PRIORITY** - Service Layer (needed for any functionality)
2. **HIGH PRIORITY** - Handler Layer (connects service to HTTP)
3. **HIGH PRIORITY** - Route Registration (exposes endpoints)
4. **MEDIUM PRIORITY** - Additional validation and error handling
5. **LOW PRIORITY** - Permission groups feature (optional, can come later)

---

## ⏱️ Estimated Implementation Time

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Permission Service | 2-3 hours |
| 2 | Permission Handler | 1-2 hours |
| 3 | Route Registration | 30 minutes |
| 4 | Testing & Debugging | 1-2 hours |
| **Total** | | **5-8 hours** |

---

## 🧪 Testing Checklist (After Implementation)

Once backend is implemented, test these endpoints:

### Manual API Testing
```bash
# 1. List permissions
curl -X GET "http://localhost:8080/api/v1/permissions?page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN"

# 2. Get permission by ID
curl -X GET "http://localhost:8080/api/v1/permissions/{id}" \
  -H "Authorization: Bearer $TOKEN"

# 3. Create permission
curl -X POST "http://localhost:8080/api/v1/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "users:read",
    "name": "Read Users",
    "resource": "users",
    "action": "read",
    "scope": "all"
  }'

# 4. Update permission
curl -X PUT "http://localhost:8080/api/v1/permissions/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Read All Users",
    "is_active": true
  }'

# 5. Delete permission
curl -X DELETE "http://localhost:8080/api/v1/permissions/{id}" \
  -H "Authorization: Bearer $TOKEN"

# 6. Get permission groups
curl -X GET "http://localhost:8080/api/v1/permissions/groups" \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Integration Testing
Once backend is ready:
1. Start backend: `cd backend && go run cmd/server/main.go`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to: `http://localhost:3000/akses/permissions`
4. Test all features (search, filter, sort, pagination, CRUD)

---

## 📝 Notes

1. **API URL Mismatch**: Frontend expects `/api/permissions` but backend typically uses `/api/v1/permissions`
   - **Solution**: Update `NEXT_PUBLIC_API_URL` in frontend `.env.local` to match backend base path

2. **Authentication**: All endpoints require authentication
   - Create/Update/Delete may require additional permissions check

3. **Validation**: Backend should validate:
   - Permission code uniqueness
   - Resource/action combinations
   - System permission protection

4. **Error Handling**: Implement consistent error responses

---

## ✅ Summary

**Backend Status**: ⚠️ **~30% Complete**

- ✅ Models defined
- ✅ Database schema ready
- ❌ Service layer NOT implemented
- ❌ Handler layer NOT implemented
- ❌ Routes NOT registered
- ❌ API endpoints NOT available

**Next Steps**: Implement missing backend components following this guide.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-19
**Status**: Ready for Backend Implementation
