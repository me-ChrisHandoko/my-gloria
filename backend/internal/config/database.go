package config

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDB initializes database connection
func InitDB(cfg *Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		cfg.DBHost,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
		cfg.DBPort,
		cfg.DBSSLMode,
		cfg.DBTimezone,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		// Disable FK constraint creation during AutoMigrate to handle cross-schema relations
		// FK constraints are added manually via custom migrations in database/migrations.go
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool for optimal performance
	// This prevents connection exhaustion under high load (1000+ concurrent users)
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// SetMaxOpenConns sets the maximum number of open connections to the database.
	// For 8-core server, optimal is (cores * 2) + headroom = ~35 connections
	// This prevents "too many connections" errors during burst traffic
	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)

	// SetMaxIdleConns sets the maximum number of connections in the idle connection pool.
	// Keep ~50% of MaxOpenConns idle for quick connection reuse
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)

	// SetConnMaxLifetime sets the maximum amount of time a connection may be reused.
	// Recycling connections prevents stale connection issues and memory leaks
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DBConnMaxLifetime) * time.Second)

	return db, nil
}
