// lib/store/services/authApi.ts
import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { setAccessToken, logout } from '../features/authSlice';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ChangePasswordRequest,
} from '@/lib/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Base query with automatic token attachment
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Base query with automatic token refresh on 401
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 Unauthorized - try to refresh token
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;

    // Check if we're on a public route (login/register)
    const isPublicRoute = typeof window !== 'undefined' &&
      (window.location.pathname === '/login' || window.location.pathname === '/register');

    if (refreshToken) {
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refresh_token: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Store the new access token
        const data = refreshResult.data as { access_token: string };
        api.dispatch(setAccessToken(data.access_token));

        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed - logout user
        api.dispatch(logout());
        if (typeof window !== 'undefined' && !isPublicRoute) {
          window.location.href = '/login';
        }
      }
    } else {
      // No refresh token - logout user (but don't redirect if already on public route)
      if (!isPublicRoute) {
        api.dispatch(logout());
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      // If already on public route, just return the error without redirect
    }
  }

  return result;
};

// Create API with RTK Query
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // Register mutation
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Login mutation
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Refresh token mutation
    refreshToken: builder.mutation<
      { access_token: string; token_type: string; expires_in: number },
      string
    >({
      query: (refreshToken) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),
    }),

    // Get current user query (cached)
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Change password mutation
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwords,
      }),
    }),

    // Logout mutation
    logout: builder.mutation<{ message: string }, string>({
      query: (refreshToken) => ({
        url: '/auth/logout',
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),
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
