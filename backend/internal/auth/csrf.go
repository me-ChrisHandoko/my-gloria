package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
	"time"
)

// CSRF token structure: {random}:{timestamp}:{signature}
// Signature = HMAC-SHA256(random:timestamp:userID, secret)

var csrfSecret []byte

// InitCSRFSecret initializes the CSRF secret key from a persistent secret
// The secret should be loaded from environment variable to ensure consistency across server restarts
func InitCSRFSecret(secret string) {
	csrfSecret = []byte(secret)
}

// GenerateCSRFToken generates a new CSRF token for a user
func GenerateCSRFToken(userID string) (string, error) {
	// Generate random bytes
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	random := base64.URLEncoding.EncodeToString(randomBytes)

	// Current timestamp
	timestamp := fmt.Sprintf("%d", time.Now().Unix())

	// Create payload: random:timestamp:userID
	payload := fmt.Sprintf("%s:%s:%s", random, timestamp, userID)

	// Generate HMAC signature
	mac := hmac.New(sha256.New, csrfSecret)
	mac.Write([]byte(payload))
	signature := base64.URLEncoding.EncodeToString(mac.Sum(nil))

	// Token format: random:timestamp:signature
	token := fmt.Sprintf("%s:%s:%s", random, timestamp, signature)
	return token, nil
}

// ValidateCSRFToken validates a CSRF token for a user
func ValidateCSRFToken(token string, userID string) error {
	if token == "" {
		return fmt.Errorf("CSRF token is required")
	}

	// Parse token: random:timestamp:signature
	parts := strings.Split(token, ":")
	if len(parts) != 3 {
		return fmt.Errorf("invalid CSRF token format")
	}

	random := parts[0]
	timestampStr := parts[1]
	providedSignature := parts[2]

	// Check token expiry (24 hours)
	var timestamp int64
	if _, err := fmt.Sscanf(timestampStr, "%d", &timestamp); err != nil {
		return fmt.Errorf("invalid CSRF token timestamp")
	}

	tokenTime := time.Unix(timestamp, 0)
	if time.Since(tokenTime) > 24*time.Hour {
		return fmt.Errorf("CSRF token has expired")
	}

	// Recreate payload and signature
	payload := fmt.Sprintf("%s:%s:%s", random, timestampStr, userID)
	mac := hmac.New(sha256.New, csrfSecret)
	mac.Write([]byte(payload))
	expectedSignature := base64.URLEncoding.EncodeToString(mac.Sum(nil))

	// Compare signatures (constant time to prevent timing attacks)
	if !hmac.Equal([]byte(expectedSignature), []byte(providedSignature)) {
		return fmt.Errorf("invalid CSRF token signature")
	}

	return nil
}
