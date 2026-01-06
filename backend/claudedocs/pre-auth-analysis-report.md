# Laporan Analisis Backend - Traditional Structure

**Tanggal**: 6 Januari 2026
**Analisis Untuk**: My Gloria Backend (Traditional MVC Structure)
**Status**: 🟡 **SIAP UNTUK BUILD** - Models ready, perlu build API handlers

---

## 📊 Executive Summary

Backend menggunakan **Traditional MVC approach** dengan domain models flat yang sudah production-ready. Semua 16 domain models sudah memiliki GORM tags dan siap digunakan. Server minimal sudah jalan dengan database connection.

**Yang perlu dibangun**: API handlers, business logic services, dan endpoints untuk authentication dan CRUD operations.

### Skor Kesiapan per Komponen

| Komponen | Kesiapan | Status | Keterangan |
|----------|----------|--------|------------|
| **Domain Models** | 100% | ✅ Siap | 16 models dengan GORM tags lengkap |
| **Database** | 90% | ✅ Siap | Connection ready, migrations tersedia |
| **HTTP Server** | 30% | 🟡 Basic | Chi router + health check |
| **API Handlers** | 0% | 🔴 Kosong | Belum ada auth/CRUD endpoints |
| **Business Logic** | 0% | 🔴 Kosong | Belum ada service layer |
| **Configuration** | 90% | ✅ Siap | Comprehensive config ready |

**Overall Readiness: 50%** - Foundation solid, perlu build API layer

---

## ✅ What's Working

### 1. Domain Models (100% Ready)

**Lokasi**: `internal/domain/`

**16 Models Available**:
```
✅ user_profile.go       - Authentication & user data
✅ data_karyawan.go      - Employee master data
✅ role.go               - User roles
✅ permission.go         - System permissions
✅ position.go           - Job positions
✅ school.go             - School master data
✅ department.go         - Department structure
✅ audit.go              - Audit logging
✅ api_key.go            - API key management
✅ delegation.go         - Delegation (PLT)
✅ workflow.go           - Workflow definitions
✅ module.go             - Module configuration
✅ feature_flag.go       - Feature toggles
✅ system_config.go      - System settings
✅ enums.go              - Enums and constants
✅ base.go               - Base model utilities
```

**Semua models sudah**:
- ✅ GORM struct tags (`gorm:"..."`, `json:"..."`)
- ✅ `TableName()` method
- ✅ Business methods (validation, state management)
- ✅ Proper relationships (foreign keys, associations)
- ✅ Package `domain` - flat structure, no subfolders

### 2. Database Infrastructure (90% Ready)

**File**: `internal/infrastructure/database/postgres.go`

✅ **Connection Management**:
```go
func NewPostgresDB(cfg *configs.DatabaseConfig) (*gorm.DB, error)
func Close(db *gorm.DB) error
```

✅ **Connection Pooling** configured:
- MaxOpenConns: 25
- MaxIdleConns: 5
- ConnMaxLifetime: 5 minutes

✅ **Migrations Available**:
```
migrations/000001_create_users_table.up.sql
migrations/000002_create_data_karyawan_table.up.sql
```

### 3. HTTP Server (30% Basic)

**File**: `cmd/server/main.go`

✅ **What's working**:
- Chi router setup
- Health check endpoint (`/health`)
- Graceful shutdown
- Middleware: RequestID, Logger, Recoverer, Timeout
- Database connection on startup

❌ **What's missing**:
- No authentication endpoints
- No CRUD endpoints
- No JWT middleware
- No business logic services

### 4. Security Utilities (100% Ready)

**File**: `pkg/crypto/crypto/password.go`

✅ **Argon2id Implementation**:
- OWASP 2024 recommended parameters
- Memory: 64MB, Iterations: 3, Threads: 2
- Constant-time comparison
- Production-ready

**File**: `pkg/jwt/jwt.go` (⚠️ Check if exists)

---

## 🔴 What's Missing (Critical)

### 1. Authentication System

**Endpoints yang perlu dibuat**:
```
❌ POST /api/v1/auth/register    - User registration
❌ POST /api/v1/auth/login       - User login
❌ POST /api/v1/auth/refresh     - Refresh token
❌ POST /api/v1/auth/logout      - Logout user
❌ GET  /api/v1/auth/me          - Get current user
```

**Components needed**:
```
❌ handlers/auth_handler.go      - Auth HTTP handlers
❌ services/auth_service.go      - Auth business logic
❌ middleware/jwt_auth.go        - JWT validation middleware
❌ pkg/jwt/jwt.go                - JWT utilities (if not exists)
```

### 2. User Management CRUD

**Endpoints yang perlu dibuat**:
```
❌ GET    /api/v1/users          - List users (paginated)
❌ GET    /api/v1/users/:id      - Get user by ID
❌ PUT    /api/v1/users/:id      - Update user
❌ DELETE /api/v1/users/:id      - Delete user (soft)
❌ GET    /api/v1/users/:id/roles - Get user roles
```

### 3. Employee Management CRUD

