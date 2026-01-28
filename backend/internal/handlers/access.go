package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// AccessHandler handles HTTP requests for access/permission checking
type AccessHandler struct {
	resolver   *services.PermissionResolverService
	cache      *services.PermissionCacheService
	escalation *services.EscalationPreventionService
}

// NewAccessHandler creates a new AccessHandler instance
func NewAccessHandler() *AccessHandler {
	return &AccessHandler{
		resolver:   middleware.GetPermissionResolver(),
		cache:      middleware.GetPermissionCache(),
		escalation: middleware.GetEscalationPrevention(),
	}
}

// PermissionCheckRequest represents a single permission check in the request
type PermissionCheckRequest struct {
	Resource string                   `json:"resource" binding:"required"`
	Action   models.PermissionAction  `json:"action" binding:"required"`
	Scope    *models.PermissionScope  `json:"scope,omitempty"`
}

// BatchPermissionCheckRequest represents the request for batch permission check
type BatchPermissionCheckRequest struct {
	Checks []PermissionCheckRequest `json:"checks" binding:"required,min=1,max=50"`
}

// PermissionCheckResponse represents a single permission check response
type PermissionCheckResponse struct {
	Allowed    bool   `json:"allowed"`
	Source     string `json:"source"`
	SourceID   string `json:"source_id,omitempty"`
	SourceName string `json:"source_name,omitempty"`
}

// BatchPermissionCheckResponse represents the response for batch permission check
type BatchPermissionCheckResponse struct {
	Results map[string]PermissionCheckResponse `json:"results"`
}

// ModuleAccessResponse represents module access information
type ModuleAccessResponse struct {
	ID          string                 `json:"id"`
	Code        string                 `json:"code"`
	Name        string                 `json:"name"`
	Category    models.ModuleCategory  `json:"category"`
	Icon        *string                `json:"icon,omitempty"`
	Path        *string                `json:"path,omitempty"`
	ParentID    *string                `json:"parent_id,omitempty"`
	SortOrder   int                    `json:"sort_order"`
	Permissions []string               `json:"permissions"`
	Children    []ModuleAccessResponse `json:"children,omitempty"`
}

// UserPermissionsResponse represents all effective permissions for a user
type UserPermissionsResponse struct {
	UserID      string                        `json:"user_id"`
	Permissions []ResolvedPermissionResponse  `json:"permissions"`
	Roles       []RoleAccessResponse          `json:"roles"`
	Positions   []PositionAccessResponse      `json:"positions"`
	CheckedAt   time.Time                     `json:"checked_at"`
}

// ResolvedPermissionResponse represents a resolved permission
type ResolvedPermissionResponse struct {
	ID         string                   `json:"id"`
	Code       string                   `json:"code"`
	Name       string                   `json:"name"`
	Resource   string                   `json:"resource"`
	Action     models.PermissionAction  `json:"action"`
	Scope      *models.PermissionScope  `json:"scope,omitempty"`
	IsGranted  bool                     `json:"is_granted"`
	Source     string                   `json:"source"`
	SourceID   string                   `json:"source_id"`
	SourceName string                   `json:"source_name"`
	Priority   int                      `json:"priority"`
}

// RoleAccessResponse represents a user's role
type RoleAccessResponse struct {
	ID             string     `json:"id"`
	Code           string     `json:"code"`
	Name           string     `json:"name"`
	HierarchyLevel int        `json:"hierarchy_level"`
	EffectiveFrom  time.Time  `json:"effective_from"`
	EffectiveUntil *time.Time `json:"effective_until,omitempty"`
}

// PositionAccessResponse represents a user's position
type PositionAccessResponse struct {
	ID         string     `json:"id"`
	Code       string     `json:"code"`
	Name       string     `json:"name"`
	Department *string    `json:"department,omitempty"`
	School     *string    `json:"school,omitempty"`
	StartDate  time.Time  `json:"start_date"`
	EndDate    *time.Time `json:"end_date,omitempty"`
	IsPlt      bool       `json:"is_plt"`
}

