# Gloria Backend - API Reference

## 1. Base URL & Authentication

### Base URLs
```
Development: http://localhost:8080/api/v1
Production:  https://api.gloria.edu/api/v1
```

### Route Groups

| Group | Path | Auth Method | Description |
|-------|------|-------------|-------------|
| Public | `/public` | None | Health check, token exchange |
| Web | `/web` | Clerk Session | Main web application |
| External | `/external` | JWT Token | Third-party integrations |

## 2. Public Endpoints

### Health Check
```
GET /ping

Response 200:
{
    "message": "pong"
}
```

### Exchange API Key for JWT
```
POST /public/auth/token
Content-Type: application/json

Request:
{
    "api_key": "glr_live_xxxxxxxxxxxxxxxxxxxx"
}

Response 200:
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "Bearer",
        "expires_in": 3600,
        "expires_at": "2024-01-15T11:00:00Z"
    }
}

Response 401:
{
    "success": false,
    "error": "invalid api key"
}
```

## 3. Web Endpoints (Clerk Auth)

### 3.1 Current User

```
GET /web/me
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": {
        "id": "uuid",
        "clerk_user_id": "user_xxx",
        "nip": "123456789012345",
        "is_active": true,
        "data_karyawan": {
            "nip": "123456789012345",
            "nama": "John Doe",
            "email": "john@example.com"
        },
        "roles": [...],
        "positions": [...]
    }
}
```

### 3.2 User Profiles

**List Users**
```
GET /web/user-profiles?page=1&limit=20
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "clerk_user_id": "user_xxx",
            "nip": "123456789012345",
            "name": "John Doe",
            "is_active": true
        }
    ],
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 100
    }
}
```

**Get User by ID**
```
GET /web/user-profiles/:id
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": {
        "id": "uuid",
        "clerk_user_id": "user_xxx",
        "nip": "123456789012345",
        "is_active": true,
        "data_karyawan": {...}
    }
}
```

**Get User with Full Details**
```
GET /web/user-profiles/:id/full
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": {
        "id": "uuid",
        "clerk_user_id": "user_xxx",
        "nip": "123456789012345",
        "is_active": true,
        "data_karyawan": {...},
        "roles": [...],
        "positions": [...],
        "permissions": [...]
    }
}
```

**Create User Profile**
```
POST /web/user-profiles
Authorization: Bearer <clerk_session_token>
Content-Type: application/json

Request:
{
    "clerk_user_id": "user_xxx",
    "nip": "123456789012345",
    "preferences": {}
}

Response 201:
{
    "success": true,
    "message": "User profile created successfully",
    "data": {...}
}
```

**Update User Profile**
```
PUT /web/user-profiles/:id
Authorization: Bearer <clerk_session_token>
Content-Type: application/json

Request:
{
    "is_active": false,
    "preferences": {"theme": "dark"}
}

Response 200:
{
    "success": true,
    "message": "User profile updated successfully",
    "data": {...}
}
```

### 3.3 Roles

**List Roles**
```
GET /web/roles?page=1&limit=20
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "code": "ADMIN",
            "name": "Administrator",
            "hierarchy_level": 0,
            "is_system_role": true,
            "is_active": true
        }
    ]
}
```

**Get Role with Permissions**
```
GET /web/roles/:id/permissions
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "ADMIN",
        "name": "Administrator",
        "permissions": [
            {
                "id": "uuid",
                "code": "user:read:all",
                "name": "Read All Users",
                "resource": "user",
                "action": "READ"
            }
        ]
    }
}
```

**Assign Role to User**
```
POST /web/user-profiles/:userId/roles
Authorization: Bearer <clerk_session_token>
Content-Type: application/json

Request:
{
    "role_id": "role-uuid",
    "effective_from": "2024-01-15T00:00:00Z",
    "effective_until": null
}

Response 200:
{
    "success": true,
    "message": "Role assigned successfully"
}
```

### 3.4 Organization

**List Schools**
```
GET /web/schools?page=1&limit=20
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "code": "SMA1",
            "name": "SMA Gloria 1",
            "lokasi": "Jakarta",
            "is_active": true
        }
    ]
}
```

**Get Department Tree**
```
GET /web/departments/tree?school_id=uuid
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "code": "AKADEMIK",
            "name": "Bagian Akademik",
            "is_active": true,
            "children": [
                {
                    "id": "uuid",
                    "code": "KURIKULUM",
                    "name": "Sub Bagian Kurikulum",
                    "children": []
                }
            ]
        }
    ]
}
```

### 3.5 API Keys Management

**List API Keys (Current User)**
```
GET /web/api-keys
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "name": "HR Integration",
            "prefix": "glr_live",
            "last_four_chars": "a1b2",
            "last_used_at": "2024-01-15T10:00:00Z",
            "usage_count": 1500,
            "expires_at": "2025-01-15T00:00:00Z",
            "is_active": true
        }
    ]
}
```

