package middleware

import (
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/services"
	"fmt"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// PermissionCheck represents a single permission requirement
type PermissionCheck struct {
	Resource string
	Action   models.PermissionAction
	Scope    *models.PermissionScope
}

var (
	// Singleton instances for middleware
	permissionResolver   *services.PermissionResolverService
	permissionCache      *services.PermissionCacheService
	escalationPrevention *services.EscalationPreventionService
	initOnce             sync.Once
)

// InitPermissionServices initializes the permission services
// Should be called once during application startup
func InitPermissionServices() {
	initOnce.Do(func() {
		db := database.GetDB()
		permissionResolver = services.NewPermissionResolverService(db)
		permissionCache = services.NewPermissionCacheService(db, permissionResolver, services.DefaultCacheConfig())
		escalationPrevention = services.NewEscalationPreventionService(db, permissionResolver)
	})
}

// GetPermissionResolver returns the permission resolver service
func GetPermissionResolver() *services.PermissionResolverService {
	if permissionResolver == nil {
		InitPermissionServices()
	}
	return permissionResolver
}

// GetPermissionCache returns the permission cache service
func GetPermissionCache() *services.PermissionCacheService {
	if permissionCache == nil {
		InitPermissionServices()
	}
	return permissionCache
}

// GetEscalationPrevention returns the escalation prevention service
func GetEscalationPrevention() *services.EscalationPreventionService {
	if escalationPrevention == nil {
		InitPermissionServices()
	}
	return escalationPrevention
}

// RequirePermission creates a middleware that checks for a single permission
// Usage: router.GET("/users", RequirePermission("users", models.PermissionActionRead))
func RequirePermission(resource string, action models.PermissionAction) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
			Resource: resource,
			Action:   action,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "permission_check_failed",
				"message": "failed to check permission",
			})
			c.Abort()
			return
		}

		if !result.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": fmt.Sprintf("permission denied: %s:%s", resource, action),
				"required": gin.H{
					"resource": resource,
					"action":   action,
				},
			})
			c.Abort()
			return
		}

		// Store permission result for potential use in handlers
		c.Set("permission_source", result.Source)
		c.Set("permission_source_name", result.SourceName)

		c.Next()
	}
}

// RequirePermissionWithScope creates a middleware that checks for permission with scope
// Usage: router.GET("/users", RequirePermissionWithScope("users", models.PermissionActionRead, models.PermissionScopeAll))
func RequirePermissionWithScope(resource string, action models.PermissionAction, scope models.PermissionScope) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
			Resource: resource,
			Action:   action,
			Scope:    &scope,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "permission_check_failed",
				"message": "failed to check permission",
			})
			c.Abort()
			return
		}

		if !result.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": fmt.Sprintf("permission denied: %s:%s:%s", resource, action, scope),
				"required": gin.H{
					"resource": resource,
					"action":   action,
					"scope":    scope,
				},
			})
			c.Abort()
			return
		}

		c.Set("permission_source", result.Source)
		c.Set("permission_source_name", result.SourceName)

		c.Next()
	}
}

// RequireAnyPermission creates a middleware that passes if user has ANY of the permissions (OR logic)
// Usage: router.GET("/reports", RequireAnyPermission(
//
//	PermissionCheck{Resource: "reports", Action: models.PermissionActionRead},
//	PermissionCheck{Resource: "admin", Action: models.PermissionActionRead},
//
// ))
func RequireAnyPermission(permissions ...PermissionCheck) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		// Check if user has ANY of the permissions
		for _, perm := range permissions {
			result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
				Resource: perm.Resource,
				Action:   perm.Action,
				Scope:    perm.Scope,
			})
			if err != nil {
				continue // Try next permission on error
			}

			if result.Allowed {
				c.Set("permission_source", result.Source)
				c.Set("permission_source_name", result.SourceName)
				c.Set("matched_permission", perm)
				c.Next()
				return
			}
		}

		// None of the permissions matched
		requiredList := make([]gin.H, len(permissions))
		for i, perm := range permissions {
			req := gin.H{
				"resource": perm.Resource,
				"action":   perm.Action,
			}
			if perm.Scope != nil {
				req["scope"] = *perm.Scope
			}
			requiredList[i] = req
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error":    "forbidden",
			"message":  "permission denied: requires any of the listed permissions",
			"required": requiredList,
		})
		c.Abort()
	}
}

// RequireAllPermissions creates a middleware that requires ALL permissions (AND logic)
// Usage: router.POST("/sensitive", RequireAllPermissions(
//
//	PermissionCheck{Resource: "data", Action: models.PermissionActionCreate},
//	PermissionCheck{Resource: "audit", Action: models.PermissionActionRead},
//
// ))
func RequireAllPermissions(permissions ...PermissionCheck) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		// Check if user has ALL permissions
		var missingPermissions []gin.H
		for _, perm := range permissions {
			result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
				Resource: perm.Resource,
				Action:   perm.Action,
				Scope:    perm.Scope,
			})
			if err != nil || !result.Allowed {
				missing := gin.H{
					"resource": perm.Resource,
					"action":   perm.Action,
				}
				if perm.Scope != nil {
					missing["scope"] = *perm.Scope
				}
				missingPermissions = append(missingPermissions, missing)
			}
		}

		if len(missingPermissions) > 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "permission denied: missing required permissions",
				"missing": missingPermissions,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireModuleAccess creates a middleware that checks for module access
