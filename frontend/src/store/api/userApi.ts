import { apiSlice } from './apiSlice';
import { UserProfile, UserPosition, UserRole } from '@/types/user';

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  schoolId?: string;
  isActive?: boolean;
}

export interface UserListResponse {
  data: UserProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper type for API responses from backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  path?: string;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all users with pagination
    getUsers: builder.query<UserListResponse, UserListParams>({
      query: (params) => ({
        url: '/v1/users',
        params,
      }),
      transformResponse: (response: ApiResponse<UserListResponse>) => response.data,
      providesTags: (result) =>
        result && result.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'UserProfile' as const, id })),
              { type: 'UserProfile', id: 'LIST' },
            ]
          : [{ type: 'UserProfile', id: 'LIST' }],
    }),

    // Get single user by ID
    getUser: builder.query<UserProfile, string>({
      query: (id) => `/v1/users/${id}`,
      transformResponse: (response: ApiResponse<UserProfile>) => response.data,
      providesTags: (result, error, id) => [{ type: 'UserProfile', id }],
    }),

    // Create new user
    createUser: builder.mutation<UserProfile, Partial<UserProfile>>({
      query: (user) => ({
        url: '/v1/users',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: [{ type: 'UserProfile', id: 'LIST' }],
    }),

    // Update user
    updateUser: builder.mutation<UserProfile, { id: string; data: Partial<UserProfile> }>({
      query: ({ id, data }) => ({
        url: `/v1/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'UserProfile', id },
        { type: 'UserProfile', id: 'LIST' },
      ],
    }),

    // Delete user
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'UserProfile', id: 'LIST' }],
    }),

    // Get positions for a specific user
    getUserPositionsByUserId: builder.query<UserPosition[], string>({
      query: (userId) => `/v1/users/${userId}/positions`,
      transformResponse: (response: ApiResponse<UserPosition[]>) => response.data,
      providesTags: (result, error, userId) => [
        { type: 'Position', id: userId },
      ],
    }),

    // Assign position to user
    assignPosition: builder.mutation<UserPosition, { userId: string; positionId: string; data: any }>({
      query: ({ userId, positionId, data }) => ({
        url: `/v1/users/${userId}/positions`,
        method: 'POST',
        body: { positionId, ...data },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Position', id: userId },
        { type: 'UserProfile', id: userId },
      ],
    }),

    // Remove position from user
    removePosition: builder.mutation<void, { userId: string; positionId: string }>({
      query: ({ userId, positionId }) => ({
        url: `/v1/users/${userId}/positions/${positionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Position', id: userId },
        { type: 'UserProfile', id: userId },
      ],
    }),

    // Get user roles
    getUserRoles: builder.query<UserRole[], string>({
      query: (userId) => `/v1/users/${userId}/roles`,
      transformResponse: (response: ApiResponse<UserRole[]>) => response.data,
      providesTags: (result, error, userId) => [
        { type: 'Role', id: userId },
      ],
    }),

    // Assign role to user
    assignRoleToUser: builder.mutation<UserRole, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/v1/users/${userId}/roles`,
        method: 'POST',
        body: { roleId },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Role', id: userId },
        { type: 'UserProfile', id: userId },
      ],
    }),

    // Remove role from user
    removeRole: builder.mutation<void, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/v1/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Role', id: userId },
        { type: 'UserProfile', id: userId },
      ],
    }),
  }),
  overrideExisting: process.env.NODE_ENV === 'development',
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserPositionsByUserIdQuery,
  useAssignPositionMutation,
  useRemovePositionMutation,
  useGetUserRolesQuery,
  useAssignRoleToUserMutation,
  useRemoveRoleMutation,
} = userApi;