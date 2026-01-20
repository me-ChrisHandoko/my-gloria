import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  User,
  UserListResponse,
  PaginatedUsersResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilter,
  AssignRoleToUserRequest,
  AssignPositionToUserRequest,
  UserRoleResponse,
  UserPositionResponse,
} from '@/lib/types/user';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fetchBaseQuery({
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
  }),
  tagTypes: ['User', 'UserDetail', 'UserRoles', 'UserPositions'],
  endpoints: (builder) => ({
    // Get all users with filters
    getUsers: builder.query<PaginatedUsersResponse, UserFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/users';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.role_id) params.append('role_id', filters.role_id);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.email_verified !== undefined) params.append('email_verified', filters.email_verified.toString());
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/users${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    // Get single user by ID
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'UserDetail', id }],
    }),

    // Create new user
    createUser: builder.mutation<User, CreateUserRequest>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    // Update user
    updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'UserDetail', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Delete user
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'UserDetail', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // Get user roles
    getUserRoles: builder.query<UserRoleResponse[], string>({
      query: (userId) => `/users/${userId}/roles`,
      providesTags: (result, error, userId) => [{ type: 'UserRoles', id: userId }],
    }),

    // Assign role to user
    assignRoleToUser: builder.mutation<UserRoleResponse, { userId: string; data: AssignRoleToUserRequest }>({
      query: ({ userId, data }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserRoles', id: userId },
        { type: 'UserDetail', id: userId },
      ],
    }),

    // Revoke role from user
    revokeRoleFromUser: builder.mutation<void, { userId: string; roleAssignmentId: string }>({
      query: ({ userId, roleAssignmentId }) => ({
        url: `/users/${userId}/roles/${roleAssignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserRoles', id: userId },
        { type: 'UserDetail', id: userId },
      ],
    }),

    // Get user positions
    getUserPositions: builder.query<UserPositionResponse[], string>({
      query: (userId) => `/users/${userId}/positions`,
      providesTags: (result, error, userId) => [{ type: 'UserPositions', id: userId }],
    }),

    // Assign position to user
    assignPositionToUser: builder.mutation<UserPositionResponse, { userId: string; data: AssignPositionToUserRequest }>({
      query: ({ userId, data }) => ({
        url: `/users/${userId}/positions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserPositions', id: userId },
        { type: 'UserDetail', id: userId },
      ],
    }),

    // Revoke position from user
    revokePositionFromUser: builder.mutation<void, { userId: string; positionAssignmentId: string }>({
      query: ({ userId, positionAssignmentId }) => ({
        url: `/users/${userId}/positions/${positionAssignmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'UserPositions', id: userId },
        { type: 'UserDetail', id: userId },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserRolesQuery,
  useAssignRoleToUserMutation,
  useRevokeRoleFromUserMutation,
  useGetUserPositionsQuery,
  useAssignPositionToUserMutation,
  useRevokePositionFromUserMutation,
} = usersApi;
