package service

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"strings"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/argon2"
	"gorm.io/gorm"
)

var (
	ErrApiKeyNotFound  = errors.New("api key not found")
	ErrApiKeyExpired   = errors.New("api key has expired")
	ErrApiKeyInactive  = errors.New("api key is not active")
	ErrInvalidApiKey   = errors.New("invalid api key")
	ErrIPNotAllowed    = errors.New("ip address not allowed")
)

const (
	// ApiKeyPrefix is the standard prefix for Gloria API keys
	ApiKeyPrefix = "glr_live"
	// ApiKeyLength is the number of random bytes for key generation
	ApiKeyLength = 24
)

// Argon2idParams holds the parameters for Argon2id hashing
type Argon2idParams struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

// DefaultArgon2idParams returns secure default Argon2id parameters
var DefaultArgon2idParams = &Argon2idParams{
	Memory:      64 * 1024, // 64MB
	Iterations:  3,
	Parallelism: 2,
	SaltLength:  16,
	KeyLength:   32,
}

// ApiKeyService defines the interface for API key business logic
type ApiKeyService interface {
	GetAll(userID string) ([]domain.ApiKeyListResponse, error)
	GetByID(id string) (*domain.ApiKeyResponse, error)
	GetByIDForUser(id string, userID string) (*domain.ApiKeyResponse, error) // With ownership check
	GetActive(userID string) ([]domain.ApiKeyListResponse, error)
	Create(userID string, req *domain.CreateApiKeyRequest) (*domain.ApiKeyCreatedResponse, error)
	RevokeForUser(id string, userID string) error  // With ownership check
	DeleteForUser(id string, userID string) error  // With ownership check
	Revoke(id string) error                        // Admin only
	Delete(id string) error                        // Admin only
	ValidateKey(plainTextKey string, clientIP string) (*domain.ApiKey, error)
	RecordUsage(id string, ip string) error
}

type apiKeyService struct {
	apiKeyRepo repository.ApiKeyRepository
}

// NewApiKeyService creates a new API key service instance
func NewApiKeyService(apiKeyRepo repository.ApiKeyRepository) ApiKeyService {
	return &apiKeyService{apiKeyRepo: apiKeyRepo}
}

func (s *apiKeyService) GetAll(userID string) ([]domain.ApiKeyListResponse, error) {
	apiKeys, err := s.apiKeyRepo.FindAll(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ApiKeyListResponse, len(apiKeys))
	for i, key := range apiKeys {
		responses[i] = *key.ToListResponse()
	}
	return responses, nil
}

func (s *apiKeyService) GetByID(id string) (*domain.ApiKeyResponse, error) {
	apiKey, err := s.apiKeyRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrApiKeyNotFound
		}
		return nil, err
	}
	return apiKey.ToResponse(), nil
}

// GetByIDForUser returns an API key by ID with ownership verification
func (s *apiKeyService) GetByIDForUser(id string, userID string) (*domain.ApiKeyResponse, error) {
	apiKey, err := s.apiKeyRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrApiKeyNotFound
		}
		return nil, err
	}
	// Verify ownership
	if apiKey.UserID != userID {
		return nil, errors.New("access denied: you don't own this API key")
	}
	return apiKey.ToResponse(), nil
}

func (s *apiKeyService) GetActive(userID string) ([]domain.ApiKeyListResponse, error) {
	apiKeys, err := s.apiKeyRepo.FindActiveByUserID(userID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.ApiKeyListResponse, len(apiKeys))
	for i, key := range apiKeys {
		responses[i] = *key.ToListResponse()
	}
	return responses, nil
}

