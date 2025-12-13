/**
 * Permission Checking Hook
 *
 * Provides utilities for checking user permissions in React components.
 * Integrates with the current user context from Redux store.
 */

'use client';

import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import type {
  PermissionCode,
  PermissionCheckOptions,
  PermissionCheckResult,
  AuthError,
  AuthErrorType,
} from '@/types/auth';

/**
 * Hook for checking user permissions
 *
 * @example
 * ```tsx
 * function CreateUserButton() {
 *   const { hasPermission, checkPermission } = usePermissions();
 *
 *   if (!hasPermission('user:create')) {
 *     return null;
 *   }
 *
 *   return <button>Create User</button>;
 * }
 * ```
 */
export function usePermissions() {
  const { permissions, isLoading, isError } = useCurrentUser();

  /**
   * Check if user has a specific permission
   *
   * @param permission - Permission code to check (e.g., "user:create")
   * @returns true if user has the permission, false otherwise
   *
   * @example
   * ```tsx
   * const canCreateUser = hasPermission('user:create');
   * const canReadCourse = hasPermission('course:read');
   * ```
   */
  const hasPermission = useMemo(() => {
    return (permission: PermissionCode): boolean => {
      if (isLoading || isError || !permissions) {
        return false;
      }

      return permissions.some((p: any) => p.code === permission);
    };
  }, [permissions, isLoading, isError]);

  /**
   * Check if user has any of the specified permissions
   *
   * @param permissionList - Array of permission codes
   * @returns true if user has at least one permission, false otherwise
   *
   * @example
   * ```tsx
   * const canManageUsers = hasAnyPermission(['user:create', 'user:update', 'user:delete']);
   * ```
   */
  const hasAnyPermission = useMemo(() => {
    return (permissionList: PermissionCode[]): boolean => {
      if (isLoading || isError || !permissions) {
        return false;
      }

      return permissionList.some((permission) =>
        permissions.some((p: any) => p.code === permission)
      );
    };
  }, [permissions, isLoading, isError]);

  /**
   * Check if user has all of the specified permissions
   *
   * @param permissionList - Array of permission codes
   * @returns true if user has all permissions, false otherwise
   *
   * @example
   * ```tsx
   * const canFullyManageUsers = hasAllPermissions(['user:create', 'user:update', 'user:delete']);
   * ```
   */
  const hasAllPermissions = useMemo(() => {
    return (permissionList: PermissionCode[]): boolean => {
      if (isLoading || isError || !permissions) {
        return false;
      }

      return permissionList.every((permission) =>
        permissions.some((p: any) => p.code === permission)
      );
    };
  }, [permissions, isLoading, isError]);

  /**
   * Advanced permission check with options
   *
   * @param permissionList - Single permission or array of permissions
   * @param options - Check options (requireAll, throwOnDenied, etc.)
   * @returns Permission check result
   *
   * @example
   * ```tsx
   * // Check single permission
   * const result = checkPermission('user:create');
   *
   * // Check multiple permissions (require all)
   * const result = checkPermission(['user:create', 'user:update'], { requireAll: true });
   *
   * // Check with throw on denied
   * try {
   *   checkPermission('admin:access', { throwOnDenied: true });
   * } catch (error) {
   *   console.error('Access denied:', error);
   * }
   * ```
   */
  const checkPermission = useMemo(() => {
    return (
      permissionList: PermissionCode | PermissionCode[],
      options: PermissionCheckOptions = {}
    ): PermissionCheckResult => {
      const {
        requireAll = true,
        throwOnDenied = false,
        deniedMessage = 'Permission denied',
      } = options;

      // Handle loading state
      if (isLoading) {
        return { granted: false, reason: 'Checking permissions...' };
      }

      // Handle error state
      if (isError) {
        return { granted: false, reason: 'Failed to load permissions' };
      }

      // Handle missing permissions
      if (!permissions) {
        return { granted: false, reason: 'No permissions available' };
      }

      // Normalize to array
      const permissionsToCheck = Array.isArray(permissionList)
        ? permissionList
        : [permissionList];

      // Empty array check
      if (permissionsToCheck.length === 0) {
        return { granted: true };
      }

      // Check permissions
      const granted = requireAll
        ? hasAllPermissions(permissionsToCheck)
        : hasAnyPermission(permissionsToCheck);

      // Build result
      const result: PermissionCheckResult = {
        granted,
        reason: granted
          ? undefined
          : `Missing required permission${permissionsToCheck.length > 1 ? 's' : ''}: ${permissionsToCheck.join(', ')}`,
      };

      // Throw if requested
      if (!granted && throwOnDenied) {
        const error: AuthError = {
          name: 'AuthError',
          message: deniedMessage,
          type: 'PERMISSION_DENIED' as AuthErrorType,
          details: {
            required: permissionsToCheck,
            requireAll,
          },
        } as AuthError;
        throw error;
      }

      return result;
    };
  }, [permissions, isLoading, isError, hasAnyPermission, hasAllPermissions]);

  /**
   * Get user's permissions filtered by resource
   *
   * @param resource - Resource name (e.g., "user", "course")
   * @returns Array of permissions for the specified resource
   *
   * @example
   * ```tsx
   * const userPermissions = getPermissionsByResource('user');
   * // Returns: ['user:create', 'user:read', 'user:update']
   * ```
   */
  const getPermissionsByResource = useMemo(() => {
    return (resource: string): PermissionCode[] => {
      if (isLoading || isError || !permissions) {
        return [];
      }

      return permissions
        .filter((p: any) => p.code.startsWith(`${resource}:`))
        .map((p: any) => p.code as PermissionCode);
    };
  }, [permissions, isLoading, isError]);

  /**
   * Get user's permissions filtered by action
   *
   * @param action - Action name (e.g., "create", "read")
   * @returns Array of permissions for the specified action
   *
   * @example
   * ```tsx
   * const createPermissions = getPermissionsByAction('create');
   * // Returns: ['user:create', 'course:create', 'grade:create']
   * ```
   */
  const getPermissionsByAction = useMemo(() => {
    return (action: string): PermissionCode[] => {
      if (isLoading || isError || !permissions) {
        return [];
      }

      return permissions
        .filter((p: any) => p.code.endsWith(`:${action}`))
        .map((p: any) => p.code as PermissionCode);
    };
  }, [permissions, isLoading, isError]);

  /**
   * Check if user can perform an action on a resource
   *
   * @param resource - Resource name
   * @param action - Action name
   * @returns true if user has permission, false otherwise
   *
   * @example
   * ```tsx
   * const canCreateUser = canPerformAction('user', 'create');
   * const canReadCourse = canPerformAction('course', 'read');
   * ```
   */
  const canPerformAction = useMemo(() => {
    return (resource: string, action: string): boolean => {
      return hasPermission(`${resource}:${action}` as PermissionCode);
    };
  }, [hasPermission]);

  return {
    // Permission data
    permissions,
    isLoading,
    isError,

    // Single permission checks
    hasPermission,
    canPerformAction,

    // Multiple permission checks
    hasAnyPermission,
    hasAllPermissions,

    // Advanced checking
    checkPermission,

    // Permission filtering
    getPermissionsByResource,
    getPermissionsByAction,
  };
}

