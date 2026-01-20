import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  Module,
  ModuleListResponse,
  ModuleTreeResponse,
  CreateModuleRequest,
  UpdateModuleRequest,
  ModuleFilter,
  PaginatedModulesResponse,
  RoleModuleAccess,
  RoleModuleAccessResponse,
  UserModuleAccess,
  UserModuleAccessResponse,
  AssignModuleToRoleRequest,
  GrantModuleAccessToUserRequest,
} from '@/lib/types/module';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

// Base query without auto-refresh
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // Send httpOnly cookies automatically
  prepareHeaders: (headers) => {
    // Inject CSRF token for state-changing requests
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    return headers;
  },
});

/**
 * RTK Query wrapper with automatic token refresh on 401 errors
 *
 * Client-Side Auto-Refresh (simpler than TIER 3 server-side):
 * - Browser automatically handles Set-Cookie headers
 * - No need to parse cookies manually
 * - Browser cookie jar auto-updates on refresh
 * - Retry automatically uses new cookies
 *
 * Flow:
 * 1. Initial request → 401 (expired token)
 * 2. Detect 401 → call /auth/refresh
 * 3. Browser receives Set-Cookie → auto-update cookie jar
 * 4. Retry original request → browser sends new cookies automatically
 * 5. Success or redirect to login if refresh fails
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // 1. Try the initial request
  let result = await baseQuery(args, api, extraOptions);

  // 2. If we get a 401, attempt to refresh the token
  if (result.error && result.error.status === 401) {
    console.log('[RTK Query] 401 detected, attempting token refresh');

    try {
      // 3. Call refresh endpoint
      // Browser automatically sends refresh token cookie and receives new tokens via Set-Cookie
      const refreshResult = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Critical: Browser handles cookies automatically
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 4. If refresh succeeded, retry the original request
      if (refreshResult.ok) {
        console.log('[RTK Query] Token refreshed successfully, retrying original request');

        // Browser cookie jar already updated with new tokens from Set-Cookie
        // Retry will automatically use the new cookies
        result = await baseQuery(args, api, extraOptions);

        if (result.error) {
          console.log('[RTK Query] Retry failed even after refresh');
        } else {
          console.log('[RTK Query] Retry successful after token refresh');
        }
      } else {
        // 5. Refresh failed (refresh token expired or invalid)
        console.log('[RTK Query] Token refresh failed, redirecting to login');

        // Redirect to login with returnUrl to preserve user's location
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/login?returnUrl=${returnUrl}`;
      }
    } catch (error) {
      console.error('[RTK Query] Exception during token refresh:', error);

      // On error, redirect to login
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
  }

  return result;
};

export const modulesApi = createApi({
  reducerPath: 'modulesApi',
  baseQuery: baseQueryWithReauth, // Use auto-refresh wrapper instead of direct baseQuery
  tagTypes: ['Module', 'ModuleDetail', 'RoleModuleAccess', 'UserModuleAccess', 'ModuleTree'],
  endpoints: (builder) => ({
    // Module CRUD Operations
    getModules: builder.query<PaginatedModulesResponse, ModuleFilter | void>({
      query: (filters) => ({
        url: '/modules',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Module' as const, id })),
              { type: 'Module', id: 'LIST' },
            ]
          : [{ type: 'Module', id: 'LIST' }],
    }),
    getModuleById: builder.query<Module, string>({
      query: (id) => `/modules/${id}`,
      providesTags: (result, error, id) => [{ type: 'ModuleDetail', id }],
    }),
    getModuleTree: builder.query<ModuleTreeResponse[], void>({
      query: () => '/modules/tree',
      providesTags: ['ModuleTree'],
    }),
    createModule: builder.mutation<Module, CreateModuleRequest>({
      query: (data) => ({
        url: '/modules',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Module'],
    }),
    updateModule: builder.mutation<Module, { id: string; data: UpdateModuleRequest }>({
      query: ({ id, data }) => ({
        url: `/modules/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Module', id: 'LIST' },
        { type: 'ModuleDetail', id },
      ],
    }),
    deleteModule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/modules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Module'],
    }),

    // Module Access Endpoints
    getRoleModuleAccesses: builder.query<RoleModuleAccessResponse[], string>({
      query: (roleId) => `/roles/${roleId}/modules`,
      providesTags: (result, error, roleId) => [
        { type: 'RoleModuleAccess', id: roleId },
        { type: 'RoleModuleAccess', id: 'LIST' },
      ],
    }),
    assignModuleToRole: builder.mutation<
      RoleModuleAccess,
      { roleId: string; data: AssignModuleToRoleRequest }
    >({
      query: ({ roleId, data }) => ({
        url: `/roles/${roleId}/modules`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'RoleModuleAccess', id: roleId },
        { type: 'RoleModuleAccess', id: 'LIST' },
      ],
    }),
    revokeModuleFromRole: builder.mutation<void, { roleId: string; accessId: string }>({
      query: ({ roleId, accessId }) => ({
        url: `/roles/${roleId}/modules/${accessId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'RoleModuleAccess', id: roleId },
        { type: 'RoleModuleAccess', id: 'LIST' },
      ],
    }),

    // User Module Access endpoints
    getUserModuleAccess: builder.query<UserModuleAccessResponse[], string>({
      query: (userId) => `/user-profiles/${userId}/modules`,
      providesTags: (result, error, userId) => [
        { type: 'UserModuleAccess', id: userId },
      ],
    }),
    grantModuleAccessToUser: builder.mutation<
      UserModuleAccess,
      { userId: string; data: GrantModuleAccessToUserRequest }
    >({
      query: ({ userId, data }) => ({
        url: `/user-profiles/${userId}/modules`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserModuleAccess', id: userId },
      ],
    }),
    revokeModuleAccessFromUser: builder.mutation<
      void,
      { userId: string; accessId: string; reason?: string }
    >({
      query: ({ userId, accessId, ...body }) => ({
        url: `/users/${userId}/module-access/${accessId}/revoke`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserModuleAccess', id: userId },
      ],
    }),
  }),
});

export const {
  useGetModulesQuery,
  useGetModuleByIdQuery,
  useGetModuleTreeQuery,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
  useGetRoleModuleAccessesQuery,
  useAssignModuleToRoleMutation,
  useRevokeModuleFromRoleMutation,
  useGetUserModuleAccessQuery,
  useGrantModuleAccessToUserMutation,
  useRevokeModuleAccessFromUserMutation,
} = modulesApi;
