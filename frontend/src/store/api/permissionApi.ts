import { apiSlice } from './apiSlice';
import {
  Permission,
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionFilterDto,
  PermissionGroup,
  PermissionGroupFilterDto,
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  RoleFilterDto,
  AssignRoleDto,
  RevokeRoleDto,
  RolePermissionDto,
  CheckPermissionDto,
  PermissionCheckResultDto,
  UserPermission,
} from '@/types/permission';

// Helper type for API responses from backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  path?: string;
}

export const permissionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Permission Endpoints
    getPermissions: builder.query<Permission[], PermissionFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/permissions',
        method: 'GET',
        params: filters,
      }),
      transformResponse: (response: ApiResponse<Permission[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Permission' as const, id })),
              { type: 'Permission', id: 'LIST' },
            ]
          : [{ type: 'Permission', id: 'LIST' }],
    }),

    getPermissionById: builder.query<Permission, string>({
      query: (id) => ({
        url: `/v1/permissions/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Permission>) => response.data,
      providesTags: (result, error, id) => [{ type: 'Permission', id }],
    }),

    getPermissionByCode: builder.query<Permission, string>({
      query: (code) => ({
        url: `/v1/permissions/code/${code}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Permission>) => response.data,
      providesTags: (result, error, code) => [{ type: 'Permission', id: `CODE-${code}` }],
    }),

    createPermission: builder.mutation<Permission, CreatePermissionDto>({
      query: (permission) => ({
        url: '/v1/permissions',
        method: 'POST',
        body: permission,
      }),
      transformResponse: (response: ApiResponse<Permission>) => response.data,
      invalidatesTags: [{ type: 'Permission', id: 'LIST' }],
    }),

    updatePermission: builder.mutation<Permission, { id: string; data: UpdatePermissionDto }>({
      query: ({ id, data }) => ({
        url: `/v1/permissions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Permission>) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Permission', id },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    deletePermission: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/permissions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Permission', id },
        { type: 'Permission', id: 'LIST' },
      ],
    }),

    checkPermission: builder.mutation<PermissionCheckResultDto, CheckPermissionDto>({
      query: (checkDto) => ({
        url: '/v1/permissions/check',
        method: 'POST',
        body: checkDto,
      }),
      transformResponse: (response: ApiResponse<PermissionCheckResultDto>) => response.data,
    }),

    // Permission Group Endpoints
    getPermissionGroups: builder.query<PermissionGroup[], PermissionGroupFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/permission-groups',
        method: 'GET',
        params: filters,
      }),
      transformResponse: (response: ApiResponse<PermissionGroup[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PermissionGroup' as const, id })),
              { type: 'PermissionGroup', id: 'LIST' },
            ]
          : [{ type: 'PermissionGroup', id: 'LIST' }],
    }),

    // Role Endpoints
    getRoles: builder.query<Role[], RoleFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/roles',
        method: 'GET',
        params: filters,
      }),
      transformResponse: (response: ApiResponse<Role[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Role' as const, id })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
    }),

    getRoleById: builder.query<Role, string>({
      query: (id) => ({
        url: `/v1/roles/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Role>) => response.data,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),

    getRoleByCode: builder.query<Role, string>({
      query: (code) => ({
        url: `/v1/roles/code/${code}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Role>) => response.data,
      providesTags: (result, error, code) => [{ type: 'Role', id: `CODE-${code}` }],
    }),

    getInheritedPermissions: builder.query<Permission[], string>({
      query: (roleId) => ({
        url: `/v1/roles/${roleId}/permissions/inherited`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Permission[]>) => response.data,
      providesTags: (result, error, roleId) => [{ type: 'Role', id: `${roleId}-inherited` }],
    }),

    createRole: builder.mutation<Role, CreateRoleDto>({
      query: (role) => ({
        url: '/v1/roles',
        method: 'POST',
        body: role,
      }),
      transformResponse: (response: ApiResponse<Role>) => response.data,
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    updateRole: builder.mutation<Role, { id: string; data: UpdateRoleDto }>({
      query: ({ id, data }) => ({
        url: `/v1/roles/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Role>) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    assignRole: builder.mutation<Role, { roleId: string; data: AssignRoleDto }>({
      query: ({ roleId, data }) => ({
        url: `/v1/roles/${roleId}/assign`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Role>) => response.data,
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'UserPermission', id: 'LIST' },
      ],
    }),

    revokeRole: builder.mutation<void, { roleId: string; data: RevokeRoleDto }>({
      query: ({ roleId, data }) => ({
        url: `/v1/roles/${roleId}/revoke`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'UserPermission', id: 'LIST' },
      ],
    }),

    assignPermissionsToRole: builder.mutation<Role, { roleId: string; permissions: RolePermissionDto[] }>({
      query: ({ roleId, permissions }) => ({
        url: `/v1/roles/${roleId}/permissions`,
        method: 'POST',
        body: permissions,
      }),
      transformResponse: (response: ApiResponse<Role>) => response.data,
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: `${roleId}-inherited` },
      ],
    }),

    removePermissionFromRole: builder.mutation<void, { roleId: string; permissionId: string }>({
      query: ({ roleId, permissionId }) => ({
        url: `/v1/roles/${roleId}/permissions/${permissionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        { type: 'Role', id: `${roleId}-inherited` },
      ],
    }),

    // User Permission Endpoints
    getUserPermissions: builder.query<UserPermission[], string>({
      query: (userId) => ({
        url: `/v1/user-permissions/${userId}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<UserPermission[]>) => response.data,
      providesTags: (result, error, userId) => [{ type: 'UserPermission', id: userId }],
    }),

    getEffectivePermissions: builder.query<Permission[], { userId: string; schoolId?: string; departmentId?: string }>({
      query: ({ userId, ...params }) => ({
        url: `/v1/user-permissions/${userId}/effective`,
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponse<Permission[]>) => response.data,
      providesTags: (result, error, { userId }) => [{ type: 'UserPermission', id: `${userId}-effective` }],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Permission hooks
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useGetPermissionByCodeQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useCheckPermissionMutation,

  // Permission Group hooks
  useGetPermissionGroupsQuery,

  // Role hooks
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useGetRoleByCodeQuery,
  useGetInheritedPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignRoleMutation,
  useRevokeRoleMutation,
  useAssignPermissionsToRoleMutation,
  useRemovePermissionFromRoleMutation,

  // User Permission hooks
  useGetUserPermissionsQuery,
  useGetEffectivePermissionsQuery,
} = permissionApi;