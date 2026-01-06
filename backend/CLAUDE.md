# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**My Gloria Backend** - Enterprise-grade Go backend for school management system implementing Clean Architecture with Domain-Driven Design principles.

- **Language**: Go 1.25.4
- **Framework**: Chi router
- **ORM**: GORM v2
- **Database**: PostgreSQL
- **Architecture**: Clean Architecture + Domain-Driven Design

## Development Commands

### Building & Running
```bash
make build              # Build binary to bin/my-gloria-backend
make run               # Run server directly (port 8080 by default)
go run cmd/server/main.go  # Alternative run command
```

### Testing
```bash
make test              # All tests with race detection
make test-unit         # Unit tests only (internal/...)
make test-integration  # Integration tests (test/integration/...)
make test-e2e          # End-to-end tests (test/e2e/...)
make coverage          # Generate coverage report (coverage/coverage.html)
```

### Code Quality
```bash
make fmt               # Format code with go fmt
make vet               # Run go vet
make lint              # Run golangci-lint (must be installed)
make all               # Run fmt, vet, lint, test, build
```

### Database Migrations
```bash
make migrate-up        # Apply all pending migrations
make migrate-down      # Rollback one migration
make migrate-create name=<migration_name>  # Create new migration
make migrate-force version=<N>  # Force migration version
```

Requires `golang-migrate` tool:
```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

### Docker
```bash
make docker-build      # Build Docker image
make docker-run        # Start docker-compose
make docker-stop       # Stop docker-compose
make docker-logs       # View logs
```

### Dependencies
```bash
make deps              # Download dependencies
make deps-update       # Update dependencies
make deps-tidy         # Tidy go.mod
make install-tools     # Install dev tools (golangci-lint, migrate, swag)
```

## Architecture Overview

### Clean Architecture Layers

**Domain Layer** (`internal/domain/`) - Core business entities with zero dependencies
- Organized by bounded contexts: identity, employee, organization, security, authorization, system, workflow
- Contains: entities, repository interfaces, domain services, value objects
- Files: `user_profile.go`, `role.go`, `permission.go`, `delegation.go`, `department.go`, `school.go`, etc.

**Application Layer** (planned: `internal/application/`)
- Use cases and business logic orchestration
- Service interfaces and implementations
- DTOs for inter-layer communication
- Not yet implemented in current codebase

**Infrastructure Layer** (`internal/infrastructure/`)
- Database implementations (`database/postgres.go` - connection, pooling, migration)
- Repository implementations (to be created in `persistence/`)
- External service adapters

**Interface Layer** (`internal/interfaces/` or handlers)
- HTTP handlers (`internal/handler/health.go`)
- Middleware (auth, RBAC, audit, rate limiting, CORS)
- Router configuration
- REST API implementation

### Current Structure
```
cmd/server/          - Main entry point (main.go)
internal/
  domain/            - 17 domain entities (user_profile, role, permission, etc.)
  infrastructure/    - Database connection & migration
  handler/           - HTTP handlers (currently minimal)
configs/             - YAML config files (dev.yaml) & loader
pkg/
  crypto/            - Argon2id password hashing (OWASP 2024 recommended)
  jwt/               - JWT token utilities
scripts/             - Shell scripts (migrate.sh, drop_all_tables.sql)
deployments/docker/  - Dockerfile, docker-compose.yml
```

## Configuration

Configuration is loaded from YAML files based on `APP_ENV` (defaults to `dev`):
- `configs/dev.yaml` - Development environment
- Environment variables override YAML values (see `.env.example`)

Key configuration areas:
- **App**: Port (8080), environment, debug mode
- **Database**: PostgreSQL connection, schema (`public`), connection pooling
- **JWT**: Secret, access token (15m), refresh token (168h)
- **Security**: Argon2id parameters (memory: 65536, iterations: 3, parallelism: 2)
- **CORS**: Allowed origins (localhost:3000, localhost:5173)

Configuration loading: `configs/loader.go` with `Load()` or `MustLoad()`

## Domain Entities & Authorization

### Key Domain Models
- **UserProfile** - Core user entity with authentication, profile, and employment data
- **Role** - Named permission containers (Admin, Teacher, Principal, etc.)
- **Permission** - Granular access rights (resource, action, scope)
- **Delegation** - PLT (Pelaksana Tugas) - temporary authority delegation
- **Position** - Organizational positions with inherent permissions
- **School** - School entities with hierarchical structure
- **Department** - Department organization within schools
- **DataKaryawan** - Employee records linked to user profiles

### Permission Resolution Order
1. Direct user permissions (highest priority)
2. Role-based permissions
3. Position-based permissions
4. Delegation permissions (PLT)
5. Apply temporal constraints (EffectiveFrom, EffectiveUntil)
6. Apply resource-specific scopes (ResourceID, ResourceType)
7. Consider IsActive flags at all levels

All domain models in `internal/domain/` use GORM and include:
- `Base` embedded struct (ID, timestamps, soft delete)
- Comprehensive business rules and validation
- Clear relationships via foreign keys

## Password Security

Uses **Argon2id** (OWASP 2024 recommended) instead of bcrypt:
- Memory-hard algorithm resistant to GPU/ASIC attacks
- Configurable security parameters
- PHC string format: `$argon2id$v=19$m=65536,t=3,p=2$saltBase64$hashBase64`

Usage:
```go
import "backend/pkg/crypto/crypto"

