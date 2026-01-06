# Makefile for My Gloria Backend

# Variables
APP_NAME=my-gloria-backend
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME=$(shell date -u '+%Y-%m-%d_%H:%M:%S')
MAIN_PATH=./cmd/server
BINARY_NAME=$(APP_NAME)
DOCKER_IMAGE=$(APP_NAME):$(VERSION)

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
GOFMT=$(GOCMD) fmt
GOVET=$(GOCMD) vet

# Linting
GOLINT=golangci-lint

# Migration tool
MIGRATE=migrate

# Database
DB_DSN?=postgres://user:password@localhost:5432/gloria?sslmode=disable

.PHONY: all build clean test coverage lint fmt vet run help
.PHONY: migrate-up migrate-down migrate-create migrate-force
.PHONY: docker-build docker-run docker-stop
.PHONY: deps deps-update deps-tidy
.PHONY: test-unit test-integration test-e2e

## all: Run fmt, vet, lint, test, and build
all: fmt vet lint test build

## help: Display this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

## build: Build the application binary
build:
	@echo "Building $(BINARY_NAME)..."
	$(GOBUILD) -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)" -o bin/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: bin/$(BINARY_NAME)"

## build-all: Build all binaries (api, worker, migrate, seed)
build-all:
	@echo "Building all binaries..."
	$(GOBUILD) -o bin/api ./cmd/server
	$(GOBUILD) -o bin/worker ./cmd/worker
	$(GOBUILD) -o bin/migrate ./cmd/migrate
	$(GOBUILD) -o bin/seed ./cmd/seed
	@echo "All builds complete"

## run: Run the application
run:
	@echo "Running $(APP_NAME)..."
	$(GOCMD) run $(MAIN_PATH)/main.go

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	rm -rf bin/
	rm -rf coverage/
	@echo "Clean complete"

## fmt: Format Go code
fmt:
	@echo "Formatting code..."
	$(GOFMT) ./...
	@echo "Format complete"

## vet: Run go vet
vet:
	@echo "Running go vet..."
	$(GOVET) ./...
	@echo "Vet complete"

## lint: Run linter
lint:
	@echo "Running linter..."
	@if command -v $(GOLINT) > /dev/null; then \
		$(GOLINT) run ./...; \
	else \
		echo "golangci-lint not installed. Run: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi

## test: Run all tests
test:
	@echo "Running tests..."
	$(GOTEST) -v -race -timeout 30s ./...
	@echo "Tests complete"

## test-unit: Run unit tests only
test-unit:
	@echo "Running unit tests..."
	$(GOTEST) -v -race -short ./internal/...
	@echo "Unit tests complete"

## test-integration: Run integration tests
test-integration:
	@echo "Running integration tests..."
	$(GOTEST) -v -race ./test/integration/...
	@echo "Integration tests complete"

## test-e2e: Run end-to-end tests
test-e2e:
	@echo "Running E2E tests..."
	$(GOTEST) -v ./test/e2e/...
	@echo "E2E tests complete"

## coverage: Run tests with coverage
coverage:
	@echo "Running tests with coverage..."
	@mkdir -p coverage
	$(GOTEST) -v -race -coverprofile=coverage/coverage.out -covermode=atomic ./...
	$(GOCMD) tool cover -html=coverage/coverage.out -o coverage/coverage.html
	@echo "Coverage report generated: coverage/coverage.html"

## deps: Download dependencies
deps:
	@echo "Downloading dependencies..."
	$(GOMOD) download
	@echo "Dependencies downloaded"

## deps-update: Update dependencies
deps-update:
	@echo "Updating dependencies..."
	$(GOGET) -u ./...
	$(GOMOD) tidy
	@echo "Dependencies updated"

## deps-tidy: Tidy dependencies
deps-tidy:
	@echo "Tidying dependencies..."
	$(GOMOD) tidy
	@echo "Dependencies tidied"

## migrate-up: Run database migrations up
migrate-up:
	@echo "Running migrations up..."
	@if command -v $(MIGRATE) > /dev/null; then \
		$(MIGRATE) -path migrations -database "$(DB_DSN)" up; \
	else \
		echo "migrate not installed. Run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

## migrate-down: Run database migrations down
migrate-down:
	@echo "Running migrations down..."
	@if command -v $(MIGRATE) > /dev/null; then \
		$(MIGRATE) -path migrations -database "$(DB_DSN)" down; \
	else \
		echo "migrate not installed. Run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

## migrate-create: Create a new migration (usage: make migrate-create name=migration_name)
migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Error: name is required. Usage: make migrate-create name=migration_name"; \
		exit 1; \
	fi
	@echo "Creating migration: $(name)..."
	@if command -v $(MIGRATE) > /dev/null; then \
		$(MIGRATE) create -ext sql -dir migrations -seq $(name); \
	else \
		echo "migrate not installed. Run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

## migrate-force: Force migration version (usage: make migrate-force version=N)
migrate-force:
	@if [ -z "$(version)" ]; then \
		echo "Error: version is required. Usage: make migrate-force version=N"; \
		exit 1; \
	fi
	@echo "Forcing migration version to $(version)..."
	@if command -v $(MIGRATE) > /dev/null; then \
		$(MIGRATE) -path migrations -database "$(DB_DSN)" force $(version); \
	else \
		echo "migrate not installed. Run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"; \
	fi

## docker-build: Build Docker image
docker-build:
	@echo "Building Docker image: $(DOCKER_IMAGE)..."
	docker build -t $(DOCKER_IMAGE) -f deployments/docker/Dockerfile .
	@echo "Docker build complete"

## docker-run: Run application in Docker
docker-run:
	@echo "Running Docker compose..."
	docker-compose -f deployments/docker/docker-compose.yml up -d
	@echo "Docker compose running"

## docker-stop: Stop Docker containers
docker-stop:
	@echo "Stopping Docker compose..."
	docker-compose -f deployments/docker/docker-compose.yml down
	@echo "Docker compose stopped"

## docker-logs: Show Docker logs
docker-logs:
	docker-compose -f deployments/docker/docker-compose.yml logs -f

## seed: Seed database with initial data
seed:
	@echo "Seeding database..."
	$(GOCMD) run ./cmd/seed/main.go
	@echo "Seeding complete"

## install-tools: Install development tools
install-tools:
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	go install github.com/swaggo/swag/cmd/swag@latest
	@echo "Tools installed"

## swagger: Generate Swagger documentation
swagger:
	@echo "Generating Swagger docs..."
	@if command -v swag > /dev/null; then \
		swag init -g cmd/server/main.go -o api/openapi; \
	else \
		echo "swag not installed. Run: make install-tools"; \
	fi

## watch: Watch for changes and rebuild (requires air)
watch:
	@echo "Watching for changes..."
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "air not installed. Run: go install github.com/cosmtrek/air@latest"; \
	fi
