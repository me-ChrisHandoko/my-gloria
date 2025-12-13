/**
 * Role Checking Hook
 *
 * Provides utilities for checking user roles in React components.
 * Integrates with the current user context from Redux store.
 */

'use client';

import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import type {
  RoleCode,
  RoleCheckOptions,
  RoleCheckResult,
  AuthError,
  AuthErrorType,
} from '@/types/auth';

/**
 * Hook for checking user roles
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { hasRole } = useRoleCheck();
 *
 *   if (!hasRole('ADMIN')) {
 *     return <AccessDenied />;
 *   }
 *
 *   return <AdminDashboard />;
 * }
 * ```
 */
export function useRoleCheck() {
  const { roles, isLoading, isError } = useCurrentUser();

  /**
   * Check if user has a specific role
   *
   * @param role - Role code to check (e.g., "ADMIN", "TEACHER")
   * @returns true if user has the role, false otherwise
   *
   * @example
   * ```tsx
   * const isAdmin = hasRole('ADMIN');
   * const isTeacher = hasRole('TEACHER');
   * ```
   */
  const hasRole = useMemo(() => {
    return (role: RoleCode): boolean => {
      if (isLoading || isError || !roles) {
        return false;
      }

      return roles.some((r: any) => r.code === role);
    };
  }, [roles, isLoading, isError]);

  /**
   * Check if user has any of the specified roles
   *
   * @param roleList - Array of role codes
   * @returns true if user has at least one role, false otherwise
   *
   * @example
   * ```tsx
   * const canAccessStaffArea = hasAnyRole(['ADMIN', 'TEACHER', 'STAFF']);
   * ```
   */
  const hasAnyRole = useMemo(() => {
    return (roleList: RoleCode[]): boolean => {
      if (isLoading || isError || !roles) {
        return false;
      }

      return roleList.some((role) => roles.some((r: any) => r.code === role));
    };
  }, [roles, isLoading, isError]);

  /**
   * Check if user has all of the specified roles
   *
   * @param roleList - Array of role codes
   * @returns true if user has all roles, false otherwise
   *
   * @example
   * ```tsx
   * const isSuperAdmin = hasAllRoles(['ADMIN', 'SUPER_USER']);
   * ```
   */
  const hasAllRoles = useMemo(() => {
    return (roleList: RoleCode[]): boolean => {
      if (isLoading || isError || !roles) {
        return false;
      }

      return roleList.every((role) => roles.some((r: any) => r.code === role));
    };
  }, [roles, isLoading, isError]);

  /**
   * Advanced role check with options
   *
   * @param roleList - Single role or array of roles
   * @param options - Check options (requireAll, throwOnDenied, etc.)
   * @returns Role check result with matched roles
   *
   * @example
   * ```tsx
   * // Check single role
   * const result = checkRole('ADMIN');
   *
   * // Check multiple roles (any)
   * const result = checkRole(['ADMIN', 'TEACHER'], { requireAll: false });
   *
   * // Check with throw on denied
   * try {
   *   checkRole('SUPER_ADMIN', { throwOnDenied: true });
   * } catch (error) {
   *   console.error('Access denied:', error);
   * }
   * ```
   */
  const checkRole = useMemo(() => {
    return (
      roleList: RoleCode | RoleCode[],
      options: RoleCheckOptions = {}
    ): RoleCheckResult => {
      const {
        requireAll = false,
        throwOnDenied = false,
        deniedMessage = 'Required role not found',
      } = options;

      // Handle loading state
      if (isLoading) {
        return {
          hasRole: false,
          matchedRoles: [],
          reason: 'Checking roles...',
        };
      }

      // Handle error state
      if (isError) {
        return {
          hasRole: false,
          matchedRoles: [],
          reason: 'Failed to load roles',
        };
      }

      // Handle missing roles
      if (!roles) {
        return {
          hasRole: false,
          matchedRoles: [],
          reason: 'No roles available',
        };
      }

      // Normalize to array
      const rolesToCheck = Array.isArray(roleList) ? roleList : [roleList];

      // Empty array check
      if (rolesToCheck.length === 0) {
        return { hasRole: true, matchedRoles: [] };
      }

      // Find matched roles
      const matchedRoles = rolesToCheck.filter((role) =>
        roles.some((r: any) => r.code === role)
      );

      // Check if requirement is met
      const hasRole = requireAll
        ? matchedRoles.length === rolesToCheck.length
        : matchedRoles.length > 0;

      // Build result
      const result: RoleCheckResult = {
        hasRole,
        matchedRoles,
        reason: hasRole
          ? undefined
          : `Missing required role${rolesToCheck.length > 1 ? 's' : ''}: ${rolesToCheck.join(', ')}`,
      };

      // Throw if requested
      if (!hasRole && throwOnDenied) {
        const error: AuthError = {
          name: 'AuthError',
          message: deniedMessage,
          type: 'ROLE_REQUIRED' as AuthErrorType,
          details: {
            required: rolesToCheck,
            matched: matchedRoles,
            requireAll,
          },
        } as AuthError;
        throw error;
      }

      return result;
    };
  }, [roles, isLoading, isError]);

  /**
   * Get all user role codes
   *
   * @returns Array of role codes
   *
   * @example
   * ```tsx
   * const userRoles = getRoleCodes();
   * // Returns: ['TEACHER', 'STAFF']
   * ```
   */
  const getRoleCodes = useMemo(() => {
    return (): RoleCode[] => {
      if (isLoading || isError || !roles) {
        return [];
      }

      return roles.map((r: any) => r.code as RoleCode);
    };
  }, [roles, isLoading, isError]);

  /**
   * Get role by code
   *
   * @param roleCode - Role code to find
   * @returns Role object or undefined
   *
   * @example
   * ```tsx
   * const adminRole = getRoleByCode('ADMIN');
   * console.log(adminRole?.name); // "Administrator"
   * ```
   */
  const getRoleByCode = useMemo(() => {
    return (roleCode: RoleCode) => {
      if (isLoading || isError || !roles) {
        return undefined;
      }

      return roles.find((r: any) => r.code === roleCode);
    };
  }, [roles, isLoading, isError]);

  /**
   * Check if user is admin
   *
   * Convenience method for common admin check
   *
   * @returns true if user has ADMIN role
   *
   * @example
   * ```tsx
   * const isAdmin = isAdminUser();
   * ```
   */
  const isAdminUser = useMemo(() => {
    return (): boolean => {
      return hasRole('ADMIN');
    };
  }, [hasRole]);

  /**
   * Check if user is teacher
   *
   * Convenience method for common teacher check
   *
   * @returns true if user has TEACHER role
   *
   * @example
   * ```tsx
   * const isTeacher = isTeacherUser();
   * ```
   */
  const isTeacherUser = useMemo(() => {
    return (): boolean => {
      return hasRole('TEACHER');
    };
  }, [hasRole]);

  /**
   * Check if user is student
   *
   * Convenience method for common student check
   *
   * @returns true if user has STUDENT role
   *
   * @example
   * ```tsx
   * const isStudent = isStudentUser();
   * ```
   */
  const isStudentUser = useMemo(() => {
    return (): boolean => {
      return hasRole('STUDENT');
    };
  }, [hasRole]);

  return {
    // Role data
    roles,
    isLoading,
    isError,

    // Single role checks
    hasRole,

    // Multiple role checks
    hasAnyRole,
    hasAllRoles,

    // Advanced checking
    checkRole,

    // Role retrieval
    getRoleCodes,
    getRoleByCode,

    // Convenience checks
    isAdminUser,
    isTeacherUser,
    isStudentUser,
  };
}

