# Gloria Backend - Architecture Overview

## 1. Ringkasan Sistem

Gloria Backend adalah sistem backend untuk Yayasan Pendidikan yang mengelola:
- Manajemen pengguna dan karyawan
- Struktur organisasi (sekolah, departemen, posisi)
- Sistem otorisasi berbasis role (RBAC)
- Akses API untuk sistem eksternal

## 2. Arsitektur Layer

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Request                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Middleware Layer                         │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  CORS   │  │ Logger  │  │   Auth   │  │  RateLimit   │  │
│  └─────────┘  └─────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Handler Layer                           │
│         (HTTP request/response, input validation)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│            (Business logic, domain errors)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│              (Database operations via GORM)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                              │
│    ┌──────────────────┐    ┌──────────────────┐            │
│    │  gloria_master   │    │    gloria_ops    │            │
│    │  (Data Karyawan) │    │  (Operasional)   │            │
│    └──────────────────┘    └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 3. Database Schema

### 3.1 gloria_master (Read-Only Reference)
- `data_karyawan` - Data master karyawan (NIP sebagai primary key)

### 3.2 gloria_ops (Operational Data)
**Organisasi:**
- `schools` - Data sekolah/unit pendidikan
- `departments` - Departemen/bagian (hierarchical)
- `positions` - Jabatan
- `position_hierarchy` - Struktur pelaporan jabatan

**User & Access:**
- `user_profiles` - Profil pengguna (link ke Clerk & data_karyawan)
- `user_roles` - Penugasan role ke user
- `user_positions` - Penugasan jabatan ke user
- `user_permissions` - Permission langsung ke user

**Roles & Permissions:**
- `roles` - Definisi role (hierarchical)
- `role_hierarchy` - Struktur hierarki role
- `permissions` - Definisi permission
- `role_permissions` - Permission yang diberikan ke role
- `module_permissions` - Permission per module

**Modules:**
- `modules` - Definisi modul sistem (hierarchical)
- `role_module_access` - Akses modul per role
- `user_module_access` - Akses modul per user

**API & Security:**
- `api_keys` - API key untuk akses eksternal
- `audit_logs` - Log audit aktivitas
- `delegations` - Delegasi wewenang

**System:**
- `feature_flags` - Feature flags
- `workflows` - Definisi workflow
- `system_configurations` - Konfigurasi sistem

## 4. Struktur Direktori

```
backend/
├── cmd/
│   └── api/
│       └── main.go              # Entry point
│
├── internal/
│   ├── config/
│   │   ├── config.go            # Environment configuration
│   │   └── database.go          # Database connection
│   │
│   ├── domain/                   # Entity definitions & DTOs
│   │   ├── base.go              # Base models
│   │   ├── enums.go             # Enum types
│   │   ├── user_profile.go
│   │   ├── role.go
│   │   ├── permission.go
│   │   └── ...
│   │
│   ├── repository/              # Data access layer
│   │   └── *_repository.go
│   │
│   ├── service/                 # Business logic layer
│   │   └── *_service.go
│   │
│   ├── handler/                 # HTTP handler layer
│   │   ├── response.go          # Standard response format
│   │   └── *_handler.go
│   │
│   ├── middleware/              # HTTP middlewares
│   │   ├── cors.go
│   │   ├── logger.go
│   │   └── auth_*.go
│   │
│   └── database/
│       └── migrations.go        # Custom migrations
│
├── docs/                        # Documentation
│
└── go.mod
```

## 5. Konvensi Kode

### 5.1 Naming Conventions
- **Files**: snake_case (`user_repository.go`)
- **Packages**: lowercase (`repository`, `service`)
- **Interfaces**: PascalCase dengan suffix deskriptif (`UserProfileRepository`)
- **Structs**: PascalCase (`UserProfile`)

### 5.2 Layer Responsibilities

| Layer | Responsibility | Tidak Boleh |
|-------|---------------|-------------|
| Handler | HTTP concerns, input validation, response formatting | Business logic, direct DB access |
| Service | Business logic, domain errors, orchestration | HTTP concerns, direct SQL |
| Repository | Database operations, query building | Business logic, HTTP concerns |
| Domain | Entity definitions, DTOs, validation tags | Logic implementation |

### 5.3 Error Handling
```go
// Domain errors defined in service layer
var (
    ErrUserProfileNotFound = errors.New("user profile not found")
    ErrNIPExists           = errors.New("NIP already exists")
)

// Service returns domain error
if errors.Is(err, gorm.ErrRecordNotFound) {
    return nil, ErrUserProfileNotFound
}

// Handler translates to HTTP status
if errors.Is(err, service.ErrUserProfileNotFound) {
    ErrorResponse(c, http.StatusNotFound, err.Error())
    return
}
```

### 5.4 Response Format
```json
{
    "success": true,
    "message": "Operation successful",
    "data": { ... }
}

{
    "success": false,
    "error": "Error message"
}
```

## 6. Dependencies

| Package | Purpose |
|---------|---------|
| gin-gonic/gin | HTTP framework |
| gorm.io/gorm | ORM |
| gorm.io/driver/postgres | PostgreSQL driver |
| google/uuid | UUID generation |
| clerk/clerk-sdk-go/v2 | Clerk authentication |
| golang-jwt/jwt/v5 | JWT handling |

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SERVER_PORT | 8080 | Server port |
| DB_HOST | localhost | Database host |
| DB_PORT | 3479 | Database port |
| DB_USER | postgres | Database user |
| DB_PASSWORD | mydevelopment | Database password |
| DB_NAME | new_gloria_db | Database name |
| DB_SSLMODE | disable | SSL mode |
| RUN_MIGRATIONS | true | Auto-migrate on startup |
