package services

import (
	"errors"
	"fmt"
	"sort"

	"backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkflowRuleService handles business logic for workflow rules
type WorkflowRuleService struct {
	db *gorm.DB
}

// NewWorkflowRuleService creates a new WorkflowRuleService instance
func NewWorkflowRuleService(db *gorm.DB) *WorkflowRuleService {
	return &WorkflowRuleService{db: db}
}

// WorkflowRuleListParams represents parameters for listing workflow rules
type WorkflowRuleListParams struct {
	Page         int
	PageSize     int
	WorkflowType string
	PositionID   string
	SchoolID     string
	IsActive     *bool
	SortBy       string
	SortOrder    string
}

// WorkflowRuleListResult represents the result of listing workflow rules
type WorkflowRuleListResult struct {
	Data       []*models.WorkflowRuleListResponse
	Total      int64
	Page       int
	PageSize   int
	TotalPages int
}

// CreateWorkflowRule creates a new workflow rule with validation
func (s *WorkflowRuleService) CreateWorkflowRule(req models.CreateWorkflowRuleRequest, userID string) (*models.WorkflowRule, error) {
	// Business rule: Check if rule already exists for this position, workflow type, and school
	var existing models.WorkflowRule
	query := s.db.Where("position_id = ? AND workflow_type = ?", req.PositionID, req.WorkflowType)
	if req.SchoolID != nil && *req.SchoolID != "" {
		query = query.Where("school_id = ?", *req.SchoolID)
	} else {
		query = query.Where("school_id IS NULL")
	}
	if err := query.First(&existing).Error; err == nil {
		return nil, errors.New("aturan workflow untuk posisi, tipe, dan sekolah ini sudah ada")
	}

	// Validate position_id exists
	if err := s.validatePositionExists(req.PositionID); err != nil {
		return nil, errors.New("posisi tidak ditemukan")
	}

	// Validate school_id if provided
	if req.SchoolID != nil && *req.SchoolID != "" {
		if err := s.validateSchoolExists(*req.SchoolID); err != nil {
			return nil, errors.New("sekolah tidak ditemukan")
		}
	}

	// Validate creator_position_id if provided
	if req.CreatorPositionID != nil && *req.CreatorPositionID != "" {
		if err := s.validatePositionExists(*req.CreatorPositionID); err != nil {
			return nil, errors.New("posisi pembuat tidak ditemukan")
		}
	}

	// Validate all step approver positions
	for i, step := range req.Steps {
		if err := s.validatePositionExists(step.ApproverPositionID); err != nil {
			return nil, fmt.Errorf("posisi penyetuju pada step %d tidak ditemukan", i+1)
		}
	}

	// Set default priority if not provided
	priority := 1
	if req.Priority != nil {
		priority = *req.Priority
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create workflow rule entity
	workflowRule := models.WorkflowRule{
		ID:                uuid.New().String(),
		WorkflowType:      req.WorkflowType,
		PositionID:        req.PositionID,
		SchoolID:          req.SchoolID,
		CreatorPositionID: req.CreatorPositionID,
		Description:       req.Description,
		Priority:          priority,
		IsActive:          true,
		CreatedBy:         &userID,
		ModifiedBy:        &userID,
	}

	if err := tx.Create(&workflowRule).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("gagal membuat aturan workflow: %w", err)
	}

	// Create steps
	for _, stepReq := range req.Steps {
		isOptional := false
		if stepReq.IsOptional != nil {
			isOptional = *stepReq.IsOptional
		}

		step := models.WorkflowRuleStep{
			ID:                 uuid.New().String(),
			WorkflowRuleID:     workflowRule.ID,
			StepOrder:          stepReq.StepOrder,
			ApproverPositionID: stepReq.ApproverPositionID,
			StepName:           stepReq.StepName,
			IsOptional:         isOptional,
		}

		if err := tx.Create(&step).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("gagal membuat step workflow: %w", err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("gagal menyimpan aturan workflow: %w", err)
	}

	// Load relations for response
	s.db.Preload("Position").
		Preload("School").
		Preload("CreatorPosition").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("step_order ASC")
		}).
		Preload("Steps.ApproverPosition").
		First(&workflowRule, "id = ?", workflowRule.ID)

	return &workflowRule, nil
}

