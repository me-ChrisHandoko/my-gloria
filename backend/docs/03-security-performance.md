# Gloria Backend - Security & Performance Guidelines

## 1. Security Architecture

### 1.1 Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Layers                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Network                                                │
│  ├── HTTPS only (TLS 1.2+)                                      │
│  ├── CORS configuration                                          │
│  └── IP whitelisting (API Keys)                                 │
│                                                                  │
│  Layer 2: Authentication                                         │
│  ├── Clerk (session-based for web)                              │
│  ├── JWT (stateless for API)                                    │
│  └── API Key validation                                          │
│                                                                  │
│  Layer 3: Authorization                                          │
│  ├── Permission-based access control                            │
│  ├── Role hierarchy                                              │
│  └── Scope-based data filtering                                 │
│                                                                  │
│  Layer 4: Application                                            │
│  ├── Input validation                                           │
│  ├── SQL injection prevention (GORM parameterized)              │
│  └── Rate limiting                                               │
│                                                                  │
│  Layer 5: Data                                                   │
│  ├── Encryption at rest (database level)                        │
│  ├── Sensitive data hashing (API keys, passwords)               │
│  └── Audit logging                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Input Validation

**Gin Binding Tags (sudah digunakan):**
```go
type CreateUserProfileRequest struct {
    ClerkUserID string `json:"clerk_user_id" binding:"required,min=1,max=100"`
    NIP         string `json:"nip" binding:"required,len=15"`
}
```

**Custom Validators:**
```go
// internal/validator/validators.go

func RegisterCustomValidators(v *validator.Validate) {
    v.RegisterValidation("nip", validateNIP)
    v.RegisterValidation("uuid", validateUUID)
    v.RegisterValidation("permission_code", validatePermissionCode)
}

func validateNIP(fl validator.FieldLevel) bool {
    nip := fl.Field().String()
    // NIP format: 15 characters, alphanumeric
    return len(nip) == 15 && regexp.MustCompile(`^[A-Z0-9]+$`).MatchString(nip)
}
```

### 1.3 SQL Injection Prevention

GORM sudah menggunakan parameterized queries:
```go
// AMAN - parameterized
db.Where("clerk_user_id = ?", clerkUserID).First(&profile)

// BERBAHAYA - string concatenation (JANGAN GUNAKAN)
db.Where("clerk_user_id = '" + clerkUserID + "'").First(&profile)
```

### 1.4 Sensitive Data Handling

**API Key Hashing (Argon2id):**
```go
// internal/util/crypto.go

import "golang.org/x/crypto/argon2"

type Argon2Params struct {
    Memory      uint32
    Iterations  uint32
    Parallelism uint8
    SaltLength  uint32
    KeyLength   uint32
}

var DefaultParams = &Argon2Params{
    Memory:      64 * 1024, // 64MB
    Iterations:  3,
    Parallelism: 2,
    SaltLength:  16,
    KeyLength:   32,
}

func HashAPIKey(plainKey string) (string, error) {
    salt := generateRandomBytes(DefaultParams.SaltLength)
    hash := argon2.IDKey(
        []byte(plainKey),
        salt,
        DefaultParams.Iterations,
        DefaultParams.Memory,
        DefaultParams.Parallelism,
        DefaultParams.KeyLength,
    )
    // Encode as: $argon2id$v=19$m=65536,t=3,p=2$<salt>$<hash>
    return encodeHash(hash, salt, DefaultParams), nil
}

func VerifyAPIKey(plainKey, encodedHash string) bool {
    params, salt, hash, err := decodeHash(encodedHash)
    if err != nil {
        return false
    }
    compareHash := argon2.IDKey(
        []byte(plainKey),
        salt,
        params.Iterations,
        params.Memory,
        params.Parallelism,
        params.KeyLength,
    )
    return subtle.ConstantTimeCompare(hash, compareHash) == 1
}
```

### 1.5 JWT Security

```go
// internal/config/jwt.go

type JWTConfig struct {
    SecretKey     string        // Minimal 256-bit
    Issuer        string        // "gloria-api"
    Audience      []string      // ["gloria-web", "gloria-external"]
    AccessExpiry  time.Duration // 1 hour
    RefreshExpiry time.Duration // 7 days
}

// JWT signing
func GenerateToken(claims *JWTClaims, config *JWTConfig) (string, error) {
    claims.IssuedAt = jwt.NewNumericDate(time.Now())
    claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(config.AccessExpiry))
    claims.Issuer = config.Issuer
    claims.ID = uuid.New().String() // Unique token ID

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(config.SecretKey))
}

// JWT validation
func ValidateToken(tokenString string, config *JWTConfig) (*JWTClaims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{},
        func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method")
            }
            return []byte(config.SecretKey), nil
        },
        jwt.WithIssuer(config.Issuer),
        jwt.WithExpirationRequired(),
    )
    if err != nil {
        return nil, err
    }
    claims, ok := token.Claims.(*JWTClaims)
    if !ok || !token.Valid {
        return nil, errors.New("invalid token")
    }
    return claims, nil
}
```

