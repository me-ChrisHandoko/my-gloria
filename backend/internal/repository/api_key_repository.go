package repository

import (
	"time"

	"backend/internal/domain"

	"gorm.io/gorm"
)

// ApiKeyRepository defines the interface for API key data access
type ApiKeyRepository interface {
	FindAll(userID string) ([]domain.ApiKey, error)
	FindByID(id string) (*domain.ApiKey, error)
	FindByPrefix(prefix string) ([]domain.ApiKey, error)
	FindActiveByUserID(userID string) ([]domain.ApiKey, error)
	Create(apiKey *domain.ApiKey) error
	Update(apiKey *domain.ApiKey) error
	Delete(id string) error
	Revoke(id string) error
	RecordUsage(id string, ip string) error
}

// apiKeyRepository implements ApiKeyRepository
type apiKeyRepository struct {
	db *gorm.DB
}

// NewApiKeyRepository creates a new API key repository instance
func NewApiKeyRepository(db *gorm.DB) ApiKeyRepository {
	return &apiKeyRepository{db: db}
}

// FindAll retrieves all API keys for a user
func (r *apiKeyRepository) FindAll(userID string) ([]domain.ApiKey, error) {
	var keys []domain.ApiKey
	if err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

// FindByID retrieves an API key by ID
func (r *apiKeyRepository) FindByID(id string) (*domain.ApiKey, error) {
	var key domain.ApiKey
	if err := r.db.First(&key, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &key, nil
}

// FindByPrefix retrieves all API keys with a matching prefix
func (r *apiKeyRepository) FindByPrefix(prefix string) ([]domain.ApiKey, error) {
	var keys []domain.ApiKey
	if err := r.db.Where("prefix = ? AND is_active = ?", prefix, true).Find(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

// FindActiveByUserID retrieves all active API keys for a user
func (r *apiKeyRepository) FindActiveByUserID(userID string) ([]domain.ApiKey, error) {
	var keys []domain.ApiKey
	if err := r.db.Where("user_id = ? AND is_active = ?", userID, true).
		Order("created_at DESC").
		Find(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

// Create creates a new API key
func (r *apiKeyRepository) Create(apiKey *domain.ApiKey) error {
	return r.db.Create(apiKey).Error
}

// Update updates an existing API key
func (r *apiKeyRepository) Update(apiKey *domain.ApiKey) error {
	return r.db.Save(apiKey).Error
}

// Delete hard deletes an API key by ID
func (r *apiKeyRepository) Delete(id string) error {
	return r.db.Delete(&domain.ApiKey{}, "id = ?", id).Error
}

// Revoke marks an API key as inactive
func (r *apiKeyRepository) Revoke(id string) error {
	return r.db.Model(&domain.ApiKey{}).Where("id = ?", id).Update("is_active", false).Error
}

// RecordUsage updates the usage statistics for an API key
func (r *apiKeyRepository) RecordUsage(id string, ip string) error {
	now := time.Now()
	return r.db.Model(&domain.ApiKey{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_used_at": now,
		"last_used_ip": ip,
		"usage_count":  gorm.Expr("usage_count + 1"),
	}).Error
}
