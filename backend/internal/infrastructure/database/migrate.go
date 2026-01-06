package database

import (
	"backend/internal/domain"
	"fmt"
	"log"

	"gorm.io/gorm"
)

// AutoMigrate runs GORM auto-migration for all domain models
func AutoMigrate(db *gorm.DB) error {
	log.Println("🔄 Running database auto-migration...")

	// Step 1: Migrate UserProfile FIRST (DataKaryawan references it)
	log.Println("📋 Step 1: Creating UserProfile table...")
	if err := db.AutoMigrate(&domain.UserProfile{}); err != nil {
		return fmt.Errorf("failed to migrate UserProfile: %w", err)
	}

	// Step 2: Base tables without complex dependencies
	batch1 := []interface{}{
		&domain.Role{},
		&domain.Permission{},
		&domain.Position{},
		&domain.School{},
		&domain.Department{},
		&domain.Module{},
		&domain.FeatureFlag{},
		&domain.SystemConfiguration{},
		&domain.Workflow{},
		&domain.BulkOperationProgress{},
	}

	// Step 3: Tables with foreign key dependencies
	batch2 := []interface{}{
		&domain.DataKaryawan{}, // FK to UserProfile
		&domain.RefreshToken{},
		&domain.LoginAttempt{},
		&domain.RoleHierarchy{},
		&domain.RolePermission{},
		&domain.ModulePermission{},
		&domain.PositionHierarchy{},
		&domain.UserRole{},
		&domain.UserPosition{},
		&domain.UserPermission{},
		&domain.RoleModuleAccess{},
		&domain.UserModuleAccess{},
		&domain.ApiKey{},
		&domain.AuditLog{},
		&domain.Delegation{},
		&domain.FeatureFlagEvaluation{},
	}

	// Migrate batch 1
	log.Println("📋 Step 2: Creating base tables...")
	if err := db.AutoMigrate(batch1...); err != nil {
		return fmt.Errorf("failed to migrate base tables: %w", err)
	}

	// Migrate batch 2
	log.Println("📋 Step 3: Creating dependent tables...")
	if err := db.AutoMigrate(batch2...); err != nil {
		return fmt.Errorf("failed to migrate dependent tables: %w", err)
	}

	totalModels := 1 + len(batch1) + len(batch2) // UserProfile + batch1 + batch2
	log.Printf("✅ Database auto-migration completed (%d models)\n", totalModels)
	return nil
}
