package configs

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Load loads configuration from YAML file based on environment
func Load() (*Config, error) {
	env := getEnv("APP_ENV", "dev")
	configPath := getEnv("CONFIG_PATH", fmt.Sprintf("configs/%s.yaml", env))

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %s: %w", configPath, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Override with environment variables if set
	overrideFromEnv(&cfg)

	return &cfg, nil
}

// overrideFromEnv overrides config values with environment variables
func overrideFromEnv(cfg *Config) {
	if port := getEnv("APP_PORT", ""); port != "" {
		fmt.Sscanf(port, "%d", &cfg.App.Port)
	}
	if dbHost := getEnv("DB_HOST", ""); dbHost != "" {
		cfg.Database.Host = dbHost
	}
	if dbPort := getEnv("DB_PORT", ""); dbPort != "" {
		fmt.Sscanf(dbPort, "%d", &cfg.Database.Port)
	}
	if dbUser := getEnv("DB_USER", ""); dbUser != "" {
		cfg.Database.User = dbUser
	}
	if dbPass := getEnv("DB_PASSWORD", ""); dbPass != "" {
		cfg.Database.Password = dbPass
	}
	if dbName := getEnv("DB_NAME", ""); dbName != "" {
		cfg.Database.Name = dbName
	}
	if dbSSLMode := getEnv("DB_SSLMODE", ""); dbSSLMode != "" {
		cfg.Database.SSLMode = dbSSLMode
	}
	if jwtSecret := getEnv("JWT_SECRET", ""); jwtSecret != "" {
		cfg.JWT.Secret = jwtSecret
	}
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// MustLoad loads configuration and panics on error
func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(err)
	}
	return cfg
}
