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
}

// Load loads configuration from environment variables with defaults
func Load() *Config {
	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3479"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "mydevelopment"),
		DBName:     getEnv("DB_NAME", "new_gloria_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		DBTimezone: getEnv("DB_TIMEZONE", "Asia/Jakarta"),
	}
}

// getEnv gets environment variable with fallback default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