// Hash password
hash, err := crypto.HashPassword("password123", nil)

// Verify password
match, err := crypto.VerifyPassword("password123", hash)

// Check if rehash needed (after upgrading parameters)
needsRehash, err := crypto.NeedsRehash(existingHash, currentParams)
```

Target hash generation time: 100-200ms (dev), 500-1000ms (production)

## Database

- **GORM v2** for ORM with prepared statement caching
- **Connection pooling**: 25 max open, 5 idle, 5min lifetime
- **Auto-migration**: Run via `database.AutoMigrate(db)` in main.go
- **Schema**: Uses `public` schema (configurable via `DB_SCHEMA`)
- All models extend `domain.Base` (UUID ID, timestamps, soft delete)

Connection: `internal/infrastructure/database/postgres.go`

## Server Lifecycle

Main server (`cmd/server/main.go`):
1. Load configuration (YAML + env overrides)
2. Connect to database with connection pooling
3. Run auto-migration
4. Initialize handlers
5. Setup Chi router with middleware (RequestID, Logger, Recoverer, Timeout)
6. Start HTTP server with graceful shutdown (30s timeout)

Middleware stack:
- Request ID tracking
- Real IP extraction
- Logging
- Panic recovery
- 60s timeout per request

Health check: `GET /health`
API base: `/api/v1`

## Development Workflow

1. **Feature Development**:
   - Define entities in `internal/domain/` (following existing patterns)
   - Create repository interfaces in domain
   - Implement repositories in `internal/infrastructure/persistence/`
   - Create use cases in `internal/application/` (to be implemented)
   - Add HTTP handlers in `internal/interfaces/http/` or `internal/handler/`
   - Unit tests alongside code (`*_test.go`)

2. **Testing**:
   - Unit tests use `-short` flag and live in `internal/`
   - Integration tests in `test/integration/`
   - E2E tests in `test/e2e/`
   - All tests run with race detector (`-race`)

3. **Migration Workflow**:
   ```bash
   make migrate-create name=add_feature
   # Edit generated SQL files in migrations/
   make migrate-up
   ```

## Common Patterns

### Domain Entity Structure
All entities embed `domain.Base` and use GORM conventions:
```go
type Entity struct {
    Base
    Field1 string `gorm:"column:field1;type:varchar(100);not null" json:"field1"`
    // Relationships
    RelatedID uuid.UUID `gorm:"column:related_id;type:uuid;not null" json:"related_id"`
    Related   *Related  `gorm:"foreignKey:RelatedID;references:ID" json:"-"`
}
```

### Enums
Enums are defined as string types with constants in `internal/domain/enums.go`:
- Gender, BloodType, Religion, EmploymentStatus
- PermissionAction, PermissionResource
- UserStatus, AuditAction, etc.

### Timestamps
All times are stored as UTC (`NowFunc` configured in GORM). Models include:
- `CreatedAt`, `UpdatedAt` (automatic GORM)
- `DeletedAt` (soft delete)
- Custom timestamp fields (e.g., `EffectiveFrom`, `EffectiveUntil`)

## Important Notes

- **No application layer yet**: Business logic currently lives in domain models
- **No middleware implemented**: Auth, RBAC, audit middleware planned but not created
- **Auto-migration used**: Production should use versioned migrations (migrations/ folder)
- **Configuration**: Prefers YAML files over env vars, but supports both
- **Port**: Default 8080 (configurable via `APP_PORT` env or YAML)
- **Schema**: Currently uses `public` schema