// GetWorkflowRules retrieves list of workflow rules with pagination and filters
func (s *WorkflowRuleService) GetWorkflowRules(params WorkflowRuleListParams) (*WorkflowRuleListResult, error) {
	query := s.db.Model(&models.WorkflowRule{})

	// Apply workflow type filter
	if params.WorkflowType != "" {
		query = query.Where("workflow_type = ?", params.WorkflowType)
	}

	// Apply position filter
	if params.PositionID != "" {
		query = query.Where("position_id = ?", params.PositionID)
	}

	// Apply school filter
	if params.SchoolID != "" {
		if params.SchoolID == "global" {
			query = query.Where("school_id IS NULL")
		} else {
			query = query.Where("school_id = ?", params.SchoolID)
		}
	}

	// Apply active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total records
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("gagal menghitung total aturan workflow: %w", err)
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy + " " + params.SortOrder
		query = query.Order(order)
	} else {
		query = query.Order("workflow_type ASC, created_at DESC")
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Fetch workflow rules with relations
	var workflowRules []models.WorkflowRule
	if err := query.Preload("Position").
		Preload("School").
		Preload("CreatorPosition").
		Preload("Steps").
		Find(&workflowRules).Error; err != nil {
		return nil, fmt.Errorf("gagal mengambil data aturan workflow: %w", err)
	}

	// Convert to list response
	ruleList := make([]*models.WorkflowRuleListResponse, len(workflowRules))
	for i, rule := range workflowRules {
		ruleList[i] = rule.ToListResponse()
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	return &WorkflowRuleListResult{
		Data:       ruleList,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetWorkflowRuleByID retrieves a workflow rule by ID with relations
func (s *WorkflowRuleService) GetWorkflowRuleByID(id string) (*models.WorkflowRule, error) {
	var workflowRule models.WorkflowRule
	if err := s.db.Preload("Position").
		Preload("School").
		Preload("CreatorPosition").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("step_order ASC")
		}).
		Preload("Steps.ApproverPosition").
		First(&workflowRule, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("aturan workflow tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data aturan workflow: %w", err)
	}

	return &workflowRule, nil
}

// GetWorkflowRuleByPositionAndType retrieves a workflow rule by position ID and workflow type
func (s *WorkflowRuleService) GetWorkflowRuleByPositionAndType(positionID, workflowType string) (*models.WorkflowRule, error) {
	var workflowRule models.WorkflowRule
	if err := s.db.Preload("Position").
		Preload("School").
		Preload("CreatorPosition").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("step_order ASC")
		}).
		Preload("Steps.ApproverPosition").
		Where("position_id = ? AND workflow_type = ? AND is_active = ?", positionID, workflowType, true).
		First(&workflowRule).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("aturan workflow tidak ditemukan untuk posisi dan tipe ini")
		}
		return nil, fmt.Errorf("gagal mengambil data aturan workflow: %w", err)
	}

	return &workflowRule, nil
}

