import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  Role,
  RoleListResponse,
  RoleWithPermissions,
  PaginatedRolesResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleFilter,
  AssignPermissionToRoleRequest,
  RolePermission,
} from '@/lib/types/role';

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
    console.log('[RTK Query - Roles] 401 detected, attempting token refresh');

    try {
      // 3. Call refresh endpoint
      const refreshResult = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 4. If refresh succeeded, retry the original request
      if (refreshResult.ok) {
        console.log('[RTK Query - Roles] Token refreshed successfully, retrying original request');
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.error('[RTK Query - Roles] Token refresh failed, redirecting to login');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('[RTK Query - Roles] Token refresh error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return result;
};

export const rolesApi = createApi({
  reducerPath: 'rolesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Role', 'RoleDetail', 'RolePermissions'],
  endpoints: (builder) => ({
    // Get all roles with filters
    getRoles: builder.query<PaginatedRolesResponse, RoleFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/roles';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.is_system_role !== undefined) params.append('is_system_role', filters.is_system_role.toString());
        if (filters.hierarchy_level !== undefined) params.append('hierarchy_level', filters.hierarchy_level.toString());
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/roles${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Role' as const, id })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
    }),

    // Get single role by ID
    getRoleById: builder.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'RoleDetail', id }],
    }),

    // Get role with permissions
    getRoleWithPermissions: builder.query<RoleWithPermissions, string>({
      query: (id) => `/roles/${id}/permissions`,
      providesTags: (result, error, id) => [
        { type: 'RoleDetail', id },
        { type: 'RolePermissions', id },
      ],
    }),

    // Create new role
    createRole: builder.mutation<Role, CreateRoleRequest>({
      query: (body) => ({
        url: '/roles',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    // Update role
    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleRequest }>({
      query: ({ id, data }) => ({
        url: `/roles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Role', id },
        { type: 'RoleDetail', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Delete role
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Role', id },
        { type: 'RoleDetail', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // Assign permission to role
    assignPermissionToRole: builder.mutation<RolePermission, { roleId: string; data: AssignPermissionToRoleRequest }>({
      query: ({ roleId, data }) => ({
        url: `/roles/${roleId}/permissions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'RolePermissions', id: roleId },
        { type: 'RoleDetail', id: roleId },
      ],
    }),

    // Revoke permission from role
    revokePermissionFromRole: builder.mutation<void, { roleId: string; permissionAssignmentId: string }>({
      query: ({ roleId, permissionAssignmentId }) => ({
        url: `/roles/${roleId}/permissions/${permissionAssignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'RolePermissions', id: roleId },
        { type: 'RoleDetail', id: roleId },
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useGetRoleWithPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignPermissionToRoleMutation,
  useRevokePermissionFromRoleMutation,
} = rolesApi;
