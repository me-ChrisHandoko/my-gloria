package config

import (
	"os"
)

// Config holds all application configuration
type Config struct {
	// Server
	ServerPort string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBTimezone string

	// Migration
	RunMigrations bool // Controls whether to run AutoMigrate on startup
}

// Load loads configuration from environment variables with defaults
func Load() *Config {
	return &Config{
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "3479"),
		DBUser:        getEnv("DB_USER", "postgres"),
		DBPassword:    getEnv("DB_PASSWORD", "mydevelopment"),
		DBName:        getEnv("DB_NAME", "new_gloria_db"),
		DBSSLMode:     getEnv("DB_SSLMODE", "disable"),
		DBTimezone:    getEnv("DB_TIMEZONE", "Asia/Jakarta"),
		RunMigrations: getEnvBool("RUN_MIGRATIONS", true), // Default true for development
	}
}

// getEnv gets environment variable with fallback default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getEnvBool gets boolean environment variable with fallback default value
func getEnvBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}
