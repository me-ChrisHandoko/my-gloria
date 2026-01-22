// lib/store/services/rolesApi.ts
/**
 * Roles API Service
 *
 * RTK Query service for role management operations.
 * Uses shared baseQueryWithReauth for consistent authentication handling.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
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
