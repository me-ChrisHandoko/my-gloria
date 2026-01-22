// lib/store/services/authApi.ts
/**
 * Authentication API Service
 *
 * RTK Query service for authentication operations.
 * Uses shared baseQueryWithReauth for consistent token refresh handling.
 *
 * Note: Login, register, and logout endpoints use baseQuery directly
 * (not baseQueryWithReauth) because:
 * - Login/register: User is not authenticated yet
 * - Logout: We're clearing tokens, not refreshing them
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery, baseQueryWithReauth } from '../baseApi';
import { logout } from '../features/authSlice';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ChangePasswordRequest,
} from '@/lib/types/auth';

/**
 * Custom base query for auth endpoints that handles logout on 401 for protected endpoints
 * but skips refresh for public endpoints (login, register, logout)
 */
const authBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Determine if this is a public endpoint that doesn't need token refresh
  const url = typeof args === 'string' ? args : args.url;
  const isPublicEndpoint =
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/refresh');

  if (isPublicEndpoint) {
    // Use base query without reauth for public endpoints
    return baseQuery(args, api, extraOptions);
  }

  // Use base query with reauth for protected endpoints (like /auth/me, /auth/change-password)
  return baseQueryWithReauth(args, api, extraOptions);
};

// Create API with RTK Query
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // Register mutation (public endpoint)
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Login mutation (public endpoint)
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Refresh token mutation (public endpoint - uses refresh_token cookie)
    refreshToken: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),

    // Get current user query (protected endpoint - uses token refresh)
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Change password mutation (protected endpoint - uses token refresh)
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwords,
      }),
    }),

    // Logout mutation (public endpoint - clears tokens)
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      // Clear user data on logout
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(logout());
        } catch {
          // Even if logout API fails, clear local state
          dispatch(logout());
        }
      },
    }),
  }),
});

// Export auto-generated hooks
export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;
