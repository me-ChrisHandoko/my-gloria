package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend/internal/auth"
	"backend/internal/models"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// ApiKeyService handles business logic for API keys
type ApiKeyService struct {
	db *gorm.DB
}

// NewApiKeyService creates a new ApiKeyService instance
func NewApiKeyService(db *gorm.DB) *ApiKeyService {
	return &ApiKeyService{db: db}
}

// ApiKeyListParams represents parameters for listing API keys
type ApiKeyListParams struct {
	Page      int
	PageSize  int
	Search    string
	IsActive  *bool
	SortBy    string
	SortOrder string
}

// ApiKeyListResult represents the result of listing API keys
type ApiKeyListResult struct {
	Data       []*models.ApiKeyListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// GeneratedApiKey contains the generated API key details
type GeneratedApiKey struct {
	PlainKey      string
	Prefix        string
	LastFourChars string
	KeyHash       string
}

// generateSecureKey generates a cryptographically secure API key
// Format: gla_<32 base64url characters>
// Example: gla_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6
func (s *ApiKeyService) generateSecureKey() (*GeneratedApiKey, error) {
	// Generate 24 random bytes (will become 32 base64 chars)
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode to base64url (URL-safe, no padding)
	keyBody := base64.RawURLEncoding.EncodeToString(randomBytes)

	// Build the full key
	prefix := "gla"
	plainKey := prefix + "_" + keyBody
	lastFour := keyBody[len(keyBody)-4:]

	// Hash the full key using argon2id (same as password hashing)
	keyHash, err := auth.HashPassword(plainKey)
	if err != nil {
		return nil, fmt.Errorf("failed to hash API key: %w", err)
	}

	return &GeneratedApiKey{
		PlainKey:      plainKey,
		Prefix:        prefix,
		LastFourChars: lastFour,
		KeyHash:       keyHash,
	}, nil
}

// CreateApiKey creates a new API key for a user
func (s *ApiKeyService) CreateApiKey(req models.CreateApiKeyRequest, userID string) (*models.ApiKeyCreatedResponse, error) {
	// Generate secure API key
	generated, err := s.generateSecureKey()
	if err != nil {
		return nil, fmt.Errorf("gagal membuat API key: %w", err)
	}

	// Convert allowed IPs to pq.StringArray
	var allowedIPs pq.StringArray
	if len(req.AllowedIPs) > 0 {
		allowedIPs = pq.StringArray(req.AllowedIPs)
	}

	// Create API key entity
	apiKey := models.ApiKey{
		ID:            uuid.New().String(),
		Name:          req.Name,
		KeyHash:       generated.KeyHash,
		Prefix:        generated.Prefix,
		LastFourChars: generated.LastFourChars,
		Algorithm:     "argon2id",
		UserID:        userID,
		Description:   req.Description,
		Permissions:   req.Permissions,
		RateLimit:     req.RateLimit,
		AllowedIPs:    allowedIPs,
		ExpiresAt:     req.ExpiresAt,
		IsActive:      true,
	}

	// Persist to database
	if err := s.db.Create(&apiKey).Error; err != nil {
		return nil, fmt.Errorf("gagal menyimpan API key: %w", err)
	}

	// Return response with plain key (only shown once!)
	return &models.ApiKeyCreatedResponse{
		ApiKeyResponse: *apiKey.ToResponse(),
		PlainTextKey:   generated.PlainKey,
	}, nil
}

// ValidateApiKey validates an API key and returns the associated ApiKey record
func (s *ApiKeyService) ValidateApiKey(plainKey string) (*models.ApiKey, error) {
	// Parse the key to extract prefix
	parts := strings.SplitN(plainKey, "_", 2)
	if len(parts) != 2 {
		return nil, errors.New("format API key tidak valid")
	}
	prefix := parts[0]

	// Find all active keys with this prefix
	var keys []models.ApiKey
	if err := s.db.Where("prefix = ? AND is_active = ?", prefix, true).Find(&keys).Error; err != nil {
		return nil, fmt.Errorf("gagal mencari API key: %w", err)
	}

	// Iterate and verify hash (constant-time comparison via argon2)
	for i := range keys {
		if auth.VerifyPassword(plainKey, keys[i].KeyHash) {
			// Found matching key, check if valid
			if !keys[i].IsValid() {
				if keys[i].IsExpired() {
					return nil, errors.New("API key sudah kadaluarsa")
				}
				return nil, errors.New("API key tidak aktif")
			}
			return &keys[i], nil
		}
	}

	return nil, errors.New("API key tidak valid")
}

// UpdateApiKeyUsage updates usage statistics for an API key
func (s *ApiKeyService) UpdateApiKeyUsage(keyID string, clientIP string) error {
	now := time.Now()
	return s.db.Model(&models.ApiKey{}).
		Where("id = ?", keyID).
		Updates(map[string]interface{}{
			"last_used_at": now,
			"last_used_ip": clientIP,
			"usage_count":  gorm.Expr("usage_count + 1"),
		}).Error
}

// GetApiKeys retrieves list of API keys for a user with pagination
func (s *ApiKeyService) GetApiKeys(userID string, params ApiKeyListParams) (*ApiKeyListResult, error) {
	query := s.db.Model(&models.ApiKey{}).Where("user_id = ?", userID)

	// Apply search filter
	if params.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total API key: %w", err)
	}

	// Apply sorting with SQL injection prevention
	if params.SortBy != "" {
		validSortColumns := map[string]bool{
			"name": true, "created_at": true, "last_used_at": true,
			"usage_count": true, "expires_at": true, "is_active": true,
		}
		if validSortColumns[params.SortBy] {
			direction := "ASC"
			if strings.ToLower(params.SortOrder) == "desc" {
				direction = "DESC"
			}
			query = query.Order(fmt.Sprintf("%s %s", params.SortBy, direction))
		}
	} else {
		query = query.Order("created_at DESC")
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch API keys
	var keys []models.ApiKey
	if err := query.Find(&keys).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data API key: %w", err)
	}

	// Convert to list response
	keyList := make([]*models.ApiKeyListResponse, len(keys))
	for i, key := range keys {
		keyList[i] = key.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &ApiKeyListResult{
		Data:       keyList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetApiKeyByID retrieves an API key by ID (must belong to user)
func (s *ApiKeyService) GetApiKeyByID(id string, userID string) (*models.ApiKey, error) {
	var key models.ApiKey
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&key).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("API key tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil API key: %w", err)
	}

	return &key, nil
}

// RevokeApiKey deactivates an API key
func (s *ApiKeyService) RevokeApiKey(id string, userID string) error {
	// Verify ownership
	key, err := s.GetApiKeyByID(id, userID)
	if err != nil {
		return err
	}

	// Deactivate the key
	key.IsActive = false
	if err := s.db.Save(&key).Error; err != nil {
		return fmt.Errorf("gagal menonaktifkan API key: %w", err)
	}

	return nil
}

// DeleteApiKey permanently deletes an API key
func (s *ApiKeyService) DeleteApiKey(id string, userID string) error {
	// Verify ownership
	key, err := s.GetApiKeyByID(id, userID)
	if err != nil {
		return err
	}

	// Delete the key
	if err := s.db.Delete(&key).Error; err != nil {
		return fmt.Errorf("gagal menghapus API key: %w", err)
	}

	return nil
}

// IsIPAllowed checks if a client IP is in the allowed list
func (s *ApiKeyService) IsIPAllowed(clientIP string, allowedIPs []string) bool {
	if len(allowedIPs) == 0 {
		return true // No restrictions
	}

	for _, ip := range allowedIPs {
		if ip == clientIP {
			return true
		}
		// Support CIDR notation in the future if needed
		// For now, exact match only
	}

	return false
}
