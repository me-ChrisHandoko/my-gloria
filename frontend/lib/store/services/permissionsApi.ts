// lib/store/services/permissionsApi.ts
/**
 * Permissions API Service
 *
 * RTK Query service for permission management operations.
 * Uses shared baseQueryWithReauth for consistent authentication handling.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
import {
  Permission,
  PermissionListResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionFilter,
  PaginatedPermissionsResponse,
  EnumOption,
} from '@/lib/types/permission';

export const permissionsApi = createApi({
  reducerPath: 'permissionsApi',
  baseQuery: baseQueryWithReauth,
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
    // Enum endpoints
    getPermissionScopes: builder.query<EnumOption[], void>({
      query: () => '/permissions/scopes',
      transformResponse: (response: { data: EnumOption[] }) => response.data,
    }),
    getPermissionActions: builder.query<EnumOption[], void>({
      query: () => '/permissions/actions',
      transformResponse: (response: { data: EnumOption[] }) => response.data,
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  useGetPermissionScopesQuery,
  useGetPermissionActionsQuery,
} = permissionsApi;
