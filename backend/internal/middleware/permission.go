package middleware

import (
	"net/http"
	"strings"

	"backend/internal/response"

	"github.com/gin-gonic/gin"
)

// PermissionChecker is an interface for checking permissions from the database
// This allows runtime permission checking beyond what's stored in the auth context
type PermissionChecker interface {
	HasPermission(userID string, permission string) bool
	HasAnyPermission(userID string, permissions []string) bool
	HasAllPermissions(userID string, permissions []string) bool
}

// permissionChecker is the global permission checker (set during initialization)
var permissionChecker PermissionChecker

// SetPermissionChecker sets the global permission checker
func SetPermissionChecker(checker PermissionChecker) {
	permissionChecker = checker
}

// RequirePermission returns a middleware that checks if user has a specific permission
// It first checks the auth context (for stateless JWT), then falls back to DB lookup
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ============================================================
		// 🔧 DEV BYPASS RBAC - Uncomment 2 baris di bawah untuk disable
		// ⚠️  JANGAN COMMIT KE PRODUCTION!
		// ============================================================
		// c.Next()
		// return
		// ============================================================

		authCtx := GetAuthContext(c)
		if authCtx == nil {
			response.Error(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}

		// First check auth context permissions (stateless check)
		if hasPermissionInContext(authCtx.Permissions, permission) {
			c.Next()
			return
		}

		// Fall back to database lookup if permission checker is available
		if permissionChecker != nil && authCtx.UserID != "" {
			if permissionChecker.HasPermission(authCtx.UserID, permission) {
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "insufficient permissions: "+permission+" required")
		c.Abort()
	}
}

// RequireAnyPermission returns a middleware that checks if user has any of the specified permissions
func RequireAnyPermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔧 DEV BYPASS RBAC - Uncomment untuk disable | ⚠️ JANGAN COMMIT!
		// c.Next()
		// return

		authCtx := GetAuthContext(c)
		if authCtx == nil {
			response.Error(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}

		// Check auth context first
		for _, permission := range permissions {
			if hasPermissionInContext(authCtx.Permissions, permission) {
				c.Next()
				return
			}
		}

		// Fall back to database lookup
		if permissionChecker != nil && authCtx.UserID != "" {
			if permissionChecker.HasAnyPermission(authCtx.UserID, permissions) {
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "insufficient permissions: one of ["+strings.Join(permissions, ", ")+"] required")
		c.Abort()
	}
}

// RequireAllPermissions returns a middleware that checks if user has all of the specified permissions
func RequireAllPermissions(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔧 DEV BYPASS RBAC - Uncomment untuk disable | ⚠️ JANGAN COMMIT!
		// c.Next()
		// return

		authCtx := GetAuthContext(c)
		if authCtx == nil {
			response.Error(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}

		// Check if all permissions exist in context
		allInContext := true
		for _, permission := range permissions {
			if !hasPermissionInContext(authCtx.Permissions, permission) {
				allInContext = false
				break
			}
		}

		if allInContext {
			c.Next()
			return
		}

		// Fall back to database lookup
		if permissionChecker != nil && authCtx.UserID != "" {
			if permissionChecker.HasAllPermissions(authCtx.UserID, permissions) {
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "insufficient permissions: all of ["+strings.Join(permissions, ", ")+"] required")
		c.Abort()
	}
}

// RequireRole returns a middleware that checks if user has a specific role
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔧 DEV BYPASS RBAC - Uncomment untuk disable | ⚠️ JANGAN COMMIT!
		// c.Next()
		// return

		authCtx := GetAuthContext(c)
		if authCtx == nil {
			response.Error(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}

		for _, r := range authCtx.Roles {
			if strings.EqualFold(r, role) {
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "role "+role+" required")
		c.Abort()
	}
}

// RequireAnyRole returns a middleware that checks if user has any of the specified roles
func RequireAnyRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔧 DEV BYPASS RBAC - Uncomment untuk disable | ⚠️ JANGAN COMMIT!
		// c.Next()
		// return

		authCtx := GetAuthContext(c)
		if authCtx == nil {
			response.Error(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}

		for _, userRole := range authCtx.Roles {
			for _, requiredRole := range roles {
				if strings.EqualFold(userRole, requiredRole) {
					c.Next()
					return
				}
			}
		}

		response.Error(c, http.StatusForbidden, "one of roles ["+strings.Join(roles, ", ")+"] required")
		c.Abort()
	}
}

// hasPermissionInContext checks if a permission exists in the context permissions list
// It supports wildcard matching (e.g., "user:*" matches "user:read", "user:create", etc.)
func hasPermissionInContext(userPermissions []string, requiredPermission string) bool {
	for _, p := range userPermissions {
		// Exact match
		if strings.EqualFold(p, requiredPermission) {
			return true
		}

		// Wildcard match (e.g., "user:*" matches "user:read")
		if strings.HasSuffix(p, ":*") {
			prefix := strings.TrimSuffix(p, "*")
			if strings.HasPrefix(strings.ToLower(requiredPermission), strings.ToLower(prefix)) {
				return true
			}
		}

		// Super admin wildcard
		if p == "*" || strings.EqualFold(p, "admin:*") {
			return true
		}
	}
	return false
}

// GetPermissionScope extracts the scope from a permission code
// e.g., "employee:read:department" returns "department"
func GetPermissionScope(permission string) string {
	parts := strings.Split(permission, ":")
	if len(parts) >= 3 {
		return parts[2]
	}
	return ""
}

// GetPermissionResource extracts the resource from a permission code
// e.g., "employee:read:department" returns "employee"
func GetPermissionResource(permission string) string {
	parts := strings.Split(permission, ":")
	if len(parts) >= 1 {
		return parts[0]
	}
	return ""
}

// GetPermissionAction extracts the action from a permission code
// e.g., "employee:read:department" returns "read"
func GetPermissionAction(permission string) string {
	parts := strings.Split(permission, ":")
	if len(parts) >= 2 {
		return parts[1]
	}
	return ""
}
