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

	err := DB.AutoMigrate(
		// Core entities
		&models.User{},
		&models.UserRole{},
		&models.UserPosition{},
		&models.UserPermission{},
		&models.RefreshToken{},
		&models.LoginAttempt{},

		// Organization entities
		&models.School{},
		&models.Department{},
		&models.Position{},
		&models.PositionHierarchy{},
		&models.DataKaryawan{},

		// Permission system
		&models.Module{},
		&models.ModulePermission{},
		&models.Permission{},
		&models.Role{},
		&models.RolePermission{},
		&models.RoleHierarchy{},
		&models.RoleModuleAccess{},
		&models.UserModuleAccess{},

		// System entities
		&models.ApiKey{},
		&models.AuditLog{},
		&models.Delegation{},
		&models.FeatureFlag{},
		&models.FeatureFlagEvaluation{},
		&models.SystemConfiguration{},
		&models.Workflow{},
		&models.BulkOperationProgress{},
	)

	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
