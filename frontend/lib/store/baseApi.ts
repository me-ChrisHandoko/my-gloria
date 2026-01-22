// lib/store/baseApi.ts
/**
 * Shared RTK Query Base API Configuration
 *
 * This module provides a centralized, thread-safe base query with automatic
 * token refresh on 401 errors. Uses Mutex to prevent race conditions when
 * multiple API calls get 401 simultaneously.
 *
 * IMPORTANT: All API services should use this shared configuration to ensure
 * consistent authentication handling across the application.
 */

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getCSRFToken } from '@/lib/utils/csrf';
import { Mutex } from '@/lib/utils/mutex';

// Standardized API Base URL - use this everywhere
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Global mutex to ensure only one token refresh happens at a time
// This prevents race conditions when multiple API calls get 401 simultaneously
const tokenRefreshMutex = new Mutex();

// Flag to track if we're currently redirecting to prevent multiple redirects
let isRedirecting = false;

/**
 * Base query with httpOnly cookie support and CSRF protection
 * This is the foundation for all authenticated API calls
 */
export const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // CRITICAL: Send httpOnly cookies with every request
  prepareHeaders: (headers) => {
    // Inject CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
    // CSRF token is readable from cookie (NOT httpOnly) so JavaScript can access it
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    return headers;
  },
});

/**
 * Enhanced base query with automatic token refresh on 401 errors
 *
 * Features:
 * - Mutex protection: Only one refresh request at a time, preventing race conditions
 * - Automatic retry: Retries original request after successful token refresh
 * - Graceful redirect: Redirects to login on refresh failure with returnUrl
 * - Public route detection: Skips refresh logic on login/register pages
 *
 * Flow:
 * 1. Execute original request
 * 2. On 401 error, acquire mutex lock
 * 3. Call /auth/refresh endpoint (only one call due to mutex)
 * 4. On success: retry original request with new token
 * 5. On failure: redirect to login page
 * 6. Release mutex lock
 *
 * Why Mutex is Critical:
 * Without mutex, if 3 API calls get 401 simultaneously:
 * - All 3 would call /auth/refresh concurrently
 * - With token rotation, first refresh succeeds, token rotates
 * - Second/third refresh use OLD (now revoked) token
 * - Backend detects "token reuse attack" → revokes ALL tokens
 * - User unexpectedly logged out
 *
 * With mutex:
 * - First call acquires lock, refreshes token
 * - Second/third calls wait for lock
 * - When lock releases, they use the NEW token automatically
 * - No race condition, no unexpected logouts
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // 1. Try the initial request
  let result = await baseQuery(args, api, extraOptions);

  // 2. Handle 401 Unauthorized - try to refresh token automatically
  if (result.error && result.error.status === 401) {
    // Check if we're on a public route (login/register) - no refresh needed
    const isPublicRoute =
      typeof window !== 'undefined' &&
      (window.location.pathname === '/login' ||
        window.location.pathname === '/register');

    if (isPublicRoute) {
      return result;
    }

    // Use mutex to ensure only one token refresh happens at a time
    // This prevents race conditions with token rotation
    await tokenRefreshMutex.runExclusive(async () => {
      console.log('[RTK Query] 401 detected, attempting token refresh (mutex acquired)');

      try {
        // Call refresh endpoint
        // Browser automatically sends refresh_token cookie and receives new tokens via Set-Cookie
        const refreshResult = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Critical: Browser handles cookies automatically
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (refreshResult.ok) {
          console.log('[RTK Query] Token refreshed successfully, retrying original request');

          // Browser cookie jar already updated with new tokens from Set-Cookie
          // Retry will automatically use the new cookies
          result = await baseQuery(args, api, extraOptions);

          if (result.error) {
            console.log('[RTK Query] Retry failed even after refresh:', result.error);
          } else {
            console.log('[RTK Query] Retry successful after token refresh');
          }
        } else {
          // Refresh failed - redirect to login
          console.log('[RTK Query] Token refresh failed, redirecting to login');

          if (!isRedirecting && typeof window !== 'undefined') {
            isRedirecting = true;

            // Redirect to login with returnUrl to preserve user's location
            const currentPath = window.location.pathname;
            const returnUrl = encodeURIComponent(currentPath);
            window.location.href = `/login?returnUrl=${returnUrl}`;
          }
        }
      } catch (error) {
        console.error('[RTK Query] Exception during token refresh:', error);

        if (!isRedirecting && typeof window !== 'undefined') {
          isRedirecting = true;

          // On error, redirect to login
          const currentPath = window.location.pathname;
          const returnUrl = encodeURIComponent(currentPath);
          window.location.href = `/login?returnUrl=${returnUrl}`;
        }
      }
    });
  }

  return result;
};

/**
 * Reset redirect flag - useful for testing or after successful login
 */
export function resetRedirectFlag(): void {
  isRedirecting = false;
}
