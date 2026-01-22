// lib/store/services/modulesApi.ts
/**
 * Modules API Service
 *
 * RTK Query service for module management operations.
 * Uses shared baseQueryWithReauth for consistent authentication handling.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
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

export const modulesApi = createApi({
  reducerPath: 'modulesApi',
  baseQuery: baseQueryWithReauth,
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
