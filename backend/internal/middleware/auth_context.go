package middleware

import (
	"github.com/gin-gonic/gin"
)

// AuthType represents the type of authentication used
type AuthType string

const (
	AuthTypeClerk  AuthType = "clerk"
	AuthTypeJWT    AuthType = "jwt"
	AuthTypeAPIKey AuthType = "api_key"
)

// Context keys for storing auth information
const (
	AuthContextKey = "auth_context"
)

// AuthContext holds authentication information for the current request
type AuthContext struct {
	Type        AuthType `json:"type"`
	UserID      string   `json:"user_id"`                 // UserProfile.ID
	ClerkUserID string   `json:"clerk_user_id,omitempty"` // Clerk user ID (if Clerk auth)
	APIKeyID    string   `json:"api_key_id,omitempty"`    // API Key ID (if JWT/API Key auth)
	NIP         string   `json:"nip,omitempty"`           // Employee NIP
	Permissions []string `json:"permissions,omitempty"`   // Cached permissions
	Roles       []string `json:"roles,omitempty"`         // Cached role codes
}

// SetAuthContext stores the auth context in the gin context
func SetAuthContext(c *gin.Context, ctx *AuthContext) {
	c.Set(AuthContextKey, ctx)
}

// GetAuthContext retrieves the auth context from the gin context
func GetAuthContext(c *gin.Context) *AuthContext {
	if ctx, exists := c.Get(AuthContextKey); exists {
		if authCtx, ok := ctx.(*AuthContext); ok {
			return authCtx
		}
	}
	return nil
}

// GetCurrentUserID returns the current user's profile ID from the auth context
func GetCurrentUserID(c *gin.Context) string {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return ""
	}
	return authCtx.UserID
}

// GetCurrentClerkUserID returns the current user's Clerk ID from the auth context
func GetCurrentClerkUserID(c *gin.Context) string {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return ""
	}
	return authCtx.ClerkUserID
}

// GetCurrentNIP returns the current user's NIP from the auth context
func GetCurrentNIP(c *gin.Context) string {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return ""
	}
	return authCtx.NIP
}

// GetCurrentAPIKeyID returns the current API key ID from the auth context
func GetCurrentAPIKeyID(c *gin.Context) string {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return ""
	}
	return authCtx.APIKeyID
}

// HasPermission checks if the current user has a specific permission
func HasPermission(c *gin.Context, permission string) bool {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return false
	}
	for _, p := range authCtx.Permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// HasAnyPermission checks if the current user has any of the specified permissions
func HasAnyPermission(c *gin.Context, permissions ...string) bool {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return false
	}
	permSet := make(map[string]struct{}, len(authCtx.Permissions))
	for _, p := range authCtx.Permissions {
		permSet[p] = struct{}{}
	}
	for _, p := range permissions {
		if _, ok := permSet[p]; ok {
			return true
		}
	}
	return false
}

// HasAllPermissions checks if the current user has all of the specified permissions
func HasAllPermissions(c *gin.Context, permissions ...string) bool {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return false
	}
	permSet := make(map[string]struct{}, len(authCtx.Permissions))
	for _, p := range authCtx.Permissions {
		permSet[p] = struct{}{}
	}
	for _, p := range permissions {
		if _, ok := permSet[p]; !ok {
			return false
		}
	}
	return true
}

// HasRole checks if the current user has a specific role
func HasRole(c *gin.Context, role string) bool {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return false
	}
	for _, r := range authCtx.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasAnyRole checks if the current user has any of the specified roles
func HasAnyRole(c *gin.Context, roles ...string) bool {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return false
	}
	roleSet := make(map[string]struct{}, len(authCtx.Roles))
	for _, r := range authCtx.Roles {
		roleSet[r] = struct{}{}
	}
	for _, r := range roles {
		if _, ok := roleSet[r]; ok {
			return true
		}
	}
	return false
}

// IsAuthenticated checks if the request has valid authentication
func IsAuthenticated(c *gin.Context) bool {
	return GetAuthContext(c) != nil
}

// GetAuthType returns the type of authentication used for the current request
func GetAuthType(c *gin.Context) AuthType {
	authCtx := GetAuthContext(c)
	if authCtx == nil {
		return ""
	}
	return authCtx.Type
}

// GetCurrentProfileID returns a pointer to the current user's profile ID for audit logging
func GetCurrentProfileID(c *gin.Context) *string {
	authCtx := GetAuthContext(c)
	if authCtx == nil || authCtx.UserID == "" {
		return nil
	}
	return &authCtx.UserID
}