// UpdateWorkflowRule updates a workflow rule with validation
func (s *WorkflowRuleService) UpdateWorkflowRule(id string, req models.UpdateWorkflowRuleRequest, userID string) (*models.WorkflowRule, error) {
	// Find existing workflow rule
	var workflowRule models.WorkflowRule
	if err := s.db.First(&workflowRule, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("aturan workflow tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mengambil data aturan workflow: %w", err)
	}

	// Check for duplicate if position_id, workflow_type, or school_id is being changed
	positionChanged := req.PositionID != nil && *req.PositionID != workflowRule.PositionID
	typeChanged := req.WorkflowType != nil && *req.WorkflowType != workflowRule.WorkflowType
	schoolChanged := req.SchoolID != nil && ((workflowRule.SchoolID == nil && *req.SchoolID != "") ||
		(workflowRule.SchoolID != nil && *req.SchoolID != *workflowRule.SchoolID))

	if positionChanged || typeChanged || schoolChanged {
		newPositionID := workflowRule.PositionID
		newWorkflowType := workflowRule.WorkflowType
		var newSchoolID *string = workflowRule.SchoolID
		if req.PositionID != nil {
			newPositionID = *req.PositionID
		}
		if req.WorkflowType != nil {
			newWorkflowType = *req.WorkflowType
		}
		if req.SchoolID != nil {
			if *req.SchoolID == "" {
				newSchoolID = nil
			} else {
				newSchoolID = req.SchoolID
			}
		}

		var existing models.WorkflowRule
		query := s.db.Where("position_id = ? AND workflow_type = ? AND id != ?", newPositionID, newWorkflowType, id)
		if newSchoolID != nil && *newSchoolID != "" {
			query = query.Where("school_id = ?", *newSchoolID)
		} else {
			query = query.Where("school_id IS NULL")
		}
		if err := query.First(&existing).Error; err == nil {
			return nil, errors.New("aturan workflow untuk posisi, tipe, dan sekolah ini sudah ada")
		}
	}

	// Validate position_id if being changed
	if req.PositionID != nil {
		if err := s.validatePositionExists(*req.PositionID); err != nil {
			return nil, errors.New("posisi tidak ditemukan")
		}
	}

	// Validate school_id if being changed
	if req.SchoolID != nil && *req.SchoolID != "" {
		if err := s.validateSchoolExists(*req.SchoolID); err != nil {
			return nil, errors.New("sekolah tidak ditemukan")
		}
	}

	// Validate creator_position_id if being changed
	if req.CreatorPositionID != nil && *req.CreatorPositionID != "" {
		if err := s.validatePositionExists(*req.CreatorPositionID); err != nil {
			return nil, errors.New("posisi pembuat tidak ditemukan")
		}
	}

	// Validate all step approver positions
	for i, step := range req.Steps {
		if err := s.validatePositionExists(step.ApproverPositionID); err != nil {
			return nil, fmt.Errorf("posisi penyetuju pada step %d tidak ditemukan", i+1)
		}
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update fields
	if req.WorkflowType != nil {
		workflowRule.WorkflowType = *req.WorkflowType
	}
	if req.PositionID != nil {
		workflowRule.PositionID = *req.PositionID
	}
	if req.SchoolID != nil {
		if *req.SchoolID == "" {
			workflowRule.SchoolID = nil
		} else {
			workflowRule.SchoolID = req.SchoolID
		}
	}
	if req.CreatorPositionID != nil {
		if *req.CreatorPositionID == "" {
			workflowRule.CreatorPositionID = nil
		} else {
			workflowRule.CreatorPositionID = req.CreatorPositionID
		}
	}
	if req.Description != nil {
		workflowRule.Description = req.Description
	}
	if req.Priority != nil {
		workflowRule.Priority = *req.Priority
	}
	if req.IsActive != nil {
		workflowRule.IsActive = *req.IsActive
	}
	workflowRule.ModifiedBy = &userID

	if err := tx.Save(&workflowRule).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("gagal memperbarui aturan workflow: %w", err)
	}

	// Update steps if provided
	if req.Steps != nil {
		// Delete existing steps
		if err := tx.Where("workflow_rule_id = ?", id).Delete(&models.WorkflowRuleStep{}).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("gagal menghapus step lama: %w", err)
		}

		// Create new steps
		for _, stepReq := range req.Steps {
			isOptional := false
			if stepReq.IsOptional != nil {
				isOptional = *stepReq.IsOptional
			}

			step := models.WorkflowRuleStep{
				ID:                 uuid.New().String(),
				WorkflowRuleID:     workflowRule.ID,
				StepOrder:          stepReq.StepOrder,
				ApproverPositionID: stepReq.ApproverPositionID,
				StepName:           stepReq.StepName,
				IsOptional:         isOptional,
			}

			if err := tx.Create(&step).Error; err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("gagal membuat step workflow: %w", err)
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("gagal menyimpan perubahan: %w", err)
	}

	// Load relations for response
	s.db.Preload("Position").
		Preload("School").
		Preload("CreatorPosition").
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("step_order ASC")
		}).
		Preload("Steps.ApproverPosition").
		First(&workflowRule, "id = ?", workflowRule.ID)

	return &workflowRule, nil
}

// DeleteWorkflowRule deletes a workflow rule and its steps
func (s *WorkflowRuleService) DeleteWorkflowRule(id string) error {
	// Check if workflow rule exists
	var workflowRule models.WorkflowRule
	if err := s.db.First(&workflowRule, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("aturan workflow tidak ditemukan")
		}
		return fmt.Errorf("gagal mengambil data aturan workflow: %w", err)
	}

	// Delete will cascade to steps due to foreign key constraint
	if err := s.db.Delete(&workflowRule).Error; err != nil {
		return fmt.Errorf("gagal menghapus aturan workflow: %w", err)
	}

	return nil
}

// GetWorkflowTypes returns all available workflow types
func (s *WorkflowRuleService) GetWorkflowTypes() []string {
	return models.AllWorkflowTypes()
}

// GetApprovalChain returns the ordered list of approvers for a given position and workflow type
func (s *WorkflowRuleService) GetApprovalChain(positionID, workflowType string) ([]models.WorkflowRuleStepResponse, error) {
	rule, err := s.GetWorkflowRuleByPositionAndType(positionID, workflowType)
	if err != nil {
		return nil, err
	}

	// Sort steps by order
	steps := rule.Steps
	sort.Slice(steps, func(i, j int) bool {
		return steps[i].StepOrder < steps[j].StepOrder
	})

	// Convert to response
	result := make([]models.WorkflowRuleStepResponse, len(steps))
	for i, step := range steps {
		result[i] = *step.ToStepResponse()
	}

	return result, nil
}

// Helper methods for validation

