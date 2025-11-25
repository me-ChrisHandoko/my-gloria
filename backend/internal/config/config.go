package config

import (
	"os"
	"strconv"
	"strings"
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

	// Authentication - Clerk
	ClerkSecretKey string

	// Authentication - JWT
	JWTSecretKey   string
	JWTIssuer      string
	JWTExpiryHours int

	// Rate Limiting
	RateLimitDefault int // Requests per hour
	RateLimitStrict  int // Requests per minute for sensitive endpoints

	// CORS Configuration
	CORSAllowedOrigins []string // Allowed origins (comma-separated in env)
	CORSAllowedMethods []string // Allowed HTTP methods
	CORSAllowedHeaders []string // Allowed headers
	CORSMaxAge         int      // Preflight cache duration in seconds
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

		// Clerk
		ClerkSecretKey: getEnv("CLERK_SECRET_KEY", ""),

		// JWT
		JWTSecretKey:   getEnv("JWT_SECRET_KEY", "your-256-bit-secret-key-change-in-production"),
		JWTIssuer:      getEnv("JWT_ISSUER", "gloria-api"),
		JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 1),

		// Rate Limiting
		RateLimitDefault: getEnvInt("RATE_LIMIT_DEFAULT", 1000),
		RateLimitStrict:  getEnvInt("RATE_LIMIT_STRICT", 10),

		// CORS - defaults allow localhost for development
		CORSAllowedOrigins: getEnvSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000", "http://localhost:5173"}),
		CORSAllowedMethods: getEnvSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}),
		CORSAllowedHeaders: getEnvSlice("CORS_ALLOWED_HEADERS", []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"}),
		CORSMaxAge:         getEnvInt("CORS_MAX_AGE", 86400),
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

// getEnvInt gets integer environment variable with fallback default value
func getEnvInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// getEnvSlice gets comma-separated environment variable as string slice
func getEnvSlice(key string, defaultValue []string) []string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		parts := strings.Split(value, ",")
		result := make([]string, 0, len(parts))
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}
