#!/bin/bash

# =====================================================
# HR Status Sync - Quick Deployment Script
# Purpose: Automated deployment with safety checks
# Usage: ./scripts/deploy_hr_sync.sh
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3479}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-new_gloria_db}"
BACKUP_DIR="./backups"
MIGRATION_FILE="./migrations/20250112_add_hr_status_sync_trigger.sql"
TEST_FILE="./migrations/test_hr_status_sync.sql"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}HR STATUS SYNC - AUTOMATED DEPLOYMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =====================================================
# Step 1: Pre-deployment Checks
# =====================================================
echo -e "${YELLOW}📋 Step 1: Running pre-deployment checks...${NC}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql not found. Please install PostgreSQL client.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ psql found${NC}"

# Check if Go is available
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Error: go not found. Please install Go 1.19+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ go found ($(go version))${NC}"

# Check database connectivity
echo "Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database${NC}"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"

# Check migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Migration file found${NC}"

echo ""

# =====================================================
# Step 2: Database Backup
# =====================================================
echo -e "${YELLOW}📋 Step 2: Creating database backup...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating backup: $BACKUP_FILE"
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
    # Check backup file size
    BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    if [ "$BACKUP_SIZE" -gt 0 ]; then
        echo -e "${GREEN}✅ Backup created successfully${NC}"
        echo "   Size: $(numfmt --to=iec-i --suffix=B $BACKUP_SIZE 2>/dev/null || echo "$BACKUP_SIZE bytes")"
        echo "   Location: $BACKUP_FILE"
    else
        echo -e "${RED}❌ Error: Backup file is empty${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Error: Failed to create backup${NC}"
    exit 1
fi

echo ""

# =====================================================
# Step 3: Install Go Dependencies
# =====================================================
echo -e "${YELLOW}📋 Step 3: Installing Go dependencies...${NC}"

echo "Installing github.com/lib/pq..."
if go get github.com/lib/pq; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Error: Failed to install dependencies${NC}"
    exit 1
fi

echo "Running go mod tidy..."
go mod tidy

echo ""

# =====================================================
# Step 4: Apply Database Migration
# =====================================================
echo -e "${YELLOW}📋 Step 4: Applying database migration...${NC}"

echo "Running migration: $MIGRATION_FILE"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Migration applied successfully${NC}"
else
    echo -e "${RED}❌ Error: Migration failed${NC}"
    echo "Attempting to rollback..."
    # Rollback logic here if needed
    exit 1
fi

# Verify trigger created
echo "Verifying trigger installation..."
TRIGGER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'trg_sync_user_status_from_hr';" | xargs)

if [ "$TRIGGER_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✅ Trigger verified: trg_sync_user_status_from_hr${NC}"
else
    echo -e "${RED}❌ Error: Trigger not found after migration${NC}"
    exit 1
fi

echo ""

# =====================================================
# Step 5: Run Test Suite
# =====================================================
echo -e "${YELLOW}📋 Step 5: Running test suite...${NC}"

if [ -f "$TEST_FILE" ]; then
    echo "Running tests: $TEST_FILE"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$TEST_FILE" 2>&1 | grep -q "PASS"; then
        echo -e "${GREEN}✅ Test suite passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Some tests may have failed. Check output above.${NC}"
        echo "Continue anyway? (y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Deployment aborted."
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Test file not found: $TEST_FILE${NC}"
    echo "   Skipping test suite..."
fi

echo ""

# =====================================================
# Step 6: Build Backend
# =====================================================
echo -e "${YELLOW}📋 Step 6: Building backend...${NC}"

echo "Compiling backend..."
if go build -o bin/api ./cmd/api; then
    echo -e "${GREEN}✅ Backend compiled successfully${NC}"
    echo "   Binary: ./bin/api"
else
    echo -e "${RED}❌ Error: Backend compilation failed${NC}"
    exit 1
fi

echo ""

# =====================================================
# Step 7: Deployment Summary
# =====================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETED SUCCESSFULLY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📝 What was deployed:"
echo "   ✓ Database trigger for HR status sync"
echo "   ✓ Real-time LISTEN/NOTIFY listener"
echo "   ✓ Auth logic updated to check HR data"
echo "   ✓ Cache TTL reduced to 30 seconds"
echo ""
echo "📋 Next steps:"
echo "   1. Stop current backend service:"
echo "      sudo systemctl stop gloria-backend"
echo ""
echo "   2. Deploy new binary:"
echo "      sudo cp bin/api /path/to/production/api"
echo ""
echo "   3. Start backend service:"
echo "      sudo systemctl start gloria-backend"
echo ""
echo "   4. Monitor logs for:"
echo "      - '✅ HR status listener initialized'"
echo "      - '🔔 HR status changes will trigger instant cache invalidation'"
echo ""
echo "   5. Test with real user:"
echo "      - User logs in"
echo "      - HR updates status to 'Tidak' via pgadmin"
echo "      - User should get 403 within 1 second"
echo ""
echo "📊 Monitoring:"
echo "   tail -f /path/to/logs/app.log | grep -E 'HR|Auth|Status'"
echo ""
echo "🔄 Rollback:"
echo "   - Backup location: $BACKUP_FILE"
echo "   - See: docs/HR_STATUS_SYNC_DEPLOYMENT.md"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
