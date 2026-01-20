package models

import (
	"time"
)

// WorkflowRule defines approval chain rules for specific workflow types and positions
type WorkflowRule struct {
	ID                string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	WorkflowType      string    `json:"workflow_type" gorm:"column:workflow_type;type:varchar(50);not null;index"`
	PositionID        string    `json:"position_id" gorm:"column:position_id;type:varchar(36);not null;index"`
	SchoolID          *string   `json:"school_id,omitempty" gorm:"column:school_id;type:varchar(36);index"`
	CreatorPositionID *string   `json:"creator_position_id,omitempty" gorm:"column:creator_position_id;type:varchar(36)"`
	Description       *string   `json:"description,omitempty" gorm:"column:description;type:text"`
	Priority          int       `json:"priority" gorm:"column:priority;default:1"`
	IsActive          bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	CreatedBy         *string   `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`
	ModifiedBy        *string   `json:"modified_by,omitempty" gorm:"column:modified_by;type:varchar(36)"`

	// Relations
	Position        *Position          `json:"position,omitempty" gorm:"foreignKey:PositionID"`
	School          *School            `json:"school,omitempty" gorm:"foreignKey:SchoolID"`
	CreatorPosition *Position          `json:"creator_position,omitempty" gorm:"foreignKey:CreatorPositionID"`
	Steps           []WorkflowRuleStep `json:"steps,omitempty" gorm:"foreignKey:WorkflowRuleID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for WorkflowRule
func (WorkflowRule) TableName() string {
	return "public.workflow_rules"
}

// WorkflowRuleStep defines a single approval step in the workflow chain
type WorkflowRuleStep struct {
	ID                 string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	WorkflowRuleID     string    `json:"workflow_rule_id" gorm:"column:workflow_rule_id;type:varchar(36);not null;index"`
	StepOrder          int       `json:"step_order" gorm:"column:step_order;not null"`
	ApproverPositionID string    `json:"approver_position_id" gorm:"column:approver_position_id;type:varchar(36);not null"`
	StepName           *string   `json:"step_name,omitempty" gorm:"column:step_name;type:varchar(100)"`
	IsOptional         bool      `json:"is_optional" gorm:"column:is_optional;default:false"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	// Relations
	WorkflowRule     *WorkflowRule `json:"-" gorm:"foreignKey:WorkflowRuleID"`
	ApproverPosition *Position     `json:"approver_position,omitempty" gorm:"foreignKey:ApproverPositionID"`
}

// TableName specifies the table name for WorkflowRuleStep
func (WorkflowRuleStep) TableName() string {
	return "public.workflow_rule_steps"
}

// WorkflowType constants
const (
	WorkflowTypeKPI       = "KPI"
	WorkflowTypeCuti      = "CUTI"
	WorkflowTypeReimburse = "REIMBURSE"
	WorkflowTypeLembur    = "LEMBUR"
	WorkflowTypeIzin      = "IZIN"
	WorkflowTypeWorkorder = "WORKORDER"
)

// AllWorkflowTypes returns all valid workflow types
func AllWorkflowTypes() []string {
	return []string{
		WorkflowTypeKPI,
		WorkflowTypeCuti,
		WorkflowTypeReimburse,
		WorkflowTypeLembur,
		WorkflowTypeIzin,
		WorkflowTypeWorkorder,
	}
}

// CreateWorkflowRuleStepRequest represents a step in the create request
type CreateWorkflowRuleStepRequest struct {
	StepOrder          int     `json:"step_order" binding:"required,min=1"`
	ApproverPositionID string  `json:"approver_position_id" binding:"required,len=36"`
	StepName           *string `json:"step_name,omitempty" binding:"omitempty,max=100"`
	IsOptional         *bool   `json:"is_optional,omitempty"`
}

// CreateWorkflowRuleRequest represents the request body for creating a workflow rule
type CreateWorkflowRuleRequest struct {
	WorkflowType      string                          `json:"workflow_type" binding:"required,max=50"`
	PositionID        string                          `json:"position_id" binding:"required,len=36"`
	SchoolID          *string                         `json:"school_id,omitempty" binding:"omitempty,len=36"`
	CreatorPositionID *string                         `json:"creator_position_id,omitempty" binding:"omitempty,len=36"`
	Description       *string                         `json:"description,omitempty"`
	Priority          *int                            `json:"priority,omitempty" binding:"omitempty,min=1,max=100"`
	Steps             []CreateWorkflowRuleStepRequest `json:"steps,omitempty" binding:"omitempty,dive"`
}

// UpdateWorkflowRuleStepRequest represents a step in the update request
type UpdateWorkflowRuleStepRequest struct {
	ID                 *string `json:"id,omitempty" binding:"omitempty,len=36"`
	StepOrder          int     `json:"step_order" binding:"required,min=1"`
	ApproverPositionID string  `json:"approver_position_id" binding:"required,len=36"`
	StepName           *string `json:"step_name,omitempty" binding:"omitempty,max=100"`
	IsOptional         *bool   `json:"is_optional,omitempty"`
}

// UpdateWorkflowRuleRequest represents the request body for updating a workflow rule
type UpdateWorkflowRuleRequest struct {
	WorkflowType      *string                         `json:"workflow_type,omitempty" binding:"omitempty,max=50"`
	PositionID        *string                         `json:"position_id,omitempty" binding:"omitempty,len=36"`
	SchoolID          *string                         `json:"school_id,omitempty" binding:"omitempty,len=36"`
	CreatorPositionID *string                         `json:"creator_position_id,omitempty" binding:"omitempty,len=36"`
	Description       *string                         `json:"description,omitempty"`
	Priority          *int                            `json:"priority,omitempty" binding:"omitempty,min=1,max=100"`
	IsActive          *bool                           `json:"is_active,omitempty"`
	Steps             []UpdateWorkflowRuleStepRequest `json:"steps,omitempty" binding:"omitempty,dive"`
}

