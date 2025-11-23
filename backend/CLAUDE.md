# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
go run ./cmd/api             # Run development server (port 8080)
go build -o api ./cmd/api    # Build production binary
go test ./...                # Run all tests
go test -v ./internal/...    # Run tests with verbose output
go mod tidy                  # Sync dependencies
```

## Architecture

Layered architecture with dependency injection. All application code lives in `internal/` (Go compiler enforces this as private).

**Request flow:**
```
HTTP Request → Handler → Service → Repository → PostgreSQL
```

**Layer responsibilities:**
- `cmd/api/main.go` - Entry point, wires all dependencies
- `internal/handler/` - HTTP request/response, validation via Gin bindings
- `internal/service/` - Business logic, domain errors (e.g., `ErrUserNotFound`)
- `internal/repository/` - Database operations via GORM, defines interfaces
- `internal/domain/` - Entities with GORM tags, request/response DTOs
- `internal/config/` - Environment-based configuration with defaults
- `internal/middleware/` - CORS, request logging

**Adding a new resource:**
1. Define entity and DTOs in `internal/domain/`
2. Create repository interface and implementation in `internal/repository/`
3. Create service with business logic in `internal/service/`
4. Create handler in `internal/handler/`
5. Wire in `cmd/api/main.go` and add routes

## Database Configuration

PostgreSQL connection via environment variables (defaults in parentheses):
- `DB_HOST` (localhost), `DB_PORT` (3479), `DB_USER` (postgres)
- `DB_PASSWORD` (mydevelopment), `DB_NAME` (new_gloria_db)
- `SERVER_PORT` (8080)

Auto-migration runs on startup for all domain entities.

## Key Patterns

- Repository interfaces enable mocking for tests
- Services return domain-specific errors, handlers translate to HTTP status codes
- Password hashing via bcrypt in service layer
- Soft deletes via GORM's `DeletedAt` field
