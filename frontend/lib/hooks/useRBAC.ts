// lib/hooks/useRBAC.ts
/**
 * useRBAC Hook
 *
 * Comprehensive RBAC hook with all access control functionality.
 * Provides access to modules, permissions, roles, positions, and utility functions.
 */

'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import {
  useGetUserModulesQuery,
  useGetUserPermissionsQuery,
} from '@/lib/store/services/accessApi';
import {
  PermissionAction,
  PermissionScope,
  ModuleAccessResponse,
  UseRBACResult,
  getPermissionKey,
  isCacheValid,
} from '@/lib/types/access';
import {
  selectModules,
  selectPermissions,
  selectRoles,
  selectPositions,
  selectPermissionCache,
  selectIsLoading,
  selectIsInitialized,
  clearRbac,
} from '@/lib/store/features/rbacSlice';

interface UseRBACOptions {
  /** Skip fetching RBAC data (useful when user is not authenticated) */
  skip?: boolean;
  /** Force refetch even if data is already cached */
  forceRefetch?: boolean;
}

/**
 * Comprehensive RBAC hook that provides all access control functionality
 *
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function AdminDashboard() {
 *   const {
 *     modules,
 *     roles,
 *     hasPermission,
 *     hasModuleAccess,
 *     isLoading,
 *   } = useRBAC();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   // Check specific permission
 *   if (hasPermission('system', 'READ')) {
 *     // Show admin panel
 *   }
 *
 *   // Check module access
 *   const employeesAccess = hasModuleAccess('EMPLOYEES');
 *
 *   // Get module permissions
 *   const employeePermissions = getModulePermissions('EMPLOYEES');
 *
 *   return <Dashboard />;
 * }
 * ```
 */
export function useRBAC(options: UseRBACOptions = {}): UseRBACResult {
  const { skip = false, forceRefetch = false } = options;
  const dispatch = useAppDispatch();

  // Selectors
  const modules = useAppSelector(selectModules);
  const permissions = useAppSelector(selectPermissions);
  const roles = useAppSelector(selectRoles);
  const positions = useAppSelector(selectPositions);
  const permissionCache = useAppSelector(selectPermissionCache);
  const isLoadingState = useAppSelector(selectIsLoading);
  const isInitialized = useAppSelector(selectIsInitialized);

  // RTK Query hooks for fetching data
  const {
    refetch: refetchModules,
    isLoading: isLoadingModules,
    isFetching: isFetchingModules,
  } = useGetUserModulesQuery(undefined, {
    skip,
    refetchOnMountOrArgChange: forceRefetch,
  });

  const {
    refetch: refetchPermissions,
    isLoading: isLoadingPermissions,
    isFetching: isFetchingPermissions,
  } = useGetUserPermissionsQuery(undefined, {
    skip,
    refetchOnMountOrArgChange: forceRefetch,
  });

  // Combined loading state
  const isLoading = useMemo(() => {
    return (
      isLoadingState ||
      isLoadingModules ||
      isLoadingPermissions ||
      isFetchingModules ||
      isFetchingPermissions ||
      (!skip && !isInitialized)
    );
  }, [
    isLoadingState,
    isLoadingModules,
    isLoadingPermissions,
    isFetchingModules,
    isFetchingPermissions,
    skip,
    isInitialized,
  ]);

  /**
   * Check if user has a specific permission (O(1) lookup from cache)
   */
  const hasPermission = useCallback(
    (resource: string, action: PermissionAction, scope?: PermissionScope): boolean => {
      if (!isInitialized) return false;

      const key = getPermissionKey(resource, action, scope);
      const cached = permissionCache[key];

      if (cached && isCacheValid(cached.cachedAt)) {
        return cached.allowed;
      }

      // Try without scope if not found
      if (scope) {
        const keyWithoutScope = getPermissionKey(resource, action);
        const cachedWithoutScope = permissionCache[keyWithoutScope];
        if (cachedWithoutScope && isCacheValid(cachedWithoutScope.cachedAt)) {
          return cachedWithoutScope.allowed;
        }
      }

      // If checking without scope but not found, try with 'ALL' scope
      // This handles the case where permissions have scope=ALL in the database
      if (!scope) {
        const keyWithAllScope = getPermissionKey(resource, action, 'ALL');
        const cachedWithAllScope = permissionCache[keyWithAllScope];
        if (cachedWithAllScope && isCacheValid(cachedWithAllScope.cachedAt)) {
          return cachedWithAllScope.allowed;
        }
      }

      return false;
    },
    [permissionCache, isInitialized]
  );

  /**
   * Check if user has access to a specific module
   */
  const hasModuleAccess = useCallback(
    (moduleCode: string): boolean => {
      if (!isInitialized) return false;

      const findModule = (mods: ModuleAccessResponse[]): boolean => {
        for (const mod of mods) {
          if (mod.code.toLowerCase() === moduleCode.toLowerCase()) {
            return true;
          }
          if (mod.children && findModule(mod.children)) {
            return true;
          }
        }
        return false;
      };

      return findModule(modules);
    },
    [modules, isInitialized]
  );

  /**
   * Get permissions for a specific module
   */
  const getModulePermissions = useCallback(
    (moduleCode: string): string[] => {
      if (!isInitialized) return [];

      const findModule = (mods: ModuleAccessResponse[]): ModuleAccessResponse | undefined => {
        for (const mod of mods) {
          if (mod.code.toLowerCase() === moduleCode.toLowerCase()) {
            return mod;
          }
          if (mod.children) {
            const found = findModule(mod.children);
            if (found) return found;
          }
        }
        return undefined;
      };

      const module = findModule(modules);
      return module?.permissions || [];
    },
    [modules, isInitialized]
  );

  /**
   * Refetch all RBAC data
   */
  const refetch = useCallback(() => {
    if (!skip) {
      refetchModules();
      refetchPermissions();
    }
  }, [skip, refetchModules, refetchPermissions]);

  /**
   * Clear all RBAC data (for logout)
   */
  const clear = useCallback(() => {
    dispatch(clearRbac());
  }, [dispatch]);

  return {
    modules,
    permissions,
    roles,
    positions,
    isLoading,
    hasPermission,
    hasModuleAccess,
    getModulePermissions,
    refetch,
    clear,
  };
}

/**
 * Hook to initialize RBAC data when user is authenticated
 * Should be called once at the app root level
 */
export function useInitializeRBAC(isAuthenticated: boolean) {
  const { refetch, clear } = useRBAC({ skip: !isAuthenticated });

  // Fetch RBAC data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refetch();
    } else {
      clear();
    }
  }, [isAuthenticated, refetch, clear]);
}

export default useRBAC;
