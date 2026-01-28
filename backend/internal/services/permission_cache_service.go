package services

import (
	"backend/internal/models"
	"fmt"
	"sync"
	"time"

	"gorm.io/gorm"
)

// PermissionCacheEntry represents a cached permission check result
type PermissionCacheEntry struct {
	Result    *PermissionCheckResult
	ExpiresAt time.Time
}

// PermissionCacheService provides caching for permission checks
type PermissionCacheService struct {
	cache    map[string]*PermissionCacheEntry
	mu       sync.RWMutex
	ttl      time.Duration
	db       *gorm.DB
	resolver *PermissionResolverService
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	TTL             time.Duration
	CleanupInterval time.Duration
}

// DefaultCacheConfig returns default cache configuration
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		TTL:             5 * time.Minute,
		CleanupInterval: 10 * time.Minute,
	}
}

// NewPermissionCacheService creates a new permission cache service
func NewPermissionCacheService(db *gorm.DB, resolver *PermissionResolverService, config CacheConfig) *PermissionCacheService {
	service := &PermissionCacheService{
		cache:    make(map[string]*PermissionCacheEntry),
		ttl:      config.TTL,
		db:       db,
		resolver: resolver,
	}

	// Start background cleanup goroutine
	go service.startCleanup(config.CleanupInterval)

	return service
}

// startCleanup periodically removes expired cache entries
func (s *PermissionCacheService) startCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		s.cleanup()
	}
}

// cleanup removes expired entries from the cache
func (s *PermissionCacheService) cleanup() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for key, entry := range s.cache {
		if now.After(entry.ExpiresAt) {
			delete(s.cache, key)
		}
	}
}

// buildCacheKey creates a unique cache key for a permission check
func buildCacheKey(userID string, req PermissionCheckRequest) string {
	key := fmt.Sprintf("perm:%s:%s:%s", userID, req.Resource, req.Action)
	if req.Scope != nil {
		key += ":" + string(*req.Scope)
	}
	return key
}

// CheckPermission checks permission with caching
func (s *PermissionCacheService) CheckPermission(userID string, req PermissionCheckRequest) (*PermissionCheckResult, error) {
	cacheKey := buildCacheKey(userID, req)

	// Try to get from cache
	s.mu.RLock()
	if entry, ok := s.cache[cacheKey]; ok {
		if time.Now().Before(entry.ExpiresAt) {
			s.mu.RUnlock()
			return entry.Result, nil
		}
	}
	s.mu.RUnlock()

	// Cache miss or expired - resolve permission
	result, err := s.resolver.CheckPermission(userID, req)
	if err != nil {
		return nil, err
	}

	// Store in cache
	s.mu.Lock()
	s.cache[cacheKey] = &PermissionCacheEntry{
		Result:    result,
		ExpiresAt: time.Now().Add(s.ttl),
	}
	s.mu.Unlock()

	return result, nil
}

// CheckPermissionBatch checks multiple permissions with caching
func (s *PermissionCacheService) CheckPermissionBatch(userID string, requests []PermissionCheckRequest) (map[string]*PermissionCheckResult, error) {
	results := make(map[string]*PermissionCheckResult)
	var uncached []PermissionCheckRequest

	// First pass: check cache
	s.mu.RLock()
	for _, req := range requests {
		cacheKey := buildCacheKey(userID, req)
		resultKey := buildPermissionKey(req)

		if entry, ok := s.cache[cacheKey]; ok {
			if time.Now().Before(entry.ExpiresAt) {
				results[resultKey] = entry.Result
				continue
			}
		}
		uncached = append(uncached, req)
	}
	s.mu.RUnlock()

	// Resolve uncached permissions
	for _, req := range uncached {
		result, err := s.resolver.CheckPermission(userID, req)
		if err != nil {
			return nil, fmt.Errorf("failed to check permission: %w", err)
		}

		cacheKey := buildCacheKey(userID, req)
		resultKey := buildPermissionKey(req)

		// Store in cache
		s.mu.Lock()
		s.cache[cacheKey] = &PermissionCacheEntry{
			Result:    result,
			ExpiresAt: time.Now().Add(s.ttl),
		}
		s.mu.Unlock()

		results[resultKey] = result
	}

	return results, nil
}

// HasPermission is a convenience method with caching
func (s *PermissionCacheService) HasPermission(userID, resource string, action models.PermissionAction) (bool, error) {
	result, err := s.CheckPermission(userID, PermissionCheckRequest{
		Resource: resource,
		Action:   action,
	})
	if err != nil {
		return false, err
	}
	return result.Allowed, nil
}

// HasPermissionWithScope checks permission with scope and caching
func (s *PermissionCacheService) HasPermissionWithScope(userID, resource string, action models.PermissionAction, scope models.PermissionScope) (bool, error) {
	result, err := s.CheckPermission(userID, PermissionCheckRequest{
		Resource: resource,
		Action:   action,
		Scope:    &scope,
	})
	if err != nil {
		return false, err
	}
	return result.Allowed, nil
}