/**
 * Hook for checking specific role with loading state
 *
 * Useful for components that need to check a role immediately
 * and handle loading/error states explicitly.
 *
 * @param role - Role code to check
 * @returns Object with hasRole status and loading/error states
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { hasRole, isLoading, isError } = useRole('ADMIN');
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *   if (!hasRole) return <AccessDenied />;
 *
 *   return <AdminDashboard />;
 * }
 * ```
 */
export function useRole(role: RoleCode) {
  const { hasRole: checkHasRole, isLoading, isError } = useRoleCheck();

  const hasRole = useMemo(() => {
    return checkHasRole(role);
  }, [checkHasRole, role]);

  return {
    hasRole,
    isLoading,
    isError,
  };
}

/**
 * Hook for checking multiple roles with loading state
 *
 * @param roleList - Array of role codes
 * @param options - Check options
 * @returns Object with hasRole status and loading/error states
 *
 * @example
 * ```tsx
 * function StaffArea() {
 *   const { hasRole, isLoading, matchedRoles } = useMultipleRoles(
 *     ['ADMIN', 'TEACHER', 'STAFF'],
 *     { requireAll: false }
 *   );
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!hasRole) return <AccessDenied />;
 *
 *   return <StaffDashboard roles={matchedRoles} />;
 * }
 * ```
 */
export function useMultipleRoles(
  roleList: RoleCode[],
  options: RoleCheckOptions = {}
) {
  const { checkRole, isLoading, isError } = useRoleCheck();

  const result = useMemo(() => {
    return checkRole(roleList, options);
  }, [checkRole, roleList, options]);

  return {
    hasRole: result.hasRole,
    matchedRoles: result.matchedRoles,
    reason: result.reason,
    isLoading,
    isError,
  };
}
