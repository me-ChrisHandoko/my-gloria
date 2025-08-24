#!/bin/bash

# Database connection details
DB_HOST="localhost"
DB_PORT="3479"
DB_USER="postgres"
DB_NAME="new_gloria_db"
export PGPASSWORD="mydevelopment"

echo "Running database migrations..."

# Function to run a migration
run_migration() {
    local migration_name=$1
    local migration_file=$2
    
    # Check if migration is already applied
    already_applied=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$migration_name' AND finished_at IS NOT NULL;")
    
    if [ $already_applied -gt 0 ]; then
        echo "⏭️  Migration $migration_name already applied, skipping..."
        return 0
    fi
    
    echo "Running migration: $migration_name"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file"
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration $migration_name completed successfully"
        # Mark migration as applied in Prisma
        npx prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
    else
        echo "❌ Migration $migration_name failed"
        return 1
    fi
}

# Run each migration in order
migrations=(
    "20250122_add_optimistic_locking"
    "20250817150436_add_cascade_rules_organizational_structure"
    "20250817213102_add_performance_indexes_organizational_structure"
    "20250817213821_add_audit_fields_organizational_structure"
    "20250817214837_add_security_audit_fields"
    "20250818233755_add_fine_grained_permissions"
    "20250820022720_add_enhanced_permissions_module"
    "20250123_add_module_optimistic_locking"
    "20250123_add_notification_indexes"
    "20250123_add_permission_features"
    "20250123_add_permission_matrix"
    "20250123_optimize_permission_indexes"
)

for migration in "${migrations[@]}"; do
    if [ -f "prisma/migrations/$migration/migration.sql" ]; then
        run_migration "$migration" "prisma/migrations/$migration/migration.sql"
        if [ $? -ne 0 ]; then
            echo "Migration process stopped due to error"
            exit 1
        fi
    else
        echo "⚠️  Migration file not found: $migration"
    fi
done

# Handle the problematic concurrent index migration separately
echo "Running concurrent index creation..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SET search_path TO gloria_ops;" -f "prisma/migrations/20250123_add_indexes/migration.sql"
if [ $? -eq 0 ]; then
    echo "✅ Concurrent indexes created successfully"
    npx prisma migrate resolve --applied "20250123_add_indexes"
else
    echo "❌ Concurrent index creation failed"
fi

echo "All migrations completed!"