// InvalidateUser invalidates all cached permissions for a user
func (s *PermissionCacheService) InvalidateUser(userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	prefix := fmt.Sprintf("perm:%s:", userID)
	for key := range s.cache {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			delete(s.cache, key)
		}
	}
}

// InvalidateAll clears the entire cache
func (s *PermissionCacheService) InvalidateAll() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.cache = make(map[string]*PermissionCacheEntry)
}

// CacheInvalidationService handles cache invalidation triggers
type CacheInvalidationService struct {
	cache *PermissionCacheService
	db    *gorm.DB
}

// NewCacheInvalidationService creates a new cache invalidation service
func NewCacheInvalidationService(cache *PermissionCacheService, db *gorm.DB) *CacheInvalidationService {
	return &CacheInvalidationService{
		cache: cache,
		db:    db,
	}
}

// InvalidateOnRoleChange invalidates cache for all users with the specified role
func (s *CacheInvalidationService) InvalidateOnRoleChange(roleID string) error {
	// Find all users with this role
	var userRoles []models.UserRole
	if err := s.db.Where("role_id = ?", roleID).Find(&userRoles).Error; err != nil {
		return fmt.Errorf("failed to find users with role: %w", err)
	}

	// Also find users with roles that inherit from this role
	inheritingRoleIDs, err := s.getInheritingRoleIDs(roleID)
	if err != nil {
		return err
	}

	if len(inheritingRoleIDs) > 0 {
		var inheritingUserRoles []models.UserRole
		if err := s.db.Where("role_id IN ?", inheritingRoleIDs).Find(&inheritingUserRoles).Error; err != nil {
			return fmt.Errorf("failed to find users with inheriting roles: %w", err)
		}
		userRoles = append(userRoles, inheritingUserRoles...)
	}

	// Invalidate cache for all affected users
	invalidated := make(map[string]bool)
	for _, ur := range userRoles {
		if !invalidated[ur.UserID] {
			s.cache.InvalidateUser(ur.UserID)
			invalidated[ur.UserID] = true
		}
	}

	return nil
}

// getInheritingRoleIDs finds all roles that inherit from the given role
func (s *CacheInvalidationService) getInheritingRoleIDs(roleID string) ([]string, error) {
	query := `
		WITH RECURSIVE role_tree AS (
			SELECT rh.role_id, 1 as depth
			FROM public.role_hierarchy rh
			WHERE rh.parent_role_id = $1

			UNION ALL

			SELECT rh.role_id, rt.depth + 1
			FROM public.role_hierarchy rh
			INNER JOIN role_tree rt ON rh.parent_role_id = rt.role_id
			WHERE rt.depth < 10
		)
		SELECT DISTINCT role_id FROM role_tree
	`

	var roleIDs []string
	if err := s.db.Raw(query, roleID).Scan(&roleIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to get inheriting roles: %w", err)
	}

	return roleIDs, nil
}

// InvalidateOnRolePermissionChange invalidates cache when a permission is added/removed from a role
func (s *CacheInvalidationService) InvalidateOnRolePermissionChange(roleID string) error {
	return s.InvalidateOnRoleChange(roleID)
}

// InvalidateOnPositionChange invalidates cache for all users with the specified position
func (s *CacheInvalidationService) InvalidateOnPositionChange(positionID string) error {
	var userPositions []models.UserPosition
	if err := s.db.Where("position_id = ?", positionID).
		Where("is_active = ?", true).
		Find(&userPositions).Error; err != nil {
		return fmt.Errorf("failed to find users with position: %w", err)
	}

	for _, up := range userPositions {
		s.cache.InvalidateUser(up.UserID)
	}

	return nil
}

// InvalidateOnUserPermissionChange invalidates cache for a specific user
func (s *CacheInvalidationService) InvalidateOnUserPermissionChange(userID string) error {
	s.cache.InvalidateUser(userID)
	return nil
}

// InvalidateOnUserRoleChange invalidates cache when a role is assigned/removed from a user
func (s *CacheInvalidationService) InvalidateOnUserRoleChange(userID string) error {
	s.cache.InvalidateUser(userID)
	return nil
}

// InvalidateOnUserPositionChange invalidates cache when a position is assigned/removed from a user
func (s *CacheInvalidationService) InvalidateOnUserPositionChange(userID string) error {
	s.cache.InvalidateUser(userID)
	return nil
}

// GetCacheStats returns cache statistics
func (s *PermissionCacheService) GetCacheStats() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := len(s.cache)
	expired := 0
	now := time.Now()

	for _, entry := range s.cache {
		if now.After(entry.ExpiresAt) {
			expired++
		}
	}

	return map[string]interface{}{
		"total_entries":   total,
		"expired_entries": expired,
		"active_entries":  total - expired,
		"ttl_seconds":     s.ttl.Seconds(),
	}
}
