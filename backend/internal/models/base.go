package models

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel contains common fields for all entities with UUID primary key
type BaseModel struct {
	ID        string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// BaseModelWithAudit extends BaseModel with audit fields
type BaseModelWithAudit struct {
	BaseModel
	CreatedBy  *string `json:"created_by,omitempty" gorm:"type:varchar(36)"`
	ModifiedBy *string `json:"modified_by,omitempty" gorm:"column:modified_by;type:varchar(36)"`
}

// BaseModelWithSoftDelete extends BaseModel with soft delete capability
type BaseModelWithSoftDelete struct {
	BaseModel
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// BaseModelFull combines all common fields including audit and soft delete
type BaseModelFull struct {
	ID         string         `json:"id" gorm:"type:varchar(36);primaryKey"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	CreatedBy  *string        `json:"created_by,omitempty" gorm:"type:varchar(36)"`
	UpdatedBy  *string        `json:"updated_by,omitempty" gorm:"column:updated_by;type:varchar(36)"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
	DeletedBy  *string        `json:"-" gorm:"column:deleted_by;type:varchar(36)"`
	DeleteReason *string      `json:"-" gorm:"column:delete_reason;type:text"`
}

// VersionedModel adds optimistic locking support
type VersionedModel struct {
	Version int `json:"version" gorm:"default:0"`
}

// ActiveModel adds is_active field for soft enable/disable
type ActiveModel struct {
	IsActive bool `json:"is_active" gorm:"column:is_active;default:true"`
}

// EffectiveDateModel adds effective date range for time-bound records
type EffectiveDateModel struct {
	EffectiveFrom  time.Time  `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty" gorm:"column:effective_until"`
}

// IsEffective checks if the record is currently effective
func (e *EffectiveDateModel) IsEffective() bool {
	now := time.Now()
	if now.Before(e.EffectiveFrom) {
		return false
	}
	if e.EffectiveUntil != nil && now.After(*e.EffectiveUntil) {
		return false
	}
	return true
}
