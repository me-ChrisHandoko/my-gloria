# Backend API Requirements for Frontend Integration

**Document Version:** 1.0
**Last Updated:** December 10, 2025
**Status:** Complete Reference for Backend Team

---

## 📋 Overview

This document specifies the backend API requirements for frontend authentication integration. The frontend uses Clerk for authentication and expects specific endpoints and response formats from the backend.

---

## 🔐 Authentication Flow

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (Next.js + Clerk)                              │
│  ↓                                                        │
│  1. User logs in via Clerk                               │
│  2. Clerk generates JWT token                            │
│  3. Frontend calls backend with token                    │
│     GET /api/v1/me                                      │
│     Headers: Authorization: Bearer <clerk_jwt>          │
│  ↓                                                        │
│  Backend (Go + Gin)                                      │
│  ↓                                                        │
│  4. Validate JWT signature with Clerk                    │
│  5. Extract user_id from JWT claims                      │
│  6. Query database for user context                      │
│  7. Return: user, employee, roles, permissions, modules  │
│  ↓                                                        │
│  Frontend                                                │
│  ↓                                                        │
│  8. Store in Redux                                       │
│  9. RBAC system active                                   │
│ 10. Module navigation active                             │
└──────────────────────────────────────────────────────────┘
```

---

## 📡 Required Endpoints

### 1. Get Current User Context
**Endpoint:** `GET /api/v1/me`

**Purpose:** Fetch complete user context including profile, employee data, roles, permissions, and accessible modules.

**Authentication:** Required (JWT Bearer token)

**Request:**
```http
GET /api/v1/me HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "",
  "data": {
    "user": {
      "id": 123,
      "clerk_user_id": "user_2abc123def456",
      "email": "john.doe@example.com",
      "display_name": "John Doe",
      "first_name": "John",
      "last_name": "Doe",
      "phone_number": "+62812345678",
      "address": "Jakarta, Indonesia",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-12-01T10:30:00Z"
    },
    "employee": {
      "id": 456,
      "user_id": 123,
      "employee_number": "EMP001",
      "position": "Senior Developer",
      "department": "Engineering",
      "hire_date": "2024-01-15",
      "is_active": true,
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    "roles": [
      {
        "id": 1,
        "code": "ADMIN",
        "name": "System Administrator",
        "description": "Full system access with administrative privileges",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": 5,
        "code": "TEACHER",
        "name": "Teacher",
        "description": "Teaching staff with academic management access",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "permissions": [
      {
        "id": 1,
        "code": "user:create",
        "name": "Create User",
        "description": "Permission to create new users in the system",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "code": "user:read",
        "name": "Read User",
        "description": "Permission to view user information",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": 10,
        "code": "course:manage",
        "name": "Manage Courses",
        "description": "Permission to create, edit, and delete courses",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "modules": [
      {
        "id": 1,
        "code": "ACADEMIC",
        "name": "Academic Management",
        "description": "Module for managing academic activities and courses",
        "icon": "book",
        "route": "/academic",
        "parent_id": null,
        "order_index": 1,
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "code": "FINANCE",
        "name": "Financial Management",
        "description": "Module for financial transactions and reporting",
        "icon": "dollar-sign",
        "route": "/finance",
        "parent_id": null,
        "order_index": 2,
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "",
  "error": "Invalid or expired token"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "",
  "error": "User profile not found"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "message": "",
  "error": "Internal server error: <detailed error message>"
}
```

---

### 2. Get Current User Permissions
**Endpoint:** `GET /api/v1/me/permissions`

**Purpose:** Fetch only permission codes for the current user.

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    "course:create",
    "course:read",
    "course:manage"
  ]
}
```

---

### 3. Get Current User Modules
**Endpoint:** `GET /api/v1/me/modules`

**Purpose:** Fetch only accessible modules for the current user.

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "ACADEMIC",
      "name": "Academic Management",
      "description": "Module for managing academic activities",
      "icon": "book",
      "route": "/academic",
      "parent_id": null,
      "order_index": 1,
      "is_active": true
    }
  ]
}
```

---

## 🔒 Security Requirements

### JWT Token Validation

**Backend MUST:**
1. Validate JWT signature using Clerk's public key
2. Verify token expiration (`exp` claim)
3. Verify token audience (`aud` claim)
4. Extract `sub` (subject) claim as clerk_user_id
5. Check if user exists and is active in database

**Clerk JWT Structure:**
```json
{
  "sub": "user_2abc123def456",
  "aud": "https://your-app.clerk.accounts.dev",
  "iss": "https://clerk.your-app.com",
  "exp": 1735689600,
  "iat": 1735686000,
  "email": "user@example.com",
  "email_verified": true
}
```

**Validation Steps:**
```go
// Example validation pseudocode
1. Extract token from Authorization header
2. Parse JWT and validate signature with Clerk public key
3. Check exp claim (token not expired)
4. Check aud claim (matches your Clerk app)
5. Extract sub claim (clerk_user_id)
6. Query database: SELECT * FROM users WHERE clerk_user_id = <sub>
7. If user not found → return 404
8. If user found but not active → return 403
9. If valid → proceed to fetch user context
```

---

### CORS Configuration

**Required for Development:**
```
Allow-Origin: http://localhost:3000
Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Allow-Headers: Authorization, Content-Type
Allow-Credentials: true
```

**Required for Production:**
```
Allow-Origin: https://your-production-domain.com
Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Allow-Headers: Authorization, Content-Type
Allow-Credentials: true
```

---

### Authorization Middleware

**Backend MUST enforce RBAC on all protected endpoints:**

```go
// Example middleware pseudocode
func RequirePermission(permission string) gin.HandlerFunc {
  return func(c *gin.Context) {
    userID := GetCurrentUserID(c)

    // Check if user has permission
    hasPermission := CheckUserPermission(userID, permission)

    if !hasPermission {
      c.JSON(403, Response{
        Success: false,
        Error: "Insufficient permissions",
      })
      c.Abort()
      return
    }

    c.Next()
  }
}

// Usage
router.DELETE("/api/v1/users/:id", RequirePermission("user:delete"), DeleteUser)
```

**NEVER trust frontend permission checks - always validate on backend!**

---

## 📊 Data Model Requirements

### User Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
```

### Employee Table (Optional)
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  position VARCHAR(100),
  department VARCHAR(100),
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Role Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Permission Table
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,  -- Format: "resource:action"
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Module Table
```sql
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  route VARCHAR(255),
  parent_id INTEGER REFERENCES modules(id),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User-Role Association
```sql
CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

### Role-Permission Association
```sql
CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);
```

### Role-Module Association
```sql
CREATE TABLE role_modules (
  role_id INTEGER REFERENCES roles(id),
  module_id INTEGER REFERENCES modules(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, module_id)
);
```

---

## 🔄 User Creation Strategy

### Option 1: Auto-Create User (Recommended)

When `/api/v1/me` is called with valid Clerk token but user doesn't exist:

```go
func GetCurrentUserContext(clerkUserID string) (*CurrentUserContext, error) {
  user := GetUserByClerkID(clerkUserID)

  if user == nil {
    // User not found → auto-create from Clerk data
    clerkUser := FetchUserFromClerk(clerkUserID)

    user = CreateUser(&User{
      ClerkUserID: clerkUserID,
      Email: clerkUser.Email,
      FirstName: clerkUser.FirstName,
      LastName: clerkUser.LastName,
      DisplayName: clerkUser.DisplayName,
      IsActive: true,
    })

    // Assign default role
    AssignRole(user.ID, "DEFAULT_USER")
  }

  // Fetch and return complete context
  return FetchUserContext(user.ID)
}
```

### Option 2: Return 404 and Manual Creation

Return 404 error and require admin to create user manually via admin panel.

**Frontend will display UserNotFoundError screen with retry option.**

---

## ⚡ Performance Requirements

- **Response Time:** < 200ms for `/me` endpoint (90th percentile)
- **Throughput:** Support 100 requests/second per user minimum
- **Caching:** Implement Redis caching for user context (TTL: 5 minutes)
- **Database:** Use database indexes on `clerk_user_id` and email columns

---

## 🧪 Testing Requirements

### Unit Tests
- JWT validation with valid/invalid tokens
- User context assembly logic
- Permission/role aggregation
- Module access filtering

### Integration Tests
- End-to-end `/me` endpoint test
- Token expiration handling
- User not found scenario
- Database transaction rollback on errors

### Load Tests
- 1000 concurrent requests to `/me` endpoint
- Response time under load < 500ms
- No memory leaks under sustained load

---

## 📝 Implementation Checklist

Backend team must verify:

- [ ] JWT validation middleware implemented
- [ ] `/api/v1/me` endpoint implemented and tested
- [ ] Response format matches specification exactly
- [ ] CORS configured for frontend origins
- [ ] Database indexes created
- [ ] User auto-creation OR 404 handling implemented
- [ ] RBAC middleware on all protected endpoints
- [ ] Error responses match specification
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load tests passing
- [ ] Redis caching configured (optional but recommended)

---

## 🚨 Common Issues & Solutions

### Issue 1: 401 Unauthorized Despite Valid Clerk Token

**Cause:** Backend not validating JWT correctly

**Solution:**
- Verify Clerk public key configuration
- Check JWT signature validation logic
- Ensure token audience matches Clerk app

### Issue 2: User Not Found (404)

**Cause:** User exists in Clerk but not in backend database

**Solution:**
- Implement auto-creation strategy, OR
- Provide admin panel for manual user creation

### Issue 3: Slow Response Times

**Cause:** Complex database queries without optimization

**Solution:**
- Add database indexes
- Implement Redis caching
- Optimize JOIN queries
- Use database query profiling

### Issue 4: CORS Errors in Browser

**Cause:** Missing or incorrect CORS headers

**Solution:**
```go
router.Use(cors.New(cors.Config{
  AllowOrigins: []string{"http://localhost:3000"},
  AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
  AllowHeaders: []string{"Authorization", "Content-Type"},
  AllowCredentials: true,
}))
```

---

## 📞 Support & Contact

**Frontend Team Contact:**
- Integration questions: frontend-team@yourdomain.com
- API specification clarifications: api-specs@yourdomain.com

**Backend Team Responsibilities:**
- Implement endpoints as specified
- Maintain response format compatibility
- Ensure security best practices
- Provide API documentation updates

---

**Document Status:** ✅ Complete and Ready for Implementation
