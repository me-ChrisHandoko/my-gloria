package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// ApiKey represents an API key for programmatic access
type ApiKey struct {
	ID            string         `json:"id" gorm:"type:varchar(36);primaryKey"`
	Name          string         `json:"name" gorm:"type:varchar(255);not null"`
	KeyHash       string         `json:"-" gorm:"column:key_hash;type:varchar(255);uniqueIndex;not null"`
	Prefix        string         `json:"prefix" gorm:"type:varchar(10);not null;index"`
	LastFourChars string         `json:"last_four_chars" gorm:"column:last_four_chars;type:varchar(4);not null"`
	Algorithm     string         `json:"algorithm" gorm:"type:varchar(20);default:'argon2id'"`
	UserID        string         `json:"user_id" gorm:"column:user_id;type:varchar(36);not null;index"`
	Description   *string        `json:"description,omitempty" gorm:"type:text"`
	Permissions   *datatypes.JSON `json:"permissions,omitempty" gorm:"type:jsonb"`
	RateLimit     *int           `json:"rate_limit,omitempty" gorm:"column:rate_limit"`
	AllowedIPs    pq.StringArray `json:"allowed_ips,omitempty" gorm:"column:allowed_ips;type:text[]"`
	LastUsedAt    *time.Time     `json:"last_used_at,omitempty" gorm:"column:last_used_at"`
	LastUsedIP    *string        `json:"last_used_ip,omitempty" gorm:"column:last_used_ip;type:varchar(45)"`
	UsageCount    int            `json:"usage_count" gorm:"column:usage_count;default:0"`
	ExpiresAt     *time.Time     `json:"expires_at,omitempty" gorm:"column:expires_at"`
	IsActive      bool           `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName specifies the table name for ApiKey
func (ApiKey) TableName() string {
	return "public.api_keys"
}

// CreateApiKeyRequest represents the request body for creating an API key
type CreateApiKeyRequest struct {
	Name        string         `json:"name" binding:"required,min=2,max=255"`
	Description *string        `json:"description,omitempty"`
	Permissions *datatypes.JSON `json:"permissions,omitempty"`
	RateLimit   *int           `json:"rate_limit,omitempty" binding:"omitempty,min=1"`
	AllowedIPs  []string       `json:"allowed_ips,omitempty"`
	ExpiresAt   *time.Time     `json:"expires_at,omitempty"`
}

// ApiKeyResponse represents the response body for API key data
type ApiKeyResponse struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Prefix        string          `json:"prefix"`
	LastFourChars string          `json:"last_four_chars"`
	Description   *string         `json:"description,omitempty"`
	Permissions   *datatypes.JSON `json:"permissions,omitempty"`
	RateLimit     *int            `json:"rate_limit,omitempty"`
	AllowedIPs    []string        `json:"allowed_ips,omitempty"`
	LastUsedAt    *time.Time      `json:"last_used_at,omitempty"`
	UsageCount    int             `json:"usage_count"`
	ExpiresAt     *time.Time      `json:"expires_at,omitempty"`
	IsActive      bool            `json:"is_active"`
	CreatedAt     time.Time       `json:"created_at"`
}

// ApiKeyCreatedResponse includes the plain-text key (only returned once on creation)
type ApiKeyCreatedResponse struct {
	ApiKeyResponse
	PlainTextKey string `json:"key"`
}

// ApiKeyListResponse represents the response for listing API keys
type ApiKeyListResponse struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Prefix        string     `json:"prefix"`
	LastFourChars string     `json:"last_four_chars"`
	LastUsedAt    *time.Time `json:"last_used_at,omitempty"`
	UsageCount    int        `json:"usage_count"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	IsActive      bool       `json:"is_active"`
}

// ToResponse converts ApiKey to ApiKeyResponse
func (a *ApiKey) ToResponse() *ApiKeyResponse {
	var allowedIPs []string
	if a.AllowedIPs != nil {
		allowedIPs = []string(a.AllowedIPs)
	}

	return &ApiKeyResponse{
		ID:            a.ID,
		Name:          a.Name,
		Prefix:        a.Prefix,
		LastFourChars: a.LastFourChars,
		Description:   a.Description,
		Permissions:   a.Permissions,
		RateLimit:     a.RateLimit,
		AllowedIPs:    allowedIPs,
		LastUsedAt:    a.LastUsedAt,
		UsageCount:    a.UsageCount,
		ExpiresAt:     a.ExpiresAt,
		IsActive:      a.IsActive,
		CreatedAt:     a.CreatedAt,
	}
}

// ToListResponse converts ApiKey to ApiKeyListResponse
func (a *ApiKey) ToListResponse() *ApiKeyListResponse {
	return &ApiKeyListResponse{
		ID:            a.ID,
		Name:          a.Name,
		Prefix:        a.Prefix,
		LastFourChars: a.LastFourChars,
		LastUsedAt:    a.LastUsedAt,
		UsageCount:    a.UsageCount,
		ExpiresAt:     a.ExpiresAt,
		IsActive:      a.IsActive,
	}
}

// IsExpired checks if the API key has expired
func (a *ApiKey) IsExpired() bool {
	if a.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*a.ExpiresAt)
}

// IsValid checks if the API key is valid for use
func (a *ApiKey) IsValid() bool {
	return a.IsActive && !a.IsExpired()
}

// DisplayKey returns a masked representation of the key
func (a *ApiKey) DisplayKey() string {
	return a.Prefix + "_****" + a.LastFourChars
}