// WorkflowRuleStepResponse represents a step in the response
type WorkflowRuleStepResponse struct {
	ID                   string                `json:"id"`
	StepOrder            int                   `json:"step_order"`
	ApproverPositionID   string                `json:"approver_position_id"`
	ApproverPosition     *PositionListResponse `json:"approver_position,omitempty"`
	ApproverPositionName *string               `json:"approver_position_name,omitempty"`
	StepName             *string               `json:"step_name,omitempty"`
	IsOptional           bool                  `json:"is_optional"`
}

// WorkflowRuleResponse represents the response body for workflow rule data
type WorkflowRuleResponse struct {
	ID                string                     `json:"id"`
	WorkflowType      string                     `json:"workflow_type"`
	PositionID        string                     `json:"position_id"`
	Position          *PositionListResponse      `json:"position,omitempty"`
	SchoolID          *string                    `json:"school_id,omitempty"`
	School            *SchoolListResponse        `json:"school,omitempty"`
	CreatorPositionID *string                    `json:"creator_position_id,omitempty"`
	CreatorPosition   *PositionListResponse      `json:"creator_position,omitempty"`
	Description       *string                    `json:"description,omitempty"`
	Priority          int                        `json:"priority"`
	IsActive          bool                       `json:"is_active"`
	CreatedAt         time.Time                  `json:"created_at"`
	UpdatedAt         time.Time                  `json:"updated_at"`
	CreatedBy         *string                    `json:"created_by,omitempty"`
	ModifiedBy        *string                    `json:"modified_by,omitempty"`
	Steps             []WorkflowRuleStepResponse `json:"steps,omitempty"`
	TotalSteps        int                        `json:"total_steps"`
}

// WorkflowRuleListResponse represents the response for listing workflow rules
type WorkflowRuleListResponse struct {
	ID                  string  `json:"id"`
	WorkflowType        string  `json:"workflow_type"`
	PositionID          string  `json:"position_id"`
	PositionName        *string `json:"position_name,omitempty"`
	SchoolID            *string `json:"school_id,omitempty"`
	SchoolName          *string `json:"school_name,omitempty"`
	CreatorPositionID   *string `json:"creator_position_id,omitempty"`
	CreatorPositionName *string `json:"creator_position_name,omitempty"`
	Description         *string `json:"description,omitempty"`
	Priority            int     `json:"priority"`
	IsActive            bool    `json:"is_active"`
	TotalSteps          int     `json:"total_steps"`
}

// ToStepResponse converts WorkflowRuleStep to WorkflowRuleStepResponse
func (s *WorkflowRuleStep) ToStepResponse() *WorkflowRuleStepResponse {
	resp := &WorkflowRuleStepResponse{
		ID:                 s.ID,
		StepOrder:          s.StepOrder,
		ApproverPositionID: s.ApproverPositionID,
		StepName:           s.StepName,
		IsOptional:         s.IsOptional,
	}

	if s.ApproverPosition != nil {
		resp.ApproverPosition = s.ApproverPosition.ToListResponse()
		resp.ApproverPositionName = &s.ApproverPosition.Name
	}

	return resp
}

// ToResponse converts WorkflowRule to WorkflowRuleResponse
func (w *WorkflowRule) ToResponse() *WorkflowRuleResponse {
	resp := &WorkflowRuleResponse{
		ID:                w.ID,
		WorkflowType:      w.WorkflowType,
		PositionID:        w.PositionID,
		SchoolID:          w.SchoolID,
		CreatorPositionID: w.CreatorPositionID,
		Description:       w.Description,
		Priority:          w.Priority,
		IsActive:          w.IsActive,
		CreatedAt:         w.CreatedAt,
		UpdatedAt:         w.UpdatedAt,
		CreatedBy:         w.CreatedBy,
		ModifiedBy:        w.ModifiedBy,
		TotalSteps:        len(w.Steps),
	}

	if w.Position != nil {
		resp.Position = w.Position.ToListResponse()
	}

	if w.School != nil {
		resp.School = w.School.ToListResponse()
	}

	if w.CreatorPosition != nil {
		resp.CreatorPosition = w.CreatorPosition.ToListResponse()
	}

	// Convert steps
	if len(w.Steps) > 0 {
		resp.Steps = make([]WorkflowRuleStepResponse, len(w.Steps))
		for i, step := range w.Steps {
			resp.Steps[i] = *step.ToStepResponse()
		}
	}

	return resp
}

// ToListResponse converts WorkflowRule to WorkflowRuleListResponse
func (w *WorkflowRule) ToListResponse() *WorkflowRuleListResponse {
	resp := &WorkflowRuleListResponse{
		ID:                w.ID,
		WorkflowType:      w.WorkflowType,
		PositionID:        w.PositionID,
		SchoolID:          w.SchoolID,
		CreatorPositionID: w.CreatorPositionID,
		Description:       w.Description,
		Priority:          w.Priority,
		IsActive:          w.IsActive,
		TotalSteps:        len(w.Steps),
	}

	if w.Position != nil {
		resp.PositionName = &w.Position.Name
	}

	if w.School != nil {
		resp.SchoolName = &w.School.Name
	}

	if w.CreatorPosition != nil {
		resp.CreatorPositionName = &w.CreatorPosition.Name
	}

	return resp
}