**Endpoints yang perlu dibuat**:
```
❌ GET    /api/v1/employees      - List employees (paginated)
❌ GET    /api/v1/employees/:nip - Get employee by NIP
❌ POST   /api/v1/employees      - Create employee
❌ PUT    /api/v1/employees/:nip - Update employee
❌ DELETE /api/v1/employees/:nip - Delete employee (soft)
```

### 4. Missing Dependencies

**Check apakah sudah ada**:
```bash
# JWT library
github.com/golang-jwt/jwt/v5

# Validator
github.com/go-playground/validator/v10

# Structured logging (optional)
github.com/sirupsen/logrus atau go.uber.org/zap
```

**Install jika belum**:
```bash
go get github.com/golang-jwt/jwt/v5
go get github.com/go-playground/validator/v10
```

---

## 🎯 Implementation Roadmap

### PHASE 1: JWT & Authentication Basics (4-6 jam)

#### 1.1 Create JWT Utility (if not exists)

**File**: `pkg/jwt/jwt.go`
```go
package jwt

import (
	"time"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	NIP    string    `json:"nip"`
	jwt.RegisteredClaims
}

type Utility struct {
	secret             string
	accessTokenExpiry  time.Duration
	refreshTokenExpiry time.Duration
}

func NewUtility(secret string, accessExp, refreshExp time.Duration) *Utility {
	return &Utility{
		secret:             secret,
		accessTokenExpiry:  accessExp,
		refreshTokenExpiry: refreshExp,
	}
}

func (u *Utility) GenerateAccessToken(userID uuid.UUID, email, nip string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		NIP:    nip,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(u.accessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(u.secret))
}

func (u *Utility) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(u.secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrTokenInvalidClaims
}
```

#### 1.2 Create Auth Service

**File**: `internal/services/auth_service.go`
```go
package services

import (
	"context"
	"errors"
	"backend/internal/domain"
	"backend/pkg/jwt"
	"backend/pkg/crypto/crypto"
	"gorm.io/gorm"
)

type AuthService struct {
	db      *gorm.DB
	jwtUtil *jwt.Utility
}

func NewAuthService(db *gorm.DB, jwtUtil *jwt.Utility) *AuthService {
	return &AuthService{db: db, jwtUtil: jwtUtil}
}

// RegisterRequest represents registration input
type RegisterRequest struct {
	NIP      string `json:"nip" validate:"required,len=15"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginRequest represents login input
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse represents auth response with tokens
type AuthResponse struct {
	AccessToken  string               `json:"access_token"`
	RefreshToken string               `json:"refresh_token"`
	ExpiresIn    int64                `json:"expires_in"`
	User         *domain.UserProfile  `json:"user"`
}

func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// 1. Check if user exists
	var existing domain.UserProfile
	err := s.db.Where("email = ? OR nip = ?", req.Email, req.NIP).First(&existing).Error
	if err == nil {
		return nil, errors.New("user already exists")
	}

	// 2. Hash password
	hashedPassword, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// 3. Create user
	user := &domain.UserProfile{
		NIP:          req.NIP,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		IsActive:     true,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	// 4. Generate tokens
	accessToken, err := s.jwtUtil.GenerateAccessToken(user.ID, user.Email, user.NIP)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken: accessToken,
		ExpiresIn:   900, // 15 minutes
		User:        user,
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	// 1. Find user
	var user domain.UserProfile
	err := s.db.Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// 2. Check if locked
	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		return nil, errors.New("account is locked")
	}

	// 3. Verify password
	valid, err := crypto.VerifyPassword(user.PasswordHash, req.Password)
	if err != nil || !valid {
		// Increment failed attempts
		user.FailedLoginAttempts++
		if user.FailedLoginAttempts >= 5 {
			locked := time.Now().Add(15 * time.Minute)
			user.LockedUntil = &locked
		}
		s.db.Save(&user)
		return nil, errors.New("invalid credentials")
	}

	// 4. Reset failed attempts
	user.FailedLoginAttempts = 0
	user.LockedUntil = nil
	now := time.Now()
	user.LastActive = &now
	s.db.Save(&user)

	// 5. Generate tokens
	accessToken, err := s.jwtUtil.GenerateAccessToken(user.ID, user.Email, user.NIP)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken: accessToken,
		ExpiresIn:   900,
		User:        &user,
	}, nil
}
```

#### 1.3 Create Auth Handler

**File**: `internal/handlers/auth_handler.go`
```go
package handlers

import (
	"encoding/json"
	"net/http"
	"backend/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req services.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.authService.Register(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, resp)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req services.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.authService.Login(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// Helper functions
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error": map[string]string{
			"message": message,
		},
	})
}
```

#### 1.4 Create JWT Middleware

**File**: `internal/middleware/auth_middleware.go`
```go
package middleware

