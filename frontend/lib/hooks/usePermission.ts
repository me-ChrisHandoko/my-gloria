// lib/hooks/usePermission.ts
/**
 * usePermission Hook
 *
 * Single permission check with O(1) lookup from cache.
 * Automatically fetches permissions if not loaded.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import {
  PermissionAction,
  PermissionScope,
  getPermissionKey,
  isCacheValid,
  isCacheStale,
  UsePermissionResult,
} from '@/lib/types/access';
import {
  selectPermissionCache,
  selectIsLoading,
  selectIsInitialized,
} from '@/lib/store/features/rbacSlice';

/**
 * Hook to check if the current user has a specific permission
 *
 * @param resource - The resource to check permission for (e.g., 'employees', 'schools')
 * @param action - The action to check (e.g., 'READ', 'CREATE', 'UPDATE', 'DELETE')
 * @param scope - Optional scope for resource-level permissions
 *
 * @example
 * ```tsx
 * const { hasPermission, isLoading } = usePermission('employees', 'CREATE');
 *
 * if (isLoading) return <Spinner />;
 * if (!hasPermission) return <AccessDenied />;
 * return <CreateEmployeeForm />;
 * ```
 */
export function usePermission(
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope
): UsePermissionResult {
  const permissionCache = useAppSelector(selectPermissionCache);
  const isLoading = useAppSelector(selectIsLoading);
  const isInitialized = useAppSelector(selectIsInitialized);

  /**
   * Check permission from cache (O(1) lookup)
   *
   * Fallback hierarchy:
   * 1. Exact match (resource:action:scope) - fresh cache
   * 2. If checking with scope, try without scope (resource:action)
   * 3. If checking without scope, try with 'ALL' scope (resource:action:all)
   * 4. If cache is stale but within 24h, still return the cached value
   */
  const checkPermission = useCallback(
    (res: string, act: PermissionAction, scp?: PermissionScope): boolean => {
      const key = getPermissionKey(res, act, scp);
      const cached = permissionCache[key];

      // Check fresh cache first
      if (cached && isCacheValid(cached.cachedAt)) {
        return cached.allowed;
      }

      // If checking with scope but not found, try without scope
      if (scp) {
        const keyWithoutScope = getPermissionKey(res, act);
        const cachedWithoutScope = permissionCache[keyWithoutScope];
        if (cachedWithoutScope && isCacheValid(cachedWithoutScope.cachedAt)) {
          return cachedWithoutScope.allowed;
        }
      }

      // If checking without scope but not found, try with 'ALL' scope
      // This handles the case where permissions have scope=ALL in the database
      if (!scp) {
        const keyWithAllScope = getPermissionKey(res, act, 'ALL');
        const cachedWithAllScope = permissionCache[keyWithAllScope];
        if (cachedWithAllScope && isCacheValid(cachedWithAllScope.cachedAt)) {
          return cachedWithAllScope.allowed;
        }
      }

      // Fallback: return stale data if available (within 24h)
      // Better to show stale permissions than hide all actions
      if (cached && isCacheStale(cached.cachedAt)) {
        return cached.allowed;
      }
      if (scp) {
        const keyWithoutScope = getPermissionKey(res, act);
        const cachedWithoutScope = permissionCache[keyWithoutScope];
        if (cachedWithoutScope && isCacheStale(cachedWithoutScope.cachedAt)) {
          return cachedWithoutScope.allowed;
        }
      }
      if (!scp) {
        const keyWithAllScope = getPermissionKey(res, act, 'ALL');
        const cachedWithAllScope = permissionCache[keyWithAllScope];
        if (cachedWithAllScope && isCacheStale(cachedWithAllScope.cachedAt)) {
          return cachedWithAllScope.allowed;
        }
      }

      return false;
    },
    [permissionCache]
  );

  /**
   * Get the cached permission result
   */
  const cachedResult = useMemo(() => {
    const key = getPermissionKey(resource, action, scope);
    const cached = permissionCache[key];

    if (cached && isCacheValid(cached.cachedAt)) {
      return cached;
    }

    // Try without scope if not found
    if (scope) {
      const keyWithoutScope = getPermissionKey(resource, action);
      const cachedWithoutScope = permissionCache[keyWithoutScope];
      if (cachedWithoutScope && isCacheValid(cachedWithoutScope.cachedAt)) {
        return cachedWithoutScope;
      }
    }

    // Try with 'ALL' scope if checking without scope
    if (!scope) {
      const keyWithAllScope = getPermissionKey(resource, action, 'ALL');
      const cachedWithAllScope = permissionCache[keyWithAllScope];
      if (cachedWithAllScope && isCacheValid(cachedWithAllScope.cachedAt)) {
        return cachedWithAllScope;
      }
    }

    return undefined;
  }, [permissionCache, resource, action, scope]);

  /**
   * Determine if user has permission
   */
  const hasPermission = useMemo(() => {
    if (!isInitialized) return false;
    return checkPermission(resource, action, scope);
  }, [isInitialized, checkPermission, resource, action, scope]);

  return {
    hasPermission,
    isLoading: isLoading || !isInitialized,
    source: cachedResult?.source,
    checkPermission,
  };
}

/**
 * Hook to check multiple permissions at once
 *
 * @example
 * ```tsx
 * const permissions = usePermissions([
 *   { resource: 'employees', action: 'CREATE' },
 *   { resource: 'employees', action: 'DELETE' },
 * ]);
 *
 * if (permissions.every(p => p.hasPermission)) {
 *   // User can both create and delete employees
 * }
 * ```
 */
export function usePermissions(
  checks: Array<{ resource: string; action: PermissionAction; scope?: PermissionScope }>
): Array<{ hasPermission: boolean; isLoading: boolean }> {
  const permissionCache = useAppSelector(selectPermissionCache);
  const isLoading = useAppSelector(selectIsLoading);
  const isInitialized = useAppSelector(selectIsInitialized);

  return useMemo(() => {
    return checks.map(({ resource, action, scope }) => {
      if (!isInitialized) {
        return { hasPermission: false, isLoading: true };
      }

      const key = getPermissionKey(resource, action, scope);
      const cached = permissionCache[key];

      if (cached && isCacheValid(cached.cachedAt)) {
        return { hasPermission: cached.allowed, isLoading: false };
      }

      // Try without scope if checking with scope
      if (scope) {
        const keyWithoutScope = getPermissionKey(resource, action);
        const cachedWithoutScope = permissionCache[keyWithoutScope];
        if (cachedWithoutScope && isCacheValid(cachedWithoutScope.cachedAt)) {
          return { hasPermission: cachedWithoutScope.allowed, isLoading: false };
        }
      }

      // Try with 'ALL' scope if checking without scope
      if (!scope) {
        const keyWithAllScope = getPermissionKey(resource, action, 'ALL');
        const cachedWithAllScope = permissionCache[keyWithAllScope];
        if (cachedWithAllScope && isCacheValid(cachedWithAllScope.cachedAt)) {
          return { hasPermission: cachedWithAllScope.allowed, isLoading: false };
        }
      }

      return { hasPermission: false, isLoading: isLoading };
    });
  }, [checks, permissionCache, isLoading, isInitialized]);
}

export default usePermission;
