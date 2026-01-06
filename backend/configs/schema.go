package configs

import (
	"fmt"
	"time"
)

// Config represents the complete application configuration
type Config struct {
	App      AppConfig      `mapstructure:"app"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Security SecurityConfig `mapstructure:"security"`
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	CORS     CORSConfig     `mapstructure:"cors"`
	Email    EmailConfig    `mapstructure:"email"`
	Logging  LoggingConfig  `mapstructure:"logging"`
	Metrics  MetricsConfig  `mapstructure:"metrics"`
	Tracing  TracingConfig  `mapstructure:"tracing"`
	Features FeatureConfig  `mapstructure:"features"`
	Swagger  SwaggerConfig  `mapstructure:"swagger"`
}

// AppConfig contains application-level configuration
type AppConfig struct {
	Name    string `mapstructure:"name"`
	Env     string `mapstructure:"env"`
	Port    int    `mapstructure:"port"`
	Host    string `mapstructure:"host"`
	Debug   bool   `mapstructure:"debug"`
	Version string `mapstructure:"version"`
}

// DatabaseConfig contains database connection configuration
type DatabaseConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	User            string        `mapstructure:"user"`
	Password        string        `mapstructure:"password"`
	Name            string        `mapstructure:"name"`
	Schema          string        `mapstructure:"schema"`
	SSLMode         string        `mapstructure:"sslmode"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
	LogLevel        string        `mapstructure:"log_level"`
}

// RedisConfig contains Redis connection configuration
type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
	TTL      int    `mapstructure:"ttl"`
	PoolSize int    `mapstructure:"pool_size"`
}

// JWTConfig contains JWT authentication configuration
type JWTConfig struct {
	Secret             string        `mapstructure:"secret"`
	AccessTokenExpiry  time.Duration `mapstructure:"access_token_expiry"`
	RefreshTokenExpiry time.Duration `mapstructure:"refresh_token_expiry"`
	Issuer             string        `mapstructure:"issuer"`
	Audience           string        `mapstructure:"audience"`
}

// SecurityConfig contains security-related configuration
type SecurityConfig struct {
	Argon2Memory               uint32        `mapstructure:"argon2_memory"`     // Memory in KiB
	Argon2Iterations           uint32        `mapstructure:"argon2_iterations"` // Number of iterations
	Argon2Parallelism          uint8         `mapstructure:"argon2_parallelism"` // Degree of parallelism
	Argon2SaltLength           uint32        `mapstructure:"argon2_salt_length"` // Salt length in bytes
	Argon2KeyLength            uint32        `mapstructure:"argon2_key_length"`  // Key length in bytes
	MaxLoginAttempts            int           `mapstructure:"max_login_attempts"`
	AccountLockoutDuration      time.Duration `mapstructure:"account_lockout_duration"`
	PasswordMinLength           int           `mapstructure:"password_min_length"`
	PasswordResetTokenExpiry    time.Duration `mapstructure:"password_reset_token_expiry"`
	EmailVerificationTokenExpiry time.Duration `mapstructure:"email_verification_token_expiry"`
}

// RateLimitConfig contains rate limiting configuration
type RateLimitConfig struct {
	Enabled            bool    `mapstructure:"enabled"`
	RequestsPerSecond  float64 `mapstructure:"requests_per_second"`
	Burst              int     `mapstructure:"burst"`
}

// CORSConfig contains CORS configuration
type CORSConfig struct {
	AllowedOrigins   []string `mapstructure:"allowed_origins"`
	AllowedMethods   []string `mapstructure:"allowed_methods"`
	AllowedHeaders   []string `mapstructure:"allowed_headers"`
	ExposedHeaders   []string `mapstructure:"exposed_headers"`
	AllowCredentials bool     `mapstructure:"allow_credentials"`
	MaxAge           int      `mapstructure:"max_age"`
}

// EmailConfig contains email service configuration
type EmailConfig struct {
	Enabled  bool       `mapstructure:"enabled"`
	From     string     `mapstructure:"from"`
	FromName string     `mapstructure:"from_name"`
	SMTP     SMTPConfig `mapstructure:"smtp"`
}

// SMTPConfig contains SMTP server configuration
type SMTPConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	UseTLS   bool   `mapstructure:"use_tls"`
}

// LoggingConfig contains logging configuration
type LoggingConfig struct {
	Level      string `mapstructure:"level"`
	Format     string `mapstructure:"format"`
	Output     string `mapstructure:"output"`
	FilePath   string `mapstructure:"file_path"`
	MaxSize    int    `mapstructure:"max_size"`
	MaxBackups int    `mapstructure:"max_backups"`
	MaxAge     int    `mapstructure:"max_age"`
	Compress   bool   `mapstructure:"compress"`
}

// MetricsConfig contains metrics configuration
type MetricsConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Port    int    `mapstructure:"port"`
	Path    string `mapstructure:"path"`
}

// TracingConfig contains distributed tracing configuration
type TracingConfig struct {
	Enabled    bool    `mapstructure:"enabled"`
	Endpoint   string  `mapstructure:"endpoint"`
	SampleRate float64 `mapstructure:"sample_rate"`
}

// FeatureConfig contains feature flag configuration
type FeatureConfig struct {
	EmailVerification bool `mapstructure:"email_verification"`
	TwoFactorAuth     bool `mapstructure:"two_factor_auth"`
	APIRateLimiting   bool `mapstructure:"api_rate_limiting"`
	AuditLogging      bool `mapstructure:"audit_logging"`
}

// SwaggerConfig contains Swagger/OpenAPI configuration
type SwaggerConfig struct {
	Enabled     bool   `mapstructure:"enabled"`
	Host        string `mapstructure:"host"`
	BasePath    string `mapstructure:"base_path"`
	Title       string `mapstructure:"title"`
	Description string `mapstructure:"description"`
	Version     string `mapstructure:"version"`
}

// IsDevelopment returns true if running in development mode
func (c *AppConfig) IsDevelopment() bool {
	return c.Env == "development"
}

// IsProduction returns true if running in production mode
func (c *AppConfig) IsProduction() bool {
	return c.Env == "production"
}

// Address returns the full address for the application
func (c *AppConfig) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// DSN returns the database connection string
func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode)
}

// Address returns the Redis connection address
func (c *RedisConfig) Address() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