## 2. Rate Limiting

### 2.1 Implementation

```go
// internal/middleware/rate_limit.go

import "golang.org/x/time/rate"

type RateLimiter struct {
    limiters sync.Map // map[string]*rate.Limiter
    mu       sync.Mutex
    rate     rate.Limit
    burst    int
}

func NewRateLimiter(requestsPerHour int) *RateLimiter {
    return &RateLimiter{
        rate:  rate.Limit(float64(requestsPerHour) / 3600), // per second
        burst: requestsPerHour / 10,                        // 10% burst
    }
}

func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
    if limiter, exists := rl.limiters.Load(key); exists {
        return limiter.(*rate.Limiter)
    }
    rl.mu.Lock()
    defer rl.mu.Unlock()
    limiter := rate.NewLimiter(rl.rate, rl.burst)
    rl.limiters.Store(key, limiter)
    return limiter
}

func RateLimit(defaultLimit int) gin.HandlerFunc {
    globalLimiter := NewRateLimiter(defaultLimit)

    return func(c *gin.Context) {
        authCtx := GetAuthContext(c)
        if authCtx == nil {
            c.Next()
            return
        }

        var limiter *rate.Limiter
        var key string

        // Per API Key limit if available
        if authCtx.APIKeyID != "" {
            key = "apikey:" + authCtx.APIKeyID
            // Could also get custom limit from API Key
        } else {
            key = "user:" + authCtx.UserID
        }

        limiter = globalLimiter.getLimiter(key)

        if !limiter.Allow() {
            c.Header("Retry-After", "60")
            c.Header("X-RateLimit-Limit", strconv.Itoa(defaultLimit))
            c.Header("X-RateLimit-Remaining", "0")
            ErrorResponse(c, 429, "rate limit exceeded")
            c.Abort()
            return
        }

        c.Next()
    }
}
```

### 2.2 Rate Limit Headers

```
X-RateLimit-Limit: 1000        # Total requests allowed
X-RateLimit-Remaining: 850     # Requests remaining
X-RateLimit-Reset: 1705312800  # Unix timestamp when limit resets
Retry-After: 60                # Seconds to wait (only on 429)
```

## 3. Performance Optimizations

### 3.1 Database Query Optimization

**Selective Preloading:**
```go
// BAD: Load everything
db.Preload(clause.Associations).Find(&profiles)

// GOOD: Load only what's needed
db.Preload("DataKaryawan").Find(&profiles)

// BETTER: Conditional preloading
db.Preload("UserRoles", "is_active = ?", true).
   Preload("UserRoles.Role").
   Find(&profiles)
```

**Pagination:**
```go
// internal/repository/base.go

type PaginationParams struct {
    Page  int `form:"page,default=1" binding:"min=1"`
    Limit int `form:"limit,default=20" binding:"min=1,max=100"`
}

func (p *PaginationParams) Offset() int {
    return (p.Page - 1) * p.Limit
}

func Paginate(params *PaginationParams) func(db *gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        return db.Offset(params.Offset()).Limit(params.Limit)
    }
}

// Usage
db.Scopes(Paginate(&params)).Find(&profiles)
```

**Index Usage:**
```go
// Domain models sudah memiliki index
type Permission struct {
    ID       string           `gorm:"primaryKey"`
    Code     string           `gorm:"uniqueIndex"`
    Resource string           `gorm:"index"`
    Action   PermissionAction `gorm:"index"`
}
```

### 3.2 Caching Strategy

```go
// internal/cache/permission_cache.go

import "github.com/patrickmn/go-cache"

type PermissionCache struct {
    cache *cache.Cache
}

func NewPermissionCache() *PermissionCache {
    return &PermissionCache{
        cache: cache.New(5*time.Minute, 10*time.Minute),
    }
}

func (pc *PermissionCache) GetUserPermissions(userID string) ([]string, bool) {
    key := "perms:" + userID
    if val, found := pc.cache.Get(key); found {
        return val.([]string), true
    }
    return nil, false
}

func (pc *PermissionCache) SetUserPermissions(userID string, permissions []string) {
    key := "perms:" + userID
    pc.cache.Set(key, permissions, cache.DefaultExpiration)
}

func (pc *PermissionCache) InvalidateUser(userID string) {
    key := "perms:" + userID
    pc.cache.Delete(key)
}
```