/**
 * Hook for checking specific permissions with loading state
 *
 * Useful for components that need to check permissions immediately
 * and handle loading/error states explicitly.
 *
 * @param permission - Permission code to check
 * @returns Object with granted status and loading/error states
 *
 * @example
 * ```tsx
 * function CreateUserButton() {
 *   const { granted, isLoading, isError } = usePermission('user:create');
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *   if (!granted) return null;
 *
 *   return <button>Create User</button>;
 * }
 * ```
 */
export function usePermission(permission: PermissionCode) {
  const { hasPermission, isLoading, isError } = usePermissions();

  const granted = useMemo(() => {
    return hasPermission(permission);
  }, [hasPermission, permission]);

  return {
    granted,
    isLoading,
    isError,
  };
}

/**
 * Hook for checking multiple permissions with loading state
 *
 * @param permissionList - Array of permission codes
 * @param options - Check options
 * @returns Object with granted status and loading/error states
 *
 * @example
 * ```tsx
 * function UserManagementPanel() {
 *   const { granted, isLoading } = useMultiplePermissions(
 *     ['user:create', 'user:update', 'user:delete'],
 *     { requireAll: true }
 *   );
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!granted) return <AccessDenied />;
 *
 *   return <UserManagementUI />;
 * }
 * ```
 */
export function useMultiplePermissions(
  permissionList: PermissionCode[],
  options: PermissionCheckOptions = {}
) {
  const { checkPermission, isLoading, isError } = usePermissions();

  const result = useMemo(() => {
    return checkPermission(permissionList, options);
  }, [checkPermission, permissionList, options]);

  return {
    granted: result.granted,
    reason: result.reason,
    isLoading,
    isError,
  };
}