func (s *apiKeyService) Create(userID string, req *domain.CreateApiKeyRequest) (*domain.ApiKeyCreatedResponse, error) {
	// Generate random API key
	plainTextKey, err := generateApiKey()
	if err != nil {
		return nil, err
	}

	// Construct full key with prefix (this is what we'll hash)
	fullKey := ApiKeyPrefix + "_" + plainTextKey

	// Hash the full key for storage using Argon2id
	keyHash, err := hashApiKeyArgon2id(fullKey)
	if err != nil {
		return nil, err
	}

	// Get last 4 characters from plain key for display
	lastFour := plainTextKey[len(plainTextKey)-4:]

	apiKey := &domain.ApiKey{
		ID:            uuid.New().String(),
		Name:          req.Name,
		KeyHash:       keyHash,
		Prefix:        ApiKeyPrefix,
		LastFourChars: lastFour,
		Algorithm:     "argon2id",
		UserID:        userID,
		Description:   req.Description,
		Permissions:   req.Permissions,
		RateLimit:     req.RateLimit,
		ExpiresAt:     req.ExpiresAt,
		IsActive:      true,
		UsageCount:    0,
	}

	if len(req.AllowedIPs) > 0 {
		apiKey.AllowedIPs = pq.StringArray(req.AllowedIPs)
	}

	if err := s.apiKeyRepo.Create(apiKey); err != nil {
		return nil, err
	}

	return &domain.ApiKeyCreatedResponse{
		ApiKeyResponse: *apiKey.ToResponse(),
		PlainTextKey:   fullKey,
	}, nil
}

func (s *apiKeyService) Revoke(id string) error {
	_, err := s.apiKeyRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrApiKeyNotFound
		}
		return err
	}

	return s.apiKeyRepo.Revoke(id)
}

// RevokeForUser revokes an API key with ownership verification
func (s *apiKeyService) RevokeForUser(id string, userID string) error {
	apiKey, err := s.apiKeyRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrApiKeyNotFound
		}
		return err
	}
	// Verify ownership
	if apiKey.UserID != userID {
		return errors.New("access denied: you don't own this API key")
	}
	return s.apiKeyRepo.Revoke(id)
}

func (s *apiKeyService) Delete(id string) error {
	_, err := s.apiKeyRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrApiKeyNotFound
		}
		return err
	}

	return s.apiKeyRepo.Delete(id)
}

// DeleteForUser deletes an API key with ownership verification
func (s *apiKeyService) DeleteForUser(id string, userID string) error {
	apiKey, err := s.apiKeyRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrApiKeyNotFound
		}
		return err
	}
	// Verify ownership
	if apiKey.UserID != userID {
		return errors.New("access denied: you don't own this API key")
	}
	return s.apiKeyRepo.Delete(id)
}

func (s *apiKeyService) ValidateKey(plainTextKey string, clientIP string) (*domain.ApiKey, error) {
	// Extract prefix from the key (format: prefix_randompart)
	prefix := extractApiKeyPrefix(plainTextKey)
	if prefix == "" || prefix != ApiKeyPrefix {
		return nil, ErrInvalidApiKey
	}

	// Find all API keys with matching prefix
	apiKeys, err := s.apiKeyRepo.FindByPrefix(prefix)
	if err != nil {
		return nil, ErrInvalidApiKey
	}

	// Verify the key against each stored hash using constant-time comparison
	var matchedKey *domain.ApiKey
	for i := range apiKeys {
		if verifyApiKeyArgon2id(plainTextKey, apiKeys[i].KeyHash) {
			matchedKey = &apiKeys[i]
			break
		}
	}

	if matchedKey == nil {
		return nil, ErrInvalidApiKey
	}

	// Check if active
	if !matchedKey.IsActive {
		return nil, ErrApiKeyInactive
	}

	// Check if expired
	if matchedKey.IsExpired() {
		return nil, ErrApiKeyExpired
	}

	// Check allowed IPs (supports both exact match and CIDR notation)
	if len(matchedKey.AllowedIPs) > 0 {
		if !isIPAllowedInList(clientIP, matchedKey.AllowedIPs) {
			return nil, ErrIPNotAllowed
		}
	}

	return matchedKey, nil
}

