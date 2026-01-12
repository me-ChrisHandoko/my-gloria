package models

import (
	"time"

	"gorm.io/datatypes"
)

// Workflow represents a workflow instance
type Workflow struct {
	ID                 string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	RequestID          string          `json:"request_id" gorm:"column:request_id;type:varchar(255);uniqueIndex;not null"`
	WorkflowType       string          `json:"workflow_type" gorm:"column:workflow_type;type:varchar(100);not null;index"`
	Status             string          `json:"status" gorm:"type:varchar(50);not null;index"`
	InitiatorID        *string         `json:"initiator_id,omitempty" gorm:"column:initiator_id;type:varchar(255);index"`
	TemporalWorkflowID *string         `json:"temporal_workflow_id,omitempty" gorm:"column:temporal_workflow_id;type:varchar(255);index"`
	TemporalRunID      *string         `json:"temporal_run_id,omitempty" gorm:"column:temporal_run_id;type:varchar(255)"`
	Metadata           *datatypes.JSON `json:"metadata,omitempty" gorm:"type:jsonb"`
	StartedAt          time.Time       `json:"started_at" gorm:"column:started_at;not null;default:CURRENT_TIMESTAMP"`
	CompletedAt        *time.Time      `json:"completed_at,omitempty" gorm:"column:completed_at"`
	CreatedAt          time.Time       `json:"created_at"`
}

// TableName specifies the table name for Workflow
func (Workflow) TableName() string {
	return "public.workflow"
}

// BulkOperationProgress represents the progress of a bulk operation
type BulkOperationProgress struct {
	ID              string          `json:"id" gorm:"type:varchar(36);primaryKey"`
	OperationType   string          `json:"operation_type" gorm:"column:operation_type;type:varchar(100);not null"`
	Status          string          `json:"status" gorm:"type:varchar(50);not null;index"`
	TotalItems      int             `json:"total_items" gorm:"column:total_items;not null"`
	ProcessedItems  int             `json:"processed_items" gorm:"column:processed_items;default:0"`
	SuccessfulItems int             `json:"successful_items" gorm:"column:successful_items;default:0"`
	FailedItems     int             `json:"failed_items" gorm:"column:failed_items;default:0"`
	ErrorDetails    *datatypes.JSON `json:"error_details,omitempty" gorm:"column:error_details;type:jsonb"`
	RollbackData    *datatypes.JSON `json:"rollback_data,omitempty" gorm:"column:rollback_data;type:jsonb"`
	StartedAt       time.Time       `json:"started_at" gorm:"column:started_at;not null;default:CURRENT_TIMESTAMP"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty" gorm:"column:completed_at"`
	InitiatedBy     string          `json:"initiated_by" gorm:"column:initiated_by;type:varchar(36);not null"`
	Metadata        *datatypes.JSON `json:"metadata,omitempty" gorm:"type:jsonb"`
}

// TableName specifies the table name for BulkOperationProgress
func (BulkOperationProgress) TableName() string {
	return "public.bulk_operation_progress"
}

// WorkflowResponse represents the response body for workflow data
type WorkflowResponse struct {
	ID                 string          `json:"id"`
	RequestID          string          `json:"request_id"`
	WorkflowType       string          `json:"workflow_type"`
	Status             string          `json:"status"`
	InitiatorID        *string         `json:"initiator_id,omitempty"`
	TemporalWorkflowID *string         `json:"temporal_workflow_id,omitempty"`
	TemporalRunID      *string         `json:"temporal_run_id,omitempty"`
	Metadata           *datatypes.JSON `json:"metadata,omitempty"`
	StartedAt          time.Time       `json:"started_at"`
	CompletedAt        *time.Time      `json:"completed_at,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
}

// WorkflowListResponse represents the response for listing workflows
type WorkflowListResponse struct {
	ID           string     `json:"id"`
	RequestID    string     `json:"request_id"`
	WorkflowType string     `json:"workflow_type"`
	Status       string     `json:"status"`
	InitiatorID  *string    `json:"initiator_id,omitempty"`
	StartedAt    time.Time  `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
}

// BulkOperationProgressResponse represents the response body for bulk operation progress
type BulkOperationProgressResponse struct {
	ID              string          `json:"id"`
	OperationType   string          `json:"operation_type"`
	Status          string          `json:"status"`
	TotalItems      int             `json:"total_items"`
	ProcessedItems  int             `json:"processed_items"`
	SuccessfulItems int             `json:"successful_items"`
	FailedItems     int             `json:"failed_items"`
	ProgressPercent float64         `json:"progress_percent"`
	ErrorDetails    *datatypes.JSON `json:"error_details,omitempty"`
	StartedAt       time.Time       `json:"started_at"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty"`
	InitiatedBy     string          `json:"initiated_by"`
	Metadata        *datatypes.JSON `json:"metadata,omitempty"`
}

// ToResponse converts Workflow to WorkflowResponse
func (w *Workflow) ToResponse() *WorkflowResponse {
	return &WorkflowResponse{
		ID:                 w.ID,
		RequestID:          w.RequestID,
		WorkflowType:       w.WorkflowType,
		Status:             w.Status,
		InitiatorID:        w.InitiatorID,
		TemporalWorkflowID: w.TemporalWorkflowID,
		TemporalRunID:      w.TemporalRunID,
		Metadata:           w.Metadata,
		StartedAt:          w.StartedAt,
		CompletedAt:        w.CompletedAt,
		CreatedAt:          w.CreatedAt,
	}
}

// ToListResponse converts Workflow to WorkflowListResponse
func (w *Workflow) ToListResponse() *WorkflowListResponse {
	return &WorkflowListResponse{
		ID:           w.ID,
		RequestID:    w.RequestID,
		WorkflowType: w.WorkflowType,
		Status:       w.Status,
		InitiatorID:  w.InitiatorID,
		StartedAt:    w.StartedAt,
		CompletedAt:  w.CompletedAt,
	}
}

// ToResponse converts BulkOperationProgress to BulkOperationProgressResponse
func (b *BulkOperationProgress) ToResponse() *BulkOperationProgressResponse {
	var progressPercent float64
	if b.TotalItems > 0 {
		progressPercent = float64(b.ProcessedItems) / float64(b.TotalItems) * 100
	}

	return &BulkOperationProgressResponse{
		ID:              b.ID,
		OperationType:   b.OperationType,
		Status:          b.Status,
		TotalItems:      b.TotalItems,
		ProcessedItems:  b.ProcessedItems,
		SuccessfulItems: b.SuccessfulItems,
		FailedItems:     b.FailedItems,
		ProgressPercent: progressPercent,
		ErrorDetails:    b.ErrorDetails,
		StartedAt:       b.StartedAt,
		CompletedAt:     b.CompletedAt,
		InitiatedBy:     b.InitiatedBy,
		Metadata:        b.Metadata,
	}
}

// IsComplete checks if the workflow is completed
func (w *Workflow) IsComplete() bool {
	return w.Status == "COMPLETED" || w.Status == "FAILED" || w.Status == "CANCELLED"
}

// IsComplete checks if the bulk operation is completed
func (b *BulkOperationProgress) IsComplete() bool {
	return b.Status == "COMPLETED" || b.Status == "FAILED" || b.Status == "CANCELLED"
}