func (s *WorkflowRuleService) validatePositionExists(id string) error {
	var position models.Position
	if err := s.db.First(&position, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

func (s *WorkflowRuleService) validateSchoolExists(id string) error {
	var school models.School
	if err := s.db.First(&school, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

// BulkCreateWorkflowRulesRequest represents request for bulk creating workflow rules
type BulkCreateWorkflowRulesRequest struct {
	WorkflowType      string                                `json:"workflow_type" binding:"required"`
	PositionID        string                                `json:"position_id" binding:"required"`
	SchoolIDs         []string                              `json:"school_ids" binding:"required,min=1"`
	CreatorPositionID *string                               `json:"creator_position_id,omitempty"`
	Description       *string                               `json:"description,omitempty"`
	Priority          *int                                  `json:"priority,omitempty"`
	Steps             []models.CreateWorkflowRuleStepRequest `json:"steps,omitempty"`
}

// BulkCreateResult represents the result of bulk create operation
type BulkCreateResult struct {
	Created  int      `json:"created"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors,omitempty"`
	RuleIDs  []string `json:"rule_ids"`
}

// BulkCreateWorkflowRules creates workflow rules for multiple schools at once
func (s *WorkflowRuleService) BulkCreateWorkflowRules(req BulkCreateWorkflowRulesRequest, userID string) (*BulkCreateResult, error) {
	result := &BulkCreateResult{
		Created:  0,
		Skipped:  0,
		Errors:   []string{},
		RuleIDs:  []string{},
	}

	// Validate position_id exists
	if err := s.validatePositionExists(req.PositionID); err != nil {
		return nil, errors.New("posisi target tidak ditemukan")
	}

	// Validate creator_position_id if provided
	if req.CreatorPositionID != nil && *req.CreatorPositionID != "" {
		if err := s.validatePositionExists(*req.CreatorPositionID); err != nil {
			return nil, errors.New("posisi pembuat tidak ditemukan")
		}
	}

	// Validate all step approver positions
	for i, step := range req.Steps {
		if err := s.validatePositionExists(step.ApproverPositionID); err != nil {
			return nil, fmt.Errorf("posisi penyetuju pada step %d tidak ditemukan", i+1)
		}
	}

	// Set default priority if not provided
	priority := 1
	if req.Priority != nil {
		priority = *req.Priority
	}

	// Process each school
	for _, schoolID := range req.SchoolIDs {
		// Validate school exists
		if err := s.validateSchoolExists(schoolID); err != nil {
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("Sekolah %s tidak ditemukan", schoolID))
			continue
		}

		// Check if rule already exists for this position, workflow type, and school
		var existing models.WorkflowRule
		if err := s.db.Where("position_id = ? AND workflow_type = ? AND school_id = ?",
			req.PositionID, req.WorkflowType, schoolID).First(&existing).Error; err == nil {
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("Aturan untuk sekolah ID %s sudah ada", schoolID))
			continue
		}

		// Start transaction for each rule
		tx := s.db.Begin()

		// Create workflow rule entity
		workflowRule := models.WorkflowRule{
			ID:                uuid.New().String(),
			WorkflowType:      req.WorkflowType,
			PositionID:        req.PositionID,
			SchoolID:          &schoolID,
			CreatorPositionID: req.CreatorPositionID,
			Description:       req.Description,
			Priority:          priority,
			IsActive:          true,
			CreatedBy:         &userID,
			ModifiedBy:        &userID,
		}

		if err := tx.Create(&workflowRule).Error; err != nil {
			tx.Rollback()
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("Gagal membuat rule untuk sekolah %s: %v", schoolID, err))
			continue
		}

		// Create steps
		stepCreateFailed := false
		for _, stepReq := range req.Steps {
			isOptional := false
			if stepReq.IsOptional != nil {
				isOptional = *stepReq.IsOptional
			}

			step := models.WorkflowRuleStep{
				ID:                 uuid.New().String(),
				WorkflowRuleID:     workflowRule.ID,
				StepOrder:          stepReq.StepOrder,
				ApproverPositionID: stepReq.ApproverPositionID,
				StepName:           stepReq.StepName,
				IsOptional:         isOptional,
			}

			if err := tx.Create(&step).Error; err != nil {
				tx.Rollback()
				result.Skipped++
				result.Errors = append(result.Errors, fmt.Sprintf("Gagal membuat step untuk sekolah %s: %v", schoolID, err))
				stepCreateFailed = true
				break
			}
		}

		if stepCreateFailed {
			continue
		}

		if err := tx.Commit().Error; err != nil {
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("Gagal commit untuk sekolah %s: %v", schoolID, err))
			continue
		}

		result.Created++
		result.RuleIDs = append(result.RuleIDs, workflowRule.ID)
	}

	return result, nil
}