// Usage: router.GET("/hr/*", RequireModuleAccess("hr_module"))
func RequireModuleAccess(moduleCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		// Check if user has READ access to the module
		result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
			Resource: moduleCode,
			Action:   models.PermissionActionRead,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "permission_check_failed",
				"message": "failed to check module access",
			})
			c.Abort()
			return
		}

		if !result.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": fmt.Sprintf("access denied to module: %s", moduleCode),
				"module":  moduleCode,
			})
			c.Abort()
			return
		}

		c.Set("module_code", moduleCode)
		c.Set("permission_source", result.Source)

		c.Next()
	}
}

// RequireModuleAction creates a middleware that checks for specific module action
// Usage: router.POST("/hr/employees", RequireModuleAction("hr_module", models.PermissionActionCreate))
func RequireModuleAction(moduleCode string, action models.PermissionAction) gin.HandlerFunc {
	return RequirePermission(moduleCode, action)
}

// DynamicPermissionCheck allows checking permissions based on request parameters
// Usage: router.GET("/schools/:id/users", DynamicPermissionCheck(func(c *gin.Context) PermissionCheck {
//
//	return PermissionCheck{Resource: "schools", Action: models.PermissionActionRead, Scope: ptr(models.PermissionScopeSchool)}
//
// }))
func DynamicPermissionCheck(checkFunc func(*gin.Context) PermissionCheck) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		// Get the permission check from the provided function
		perm := checkFunc(c)

		result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
			Resource: perm.Resource,
			Action:   perm.Action,
			Scope:    perm.Scope,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "permission_check_failed",
				"message": "failed to check permission",
			})
			c.Abort()
			return
		}

		if !result.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "permission denied for this resource",
				"required": gin.H{
					"resource": perm.Resource,
					"action":   perm.Action,
					"scope":    perm.Scope,
				},
			})
			c.Abort()
			return
		}

		c.Set("permission_source", result.Source)
		c.Next()
	}
}

// ResourceOwnerOrPermission checks if user owns the resource or has the specified permission
// Useful for "users can edit their own data OR admins can edit any data"
// Usage: router.PUT("/users/:id", ResourceOwnerOrPermission("id", "users", models.PermissionActionUpdate, models.PermissionScopeAll))
func ResourceOwnerOrPermission(userIDParam, resource string, action models.PermissionAction, requiredScope models.PermissionScope) gin.HandlerFunc {
	return func(c *gin.Context) {
		if permissionCache == nil {
			InitPermissionServices()
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "user not authenticated",
			})
			c.Abort()
			return
		}

		targetUserID := c.Param(userIDParam)

		// Check if user is accessing their own resource
		if userID.(string) == targetUserID {
			// Check for OWN scope permission
			result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
				Resource: resource,
				Action:   action,
				Scope:    ptrScope(models.PermissionScopeOwn),
			})
			if err == nil && result.Allowed {
				c.Set("permission_source", "owner")
				c.Set("is_own_resource", true)
				c.Next()
				return
			}
		}

		// Not own resource, check for broader permission
		result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
			Resource: resource,
			Action:   action,
			Scope:    &requiredScope,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "permission_check_failed",
				"message": "failed to check permission",
			})
			c.Abort()
			return
		}

		if !result.Allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "permission denied: not owner and lacks required permission",
				"required": gin.H{
					"resource": resource,
					"action":   action,
					"scope":    requiredScope,
				},
			})
			c.Abort()
			return
		}

		c.Set("permission_source", result.Source)
		c.Set("is_own_resource", false)
		c.Next()
	}
}

// Helper function to create pointer to PermissionScope
func ptrScope(scope models.PermissionScope) *models.PermissionScope {
	return &scope
}

// Helper functions for handlers to check permissions programmatically

// CheckPermissionInHandler checks permission within a handler
func CheckPermissionInHandler(c *gin.Context, resource string, action models.PermissionAction) (bool, error) {
	if permissionCache == nil {
		InitPermissionServices()
	}

	userID, exists := c.Get("user_id")
	if !exists {
		return false, fmt.Errorf("user not authenticated")
	}

	result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
		Resource: resource,
		Action:   action,
	})
	if err != nil {
		return false, err
	}

	return result.Allowed, nil
}

// CheckPermissionWithScopeInHandler checks permission with scope within a handler
func CheckPermissionWithScopeInHandler(c *gin.Context, resource string, action models.PermissionAction, scope models.PermissionScope) (bool, error) {
	if permissionCache == nil {
		InitPermissionServices()
	}

	userID, exists := c.Get("user_id")
	if !exists {
		return false, fmt.Errorf("user not authenticated")
	}

	result, err := permissionCache.CheckPermission(userID.(string), services.PermissionCheckRequest{
		Resource: resource,
		Action:   action,
		Scope:    &scope,
	})
	if err != nil {
		return false, err
	}

	return result.Allowed, nil
}

// GetUserIDFromContext extracts user ID from gin context
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	return userID.(string), true
}