func (s *apiKeyService) RecordUsage(id string, ip string) error {
	return s.apiKeyRepo.RecordUsage(id, ip)
}

// generateApiKey generates a cryptographically secure random API key
func generateApiKey() (string, error) {
	bytes := make([]byte, ApiKeyLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// Use URL-safe base64 encoding without padding
	encoded := base64.URLEncoding.EncodeToString(bytes)
	encoded = strings.ReplaceAll(encoded, "=", "")
	encoded = strings.ReplaceAll(encoded, "+", "")
	encoded = strings.ReplaceAll(encoded, "/", "")
	return encoded, nil
}

// hashApiKeyArgon2id hashes an API key using Argon2id algorithm
func hashApiKeyArgon2id(plainKey string) (string, error) {
	// Generate random salt
	salt := make([]byte, DefaultArgon2idParams.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	// Hash with Argon2id
	hash := argon2.IDKey(
		[]byte(plainKey),
		salt,
		DefaultArgon2idParams.Iterations,
		DefaultArgon2idParams.Memory,
		DefaultArgon2idParams.Parallelism,
		DefaultArgon2idParams.KeyLength,
	)

	// Encode as: $argon2id$v=19$m=65536,t=3,p=2$<salt>$<hash>
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, DefaultArgon2idParams.Memory, DefaultArgon2idParams.Iterations,
		DefaultArgon2idParams.Parallelism, b64Salt, b64Hash)

	return encoded, nil
}

// verifyApiKeyArgon2id verifies an API key against a stored Argon2id hash
func verifyApiKeyArgon2id(plainKey, encodedHash string) bool {
	// Parse the encoded hash
	params, salt, hash, err := decodeArgon2idHash(encodedHash)
	if err != nil {
		return false
	}

	// Compute hash with same parameters
	compareHash := argon2.IDKey(
		[]byte(plainKey),
		salt,
		params.Iterations,
		params.Memory,
		params.Parallelism,
		params.KeyLength,
	)

	// Constant-time comparison to prevent timing attacks
	return subtle.ConstantTimeCompare(hash, compareHash) == 1
}

// decodeArgon2idHash parses an encoded Argon2id hash string
func decodeArgon2idHash(encodedHash string) (*Argon2idParams, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return nil, nil, nil, errors.New("invalid hash format")
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return nil, nil, nil, err
	}

	params := &Argon2idParams{}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d",
		&params.Memory, &params.Iterations, &params.Parallelism); err != nil {
		return nil, nil, nil, err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, nil, err
	}

	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, err
	}

	params.SaltLength = uint32(len(salt))
	params.KeyLength = uint32(len(hash))

	return params, salt, hash, nil
}

// extractApiKeyPrefix extracts the prefix from an API key (format: prefix_randompart)
func extractApiKeyPrefix(plainKey string) string {
	// Find the last underscore to split prefix from random part
	parts := strings.SplitN(plainKey, "_", 3)
	if len(parts) < 2 {
		return ""
	}
	// Prefix is "glr_live" so we need first two parts
	return parts[0] + "_" + parts[1]
}

// isIPAllowedInList checks if an IP is allowed against a list of IPs/CIDRs
func isIPAllowedInList(clientIP string, allowedPatterns []string) bool {
	for _, pattern := range allowedPatterns {
		if checkIPAllowed(clientIP, pattern) {
			return true
		}
	}
	return false
}

// checkIPAllowed checks if a client IP matches an allowed pattern (exact or CIDR)
func checkIPAllowed(clientIP string, allowedPattern string) bool {
	// Check for exact match
	if clientIP == allowedPattern {
		return true
	}

	// Check for CIDR notation
	if strings.Contains(allowedPattern, "/") {
		_, network, err := net.ParseCIDR(allowedPattern)
		if err != nil {
			return false
		}
		ip := net.ParseIP(clientIP)
		if ip == nil {
			return false
		}
		return network.Contains(ip)
	}

	return false
}
