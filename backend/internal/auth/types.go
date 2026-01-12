package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT custom claims
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// Token expiry constants
const (
	AccessTokenExpiry  = 15 * time.Minute   // 15 minutes
	RefreshTokenExpiry = 7 * 24 * time.Hour // 7 days
)

// Account locking constants
const (
	MaxFailedAttempts    = 5
	AccountLockDuration  = 15 * time.Minute
	FailedAttemptsWindow = 15 * time.Minute
)

// Error messages
const (
	ErrInvalidCredentials = "invalid email or password"
	ErrAccountLocked      = "account is locked due to too many failed attempts"
	ErrAccountInactive    = "account is inactive"
	ErrTokenExpired       = "token has expired"
	ErrTokenInvalid       = "invalid token"
	ErrTokenRevoked       = "token has been revoked"
)