**Create API Key**
```
POST /web/api-keys
Authorization: Bearer <clerk_session_token>
Content-Type: application/json

Request:
{
    "name": "HR Integration",
    "description": "API key for HR system",
    "permissions": ["employee:read", "department:read"],
    "rate_limit": 1000,
    "allowed_ips": ["192.168.1.100"],
    "expires_at": "2025-12-31T23:59:59Z"
}

Response 201:
{
    "success": true,
    "message": "API key created successfully",
    "data": {
        "id": "uuid",
        "name": "HR Integration",
        "key": "glr_live_xxxxxxxxxxxxxxxxxxxx",
        "prefix": "glr_live",
        "last_four_chars": "xxxx",
        "created_at": "2024-01-15T10:00:00Z"
    }
}
```

**Revoke API Key**
```
DELETE /web/api-keys/:id
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "message": "API key revoked successfully"
}
```

### 3.6 Audit Logs

**Query Audit Logs**
```
GET /web/audit-logs?page=1&limit=50&action=CREATE&module=user_management&start_date=2024-01-01
Authorization: Bearer <clerk_session_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "actor_id": "user_xxx",
            "actor_name": "John Doe",
            "action": "CREATE",
            "module": "user_management",
            "entity_type": "user_profile",
            "entity_id": "uuid",
            "entity_display": "Jane Smith",
            "created_at": "2024-01-15T10:00:00Z",
            "category": "USER_MANAGEMENT"
        }
    ],
    "meta": {
        "page": 1,
        "limit": 50,
        "total": 1000
    }
}
```

## 4. External API Endpoints (JWT Auth)

### 4.1 Employees

**List Employees**
```
GET /external/employees?page=1&limit=20&status_aktif=AKTIF
Authorization: Bearer <jwt_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "nip": "123456789012345",
            "nama": "John Doe",
            "email": "john@example.com",
            "bagian_kerja": "Akademik",
            "jenis_karyawan": "Tetap",
            "status_aktif": "AKTIF"
        }
    ],
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 500
    }
}
```

**Get Employee by NIP**
```
GET /external/employees/:nip
Authorization: Bearer <jwt_token>

Response 200:
{
    "success": true,
    "data": {
        "nip": "123456789012345",
        "nama": "John Doe",
        "jenis_kelamin": "L",
        "tgl_mulai_bekerja": "2020-01-15",
        "status": "Tetap",
        "bagian_kerja": "Akademik",
        "lokasi": "Jakarta",
        "bidang_kerja": "Pengajaran",
        "jenis_karyawan": "Guru",
        "status_aktif": "AKTIF",
        "email": "john@example.com",
        "no_ponsel": "081234567890"
    }
}
```

### 4.2 Organization Structure

**List Schools**
```
GET /external/schools
Authorization: Bearer <jwt_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "code": "SMA1",
            "name": "SMA Gloria 1",
            "lokasi": "Jakarta"
        }
    ]
}
```

**List Departments**
```
GET /external/departments?school_id=uuid
Authorization: Bearer <jwt_token>

Response 200:
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "code": "AKADEMIK",
            "name": "Bagian Akademik",
            "school_id": "uuid"
        }
    ]
}
```

## 5. Error Responses

### Standard Error Format
```json
{
    "success": false,
    "error": "Error message here"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid JSON, validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions, IP blocked |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Examples

**Validation Error (400)**
```json
{
    "success": false,
    "error": "validation error: nip must be exactly 15 characters"
}
```

**Unauthorized (401)**
```json
{
    "success": false,
    "error": "invalid or expired token"
}
```

**Forbidden (403)**
```json
{
    "success": false,
    "error": "insufficient permissions to access this resource"
}
```

**Not Found (404)**
```json
{
    "success": false,
    "error": "user profile not found"
}
```

**Rate Limited (429)**
```json
{
    "success": false,
    "error": "rate limit exceeded, try again in 60 seconds"
}
```

## 6. Pagination

### Request Parameters
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| page | int | 1 | - | Page number (1-indexed) |
| limit | int | 20 | 100 | Items per page |

### Response Meta
```json
{
    "success": true,
    "data": [...],
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "total_pages": 8
    }
}
```

## 7. Filtering & Sorting

### Filter Examples
```
GET /web/user-profiles?is_active=true
GET /web/roles?is_system_role=false
GET /web/audit-logs?action=CREATE&module=user_management
GET /external/employees?status_aktif=AKTIF&bagian_kerja=Akademik
```

### Date Range Filtering
```
GET /web/audit-logs?start_date=2024-01-01&end_date=2024-01-31
```

### Sorting (Future)
```
GET /web/user-profiles?sort=created_at&order=desc
```

## 8. Rate Limits

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Public | 100 req | 1 hour |
| Web | 1000 req | 1 hour |
| External | Per API Key | 1 hour |

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1705316400
```
