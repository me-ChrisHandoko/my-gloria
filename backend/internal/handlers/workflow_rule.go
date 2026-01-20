package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// WorkflowRuleHandler handles HTTP requests for workflow rules
type WorkflowRuleHandler struct {
	workflowRuleService *services.WorkflowRuleService
}

// NewWorkflowRuleHandler creates a new WorkflowRuleHandler instance
func NewWorkflowRuleHandler(workflowRuleService *services.WorkflowRuleService) *WorkflowRuleHandler {
	return &WorkflowRuleHandler{
		workflowRuleService: workflowRuleService,
	}
}

// CreateWorkflowRule handles creating a new workflow rule
// @Summary Create a new workflow rule
// @Tags workflow-rules
// @Accept json
// @Produce json
// @Param request body models.CreateWorkflowRuleRequest true "Workflow rule data"
// @Success 201 {object} models.WorkflowRuleResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /workflow-rules [post]
func (h *WorkflowRuleHandler) CreateWorkflowRule(c *gin.Context) {
	var req models.CreateWorkflowRuleRequest

	// HTTP: Parse and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Create workflow rule via service
	workflowRule, err := h.workflowRuleService.CreateWorkflowRule(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, workflowRule.ToResponse())
}

// GetWorkflowRules handles getting list of workflow rules with pagination and filters
// @Summary Get list of workflow rules
// @Tags workflow-rules
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Param workflow_type query string false "Filter by workflow type"
// @Param position_id query string false "Filter by position ID"
// @Param school_id query string false "Filter by school ID (use 'global' for rules without school)"
// @Param is_active query bool false "Filter by active status"
// @Param sort_by query string false "Sort by field" default(workflow_type)
// @Param sort_order query string false "Sort order (asc/desc)" default(asc)
// @Success 200 {object} services.WorkflowRuleListResult
// @Failure 500 {object} map[string]string
// @Router /workflow-rules [get]
func (h *WorkflowRuleHandler) GetWorkflowRules(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	workflowType := c.Query("workflow_type")
	positionID := c.Query("position_id")
	schoolID := c.Query("school_id")
	sortBy := c.DefaultQuery("sort_by", "workflow_type")
	sortOrder := c.DefaultQuery("sort_order", "asc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// Build params
	params := services.WorkflowRuleListParams{
		Page:         page,
		PageSize:     pageSize,
		WorkflowType: workflowType,
		PositionID:   positionID,
		SchoolID:     schoolID,
		IsActive:     isActive,
		SortBy:       sortBy,
		SortOrder:    sortOrder,
	}

	// Business logic: Get workflow rules via service
	result, err := h.workflowRuleService.GetWorkflowRules(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"data":        result.Data,
		"total":       result.Total,
		"page":        result.Page,
		"page_size":   result.PageSize,
		"total_pages": result.TotalPages,
	})
}

// GetWorkflowRuleByID handles getting a single workflow rule by ID
// @Summary Get workflow rule by ID
// @Tags workflow-rules
// @Produce json
// @Param id path string true "Workflow Rule ID"
// @Success 200 {object} models.WorkflowRuleResponse
// @Failure 404 {object} map[string]string
// @Router /workflow-rules/{id} [get]
func (h *WorkflowRuleHandler) GetWorkflowRuleByID(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get workflow rule via service
	workflowRule, err := h.workflowRuleService.GetWorkflowRuleByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, workflowRule.ToResponse())
}

// GetWorkflowRuleByPositionAndType handles getting workflow rule by position and type
// @Summary Get workflow rule by position ID and workflow type
// @Tags workflow-rules
// @Produce json
// @Param position_id query string true "Position ID"
// @Param workflow_type query string true "Workflow Type"
// @Success 200 {object} models.WorkflowRuleResponse
// @Failure 404 {object} map[string]string
// @Router /workflow-rules/lookup [get]
func (h *WorkflowRuleHandler) GetWorkflowRuleByPositionAndType(c *gin.Context) {
	// HTTP: Get query parameters
	positionID := c.Query("position_id")
	workflowType := c.Query("workflow_type")

	if positionID == "" || workflowType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "position_id dan workflow_type harus diisi"})
		return
	}

	// Business logic: Get workflow rule via service
	workflowRule, err := h.workflowRuleService.GetWorkflowRuleByPositionAndType(positionID, workflowType)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, workflowRule.ToResponse())
}

// UpdateWorkflowRule handles updating a workflow rule
// @Summary Update a workflow rule
// @Tags workflow-rules
// @Accept json
// @Produce json
// @Param id path string true "Workflow Rule ID"
// @Param request body models.UpdateWorkflowRuleRequest true "Workflow rule data"
// @Success 200 {object} models.WorkflowRuleResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /workflow-rules/{id} [put]
func (h *WorkflowRuleHandler) UpdateWorkflowRule(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdateWorkflowRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Update workflow rule via service
	workflowRule, err := h.workflowRuleService.UpdateWorkflowRule(id, req, userID.(string))
	if err != nil {
		if err.Error() == "aturan workflow tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, workflowRule.ToResponse())
}

// DeleteWorkflowRule handles deleting a workflow rule
// @Summary Delete a workflow rule
// @Tags workflow-rules
// @Produce json
// @Param id path string true "Workflow Rule ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /workflow-rules/{id} [delete]
func (h *WorkflowRuleHandler) DeleteWorkflowRule(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Delete workflow rule via service
	err := h.workflowRuleService.DeleteWorkflowRule(id)
	if err != nil {
		if err.Error() == "aturan workflow tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Aturan workflow berhasil dihapus"})
}

// GetWorkflowTypes handles getting list of available workflow types
// @Summary Get list of workflow types
// @Tags workflow-rules
// @Produce json
// @Success 200 {object} []string
// @Router /workflow-rules/types [get]
func (h *WorkflowRuleHandler) GetWorkflowTypes(c *gin.Context) {
	types := h.workflowRuleService.GetWorkflowTypes()
	c.JSON(http.StatusOK, gin.H{"data": types})
}

// BulkCreateWorkflowRules handles bulk creation of workflow rules for multiple schools
// @Summary Bulk create workflow rules for multiple schools
// @Tags workflow-rules
// @Accept json
// @Produce json
// @Param request body services.BulkCreateWorkflowRulesRequest true "Bulk create request"
// @Success 200 {object} services.BulkCreateResult
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /workflow-rules/bulk [post]
func (h *WorkflowRuleHandler) BulkCreateWorkflowRules(c *gin.Context) {
	var req services.BulkCreateWorkflowRulesRequest

	// HTTP: Parse and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Bulk create workflow rules via service
	result, err := h.workflowRuleService.BulkCreateWorkflowRules(req, userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, result)
}
