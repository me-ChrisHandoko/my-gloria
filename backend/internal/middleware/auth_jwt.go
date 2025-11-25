package middleware

import (
	"errors"
	"net/http"
	"time"

	"backend/internal/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidClaims    = errors.New("invalid token claims")
	ErrMissingToken     = errors.New("missing authorization token")
	ErrInvalidSignature = errors.New("invalid token signature")
)

// JWTClaims represents the claims in a JWT token for external API access
type JWTClaims struct {
	jwt.RegisteredClaims
	UserID      string   `json:"user_id"`
	APIKeyID    string   `json:"api_key_id"`
	NIP         string   `json:"nip,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// JWTConfig holds configuration for JWT authentication
type JWTConfig struct {
	SecretKey    string
	Issuer       string
	Audience     []string
	ExpiryHours  int
	RefreshHours int
}

// DefaultJWTConfig returns default JWT configuration
// WARNING: SecretKey MUST be overridden with a secure value from environment
func DefaultJWTConfig() *JWTConfig {
	return &JWTConfig{
		SecretKey:    "", // Must be set from environment - empty will cause validation to fail
		Issuer:       "gloria-api",
		Audience:     []string{"gloria-external"},
		ExpiryHours:  1,
		RefreshHours: 168, // 7 days
	}
}

// ValidateConfig checks if the JWT configuration is valid for production use
func (c *JWTConfig) ValidateConfig() error {
	if c.SecretKey == "" {
		return errors.New("JWT_SECRET_KEY is required but not set")
	}
	if len(c.SecretKey) < 32 {
		return errors.New("JWT_SECRET_KEY must be at least 32 characters (256 bits)")
	}
	if c.SecretKey == "your-256-bit-secret-key-here" || c.SecretKey == "change-me" {
		return errors.New("JWT_SECRET_KEY contains insecure default value - please set a secure random key")
	}
	return nil
}

// JWTAuth returns a middleware that validates JWT tokens for external API access
func JWTAuth(config *JWTConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		token := extractBearerToken(c)
		if token == "" {
			response.Error(c, http.StatusUnauthorized, "missing authorization token")
			c.Abort()
			return
		}

		// Parse and validate the JWT token
		claims, err := ValidateJWT(token, config)
		if err != nil {
			status := http.StatusUnauthorized
			message := "invalid token"

			if errors.Is(err, ErrExpiredToken) {
				message = "token has expired"
			} else if errors.Is(err, ErrInvalidSignature) {
				message = "invalid token signature"
			}

			response.Error(c, status, message)
			c.Abort()
			return
		}

		// Set auth context (no DB lookup needed - stateless)
		authCtx := &AuthContext{
			Type:        AuthTypeJWT,
			UserID:      claims.UserID,
			APIKeyID:    claims.APIKeyID,
			NIP:         claims.NIP,
			Permissions: claims.Permissions,
		}
		SetAuthContext(c, authCtx)

		c.Next()
	}
}

// GenerateJWT creates a new JWT token with the provided claims
func GenerateJWT(userID, apiKeyID, nip string, permissions []string, config *JWTConfig) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(time.Duration(config.ExpiryHours) * time.Hour)

	claims := &JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Issuer:    config.Issuer,
			Subject:   userID,
			Audience:  config.Audience,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
		UserID:      userID,
		APIKeyID:    apiKeyID,
		NIP:         nip,
		Permissions: permissions,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.SecretKey))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// ValidateJWT parses and validates a JWT token
func ValidateJWT(tokenString string, config *JWTConfig) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidSignature
		}
		return []byte(config.SecretKey), nil
	}, jwt.WithIssuer(config.Issuer), jwt.WithExpirationRequired())

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		if errors.Is(err, jwt.ErrSignatureInvalid) {
			return nil, ErrInvalidSignature
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	return claims, nil
}

// GenerateRefreshToken creates a refresh token with longer expiry
func GenerateRefreshToken(userID, apiKeyID string, config *JWTConfig) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(time.Duration(config.RefreshHours) * time.Hour)

	claims := &jwt.RegisteredClaims{
		ID:        uuid.New().String(),
		Issuer:    config.Issuer,
		Subject:   userID,
		Audience:  []string{"gloria-refresh"},
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.SecretKey))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// ValidateRefreshToken validates a refresh token
func ValidateRefreshToken(tokenString string, config *JWTConfig) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidSignature
		}
		return []byte(config.SecretKey), nil
	}, jwt.WithIssuer(config.Issuer), jwt.WithExpirationRequired())

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return "", ErrExpiredToken
		}
		return "", ErrInvalidToken
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		return "", ErrInvalidClaims
	}

	return claims.Subject, nil
}
