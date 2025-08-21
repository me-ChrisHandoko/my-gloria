import { apiSlice } from './apiSlice';
import { UserProfile, DataKaryawan } from '@/types/auth';

export interface AuthResponse {
  success: boolean;
  user: UserProfile;
}

export interface CurrentUserResponse extends UserProfile {
  dataKaryawan: DataKaryawan;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get current user profile
    getCurrentUser: builder.query<CurrentUserResponse, void>({
      query: () => '/v1/auth/me',
      providesTags: ['User'],
      transformResponse: (response: CurrentUserResponse) => {
        // Store user data in localStorage for offline access
        if (typeof window !== 'undefined') {
          localStorage.setItem('userProfile', JSON.stringify(response));
        }
        return response;
      },
    }),

    // Sync user data from Clerk
    syncUser: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/v1/auth/sync',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'UserProfile'],
    }),

    // Get user permissions for a specific module
    getUserPermissions: builder.query<any, string>({
      query: (moduleCode) => `/v1/auth/permissions/${moduleCode}`,
      providesTags: (result, error, moduleCode) => [
        { type: 'Module', id: moduleCode },
      ],
    }),

    // Get all user modules with permissions
    getUserModules: builder.query<any[], void>({
      query: () => '/v1/auth/modules',
      providesTags: ['Module'],
    }),

    // Check auth health
    checkAuthHealth: builder.query<{ status: string; service: string; timestamp: string }, void>({
      query: () => '/v1/auth/health',
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useSyncUserMutation,
  useGetUserPermissionsQuery,
  useGetUserModulesQuery,
  useCheckAuthHealthQuery,
} = authApi;