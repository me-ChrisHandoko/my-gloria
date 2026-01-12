package configs

import (
	"log"
	"os"
)

type Config struct {
	Database DatabaseConfig
	JWT      JWTConfig
	Server   ServerConfig
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type JWTConfig struct {
	Secret      string
	ExpireHours int
}

type ServerConfig struct {
	Port string
	Env  string
}

func LoadConfig() *Config {
	cfg := &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", ""),
			Port:     getEnv("DB_PORT", ""),
			User:     getEnv("DB_USER", ""),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", ""),
			SSLMode:  getEnv("DB_SSLMODE", ""),
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", ""),
			ExpireHours: 24,
		},
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Env:  getEnv("ENV", "development"),
		},
	}

	// Validate required configuration
	validateConfig(cfg)

	return cfg
}

// validateConfig checks if all required configuration values are set
func validateConfig(cfg *Config) {
	var missing []string

	// Database configuration is required
	if cfg.Database.Host == "" {
		missing = append(missing, "DB_HOST")
	}
	if cfg.Database.Port == "" {
		missing = append(missing, "DB_PORT")
	}
	if cfg.Database.User == "" {
		missing = append(missing, "DB_USER")
	}
	if cfg.Database.Password == "" {
		missing = append(missing, "DB_PASSWORD")
	}
	if cfg.Database.DBName == "" {
		missing = append(missing, "DB_NAME")
	}
	if cfg.Database.SSLMode == "" {
		missing = append(missing, "DB_SSLMODE")
	}

	// JWT secret is required
	if cfg.JWT.Secret == "" {
		missing = append(missing, "JWT_SECRET")
	}

	if len(missing) > 0 {
		log.Fatalf("Missing required environment variables: %v\nPlease check your .env file", missing)
	}

	// Validate JWT secret strength
	if len(cfg.JWT.Secret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters long for security")
	}
}

// MustLoadConfig loads configuration and panics if validation fails
func MustLoadConfig() *Config {
	return LoadConfig()
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
