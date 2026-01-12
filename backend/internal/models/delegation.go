package models

import (
	"time"

	"gorm.io/datatypes"
)

// Delegation represents a delegation of authority between users
type Delegation struct {
	ID             string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	Type           DelegationType  `json:"type" gorm:"type:varchar(20);not null"`
	DelegatorID    string          `json:"delegator_id" gorm:"column:delegator_id;type:varchar(36);not null"`
	DelegateID     string          `json:"delegate_id" gorm:"column:delegate_id;type:varchar(36);not null"`
	Reason         *string         `json:"reason,omitempty" gorm:"type:text"`
	EffectiveFrom  time.Time       `json:"effective_from" gorm:"column:effective_from;not null;default:CURRENT_TIMESTAMP"`
	EffectiveUntil *time.Time      `json:"effective_until,omitempty" gorm:"column:effective_until"`
	IsActive       bool            `json:"is_active" gorm:"column:is_active;default:true"`
	Context        *datatypes.JSON `json:"context,omitempty" gorm:"type:jsonb"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	CreatedBy      *string         `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`

	// Relations
	Delegator *User `json:"delegator,omitempty" gorm:"foreignKey:DelegatorID"`
	Delegate  *User `json:"delegate,omitempty" gorm:"foreignKey:DelegateID"`
}

// TableName specifies the table name for Delegation
func (Delegation) TableName() string {
	return "public.delegations"
}

// CreateDelegationRequest represents the request body for creating a delegation
type CreateDelegationRequest struct {
	Type           DelegationType  `json:"type" binding:"required"`
	DelegateID     string          `json:"delegate_id" binding:"required,len=36"`
	Reason         *string         `json:"reason,omitempty"`
	EffectiveFrom  *time.Time      `json:"effective_from,omitempty"`
	EffectiveUntil *time.Time      `json:"effective_until,omitempty"`
	Context        *datatypes.JSON `json:"context,omitempty"`
}

// UpdateDelegationRequest represents the request body for updating a delegation
type UpdateDelegationRequest struct {
	Reason         *string         `json:"reason,omitempty"`
	EffectiveFrom  *time.Time      `json:"effective_from,omitempty"`
	EffectiveUntil *time.Time      `json:"effective_until,omitempty"`
	IsActive       *bool           `json:"is_active,omitempty"`
	Context        *datatypes.JSON `json:"context,omitempty"`
}

// DelegationResponse represents the response body for delegation data
type DelegationResponse struct {
	ID             string                   `json:"id"`
	Type           DelegationType           `json:"type"`
	DelegatorID    string                   `json:"delegator_id"`
	Delegator      *UserListResponse `json:"delegator,omitempty"`
	DelegateID     string                   `json:"delegate_id"`
	Delegate       *UserListResponse `json:"delegate,omitempty"`
	Reason         *string                  `json:"reason,omitempty"`
	EffectiveFrom  time.Time                `json:"effective_from"`
	EffectiveUntil *time.Time               `json:"effective_until,omitempty"`
	IsActive       bool                     `json:"is_active"`
	Context        *datatypes.JSON          `json:"context,omitempty"`
	CreatedAt      time.Time                `json:"created_at"`
	UpdatedAt      time.Time                `json:"updated_at"`
	CreatedBy      *string                  `json:"created_by,omitempty"`
}

// DelegationListResponse represents the response for listing delegations
type DelegationListResponse struct {
	ID             string         `json:"id"`
	Type           DelegationType `json:"type"`
	DelegatorName  *string        `json:"delegator_name,omitempty"`
	DelegateName   *string        `json:"delegate_name,omitempty"`
	EffectiveFrom  time.Time      `json:"effective_from"`
	EffectiveUntil *time.Time     `json:"effective_until,omitempty"`
	IsActive       bool           `json:"is_active"`
}

// ToResponse converts Delegation to DelegationResponse
func (d *Delegation) ToResponse() *DelegationResponse {
	resp := &DelegationResponse{
		ID:             d.ID,
		Type:           d.Type,
		DelegatorID:    d.DelegatorID,
		DelegateID:     d.DelegateID,
		Reason:         d.Reason,
		EffectiveFrom:  d.EffectiveFrom,
		EffectiveUntil: d.EffectiveUntil,
		IsActive:       d.IsActive,
		Context:        d.Context,
		CreatedAt:      d.CreatedAt,
		UpdatedAt:      d.UpdatedAt,
		CreatedBy:      d.CreatedBy,
	}

	if d.Delegator != nil {
		resp.Delegator = d.Delegator.ToListResponse()
	}

	if d.Delegate != nil {
		resp.Delegate = d.Delegate.ToListResponse()
	}

	return resp
}

// ToListResponse converts Delegation to DelegationListResponse
func (d *Delegation) ToListResponse() *DelegationListResponse {
	resp := &DelegationListResponse{
		ID:             d.ID,
		Type:           d.Type,
		EffectiveFrom:  d.EffectiveFrom,
		EffectiveUntil: d.EffectiveUntil,
		IsActive:       d.IsActive,
	}

	if d.Delegator != nil {
		if d.Delegator.Username != nil {
			resp.DelegatorName = d.Delegator.Username
		} else {
			email := d.Delegator.Email
			resp.DelegatorName = &email
		}
	}

	if d.Delegate != nil {
		if d.Delegate.Username != nil {
			resp.DelegateName = d.Delegate.Username
		} else {
			email := d.Delegate.Email
			resp.DelegateName = &email
		}
	}

	return resp
}

// IsEffective checks if the delegation is currently effective
func (d *Delegation) IsEffective() bool {
	if !d.IsActive {
		return false
	}
	now := time.Now()
	if now.Before(d.EffectiveFrom) {
		return false
	}
	if d.EffectiveUntil != nil && now.After(*d.EffectiveUntil) {
		return false
	}
	return true
}
