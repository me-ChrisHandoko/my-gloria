import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  Permission,
  PermissionListResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionFilter,
  PaginatedPermissionsResponse,
} from '@/lib/types/permission';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

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
    console.log('[RTK Query - Permissions] 401 detected, attempting token refresh');

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
        console.log('[RTK Query - Permissions] Token refreshed successfully, retrying original request');

        // Browser cookie jar already updated with new tokens from Set-Cookie
        // Retry will automatically use the new cookies
        result = await baseQuery(args, api, extraOptions);

        if (result.error) {
          console.log('[RTK Query - Permissions] Retry failed even after refresh');
        } else {
          console.log('[RTK Query - Permissions] Retry successful after token refresh');
        }
      } else {
        // 5. Refresh failed (refresh token expired or invalid)
        console.log('[RTK Query - Permissions] Token refresh failed, redirecting to login');

        // Redirect to login with returnUrl to preserve user's location
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/login?returnUrl=${returnUrl}`;
      }
    } catch (error) {
      console.error('[RTK Query - Permissions] Exception during token refresh:', error);

      // On error, redirect to login
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
  }

  return result;
};

export const permissionsApi = createApi({
  reducerPath: 'permissionsApi',
  baseQuery: baseQueryWithReauth, // Use auto-refresh wrapper instead of direct baseQuery
  tagTypes: ['Permission', 'PermissionDetail'],
  endpoints: (builder) => ({
    // Permission CRUD Operations
    getPermissions: builder.query<PaginatedPermissionsResponse, PermissionFilter | void>({
      query: (filters) => ({
        url: '/permissions',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Permission' as const, id })),
              { type: 'Permission', id: 'LIST' },
            ]
          : [{ type: 'Permission', id: 'LIST' }],
    }),
    getPermissionById: builder.query<Permission, string>({
      query: (id) => `/permissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'PermissionDetail', id }],
    }),
    createPermission: builder.mutation<Permission, CreatePermissionRequest>({
      query: (data) => ({
        url: '/permissions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Permission'],
    }),
    updatePermission: builder.mutation<Permission, { id: string; data: UpdatePermissionRequest }>({
      query: ({ id, data }) => ({
        url: `/permissions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Permission', id: 'LIST' },
        { type: 'PermissionDetail', id },
      ],
    }),
    deletePermission: builder.mutation<void, string>({
      query: (id) => ({
        url: `/permissions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Permission'],
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
} = permissionsApi;
