# Gloria Backend - Authentication Design

## 1. Overview

Sistem Gloria menggunakan **dual authentication** untuk mendukung dua jenis akses:

| Jalur | Metode | Use Case |
|-------|--------|----------|
| Web Utama | Clerk | User login via web application (SSO, session-based) |
| API Eksternal | JWT + API Key | Sistem eksternal mengakses API (stateless) |

## 2. Authentication Flow

### 2.1 Clerk Authentication (Web)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │────▶│  Clerk   │────▶│ Backend  │────▶│    DB    │
│          │     │  (Auth)  │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │  1. Login      │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │  2. Session    │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  3. API Request + Session Token │                │
     │─────────────────────────────────▶                │
     │                │                │                │
     │                │  4. Validate   │                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │                │  5. Get User   │
     │                │                │───────────────▶│
     │                │                │                │
     │  6. Response   │                │                │
     │◀─────────────────────────────────                │
```

**Flow:**
1. User login melalui Clerk (web interface)
2. Clerk memberikan session token
3. Frontend mengirim request dengan `Authorization: Bearer <session_token>`
4. Backend memvalidasi token dengan Clerk SDK
5. Backend mengambil user profile berdasarkan `clerk_user_id`
6. Request diproses dengan context user

### 2.2 JWT Authentication (External API)

```
┌──────────────┐     ┌──────────┐     ┌──────────┐
│   External   │────▶│ Backend  │────▶│    DB    │
│    System    │     │          │     │          │
└──────────────┘     └──────────┘     └──────────┘
      │                   │                │
      │ 1. Create API Key (one-time setup) │
      │──────────────────▶│                │
      │                   │───────────────▶│
      │◀──────────────────│                │
      │   API Key         │                │
      │                   │                │
      │ 2. Exchange Key   │                │
      │    for JWT        │                │
      │──────────────────▶│                │
      │◀──────────────────│                │
      │   JWT Token       │                │
      │                   │                │
      │ 3. API Request    │                │
      │   + JWT Token     │                │
      │──────────────────▶│                │
      │                   │ 4. Validate JWT│
      │                   │   (stateless)  │
      │◀──────────────────│                │
      │   Response        │                │
```

**Flow:**
1. Admin membuat API Key untuk sistem eksternal
2. Sistem eksternal menukar API Key dengan JWT token
3. JWT digunakan untuk semua request berikutnya
4. JWT divalidasi secara stateless (tidak perlu DB lookup)

## 3. Implementation Design

### 3.1 Auth Context

```go
// internal/middleware/auth_context.go

type AuthType string

const (
    AuthTypeClerk  AuthType = "clerk"
    AuthTypeJWT    AuthType = "jwt"
    AuthTypeAPIKey AuthType = "api_key"
)

type AuthContext struct {
    Type           AuthType
    UserID         string           // UserProfile.ID
    ClerkUserID    string           // Clerk user ID (if Clerk auth)
    APIKeyID       string           // API Key ID (if JWT/API Key auth)
    Permissions    []string         // Cached permissions
    Roles          []string         // Cached role codes
    Scope          PermissionScope  // OWN, DEPARTMENT, SCHOOL, ALL
}

// Context keys
const (
    AuthContextKey = "auth_context"
)

// Helper functions
func GetAuthContext(c *gin.Context) *AuthContext
func SetAuthContext(c *gin.Context, ctx *AuthContext)
func GetCurrentUserID(c *gin.Context) string
func HasPermission(c *gin.Context, permission string) bool
```

### 3.2 Clerk Middleware

```go
// internal/middleware/auth_clerk.go

func ClerkAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. Extract token from header
        token := extractBearerToken(c)
        if token == "" {
            ErrorResponse(c, 401, "missing authorization token")
            c.Abort()
            return
        }

        // 2. Validate with Clerk SDK
        claims, err := clerk.VerifyToken(token)
        if err != nil {
            ErrorResponse(c, 401, "invalid token")
            c.Abort()
            return
        }

        // 3. Get user profile from database
        userProfile, err := userProfileService.GetByClerkUserID(claims.Subject)
        if err != nil {
            ErrorResponse(c, 401, "user not found")
            c.Abort()
            return
        }

        // 4. Check if user is active
        if !userProfile.IsActive {
            ErrorResponse(c, 403, "user account is inactive")
            c.Abort()
            return
        }

        // 5. Load permissions and set context
        authCtx := &AuthContext{
            Type:        AuthTypeClerk,
            UserID:      userProfile.ID,
            ClerkUserID: claims.Subject,
            Permissions: loadUserPermissions(userProfile.ID),
            Roles:       loadUserRoles(userProfile.ID),
        }
        SetAuthContext(c, authCtx)

        c.Next()
    }
}
```

### 3.3 JWT Middleware

```go
// internal/middleware/auth_jwt.go

type JWTClaims struct {
    jwt.RegisteredClaims
    UserID      string   `json:"user_id"`
    APIKeyID    string   `json:"api_key_id"`
    Permissions []string `json:"permissions"`
}

func JWTAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. Extract token from header
        token := extractBearerToken(c)
        if token == "" {
            ErrorResponse(c, 401, "missing authorization token")
            c.Abort()
            return
        }

        // 2. Parse and validate JWT
        claims, err := validateJWT(token)
        if err != nil {
            ErrorResponse(c, 401, "invalid token")
            c.Abort()
            return
        }

        // 3. Set auth context (no DB lookup needed)
        authCtx := &AuthContext{
            Type:        AuthTypeJWT,
            UserID:      claims.UserID,
            APIKeyID:    claims.APIKeyID,
            Permissions: claims.Permissions,
        }
        SetAuthContext(c, authCtx)

        c.Next()
    }
}
```

### 3.4 Auth Service

```go
// internal/service/auth_service.go

type AuthService interface {
    // JWT operations
    GenerateJWT(apiKeyID string) (*TokenResponse, error)
    ValidateJWT(token string) (*JWTClaims, error)
    RefreshJWT(refreshToken string) (*TokenResponse, error)

    // API Key operations
    ValidateAPIKey(plainKey string) (*domain.ApiKey, error)
    ExchangeAPIKeyForJWT(plainKey string) (*TokenResponse, error)
}

type TokenResponse struct {
    AccessToken  string    `json:"access_token"`
    TokenType    string    `json:"token_type"`
    ExpiresIn    int       `json:"expires_in"`
    ExpiresAt    time.Time `json:"expires_at"`
    RefreshToken string    `json:"refresh_token,omitempty"`
}
```

## 4. Route Configuration

```go
// cmd/api/main.go

// Public routes (no auth)
public := api.Group("/public")
{
    public.GET("/health", healthHandler.Check)
    public.POST("/auth/token", authHandler.ExchangeToken) // API Key → JWT
}

// Web routes (Clerk auth)
web := api.Group("/web")
web.Use(middleware.ClerkAuth())
{
    web.GET("/me", userHandler.GetCurrentUser)
    web.GET("/user-profiles", userHandler.GetAll)
    // ... other web endpoints
}

// External API routes (JWT auth)
external := api.Group("/external")
external.Use(middleware.JWTAuth())
external.Use(middleware.RateLimit())
{
    external.GET("/employees", employeeHandler.GetAll)
    external.GET("/employees/:nip", employeeHandler.GetByNIP)
    // ... other external endpoints
}
```

## 5. API Key Management

### 5.1 Creating API Key (Admin Only)

```
POST /api/v1/web/api-keys
Authorization: Bearer <clerk_session_token>
Content-Type: application/json

{
    "name": "HR System Integration",
    "description": "API key for HR system to sync employee data",
    "permissions": ["employee:read", "department:read"],
    "rate_limit": 1000,
    "allowed_ips": ["192.168.1.100", "10.0.0.0/24"],
    "expires_at": "2025-12-31T23:59:59Z"
}
```

**Response (API Key hanya ditampilkan sekali):**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "name": "HR System Integration",
        "key": "glr_live_xxxxxxxxxxxxxxxxxxxx",
        "prefix": "glr_live",
        "last_four_chars": "xxxx",
        "created_at": "2024-01-15T10:00:00Z"
    }
}
```

### 5.2 Exchanging API Key for JWT

```
POST /api/v1/public/auth/token
Content-Type: application/json

{
    "api_key": "glr_live_xxxxxxxxxxxxxxxxxxxx"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "token_type": "Bearer",
        "expires_in": 3600,
        "expires_at": "2024-01-15T11:00:00Z"
    }
}
```

### 5.3 Using JWT Token

```
GET /api/v1/external/employees
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 6. JWT Token Structure

```json
{
    "header": {
        "alg": "HS256",
        "typ": "JWT"
    },
    "payload": {
        "iss": "gloria-api",
        "sub": "user-profile-id",
        "aud": ["gloria-external"],
        "exp": 1705312800,
        "iat": 1705309200,
        "jti": "unique-token-id",
        "user_id": "user-profile-id",
        "api_key_id": "api-key-id",
        "permissions": ["employee:read", "department:read"]
    }
}
```

## 7. Security Considerations

### 7.1 Token Security
- JWT expiry: 1 jam (configurable)
- API Key hash: Argon2id
- Refresh token: Opsional, 7 hari expiry

### 7.2 Rate Limiting
- Per API Key limit (stored in `api_keys.rate_limit`)
- Default: 1000 requests/hour
- Exceeded: HTTP 429 Too Many Requests

### 7.3 IP Whitelisting
- Per API Key (`api_keys.allowed_ips`)
- Empty = allow all
- Middleware checks client IP against whitelist

### 7.4 Audit Logging
- Login events: AuditActionLogin
- Token generation: Logged with metadata
- Failed attempts: Logged for security monitoring

## 8. Environment Variables

```env
# Clerk Configuration
CLERK_SECRET_KEY=sk_live_xxxxx

# JWT Configuration
JWT_SECRET=your-256-bit-secret
JWT_ISSUER=gloria-api
JWT_EXPIRY_HOURS=1

# Rate Limiting
RATE_LIMIT_DEFAULT=1000
RATE_LIMIT_WINDOW_HOURS=1
```
