package service

import (
	"errors"
	"strings"
	"sync"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrPermissionNotFound    = errors.New("permission not found")
	ErrPermissionCodeExists  = errors.New("permission code already exists")
	ErrInvalidPermission     = errors.New("invalid permission format")
)

// PermissionDetail represents detailed permission information
type PermissionDetail struct {
	ID       string                 `json:"id"`
	Code     string                 `json:"code"`
	Name     string                 `json:"name"`
	Resource string                 `json:"resource"`
	Action   domain.PermissionAction `json:"action"`
	Scope    *domain.PermissionScope `json:"scope,omitempty"`
	Source   string                 `json:"source"` // "direct", "role", "inherited"
	RoleCode *string                `json:"role_code,omitempty"`
}

// EffectivePermissions represents all permissions for a user organized by source
type EffectivePermissions struct {
	UserID    string             `json:"user_id"`
	Direct    []PermissionDetail `json:"direct"`
	FromRoles []PermissionDetail `json:"from_roles"`
	Inherited []PermissionDetail `json:"inherited"`
	All       []string           `json:"all"` // All permission codes for quick lookup
}

// PermissionService defines the interface for permission business logic
type PermissionService interface {
	// Check permissions
	HasPermission(userID string, permission string) bool
	HasAnyPermission(userID string, permissions []string) bool
	HasAllPermissions(userID string, permissions []string) bool

	// Get user permissions
	GetUserPermissions(userID string) ([]string, error)
	GetEffectivePermissions(userID string) (*EffectivePermissions, error)

	// Permission scope helpers
	GetPermissionScope(userID string, resource string, action string) (*domain.PermissionScope, error)

	// CRUD operations
	GetAll() ([]domain.PermissionListResponse, error)
	GetByID(id string) (*domain.PermissionResponse, error)
	GetByResource(resource string) ([]domain.PermissionListResponse, error)
	Create(req *domain.CreatePermissionRequest, createdBy *string) (*domain.PermissionResponse, error)
	Update(id string, req *domain.UpdatePermissionRequest) (*domain.PermissionResponse, error)
	Delete(id string) error
}

type permissionService struct {
	permissionRepo repository.PermissionRepository
	cache          *permissionCache
}

// permissionCache provides a simple in-memory cache for user permissions
type permissionCache struct {
	mu      sync.RWMutex
	data    map[string]*cachedPermissions
	ttl     time.Duration
}

type cachedPermissions struct {
	permissions []string
	expiry      time.Time
}

func newPermissionCache(ttl time.Duration) *permissionCache {
	return &permissionCache{
		data: make(map[string]*cachedPermissions),
		ttl:  ttl,
	}
}

func (c *permissionCache) get(userID string) ([]string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cached, exists := c.data[userID]
	if !exists || time.Now().After(cached.expiry) {
		return nil, false
	}
	return cached.permissions, true
}

func (c *permissionCache) set(userID string, permissions []string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data[userID] = &cachedPermissions{
		permissions: permissions,
		expiry:      time.Now().Add(c.ttl),
	}
}

func (c *permissionCache) invalidate(userID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.data, userID)
}

func (c *permissionCache) invalidateAll() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data = make(map[string]*cachedPermissions)
}

// NewPermissionService creates a new permission service instance
func NewPermissionService(permissionRepo repository.PermissionRepository) PermissionService {
	return &permissionService{
		permissionRepo: permissionRepo,
		cache:          newPermissionCache(5 * time.Minute), // 5 minute cache TTL
	}
}

// HasPermission checks if a user has a specific permission
func (s *permissionService) HasPermission(userID string, permission string) bool {
	permissions, err := s.GetUserPermissions(userID)
	if err != nil {
		return false
	}

	return s.matchPermission(permissions, permission)
}

// HasAnyPermission checks if a user has any of the specified permissions
func (s *permissionService) HasAnyPermission(userID string, permissions []string) bool {
	userPermissions, err := s.GetUserPermissions(userID)
	if err != nil {
		return false
	}

	for _, permission := range permissions {
		if s.matchPermission(userPermissions, permission) {
			return true
		}
	}
	return false
}

// HasAllPermissions checks if a user has all of the specified permissions
func (s *permissionService) HasAllPermissions(userID string, permissions []string) bool {
	userPermissions, err := s.GetUserPermissions(userID)
	if err != nil {
		return false
	}

	for _, permission := range permissions {
		if !s.matchPermission(userPermissions, permission) {
			return false
		}
	}
	return true
}

