# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Go backend API for an education foundation management system (Gloria Ops). Built with Gin web framework, GORM ORM, and PostgreSQL. The project follows clean architecture principles with domain-driven design.

**Tech Stack:** Go 1.25.4 | Gin | GORM | PostgreSQL | JWT Authentication | Argon2 Password Hashing

## Key Dependencies

- **Gin** (github.com/gin-gonic/gin): HTTP web framework for building APIs
- **GORM** (gorm.io/gorm): ORM library for database operations
- **PostgreSQL Driver** (gorm.io/driver/postgres, github.com/jackc/pgx/v5): PostgreSQL database connectivity
- **JWT** (github.com/golang-jwt/jwt/v5): JSON Web Token authentication
- **UUID** (github.com/google/uuid): Unique identifier generation
- **Argon2** (golang.org/x/crypto/argon2): Password hashing
- **Validator** (github.com/go-playground/validator/v10): Struct and field validation
- **QUIC** (github.com/quic-go/quic-go): HTTP/3 support
- **Sonic** (github.com/bytedance/sonic): High-performance JSON serialization

## Development Commands

### Building and Running
```bash
# Build the project
go build -o bin/server

# Run the application
go run .

# Run with hot reload (requires air or similar tool)
# Install: go install github.com/air-verse/air@latest
air
```

### Testing
```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests in a specific package
go test ./pkg/package-name

# Run a specific test
go test -run TestFunctionName ./path/to/package

# Run tests with verbose output
go test -v ./...
```

### Code Quality
```bash
# Format code
go fmt ./...

# Run linter (requires golangci-lint)
# Install: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
golangci-lint run

# Vet code for common issues
go vet ./...

# Update dependencies
go mod tidy

# Verify dependencies
go mod verify
```

## Project Structure

```
my-gloria/
├── cmd/server/          # Application entry point
│   └── main.go          # Server initialization & routing
├── internal/            # Private application code
│   ├── models/          # Database models (GORM entities)
│   │   ├── base.go          # Base models with common fields
│   │   ├── user_profile.go  # User authentication & profiles
│   │   ├── school.go        # School/institution entities
│   │   ├── role.go          # RBAC roles
│   │   ├── permission.go    # RBAC permissions
│   │   ├── department.go    # Organization departments
│   │   ├── position.go      # Staff positions
│   │   ├── data_karyawan.go # Employee data
│   │   └── ...              # Other models (16 files total)
│   ├── database/        # Database connection & migrations
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # HTTP middleware (auth, logging, etc.)
│   ├── services/        # Business logic layer
│   ├── auth/            # Authentication utilities
│   └── utils/           # Helper functions
├── configs/             # Configuration management
├── docs/                # API documentation
└── pkg/                 # Public reusable packages
```

### Key Directories

- **`internal/models/`** - All GORM models with database schema definitions. These are the source of truth for data structure.
- **`internal/handlers/`** - HTTP handlers that receive requests and return responses.
- **`internal/services/`** - Business logic that handlers call. Keep handlers thin, services fat.
- **`internal/database/`** - Database initialization and migration management.

## Architecture Notes

### Gin Framework Patterns

The project uses Gin for HTTP routing. Typical patterns:

- Route handlers should be in `internal/handlers/` or similar
- Middleware should be in `internal/middleware/`
- Use Gin's binding for request validation with validator tags
- Leverage Sonic JSON for performance-critical serialization

### Database Layer (GORM + PostgreSQL)

**Schema:** `gloria_ops` (all tables use this PostgreSQL schema)

**Models Location:** `internal/models/` directory contains all GORM entity definitions

**Base Models:** All entities extend from base models in `internal/models/base.go`:
- `BaseModel` - ID, CreatedAt, UpdatedAt
- `BaseModelWithAudit` - Adds CreatedBy, ModifiedBy
- `BaseModelFull` - Full audit trail with soft delete
- `ActiveModel` - IsActive field for soft enable/disable
- `EffectiveDateModel` - Time-bound records with effective dates

