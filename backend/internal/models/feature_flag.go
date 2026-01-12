package models

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/datatypes"
)

// FeatureFlag represents a feature flag for controlled rollouts
type FeatureFlag struct {
	ID                string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	Key               string          `json:"key" gorm:"type:varchar(100);uniqueIndex;not null"`
	Name              string          `json:"name" gorm:"type:varchar(255);not null"`
	Description       *string         `json:"description,omitempty" gorm:"type:text"`
	Type              string          `json:"type" gorm:"type:varchar(50);not null;index"`
	Enabled           bool            `json:"enabled" gorm:"default:false;index"`
	DefaultValue      *datatypes.JSON `json:"default_value,omitempty" gorm:"column:default_value;type:jsonb"`
	RolloutPercentage int             `json:"rollout_percentage" gorm:"column:rollout_percentage;default:0"`
	Conditions        *datatypes.JSON `json:"conditions,omitempty" gorm:"type:jsonb"`
	TargetUsers       pq.StringArray  `json:"target_users,omitempty" gorm:"column:target_users;type:text[]"`
	TargetRoles       pq.StringArray  `json:"target_roles,omitempty" gorm:"column:target_roles;type:text[]"`
	TargetSchools     pq.StringArray  `json:"target_schools,omitempty" gorm:"column:target_schools;type:text[]"`
	StartDate         *time.Time      `json:"start_date,omitempty" gorm:"column:start_date"`
	EndDate           *time.Time      `json:"end_date,omitempty" gorm:"column:end_date"`
	Metadata          *datatypes.JSON `json:"metadata,omitempty" gorm:"type:jsonb"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	CreatedBy         *string         `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`

	// Relations
	Evaluations []FeatureFlagEvaluation `json:"-" gorm:"foreignKey:FeatureFlagID"`
}

// TableName specifies the table name for FeatureFlag
func (FeatureFlag) TableName() string {
	return "public.feature_flags"
}

// FeatureFlagEvaluation represents an evaluation record of a feature flag
type FeatureFlagEvaluation struct {
	ID            string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	FeatureFlagID string          `json:"feature_flag_id" gorm:"column:feature_flag_id;type:varchar(36);not null;index"`
	UserID        *string         `json:"user_id,omitempty" gorm:"column:user_id;type:varchar(36);index"`
	Result        bool            `json:"result" gorm:"not null"`
	Reason        string          `json:"reason" gorm:"type:varchar(255);not null"`
	Context       *datatypes.JSON `json:"context,omitempty" gorm:"type:jsonb"`
	EvaluatedAt   time.Time       `json:"evaluated_at" gorm:"column:evaluated_at;not null;default:CURRENT_TIMESTAMP;index"`

	// Relations
	FeatureFlag *FeatureFlag `json:"feature_flag,omitempty" gorm:"foreignKey:FeatureFlagID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for FeatureFlagEvaluation
func (FeatureFlagEvaluation) TableName() string {
	return "public.feature_flag_evaluations"
}

// CreateFeatureFlagRequest represents the request body for creating a feature flag
type CreateFeatureFlagRequest struct {
	Key               string          `json:"key" binding:"required,min=2,max=100"`
	Name              string          `json:"name" binding:"required,min=2,max=255"`
	Description       *string         `json:"description,omitempty"`
	Type              string          `json:"type" binding:"required,min=2,max=50"`
	Enabled           *bool           `json:"enabled,omitempty"`
	DefaultValue      *datatypes.JSON `json:"default_value,omitempty"`
	RolloutPercentage *int            `json:"rollout_percentage,omitempty" binding:"omitempty,min=0,max=100"`
	Conditions        *datatypes.JSON `json:"conditions,omitempty"`
	TargetUsers       []string        `json:"target_users,omitempty"`
	TargetRoles       []string        `json:"target_roles,omitempty"`
	TargetSchools     []string        `json:"target_schools,omitempty"`
	StartDate         *time.Time      `json:"start_date,omitempty"`
	EndDate           *time.Time      `json:"end_date,omitempty"`
	Metadata          *datatypes.JSON `json:"metadata,omitempty"`
}

// UpdateFeatureFlagRequest represents the request body for updating a feature flag
type UpdateFeatureFlagRequest struct {
	Name              *string         `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	Description       *string         `json:"description,omitempty"`
	Enabled           *bool           `json:"enabled,omitempty"`
	DefaultValue      *datatypes.JSON `json:"default_value,omitempty"`
	RolloutPercentage *int            `json:"rollout_percentage,omitempty" binding:"omitempty,min=0,max=100"`
	Conditions        *datatypes.JSON `json:"conditions,omitempty"`
	TargetUsers       []string        `json:"target_users,omitempty"`
	TargetRoles       []string        `json:"target_roles,omitempty"`
	TargetSchools     []string        `json:"target_schools,omitempty"`
	StartDate         *time.Time      `json:"start_date,omitempty"`
	EndDate           *time.Time      `json:"end_date,omitempty"`
	Metadata          *datatypes.JSON `json:"metadata,omitempty"`
}

// FeatureFlagResponse represents the response body for feature flag data
type FeatureFlagResponse struct {
	ID                string          `json:"id"`
	Key               string          `json:"key"`
	Name              string          `json:"name"`
	Description       *string         `json:"description,omitempty"`
	Type              string          `json:"type"`
	Enabled           bool            `json:"enabled"`
	DefaultValue      *datatypes.JSON `json:"default_value,omitempty"`
	RolloutPercentage int             `json:"rollout_percentage"`
	Conditions        *datatypes.JSON `json:"conditions,omitempty"`
	TargetUsers       []string        `json:"target_users,omitempty"`
	TargetRoles       []string        `json:"target_roles,omitempty"`
	TargetSchools     []string        `json:"target_schools,omitempty"`
	StartDate         *time.Time      `json:"start_date,omitempty"`
	EndDate           *time.Time      `json:"end_date,omitempty"`
	Metadata          *datatypes.JSON `json:"metadata,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
	CreatedBy         *string         `json:"created_by,omitempty"`
}

// FeatureFlagListResponse represents the response for listing feature flags
type FeatureFlagListResponse struct {
	ID                string     `json:"id"`
	Key               string     `json:"key"`
	Name              string     `json:"name"`
	Type              string     `json:"type"`
	Enabled           bool       `json:"enabled"`
	RolloutPercentage int        `json:"rollout_percentage"`
	StartDate         *time.Time `json:"start_date,omitempty"`
	EndDate           *time.Time `json:"end_date,omitempty"`
}

// ToResponse converts FeatureFlag to FeatureFlagResponse
func (f *FeatureFlag) ToResponse() *FeatureFlagResponse {
	return &FeatureFlagResponse{
		ID:                f.ID,
		Key:               f.Key,
		Name:              f.Name,
		Description:       f.Description,
		Type:              f.Type,
		Enabled:           f.Enabled,
		DefaultValue:      f.DefaultValue,
		RolloutPercentage: f.RolloutPercentage,
		Conditions:        f.Conditions,
		TargetUsers:       []string(f.TargetUsers),
		TargetRoles:       []string(f.TargetRoles),
		TargetSchools:     []string(f.TargetSchools),
		StartDate:         f.StartDate,
		EndDate:           f.EndDate,
		Metadata:          f.Metadata,
		CreatedAt:         f.CreatedAt,
		UpdatedAt:         f.UpdatedAt,
		CreatedBy:         f.CreatedBy,
	}
}

// ToListResponse converts FeatureFlag to FeatureFlagListResponse
func (f *FeatureFlag) ToListResponse() *FeatureFlagListResponse {
	return &FeatureFlagListResponse{
		ID:                f.ID,
		Key:               f.Key,
		Name:              f.Name,
		Type:              f.Type,
		Enabled:           f.Enabled,
		RolloutPercentage: f.RolloutPercentage,
		StartDate:         f.StartDate,
		EndDate:           f.EndDate,
	}
}

// IsActiveNow checks if the feature flag is currently active based on dates
func (f *FeatureFlag) IsActiveNow() bool {
	if !f.Enabled {
		return false
	}
	now := time.Now()
	if f.StartDate != nil && now.Before(*f.StartDate) {
		return false
	}
	if f.EndDate != nil && now.After(*f.EndDate) {
		return false
	}
	return true
}