// CheckPermission checks a single permission for the authenticated user
// @Summary Check if user has a specific permission
// @Tags access
// @Accept json
// @Produce json
// @Param request body PermissionCheckRequest true "Permission to check"
// @Success 200 {object} PermissionCheckResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /access/check [post]
func (h *AccessHandler) CheckPermission(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req PermissionCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.cache.CheckPermission(userID.(string), services.PermissionCheckRequest{
		Resource: req.Resource,
		Action:   req.Action,
		Scope:    req.Scope,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check permission"})
		return
	}

	c.JSON(http.StatusOK, PermissionCheckResponse{
		Allowed:    result.Allowed,
		Source:     result.Source,
		SourceID:   result.SourceID,
		SourceName: result.SourceName,
	})
}

// CheckPermissionBatch checks multiple permissions at once
// @Summary Check multiple permissions in a single request
// @Tags access
// @Accept json
// @Produce json
// @Param request body BatchPermissionCheckRequest true "Permissions to check"
// @Success 200 {object} BatchPermissionCheckResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /access/check-batch [post]
func (h *AccessHandler) CheckPermissionBatch(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req BatchPermissionCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to service request format
	serviceRequests := make([]services.PermissionCheckRequest, len(req.Checks))
	for i, check := range req.Checks {
		serviceRequests[i] = services.PermissionCheckRequest{
			Resource: check.Resource,
			Action:   check.Action,
			Scope:    check.Scope,
		}
	}

	results, err := h.cache.CheckPermissionBatch(userID.(string), serviceRequests)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check permissions"})
		return
	}

	// Convert to response format
	response := BatchPermissionCheckResponse{
		Results: make(map[string]PermissionCheckResponse),
	}
	for key, result := range results {
		response.Results[key] = PermissionCheckResponse{
			Allowed:    result.Allowed,
			Source:     result.Source,
			SourceID:   result.SourceID,
			SourceName: result.SourceName,
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetUserModules returns all modules accessible to the authenticated user
// @Summary Get all accessible modules for the user
// @Tags access
// @Produce json
// @Success 200 {array} ModuleAccessResponse
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /access/modules [get]
func (h *AccessHandler) GetUserModules(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	db := database.GetDB()

	// Get user's active role IDs
	var userRoles []models.UserRole
	now := time.Now()
	if err := db.Where("user_id = ? AND is_active = ?", userID, true).
		Where("effective_from <= ?", now).
		Where("(effective_until IS NULL OR effective_until >= ?)", now).
		Find(&userRoles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user roles"})
		return
	}

	roleIDs := make([]string, 0, len(userRoles))
	for _, ur := range userRoles {
		roleIDs = append(roleIDs, ur.RoleID)
	}

	// Get all active modules
	var modules []models.Module
	if err := db.Where("is_active = ?", true).
		Where("is_visible = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&modules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch modules"})
		return
	}

	// Get RoleModuleAccess for user's roles
	var roleModuleAccesses []models.RoleModuleAccess
	if len(roleIDs) > 0 {
		db.Where("role_id IN ? AND is_active = ?", roleIDs, true).
			Find(&roleModuleAccesses)
	}

	// Build a map of module_id -> permissions from RoleModuleAccess
	// Also track which modules user has access to via RoleModuleAccess
	moduleAccessMap := make(map[string][]string)
	moduleAccessSet := make(map[string]bool) // Set of module IDs user has access to
	for _, rma := range roleModuleAccesses {
		moduleAccessSet[rma.ModuleID] = true
		// Parse permissions from JSONB
		perms := h.parseModuleAccessPermissions(rma.Permissions)
		if len(perms) > 0 {
			// Merge permissions if module already has some from another role
			if existing, ok := moduleAccessMap[rma.ModuleID]; ok {
				moduleAccessMap[rma.ModuleID] = mergePermissions(existing, perms)
			} else {
				moduleAccessMap[rma.ModuleID] = perms
			}
		}
	}

	// Check user permissions for each module
	accessibleModules := make([]ModuleAccessResponse, 0)
	moduleMap := make(map[string]*ModuleAccessResponse)

	for _, module := range modules {
		var permissions []string
		var hasAccess bool

		// First check if user has RoleModuleAccess for this module
		if moduleAccessSet[module.ID] {
			hasAccess = true
			// Get permissions from RoleModuleAccess
			if perms, ok := moduleAccessMap[module.ID]; ok && len(perms) > 0 {
				permissions = perms
			} else {
				// RoleModuleAccess exists but permissions JSONB is empty
				// Give default READ permission
				permissions = []string{"READ"}
			}
		} else {
			// No RoleModuleAccess - fall back to permission-based access check
			permissions = h.getModulePermissions(userID.(string), module.Code)
			hasAccess = len(permissions) > 0
		}

		if !hasAccess {
			continue // User has no access to this module
		}

		response := ModuleAccessResponse{
			ID:          module.ID,
			Code:        module.Code,
			Name:        module.Name,
			Category:    module.Category,
			Icon:        module.Icon,
			Path:        module.Path,
			ParentID:    module.ParentID,
			SortOrder:   module.SortOrder,
			Permissions: permissions,
			Children:    make([]ModuleAccessResponse, 0),
		}

		moduleMap[module.ID] = &response
	}

	// Build hierarchy - first add children to parents
	for _, module := range moduleMap {
		if module.ParentID != nil {
			if parent, ok := moduleMap[*module.ParentID]; ok {
				parent.Children = append(parent.Children, *module)
			}
		}
	}

	// Sort children within each parent by SortOrder
	for _, module := range moduleMap {
		if len(module.Children) > 0 {
			sort.Slice(module.Children, func(i, j int) bool {
				return module.Children[i].SortOrder < module.Children[j].SortOrder
			})
		}
	}

	// Then collect only root modules (which now have their children populated)
	for _, module := range moduleMap {
		if module.ParentID == nil {
			accessibleModules = append(accessibleModules, *module)
		}
	}

	// Sort root modules by SortOrder
	sort.Slice(accessibleModules, func(i, j int) bool {
		return accessibleModules[i].SortOrder < accessibleModules[j].SortOrder
	})

	c.JSON(http.StatusOK, accessibleModules)
}

// parseModuleAccessPermissions parses permissions from JSONB field
func (h *AccessHandler) parseModuleAccessPermissions(permissions []byte) []string {
	if permissions == nil {
		return nil
	}

	var result []string

	// Try parsing as map[string]bool first (e.g., {"READ": true, "CREATE": false})
	var permMap map[string]bool
	if err := json.Unmarshal(permissions, &permMap); err == nil {
		for action, granted := range permMap {
			if granted {
				result = append(result, action)
			}
		}
		return result
	}

	// Try parsing as string array (e.g., ["READ", "CREATE"])
	var permArray []string
	if err := json.Unmarshal(permissions, &permArray); err == nil {
		return permArray
	}

	return nil
}

// mergePermissions merges two permission slices without duplicates
func mergePermissions(existing, newPerms []string) []string {
	permSet := make(map[string]bool)
	for _, p := range existing {
		permSet[p] = true
	}
	for _, p := range newPerms {
		permSet[p] = true
	}

	result := make([]string, 0, len(permSet))
	for p := range permSet {
		result = append(result, p)
	}
	return result
}

// getModulePermissions returns list of permissions user has on a module
func (h *AccessHandler) getModulePermissions(userID, moduleCode string) []string {
	actions := []models.PermissionAction{
		models.PermissionActionRead,
		models.PermissionActionCreate,
		models.PermissionActionUpdate,
		models.PermissionActionDelete,
		models.PermissionActionApprove,
		models.PermissionActionExport,
		models.PermissionActionImport,
	}

	var permissions []string
	for _, action := range actions {
		result, err := h.cache.CheckPermission(userID, services.PermissionCheckRequest{
			Resource: moduleCode,
			Action:   action,
		})
		if err == nil && result.Allowed {
			permissions = append(permissions, string(action))
		}
	}

	return permissions
}

// GetUserPermissions returns all effective permissions for the authenticated user
// @Summary Get all effective permissions for the user
// @Tags access
// @Produce json
// @Success 200 {object} UserPermissionsResponse
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /access/permissions [get]
func (h *AccessHandler) GetUserPermissions(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get all effective permissions
	resolved, err := h.resolver.GetEffectiveUserPermissions(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get permissions"})
		return
	}

	// Get effective roles
	userRoles, err := h.resolver.GetEffectiveUserRoles(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get roles"})
		return
	}

	// Get effective positions
	userPositions, err := h.resolver.GetEffectiveUserPositions(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get positions"})
		return
	}

	// Build response
	response := UserPermissionsResponse{
		UserID:      userID.(string),
		Permissions: make([]ResolvedPermissionResponse, 0, len(resolved)),
		Roles:       make([]RoleAccessResponse, 0, len(userRoles)),
		Positions:   make([]PositionAccessResponse, 0, len(userPositions)),
		CheckedAt:   time.Now(),
	}

	// Convert permissions
	for _, rp := range resolved {
		if rp.Permission == nil {
			continue
		}
		response.Permissions = append(response.Permissions, ResolvedPermissionResponse{
			ID:         rp.Permission.ID,
			Code:       rp.Permission.Code,
			Name:       rp.Permission.Name,
			Resource:   rp.Permission.Resource,
			Action:     rp.Permission.Action,
			Scope:      rp.Scope,
			IsGranted:  rp.IsGranted,
			Source:     rp.Source,
			SourceID:   rp.SourceID,
			SourceName: rp.SourceName,
			Priority:   rp.Priority,
		})
	}

	// Convert roles
	for _, ur := range userRoles {
		if ur.Role == nil {
			continue
		}
		response.Roles = append(response.Roles, RoleAccessResponse{
			ID:             ur.Role.ID,
			Code:           ur.Role.Code,
			Name:           ur.Role.Name,
			HierarchyLevel: ur.Role.HierarchyLevel,
			EffectiveFrom:  ur.EffectiveFrom,
			EffectiveUntil: ur.EffectiveUntil,
		})
	}

	// Convert positions
	for _, up := range userPositions {
		if up.Position == nil {
			continue
		}
		var deptName, schoolName *string
		if up.Position.Department != nil {
			deptName = &up.Position.Department.Name
		}
		if up.Position.School != nil {
			schoolName = &up.Position.School.Name
		}
		response.Positions = append(response.Positions, PositionAccessResponse{
			ID:         up.Position.ID,
			Code:       up.Position.Code,
			Name:       up.Position.Name,
			Department: deptName,
			School:     schoolName,
			StartDate:  up.StartDate,
			EndDate:    up.EndDate,
			IsPlt:      up.IsPlt,
		})
	}

	c.JSON(http.StatusOK, response)
}

// GetCacheStats returns permission cache statistics (admin only)
// @Summary Get permission cache statistics
// @Tags access
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /access/cache/stats [get]
func (h *AccessHandler) GetCacheStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Check if user has system admin permission
	hasPermission, err := h.resolver.HasPermission(userID.(string), "system", models.PermissionActionRead)
	if err != nil || !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	stats := h.cache.GetCacheStats()
	c.JSON(http.StatusOK, stats)
}

// InvalidateUserCache invalidates cache for a specific user (admin only)
// @Summary Invalidate permission cache for a user
// @Tags access
// @Param user_id path string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /access/cache/invalidate/{user_id} [post]
func (h *AccessHandler) InvalidateUserCache(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Check if user has system admin permission
	hasPermission, err := h.resolver.HasPermission(currentUserID.(string), "system", models.PermissionActionUpdate)
	if err != nil || !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	targetUserID := c.Param("user_id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	h.cache.InvalidateUser(targetUserID)
	c.JSON(http.StatusOK, gin.H{"message": "cache invalidated", "user_id": targetUserID})
}

// InvalidateAllCache invalidates entire permission cache (admin only)
// @Summary Invalidate entire permission cache
// @Tags access
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /access/cache/invalidate-all [post]
func (h *AccessHandler) InvalidateAllCache(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Check if user has system admin permission
	hasPermission, err := h.resolver.HasPermission(userID.(string), "system", models.PermissionActionUpdate)
	if err != nil || !hasPermission {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}

	h.cache.InvalidateAll()
	c.JSON(http.StatusOK, gin.H{"message": "all cache invalidated"})
}