### 3.3 Connection Pooling

```go
// internal/config/database.go

func InitDB(cfg *Config) (*gorm.DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
        cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword,
        cfg.DBName, cfg.DBSSLMode, cfg.DBTimezone,
    )

    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Warn),
    })
    if err != nil {
        return nil, err
    }

    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    // Connection pool settings
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)

    return db, nil
}
```

### 3.4 Response Optimization

**ListResponse vs FullResponse Pattern:**
```go
// Untuk list: hanya field essential
type UserProfileListResponse struct {
    ID         string  `json:"id"`
    NIP        string  `json:"nip"`
    Name       *string `json:"name,omitempty"`
    IsActive   bool    `json:"is_active"`
}

// Untuk detail: semua field + relations
type UserProfileResponse struct {
    ID           string                    `json:"id"`
    ClerkUserID  string                    `json:"clerk_user_id"`
    NIP          string                    `json:"nip"`
    IsActive     bool                      `json:"is_active"`
    Preferences  *datatypes.JSON           `json:"preferences,omitempty"`
    DataKaryawan *DataKaryawanResponse     `json:"data_karyawan,omitempty"`
    Roles        []RoleListResponse        `json:"roles,omitempty"`
    Positions    []UserPositionResponse    `json:"positions,omitempty"`
    // ... more fields
}
```

## 4. Logging & Monitoring

### 4.1 Structured Logging

```go
// internal/middleware/logger.go

func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        c.Next()

        latency := time.Since(start)
        status := c.Writer.Status()

        // Structured log
        log.Printf(`{"time":"%s","method":"%s","path":"%s","status":%d,"latency":"%s","ip":"%s","user_agent":"%s"}`,
            time.Now().Format(time.RFC3339),
            c.Request.Method,
            path,
            status,
            latency,
            c.ClientIP(),
            c.Request.UserAgent(),
        )
    }
}
```

### 4.2 Error Tracking

```go
// internal/handler/response.go

func ErrorResponse(c *gin.Context, status int, err string) {
    // Log error details
    log.Printf(`{"level":"error","status":%d,"error":"%s","path":"%s","method":"%s","user":"%s"}`,
        status,
        err,
        c.Request.URL.Path,
        c.Request.Method,
        GetCurrentUserID(c),
    )

    c.JSON(status, Response{
        Success: false,
        Error:   err,
    })
}
```

## 5. Security Checklist

### 5.1 Pre-Production Checklist

- [ ] HTTPS enforced
- [ ] CORS properly configured (not *)
- [ ] JWT secret minimal 256-bit
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] API keys hashed with Argon2id
- [ ] Audit logging enabled
- [ ] Error messages don't leak internals
- [ ] Debug mode disabled

### 5.2 Endpoint Security Matrix

| Endpoint | Auth | Permission | Rate Limit | Audit |
|----------|------|------------|------------|-------|
| GET /health | None | None | Global | No |
| POST /auth/token | API Key | None | Strict | Yes |
| GET /web/me | Clerk | None | Standard | No |
| GET /web/users | Clerk | user:read | Standard | No |
| POST /web/users | Clerk | user:create | Standard | Yes |
| DELETE /web/users/:id | Clerk | user:delete | Standard | Yes |
| GET /external/employees | JWT | employee:read | Per-Key | No |

### 5.3 Environment Variables (Production)

```env
# CRITICAL - Must be set in production
CLERK_SECRET_KEY=sk_live_xxxxxxx
JWT_SECRET=<256-bit-random-string>

# Security settings
GIN_MODE=release
CORS_ALLOWED_ORIGINS=https://app.gloria.edu
RATE_LIMIT_DEFAULT=1000
RATE_LIMIT_STRICT=100

# Database
DB_SSLMODE=require
```

## 6. Troubleshooting

### 6.1 Common Security Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Token expired | 401 Unauthorized | Refresh token or re-authenticate |
| Invalid signature | 401 Unauthorized | Check JWT_SECRET consistency |
| Rate limited | 429 Too Many Requests | Wait for reset or increase limit |
| Permission denied | 403 Forbidden | Check user permissions/roles |
| IP blocked | 403 Forbidden | Check API key allowed_ips |

### 6.2 Performance Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Slow queries | High latency | Check indexes, use EXPLAIN ANALYZE |
| Memory leak | Growing memory | Check connection pool settings |
| N+1 queries | Many DB calls | Use Preload properly |
| Cache miss | High DB load | Implement caching layer |