// matchPermission checks if a permission exists in the list with wildcard support
func (s *permissionService) matchPermission(userPermissions []string, required string) bool {
	requiredLower := strings.ToLower(required)

	for _, p := range userPermissions {
		pLower := strings.ToLower(p)

		// Exact match
		if pLower == requiredLower {
			return true
		}

		// Wildcard match (e.g., "user:*" matches "user:read")
		if strings.HasSuffix(pLower, ":*") {
			prefix := strings.TrimSuffix(pLower, "*")
			if strings.HasPrefix(requiredLower, prefix) {
				return true
			}
		}

		// Resource wildcard (e.g., "*:read" matches "user:read")
		if strings.HasPrefix(pLower, "*:") {
			suffix := strings.TrimPrefix(pLower, "*")
			if strings.HasSuffix(requiredLower, suffix) {
				return true
			}
		}

		// Super admin
		if pLower == "*" || pLower == "admin:*" {
			return true
		}
	}

	return false
}

// GetUserPermissions returns all permission codes for a user
func (s *permissionService) GetUserPermissions(userID string) ([]string, error) {
	// Check cache first
	if cached, found := s.cache.get(userID); found {
		return cached, nil
	}

	// Load from database
	permissions, err := s.permissionRepo.GetUserAllPermissions(userID)
	if err != nil {
		return nil, err
	}

	// Extract permission codes
	codes := make([]string, len(permissions))
	for i, p := range permissions {
		codes[i] = p.Code
	}

	// Cache the result
	s.cache.set(userID, codes)

	return codes, nil
}

// GetEffectivePermissions returns detailed permission information organized by source
func (s *permissionService) GetEffectivePermissions(userID string) (*EffectivePermissions, error) {
	result := &EffectivePermissions{
		UserID:    userID,
		Direct:    []PermissionDetail{},
		FromRoles: []PermissionDetail{},
		Inherited: []PermissionDetail{},
		All:       []string{},
	}

	// Get direct permissions
	directPerms, err := s.permissionRepo.GetUserDirectPermissions(userID)
	if err != nil {
		return nil, err
	}
	for _, p := range directPerms {
		result.Direct = append(result.Direct, PermissionDetail{
			ID:       p.ID,
			Code:     p.Code,
			Name:     p.Name,
			Resource: p.Resource,
			Action:   p.Action,
			Scope:    p.Scope,
			Source:   "direct",
		})
		result.All = append(result.All, p.Code)
	}

	// Get role permissions
	rolePerms, err := s.permissionRepo.GetUserRolePermissions(userID)
	if err != nil {
		return nil, err
	}
	for _, p := range rolePerms {
		// Skip if already in direct (direct takes precedence)
		if containsCode(result.All, p.Code) {
			continue
		}
		result.FromRoles = append(result.FromRoles, PermissionDetail{
			ID:       p.ID,
			Code:     p.Code,
			Name:     p.Name,
			Resource: p.Resource,
			Action:   p.Action,
			Scope:    p.Scope,
			Source:   "role",
		})
		result.All = append(result.All, p.Code)
	}

	return result, nil
}

// GetPermissionScope returns the highest scope a user has for a resource/action
func (s *permissionService) GetPermissionScope(userID string, resource string, action string) (*domain.PermissionScope, error) {
	permissions, err := s.permissionRepo.GetUserAllPermissions(userID)
	if err != nil {
		return nil, err
	}

	// Scope priority: ALL > SCHOOL > DEPARTMENT > OWN
	scopePriority := map[domain.PermissionScope]int{
		domain.PermissionScopeOwn:        1,
		domain.PermissionScopeDepartment: 2,
		domain.PermissionScopeSchool:     3,
		domain.PermissionScopeAll:        4,
	}

	var highestScope *domain.PermissionScope
	highestPriority := 0

	for _, p := range permissions {
		// Check if this permission matches the resource and action
		if strings.EqualFold(p.Resource, resource) &&
			strings.EqualFold(string(p.Action), action) {
			if p.Scope != nil {
				priority := scopePriority[*p.Scope]
				if priority > highestPriority {
					highestPriority = priority
					highestScope = p.Scope
				}
			}
		}
	}

	return highestScope, nil
}

// GetAll returns all permissions
func (s *permissionService) GetAll() ([]domain.PermissionListResponse, error) {
	permissions, err := s.permissionRepo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PermissionListResponse, len(permissions))
	for i, p := range permissions {
		responses[i] = *p.ToListResponse()
	}
	return responses, nil
}

