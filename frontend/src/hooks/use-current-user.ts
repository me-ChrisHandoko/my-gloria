'use client';

import { useAuthQuery } from './use-auth-query';
import { useGetCurrentUserQuery } from '@/store/api/apiSlice';

/**
 * Hook to get current user context with automatic Clerk token injection
 *
 * This is the primary hook for accessing user data in components.
 * It automatically handles:
 * - Clerk token injection
 * - Loading states
 * - Error handling
 * - Type-safe user data access
 *
 * Usage:
 * ```tsx
 * const { user, employee, roles, permissions, isLoading } = useCurrentUser();
 * ```
 */
export function useCurrentUser() {
  const result = useAuthQuery(useGetCurrentUserQuery);

  return {
    user: result.data?.user,
    employee: result.data?.employee,
    roles: result.data?.roles ?? [],
    permissions: result.data?.permissions ?? [],
    modules: result.data?.modules ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
}
