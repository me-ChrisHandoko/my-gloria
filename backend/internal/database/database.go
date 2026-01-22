package database

import (
	"fmt"
	"log"

	"backend/configs"
	"backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes the database connection
func InitDB(cfg *configs.Config) error {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connection established successfully")
	return nil
}

// AutoMigrate runs database migrations for all models
func AutoMigrate() error {
	log.Println("Running database migrations...")

	// Migrate models individually to isolate issues
	models := []struct {
		name  string
		model interface{}
	}{
		// Core entities
		{"User", &models.User{}},
		{"RefreshToken", &models.RefreshToken{}},
		{"LoginAttempt", &models.LoginAttempt{}},

		// Organization entities (no foreign keys)
		{"School", &models.School{}},
		{"Department", &models.Department{}},
		{"Position", &models.Position{}},
		{"DataKaryawan", &models.DataKaryawan{}},

		// Permission system (base models first)
		{"Module", &models.Module{}},
		{"Permission", &models.Permission{}},
		{"Role", &models.Role{}},

		// Junction tables and relationships
		{"ModulePermission", &models.ModulePermission{}},
		{"RolePermission", &models.RolePermission{}},
		{"RoleHierarchy", &models.RoleHierarchy{}},
		{"RoleModuleAccess", &models.RoleModuleAccess{}},
		{"UserRole", &models.UserRole{}},
		{"UserPosition", &models.UserPosition{}},
		{"UserPermission", &models.UserPermission{}},
		{"UserModuleAccess", &models.UserModuleAccess{}},

		// System entities
		{"ApiKey", &models.ApiKey{}},
		{"AuditLog", &models.AuditLog{}},
		{"Delegation", &models.Delegation{}},
		{"FeatureFlag", &models.FeatureFlag{}},
		{"FeatureFlagEvaluation", &models.FeatureFlagEvaluation{}},
		{"SystemConfiguration", &models.SystemConfiguration{}},
		{"Workflow", &models.Workflow{}},
		{"BulkOperationProgress", &models.BulkOperationProgress{}},
		{"WorkflowRule", &models.WorkflowRule{}},
		{"WorkflowRuleStep", &models.WorkflowRuleStep{}},
	}

	for _, m := range models {
		log.Printf("Migrating %s...", m.name)
		if err := DB.AutoMigrate(m.model); err != nil {
			return fmt.Errorf("failed to migrate %s: %w", m.name, err)
		}
		log.Printf("✓ %s migrated successfully", m.name)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