**Key Domain Entities:**
- `User` (table: `users`) - Authentication, user accounts, JWT tokens
- `School` (table: `schools`) - Educational institutions
- `Department` (table: `departments`) - Organization departments
- `Position` (table: `positions`) - Staff positions/roles in organization
- `DataKaryawan` (table: `data_karyawan`) - Employee master data
- `Role` (table: `roles`) - RBAC roles
- `Permission` (table: `permissions`) - RBAC permissions
- `Module` (table: `modules`) - System modules for permission grouping
- `AuditLog` (table: `audit_logs`) - Full audit trail of system actions
- `RefreshToken` (table: `refresh_tokens`) - JWT refresh token management
- `LoginAttempt` (table: `login_attempts`) - Security tracking for login attempts

**Database Patterns:**
- UUID as primary keys (varchar(36))
- Soft deletes using GORM's DeletedAt
- Full audit trails (created_by, modified_by, deleted_by)
- Effective date ranges for time-bound records
- JSONB fields for flexible data (Preferences, Conditions)
- Foreign key constraints with CASCADE on delete

### Authentication Stack

**JWT-based authentication** with refresh token support:

- **Access Tokens**: Short-lived JWT tokens for API authentication
- **Refresh Tokens**: Long-lived tokens stored in database (`RefreshToken` model)
- **Password Hashing**: Argon2id for secure password storage in `User.PasswordHash`
- **Security Features**:
  - Failed login attempt tracking (`User.FailedLoginAttempts`)
  - Account locking (`User.LockedUntil`)
  - Email verification (`User.EmailVerified`)
  - Password reset tokens (`User.PasswordResetToken`)
  - Login attempt auditing (`LoginAttempt` model)

**User System:**
- `User` model handles authentication
- Role-based access control (RBAC) through `UserRole`, `UserPosition`, `UserPermission`
- Optional Clerk integration (supports migration from Clerk)

### RBAC (Role-Based Access Control)

**Multi-layered permission system:**

1. **Roles** (`Role` model): Named collections of permissions
   - Assigned to users via `UserRole` (with effective dates)

2. **Positions** (`Position` model): Organizational positions
   - Assigned to users via `UserPosition` (with effective dates)
   - Supports PLT (Pelaksana Tugas / Acting) positions
   - SK Number tracking for official appointments

3. **Direct Permissions** (`UserPermission` model): Override permissions
   - Can grant or revoke specific permissions
   - Priority-based resolution
   - Resource-level permissions (ResourceID, ResourceType)
   - Temporary permission support

4. **Permissions** (`Permission` model): Granular access rights
   - Organized by Module
   - Support for CRUD operations
   - Conditional permissions (JSONB conditions field)

**Permission Resolution:** UserPermission (highest priority) → Position → Role (lowest priority)

### HTTP/3 Support

The project includes QUIC support (github.com/quic-go/quic-go). If implementing HTTP/3:

- Configure both HTTP/1.1 and HTTP/3 listeners
- Handle TLS certificate requirements for QUIC
- Consider fallback mechanisms for clients without HTTP/3 support

## Development Notes

### Environment Setup

Copy `.env.example` to `.env` and configure:
```bash
# Database (PostgreSQL required)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=gloria_ops
DB_SSLMODE=disable

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-this-in-production

# Server
PORT=8080
ENV=development
```

### Important Conventions

- **UUIDs**: All primary keys are UUIDs (varchar(36))
- **Schema**: All tables reside in `gloria_ops` PostgreSQL schema
- **Effective Dates**: Use `EffectiveFrom`/`EffectiveUntil` for time-bound records
- **Soft Deletes**: Use GORM's DeletedAt, never hard delete user data
- **Audit Fields**: Always populate CreatedBy/ModifiedBy when available
- **JSONB**: Use for flexible/dynamic data (Preferences, Conditions, DeviceInfo)

### API Response Patterns

Models in `internal/models/` include `ToResponse()` and `ToListResponse()` methods:
- `ToResponse()` - Full detail for single entity
- `ToListResponse()` - Minimal data for list endpoints

**Example usage:**
```go
import "backend/internal/models"

user := &models.User{}
// ... fetch from database
response := user.ToResponse()
c.JSON(200, response)
```

Use these for consistent API responses!