// GetByID returns a permission by ID
func (s *permissionService) GetByID(id string) (*domain.PermissionResponse, error) {
	permission, err := s.permissionRepo.FindByID(id)
	if err != nil {
		return nil, ErrPermissionNotFound
	}
	return permission.ToResponse(), nil
}

// GetByResource returns all permissions for a resource
func (s *permissionService) GetByResource(resource string) ([]domain.PermissionListResponse, error) {
	permissions, err := s.permissionRepo.FindByResource(resource)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PermissionListResponse, len(permissions))
	for i, p := range permissions {
		responses[i] = *p.ToListResponse()
	}
	return responses, nil
}

// Create creates a new permission
func (s *permissionService) Create(req *domain.CreatePermissionRequest, createdBy *string) (*domain.PermissionResponse, error) {
	// Check if code already exists
	existing, _ := s.permissionRepo.FindByCode(req.Code)
	if existing != nil {
		return nil, ErrPermissionCodeExists
	}

	permission := &domain.Permission{
		ID:                 generateUUID(),
		Code:               req.Code,
		Name:               req.Name,
		Description:        req.Description,
		Resource:           req.Resource,
		Action:             req.Action,
		Scope:              req.Scope,
		Conditions:         req.Conditions,
		Metadata:           req.Metadata,
		IsSystemPermission: false,
		IsActive:           true,
		CreatedBy:          createdBy,
		Category:           req.Category,
		GroupIcon:          req.GroupIcon,
		GroupName:          req.GroupName,
		GroupSortOrder:     req.GroupSortOrder,
	}

	if req.IsSystemPermission != nil {
		permission.IsSystemPermission = *req.IsSystemPermission
	}

	if err := s.permissionRepo.Create(permission); err != nil {
		return nil, err
	}

	// Invalidate all caches since permission definitions changed
	s.cache.invalidateAll()

	return permission.ToResponse(), nil
}

// Update updates an existing permission
func (s *permissionService) Update(id string, req *domain.UpdatePermissionRequest) (*domain.PermissionResponse, error) {
	permission, err := s.permissionRepo.FindByID(id)
	if err != nil {
		return nil, ErrPermissionNotFound
	}

	// Check code uniqueness if changing
	if req.Code != nil && *req.Code != permission.Code {
		existing, _ := s.permissionRepo.FindByCode(*req.Code)
		if existing != nil {
			return nil, ErrPermissionCodeExists
		}
		permission.Code = *req.Code
	}

	if req.Name != nil {
		permission.Name = *req.Name
	}
	if req.Description != nil {
		permission.Description = req.Description
	}
	if req.Resource != nil {
		permission.Resource = *req.Resource
	}
	if req.Action != nil {
		permission.Action = *req.Action
	}
	if req.Scope != nil {
		permission.Scope = req.Scope
	}
	if req.Conditions != nil {
		permission.Conditions = req.Conditions
	}
	if req.Metadata != nil {
		permission.Metadata = req.Metadata
	}
	if req.IsActive != nil {
		permission.IsActive = *req.IsActive
	}
	if req.Category != nil {
		permission.Category = req.Category
	}
	if req.GroupIcon != nil {
		permission.GroupIcon = req.GroupIcon
	}
	if req.GroupName != nil {
		permission.GroupName = req.GroupName
	}
	if req.GroupSortOrder != nil {
		permission.GroupSortOrder = req.GroupSortOrder
	}

	if err := s.permissionRepo.Update(permission); err != nil {
		return nil, err
	}

	// Invalidate all caches
	s.cache.invalidateAll()

	return permission.ToResponse(), nil
}

// Delete deletes a permission
func (s *permissionService) Delete(id string) error {
	_, err := s.permissionRepo.FindByID(id)
	if err != nil {
		return ErrPermissionNotFound
	}

	if err := s.permissionRepo.Delete(id); err != nil {
		return err
	}

	// Invalidate all caches
	s.cache.invalidateAll()

	return nil
}

// InvalidateUserCache invalidates the permission cache for a specific user
func (s *permissionService) InvalidateUserCache(userID string) {
	s.cache.invalidate(userID)
}

// InvalidateAllCache invalidates all permission caches
func (s *permissionService) InvalidateAllCache() {
	s.cache.invalidateAll()
}

// Helper functions

func containsCode(codes []string, code string) bool {
	for _, c := range codes {
		if strings.EqualFold(c, code) {
			return true
		}
	}
	return false
}

func generateUUID() string {
	return uuid.New().String()
}
