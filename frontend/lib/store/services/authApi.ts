// lib/store/services/authApi.ts
import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { logout } from '../features/authSlice';
import { getCSRFToken } from '@/lib/utils/csrf';
import { Mutex } from '@/lib/utils/mutex';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ChangePasswordRequest,
} from '@/lib/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Mutex to ensure only one token refresh happens at a time
const refreshMutex = new Mutex();

// Base query with httpOnly cookie support (secure, XSS-safe) and CSRF protection
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // CRITICAL: Send httpOnly cookies with every request
  prepareHeaders: (headers, { endpoint }) => {
    // Inject CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
    // CSRF token is readable from cookie (NOT httpOnly) so JavaScript can access it
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    return headers;
  },
});

// Base query with automatic token refresh on 401
// Uses mutex to ensure only one refresh happens at a time
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 Unauthorized - try to refresh token automatically
  if (result.error && result.error.status === 401) {
    // Check if we're on a public route (login/register)
    const isPublicRoute = typeof window !== 'undefined' &&
      (window.location.pathname === '/login' || window.location.pathname === '/register');

    // Use mutex to ensure only one token refresh happens at a time
    // This prevents multiple concurrent 401s from triggering multiple refresh requests
    await refreshMutex.runExclusive(async () => {
      // Try to refresh the token (refresh_token cookie sent automatically)
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Token refreshed successfully (new access_token cookie set by server)
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed - logout user
        api.dispatch(logout());
        if (typeof window !== 'undefined' && !isPublicRoute) {
          window.location.href = '/login';
        }
      }
    });
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

    // Refresh token mutation (refresh_token sent via httpOnly cookie)
    refreshToken: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
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

    // Logout mutation (refresh_token sent via httpOnly cookie)
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
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
