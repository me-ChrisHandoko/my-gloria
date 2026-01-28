// lib/store/services/accessApi.ts
/**
 * Access API Service
 *
 * RTK Query service for RBAC access checking operations.
 * Endpoints for fetching user modules, permissions, and permission checks.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
import {
  ModuleAccessResponse,
  UserPermissionsResponse,
  PermissionCheckRequest,
  PermissionCheckResponse,
  BatchPermissionCheckRequest,
  BatchPermissionCheckResponse,
} from '@/lib/types/access';

export const accessApi = createApi({
  reducerPath: 'accessApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['UserModules', 'UserPermissions', 'PermissionCheck'],
  endpoints: (builder) => ({
    /**
     * Get all accessible modules for the current user
     * Returns hierarchical module structure with permissions
     */
    getUserModules: builder.query<ModuleAccessResponse[], void>({
      query: () => '/access/modules',
      providesTags: ['UserModules'],
    }),

    /**
     * Get all effective permissions for the current user
     * Includes resolved permissions, roles, and positions
     */
    getUserPermissions: builder.query<UserPermissionsResponse, void>({
      query: () => '/access/permissions',
      providesTags: ['UserPermissions'],
    }),

    /**
     * Check a single permission for the current user
     */
    checkPermission: builder.mutation<PermissionCheckResponse, PermissionCheckRequest>({
      query: (request) => ({
        url: '/access/check',
        method: 'POST',
        body: request,
      }),
    }),

    /**
     * Check multiple permissions in a single request
     * More efficient than multiple single checks
     */
    checkPermissionBatch: builder.mutation<BatchPermissionCheckResponse, BatchPermissionCheckRequest>({
      query: (request) => ({
        url: '/access/check-batch',
        method: 'POST',
        body: request,
      }),
    }),

    /**
     * Get cache statistics (admin only)
     */
    getCacheStats: builder.query<Record<string, unknown>, void>({
      query: () => '/access/cache/stats',
    }),

    /**
     * Invalidate cache for a specific user (admin only)
     */
    invalidateUserCache: builder.mutation<{ message: string; user_id: string }, string>({
      query: (userId) => ({
        url: `/access/cache/invalidate/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: ['UserModules', 'UserPermissions'],
    }),

    /**
     * Invalidate entire permission cache (admin only)
     */
    invalidateAllCache: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/access/cache/invalidate-all',
        method: 'POST',
      }),
      invalidatesTags: ['UserModules', 'UserPermissions'],
    }),
  }),
});

export const {
  useGetUserModulesQuery,
  useGetUserPermissionsQuery,
  useCheckPermissionMutation,
  useCheckPermissionBatchMutation,
  useGetCacheStatsQuery,
  useInvalidateUserCacheMutation,
  useInvalidateAllCacheMutation,
  // Lazy queries for manual triggering
  useLazyGetUserModulesQuery,
  useLazyGetUserPermissionsQuery,
} = accessApi;