import (
	"context"
	"net/http"
	"strings"
	"backend/pkg/jwt"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const UserEmailKey contextKey = "user_email"

func JWTAuth(jwtUtil *jwt.Utility) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing authorization header", http.StatusUnauthorized)
				return
			}

			// Remove "Bearer " prefix
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == authHeader {
				http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
				return
			}

			// Validate token
			claims, err := jwtUtil.ValidateToken(tokenString)
			if err != nil {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			// Inject user info into context
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserEmailKey, claims.Email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

#### 1.5 Update main.go

**File**: `cmd/server/main.go`
```go
func main() {
	// ... existing code ...

	// Initialize JWT utility
	jwtUtil := jwt.NewUtility(
		cfg.JWT.Secret,
		cfg.JWT.AccessTokenExpiry,
		cfg.JWT.RefreshTokenExpiry,
	)

	// Initialize services
	authService := services.NewAuthService(db, jwtUtil)

	// Initialize handlers
	healthHandler := handler.NewHealthHandler()
	authHandler := handlers.NewAuthHandler(authService)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Public endpoints
	r.Get("/health", healthHandler.HandleHealth)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Auth endpoints (public)
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)

		// Protected endpoints
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtUtil))

			r.Get("/auth/me", authHandler.GetMe) // TODO: implement
			r.Post("/auth/logout", authHandler.Logout) // TODO: implement

			// User endpoints
			// r.Get("/users", userHandler.List)
			// r.Get("/users/:id", userHandler.Get)

			// Employee endpoints
			// r.Get("/employees", employeeHandler.List)
		})
	})

	// ... rest of server code ...
}
```

---

### PHASE 2: User & Employee CRUD (6-8 jam)

#### 2.1 User Service
**File**: `internal/services/user_service.go`

CRUD operations: List, Get, Update, Delete

#### 2.2 Employee Service
**File**: `internal/services/employee_service.go`

CRUD operations: List, Get, Create, Update, Delete

#### 2.3 Handlers
**Files**:
- `internal/handlers/user_handler.go`
- `internal/handlers/employee_handler.go`

---

### PHASE 3: Role & Permission Management (4-6 jam)

RBAC implementation untuk authorization

---

## 📋 Implementation Checklist

### ✅ Phase 1: Authentication (Must Have untuk MVP)

- [ ] **JWT Utility**
  - [ ] Create `pkg/jwt/jwt.go`
  - [ ] GenerateAccessToken method
  - [ ] ValidateToken method

- [ ] **Auth Service**
  - [ ] Create `internal/services/auth_service.go`
  - [ ] Register method
  - [ ] Login method
  - [ ] Failed login tracking
  - [ ] Account lockout logic

- [ ] **Auth Handler**
  - [ ] Create `internal/handlers/auth_handler.go`
  - [ ] POST /auth/register endpoint
  - [ ] POST /auth/login endpoint
  - [ ] Response helper functions

- [ ] **JWT Middleware**
  - [ ] Create `internal/middleware/auth_middleware.go`
  - [ ] Token extraction from header
  - [ ] Token validation
  - [ ] User context injection

- [ ] **Integration**
  - [ ] Update main.go with auth routes
  - [ ] Wire dependencies
  - [ ] Test register flow
  - [ ] Test login flow
  - [ ] Test protected endpoint

### 🔄 Phase 2: User & Employee CRUD (Nice to Have)

- [ ] User service + handlers
- [ ] Employee service + handlers
- [ ] Pagination utilities
- [ ] Query filtering

### 🔐 Phase 3: Authorization (Future)

- [ ] Role management
- [ ] Permission checking
- [ ] RBAC middleware

---

## ⏱️ Time Estimates

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | JWT + Auth endpoints | 4-6 hours |
| **Phase 2** | User + Employee CRUD | 6-8 hours |
| **Phase 3** | RBAC implementation | 4-6 hours |
| **Total** | MVP Complete | **14-20 hours** |

---

## 🎯 Current vs Target State

### Current State (50% Ready)
```
✅ Domain models (16 files) - 100%
✅ Database connection - 90%
✅ HTTP server basic - 30%
✅ Security utilities - 100%
❌ API endpoints - 0%
❌ Business logic - 0%
```

### Target State (MVP Complete)
```
✅ All above
✅ Authentication endpoints (register, login)
✅ JWT middleware for protected routes
✅ User CRUD endpoints
✅ Employee CRUD endpoints
✅ Basic error handling
```

---

## 📝 Notes

**Approach**: Traditional MVC structure
- Models = Domain models dengan GORM
- Services = Business logic layer
- Handlers = HTTP handlers (Controllers)
- No Clean Architecture complexity
- Simple, straightforward, easy to understand

**Keuntungan**:
- ✅ Less abstraction, lebih cepat develop
- ✅ Easy to understand untuk team
- ✅ Domain models sudah production-ready
- ✅ Database infrastructure solid

**Trade-offs**:
- ⚠️ Less separation of concerns
- ⚠️ Harder to unit test (tightly coupled to DB)
- ⚠️ Business logic bisa tercampur di handlers

**Recommended next**: Build Phase 1 authentication terlebih dahulu untuk proof of concept.

---

**Prepared by**: Claude Sonnet 4.5
**Analysis Date**: 6 Januari 2026
**Structure**: Traditional MVC with flat domain models
