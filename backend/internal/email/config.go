package email

import (
	"os"
)

// SMTPConfig holds SMTP configuration
type SMTPConfig struct {
	Host       string
	Port       string
	Username   string
	Password   string
	From       string
	Encryption string // tls or ssl
}

// GetSMTPConfig returns SMTP configuration
// For development, all emails go to christian_handoko@gloriaschool.org
// IMPORTANT: SMTP credentials MUST be set via environment variables
func GetSMTPConfig() *SMTPConfig {
	return &SMTPConfig{
		Host:       getEnv("SMTP_HOST", "smtp.postmarkapp.com"),
		Port:       getEnv("SMTP_PORT", "2525"),
		Username:   getEnv("SMTP_USERNAME", ""),
		Password:   getEnv("SMTP_PASSWORD", ""),
		From:       getEnv("SMTP_FROM", "noreply@gloriaschool.org"),
		Encryption: getEnv("SMTP_ENCRYPTION", "tls"),
	}
}

// GetDevelopmentEmail returns the email for development environment
// All emails in development will be sent to this address
func GetDevelopmentEmail() string {
	return getEnv("DEV_EMAIL_RECIPIENT", "christian_handoko@gloriaschool.org")
}

// IsDevelopment checks if the application is running in development mode
func IsDevelopment() bool {
	env := getEnv("APP_ENV", "development")
	return env == "development" || env == "dev"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
