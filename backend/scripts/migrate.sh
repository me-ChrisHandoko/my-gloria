#!/bin/bash

# Database Migration Script for My Gloria Backend

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection string
DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}&search_path=${DB_SCHEMA:-public}"

echo "🔄 Running migrations..."
echo "Database: ${DB_NAME}"
echo "Schema: ${DB_SCHEMA:-public}"
echo ""

# Check if migration tool is available
if ! command -v migrate &> /dev/null; then
    echo "❌ migrate command not found!"
    echo "Install it with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
    exit 1
fi

# Run migrations
case "$1" in
    "up")
        echo "⬆️  Migrating UP..."
        migrate -path migrations -database "$DB_URL" up
        echo "✅ Migrations completed successfully"
        ;;
    "down")
        echo "⬇️  Migrating DOWN..."
        migrate -path migrations -database "$DB_URL" down
        echo "✅ Migration rollback completed"
        ;;
    "force")
        if [ -z "$2" ]; then
            echo "❌ Please provide version number: ./scripts/migrate.sh force <version>"
            exit 1
        fi
        echo "🔧 Forcing version $2..."
        migrate -path migrations -database "$DB_URL" force "$2"
        echo "✅ Version forced successfully"
        ;;
    "version")
        echo "📌 Current migration version:"
        migrate -path migrations -database "$DB_URL" version
        ;;
    *)
        echo "Usage: ./scripts/migrate.sh {up|down|force|version}"
        echo ""
        echo "Examples:"
        echo "  ./scripts/migrate.sh up       - Run all pending migrations"
        echo "  ./scripts/migrate.sh down     - Rollback one migration"
        echo "  ./scripts/migrate.sh force 1  - Force version 1"
        echo "  ./scripts/migrate.sh version  - Show current version"
        exit 1
        ;;
esac
