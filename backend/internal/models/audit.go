package models

import (
	"time"

	"gorm.io/datatypes"
)

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID             string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	ActorID        string          `json:"actor_id" gorm:"column:actor_id;type:varchar(100);not null"`
	ActorProfileID *string         `json:"actor_profile_id,omitempty" gorm:"column:actor_profile_id;type:varchar(36)"`
	Action         AuditAction     `json:"action" gorm:"type:varchar(20);not null"`
	Module         string          `json:"module" gorm:"type:varchar(100);not null"`
	EntityType     string          `json:"entity_type" gorm:"column:entity_type;type:varchar(100);not null"`
	EntityID       string          `json:"entity_id" gorm:"column:entity_id;type:varchar(100);not null"`
	EntityDisplay  *string         `json:"entity_display,omitempty" gorm:"column:entity_display;type:varchar(255)"`
	OldValues      *datatypes.JSON `json:"old_values,omitempty" gorm:"column:old_values;type:jsonb"`
	NewValues      *datatypes.JSON `json:"new_values,omitempty" gorm:"column:new_values;type:jsonb"`
	ChangedFields  *datatypes.JSON `json:"changed_fields,omitempty" gorm:"column:changed_fields;type:jsonb"`
	TargetUserID   *string         `json:"target_user_id,omitempty" gorm:"column:target_user_id;type:varchar(36)"`
	Metadata       *datatypes.JSON `json:"metadata,omitempty" gorm:"type:jsonb"`
	IPAddress      *string         `json:"ip_address,omitempty" gorm:"column:ip_address;type:varchar(45)"`
	UserAgent      *string         `json:"user_agent,omitempty" gorm:"column:user_agent;type:text"`
	CreatedAt      time.Time       `json:"created_at"`
	Category       *AuditCategory  `json:"category,omitempty" gorm:"type:varchar(30)"`

	// Relations
	Actor      *User `json:"actor,omitempty" gorm:"foreignKey:ActorProfileID"`
	TargetUser *User `json:"target_user,omitempty" gorm:"foreignKey:TargetUserID"`
}

// TableName specifies the table name for AuditLog
func (AuditLog) TableName() string {
	return "public.audit_logs"
}

// AuditLogResponse represents the response body for audit log data
type AuditLogResponse struct {
	ID             string                   `json:"id"`
	ActorID        string                   `json:"actor_id"`
	ActorProfileID *string                  `json:"actor_profile_id,omitempty"`
	ActorName      *string                  `json:"actor_name,omitempty"`
	Action         AuditAction              `json:"action"`
	Module         string                   `json:"module"`
	EntityType     string                   `json:"entity_type"`
	EntityID       string                   `json:"entity_id"`
	EntityDisplay  *string                  `json:"entity_display,omitempty"`
	OldValues      *datatypes.JSON          `json:"old_values,omitempty"`
	NewValues      *datatypes.JSON          `json:"new_values,omitempty"`
	ChangedFields  *datatypes.JSON          `json:"changed_fields,omitempty"`
	TargetUserID   *string                  `json:"target_user_id,omitempty"`
	TargetUserName *string                  `json:"target_user_name,omitempty"`
	Metadata       *datatypes.JSON          `json:"metadata,omitempty"`
	IPAddress      *string                  `json:"ip_address,omitempty"`
	UserAgent      *string                  `json:"user_agent,omitempty"`
	CreatedAt      time.Time                `json:"created_at"`
	Category       *AuditCategory           `json:"category,omitempty"`
}

// AuditLogListResponse represents the response for listing audit logs
type AuditLogListResponse struct {
	ID            string       `json:"id"`
	ActorID       string       `json:"actor_id"`
	ActorName     *string      `json:"actor_name,omitempty"`
	Action        AuditAction  `json:"action"`
	Module        string       `json:"module"`
	EntityType    string       `json:"entity_type"`
	EntityID      string       `json:"entity_id"`
	EntityDisplay *string      `json:"entity_display,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
	Category      *AuditCategory `json:"category,omitempty"`
}

// AuditLogFilter represents filters for querying audit logs
type AuditLogFilter struct {
	ActorProfileID *string        `form:"actor_profile_id"`
	Action         *AuditAction   `form:"action"`
	Module         *string        `form:"module"`
	EntityType     *string        `form:"entity_type"`
	EntityID       *string        `form:"entity_id"`
	Category       *AuditCategory `form:"category"`
	TargetUserID   *string        `form:"target_user_id"`
	StartDate      *time.Time     `form:"start_date"`
	EndDate        *time.Time     `form:"end_date"`
	Page           int            `form:"page,default=1"`
	Limit          int            `form:"limit,default=50"`
}

// ToResponse converts AuditLog to AuditLogResponse
func (a *AuditLog) ToResponse() *AuditLogResponse {
	resp := &AuditLogResponse{
		ID:             a.ID,
		ActorID:        a.ActorID,
		ActorProfileID: a.ActorProfileID,
		Action:         a.Action,
		Module:         a.Module,
		EntityType:     a.EntityType,
		EntityID:       a.EntityID,
		EntityDisplay:  a.EntityDisplay,
		OldValues:      a.OldValues,
		NewValues:      a.NewValues,
		ChangedFields:  a.ChangedFields,
		TargetUserID:   a.TargetUserID,
		Metadata:       a.Metadata,
		IPAddress:      a.IPAddress,
		UserAgent:      a.UserAgent,
		CreatedAt:      a.CreatedAt,
		Category:       a.Category,
	}

	if a.Actor != nil {
		if a.Actor.Username != nil {
			resp.ActorName = a.Actor.Username
		} else {
			email := a.Actor.Email
			resp.ActorName = &email
		}
	}

	if a.TargetUser != nil {
		if a.TargetUser.Username != nil {
			resp.TargetUserName = a.TargetUser.Username
		} else {
			email := a.TargetUser.Email
			resp.TargetUserName = &email
		}
	}

	return resp
}

// ToListResponse converts AuditLog to AuditLogListResponse
func (a *AuditLog) ToListResponse() *AuditLogListResponse {
	resp := &AuditLogListResponse{
		ID:            a.ID,
		ActorID:       a.ActorID,
		Action:        a.Action,
		Module:        a.Module,
		EntityType:    a.EntityType,
		EntityID:      a.EntityID,
		EntityDisplay: a.EntityDisplay,
		CreatedAt:     a.CreatedAt,
		Category:      a.Category,
	}

	if a.Actor != nil {
		if a.Actor.Username != nil {
			resp.ActorName = a.Actor.Username
		} else {
			email := a.Actor.Email
			resp.ActorName = &email
		}
	}

	return resp
}
