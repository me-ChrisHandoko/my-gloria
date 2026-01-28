// lib/types/access.ts
/**
 * RBAC Type Definitions
 *
 * Type definitions for the Role-Based Access Control system.
 * Maps to backend API responses from /access/* endpoints.
 */

import { ModuleCategory } from './module';

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Available permission actions
 * Maps to backend models.PermissionAction
 */
export type PermissionAction =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'IMPORT';

/**
 * Permission scope for resource-level permissions
 * Maps to backend models.PermissionScope
 */
export type PermissionScope = 'OWN' | 'DEPARTMENT' | 'SCHOOL' | 'ALL';

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Single permission check request
 */
export interface PermissionCheckRequest {
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
}

/**
 * Batch permission check request
 */
export interface BatchPermissionCheckRequest {
  checks: PermissionCheckRequest[];
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Single permission check response
 */
export interface PermissionCheckResponse {
  allowed: boolean;
  source: string;
  source_id?: string;
  source_name?: string;
}

/**
 * Batch permission check response
 */
export interface BatchPermissionCheckResponse {
  results: Record<string, PermissionCheckResponse>;
}

/**
 * Module access response from /access/modules
 */
export interface ModuleAccessResponse {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  icon?: string | null;
  path?: string | null;
  parent_id?: string | null;
  sort_order: number;
  permissions: string[];
  children?: ModuleAccessResponse[];
}

/**
 * Resolved permission from /access/permissions
 */
export interface ResolvedPermissionResponse {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope | null;
  is_granted: boolean;
  source: string;
  source_id: string;
  source_name: string;
  priority: number;
}

/**
 * User's role access information
 */
export interface RoleAccessResponse {
  id: string;
  code: string;
  name: string;
  hierarchy_level: number;
  effective_from: string;
  effective_until?: string | null;
}

/**
 * User's position access information
 */
export interface PositionAccessResponse {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  school?: string | null;
  start_date: string;
  end_date?: string | null;
  is_plt: boolean;
}

/**
 * Full user permissions response from /access/permissions
 */
export interface UserPermissionsResponse {
  user_id: string;
  permissions: ResolvedPermissionResponse[];
  roles: RoleAccessResponse[];
  positions: PositionAccessResponse[];
  checked_at: string;
}

// ============================================================================
// Redux State Types
// ============================================================================

/**
 * Cached permission entry for O(1) lookup
 */
export interface CachedPermission {
  allowed: boolean;
  source: string;
  sourceId?: string;
  sourceName?: string;
  cachedAt: number;
}

/**
 * RBAC Redux state
 */
export interface RBACState {
  /** User's accessible modules */
  modules: ModuleAccessResponse[];
  /** User's resolved permissions */
  permissions: ResolvedPermissionResponse[];
  /** User's active roles */
  roles: RoleAccessResponse[];
  /** User's active positions */
  positions: PositionAccessResponse[];
  /** Permission cache for O(1) lookup: key -> CachedPermission */
  permissionCache: Record<string, CachedPermission>;
  /** Loading states */
  isLoadingModules: boolean;
  isLoadingPermissions: boolean;
  /** Last fetch timestamps */
  modulesLastFetched: number | null;
  permissionsLastFetched: number | null;
  /** Error states */
  modulesError: string | null;
  permissionsError: string | null;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for usePermission hook
 */
export interface UsePermissionResult {
  /** Whether the user has the permission */
  hasPermission: boolean;
  /** Whether permission check is loading */
  isLoading: boolean;
  /** Source of the permission (role, position, direct, etc.) */
  source?: string;
  /** Function to manually check a different permission */
  checkPermission: (resource: string, action: PermissionAction, scope?: PermissionScope) => boolean;
}

/**
 * Return type for useModuleAccess hook
 */
export interface UseModuleAccessResult {
  /** Whether user has access to the module */
  hasAccess: boolean;
  /** Whether module access check is loading */
  isLoading: boolean;
  /** The module details if accessible */
  module?: ModuleAccessResponse;
  /** List of permissions user has on this module */
  permissions: string[];
  /** Check if user can perform a specific action */
  canPerform: (action: PermissionAction) => boolean;
}

/**
 * Return type for useRBAC hook
 */
export interface UseRBACResult {
  /** User's accessible modules */
  modules: ModuleAccessResponse[];
  /** User's resolved permissions */
  permissions: ResolvedPermissionResponse[];
  /** User's active roles */
  roles: RoleAccessResponse[];
  /** User's active positions */
  positions: PositionAccessResponse[];
  /** Overall loading state */
  isLoading: boolean;
  /** Check if user has a specific permission */
  hasPermission: (resource: string, action: PermissionAction, scope?: PermissionScope) => boolean;
  /** Check if user has access to a module */
  hasModuleAccess: (moduleCode: string) => boolean;
  /** Get permissions for a specific module */
  getModulePermissions: (moduleCode: string) => string[];
  /** Refetch all RBAC data */
  refetch: () => void;
  /** Clear all RBAC data (for logout) */
  clear: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique key for permission cache lookup
 * Format: resource:action[:scope]
 */
export function getPermissionKey(
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope
): string {
  const baseKey = `${resource.toLowerCase()}:${action.toLowerCase()}`;
  return scope ? `${baseKey}:${scope.toLowerCase()}` : baseKey;
}

/**
 * Parse a permission key back into its components
 */
export function parsePermissionKey(key: string): {
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
} {
  const parts = key.split(':');
  return {
    resource: parts[0].toUpperCase(),
    action: parts[1].toUpperCase() as PermissionAction,
    scope: parts[2]?.toUpperCase() as PermissionScope | undefined,
  };
}

/**
 * Check if a permission cache entry is still valid
 * Default TTL: 60 minutes (1 hour)
 */
export function isCacheValid(cachedAt: number, ttlMs: number = 60 * 60 * 1000): boolean {
  return Date.now() - cachedAt < ttlMs;
}

/**
 * Check if a permission cache entry is stale but still usable
 * Stale TTL: 24 hours - use stale data while refreshing
 */
export function isCacheStale(cachedAt: number, staleTtlMs: number = 24 * 60 * 60 * 1000): boolean {
  return Date.now() - cachedAt < staleTtlMs;
}
