package models

import (
	"time"

	"gorm.io/datatypes"
)

// SystemConfiguration represents a system configuration entry
type SystemConfiguration struct {
	ID              string         `json:"id" gorm:"type:varchar(36);primaryKey"`
	Key             string         `json:"key" gorm:"type:varchar(100);uniqueIndex;not null"`
	Value           datatypes.JSON `json:"value" gorm:"type:jsonb;not null"`
	Type            string         `json:"type" gorm:"type:varchar(50);not null"`
	Category        string         `json:"category" gorm:"type:varchar(50);not null;index"`
	Description     *string        `json:"description,omitempty" gorm:"type:text"`
	IsEncrypted     bool           `json:"is_encrypted" gorm:"column:is_encrypted;default:false"`
	IsPublic        bool           `json:"is_public" gorm:"column:is_public;default:false;index"`
	Metadata        *datatypes.JSON `json:"metadata,omitempty" gorm:"type:jsonb"`
	ValidationRules *datatypes.JSON `json:"validation_rules,omitempty" gorm:"column:validation_rules;type:jsonb"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	UpdatedBy       *string        `json:"updated_by,omitempty" gorm:"column:updated_by;type:varchar(36)"`
}

// TableName specifies the table name for SystemConfiguration
func (SystemConfiguration) TableName() string {
	return "public.system_configurations"
}

// CreateSystemConfigRequest represents the request body for creating a system config
type CreateSystemConfigRequest struct {
	Key             string          `json:"key" binding:"required,min=2,max=100"`
	Value           datatypes.JSON  `json:"value" binding:"required"`
	Type            string          `json:"type" binding:"required,min=2,max=50"`
	Category        string          `json:"category" binding:"required,min=2,max=50"`
	Description     *string         `json:"description,omitempty"`
	IsEncrypted     *bool           `json:"is_encrypted,omitempty"`
	IsPublic        *bool           `json:"is_public,omitempty"`
	Metadata        *datatypes.JSON `json:"metadata,omitempty"`
	ValidationRules *datatypes.JSON `json:"validation_rules,omitempty"`
}

// UpdateSystemConfigRequest represents the request body for updating a system config
type UpdateSystemConfigRequest struct {
	Value           *datatypes.JSON `json:"value,omitempty"`
	Description     *string         `json:"description,omitempty"`
	IsEncrypted     *bool           `json:"is_encrypted,omitempty"`
	IsPublic        *bool           `json:"is_public,omitempty"`
	Metadata        *datatypes.JSON `json:"metadata,omitempty"`
	ValidationRules *datatypes.JSON `json:"validation_rules,omitempty"`
}

// SystemConfigResponse represents the response body for system config data
type SystemConfigResponse struct {
	ID              string          `json:"id"`
	Key             string          `json:"key"`
	Value           datatypes.JSON  `json:"value"`
	Type            string          `json:"type"`
	Category        string          `json:"category"`
	Description     *string         `json:"description,omitempty"`
	IsEncrypted     bool            `json:"is_encrypted"`
	IsPublic        bool            `json:"is_public"`
	Metadata        *datatypes.JSON `json:"metadata,omitempty"`
	ValidationRules *datatypes.JSON `json:"validation_rules,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	UpdatedBy       *string         `json:"updated_by,omitempty"`
}

// SystemConfigListResponse represents the response for listing system configs
type SystemConfigListResponse struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Type        string    `json:"type"`
	Category    string    `json:"category"`
	Description *string   `json:"description,omitempty"`
	IsEncrypted bool      `json:"is_encrypted"`
	IsPublic    bool      `json:"is_public"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SystemConfigPublicResponse represents the public response (only public configs)
type SystemConfigPublicResponse struct {
	Key      string         `json:"key"`
	Value    datatypes.JSON `json:"value"`
	Type     string         `json:"type"`
	Category string         `json:"category"`
}

// ToResponse converts SystemConfiguration to SystemConfigResponse
func (s *SystemConfiguration) ToResponse() *SystemConfigResponse {
	return &SystemConfigResponse{
		ID:              s.ID,
		Key:             s.Key,
		Value:           s.Value,
		Type:            s.Type,
		Category:        s.Category,
		Description:     s.Description,
		IsEncrypted:     s.IsEncrypted,
		IsPublic:        s.IsPublic,
		Metadata:        s.Metadata,
		ValidationRules: s.ValidationRules,
		CreatedAt:       s.CreatedAt,
		UpdatedAt:       s.UpdatedAt,
		UpdatedBy:       s.UpdatedBy,
	}
}

// ToListResponse converts SystemConfiguration to SystemConfigListResponse
func (s *SystemConfiguration) ToListResponse() *SystemConfigListResponse {
	return &SystemConfigListResponse{
		ID:          s.ID,
		Key:         s.Key,
		Type:        s.Type,
		Category:    s.Category,
		Description: s.Description,
		IsEncrypted: s.IsEncrypted,
		IsPublic:    s.IsPublic,
		UpdatedAt:   s.UpdatedAt,
	}
}

// ToPublicResponse converts SystemConfiguration to SystemConfigPublicResponse
func (s *SystemConfiguration) ToPublicResponse() *SystemConfigPublicResponse {
	if !s.IsPublic {
		return nil
	}
	return &SystemConfigPublicResponse{
		Key:      s.Key,
		Value:    s.Value,
		Type:     s.Type,
		Category: s.Category,
	}
}
