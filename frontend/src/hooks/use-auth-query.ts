'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useEffect, useState, useCallback, useRef } from 'react';
import { setApiToken } from '@/store/api/apiSlice';
import { redirectOnce } from '@/lib/redirect-guard';

/**
 * Wrapper hook that injects Clerk token into RTK Query with automatic refresh
 *
 * This hook solves the architectural impossibility of using React hooks
 * inside RTK Query's baseQuery. Instead, we wrap the query hooks and
 * inject the token via extraOptions.
 *
 * Features:
 * - Automatic token injection into API calls
 * - Token refresh on 401 errors
 * - Retry mechanism for failed requests (max 3 attempts)
 * - Token caching and revalidation
 * - **LAYER 2 DEFENSE**: Auto-logout after max retries on 401
 *
 * Security: Defense-in-Depth Architecture
 * ----------------------------------------
 * This hook implements Layer 2 of the authentication security system:
 *
 * Layer 1 (Primary): middleware.ts
 *   - Server-side token validation BEFORE page render
 *   - Blocks access if token invalid
 *
 * Layer 2 (Fallback): THIS HOOK
 *   - Client-side validation during API calls
 *   - Auto-logout after 3 failed 401 retries
 *   - Catches edge cases where middleware didn't block access
 *
 * Layer 3 (Defensive): auth-initializer.tsx
 *   - Blocks rendering on persistent errors
 *   - Last line of defense
 *
 * Usage: const result = useAuthQuery(useGetCurrentUserQuery);
 *
 * @param useQueryHook - RTK Query hook to wrap
 * @param args - Arguments to pass to the query hook
 * @param options - Additional options for the query
 */
export function useAuthQuery<T>(
  useQueryHook: any,
  args?: any,
  options?: any
) {
  const { getToken, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const [token, setToken] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshTime = useRef<number>(0);
  const retryCount = useRef<number>(0);
  const lastErrorMessage = useRef<string>('');
  const isLoggingOut = useRef<boolean>(false);

  // Refresh token with debouncing to prevent multiple simultaneous refreshes
  const refreshToken = useCallback(async () => {
    const now = Date.now();
    // Prevent refresh if last refresh was less than 5 seconds ago
    if (now - lastRefreshTime.current < 5000) {
      return token;
    }

    setIsRefreshing(true);
    try {
      const newToken = await getToken({ template: undefined });
      setToken(newToken);
      setApiToken(newToken); // Update global token
      lastRefreshTime.current = now;
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      setApiToken(null);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [getToken, token]);

  // Fetch token when auth is loaded or periodically refresh
  useEffect(() => {
    if (isLoaded && !isRefreshing) {
      console.log('🔑 useAuthQuery: Fetching token from Clerk...');
      getToken({ template: undefined }).then((fetchedToken) => {
        console.log('🔑 useAuthQuery: Token fetched:', fetchedToken ? `${fetchedToken.substring(0, 20)}...` : 'NULL');
        setToken(fetchedToken);
        setApiToken(fetchedToken); // Update global token for RTK Query
      }).catch((err) => {
        console.error('❌ useAuthQuery: Token fetch failed:', err);
        setApiToken(null);
      });
    }
  }, [getToken, isLoaded, isRefreshing]);

  // Track if we've encountered a 403 inactive error to prevent refetching
  const [has403Error, setHas403Error] = useState(false);

  // Call RTK Query hook (token is now in global state)
  const result = useQueryHook(args, {
    ...options,
    skip: !token || options?.skip || has403Error, // Skip if 403 error detected
  });

  // Auto-refresh token on 401 error with intelligent retry logic
  // Auto-logout on 403 "user account is inactive" error
  useEffect(() => {
    if (result.isError && result.error && 'status' in result.error) {
      // Handle 403 Forbidden - User account is inactive (HR deactivation)
      if (result.error.status === 403) {
        const errorData = (result.error as any).data;
        const errorMessage = errorData?.error?.toLowerCase() || '';

        if (
          errorMessage.includes('user account is inactive') ||
          errorMessage.includes('akun pengguna tidak aktif') ||
          errorMessage.includes('inactive')
        ) {
          console.log('🚫 [useAuthQuery] User account is inactive');

          // Set flag to prevent automatic refetch
          setHas403Error(true);

          // Use redirect guard to prevent duplicate redirects
          // This provides backup detection if apiSlice didn't catch it
          redirectOnce('/sign-out?reason=account_deactivated');

          // Exit useEffect immediately to prevent retry logic
          return;
        }
      }

      // Handle 401 Unauthorized - Token issues
      if (result.error.status === 401) {
        // Extract error message from response
        const errorData = (result.error as any).data;
        const errorMessage = errorData?.error || '';

        console.log('🚨 401 Error detected:', {
          errorMessage,
          retryCount: retryCount.current,
          maxRetries: 3,
        });

        // Check if this is a "user not registered" error
        const isUserNotRegistered =
          errorMessage.toLowerCase().includes('tidak terdaftar') ||
          errorMessage.toLowerCase().includes('not registered') ||
          errorMessage.toLowerCase().includes('user not found');

        // Reset retry count if error message changed (different error type)
        if (errorMessage !== lastErrorMessage.current) {
          console.log('🔄 Error type changed, resetting retry count');
          retryCount.current = 0;
          lastErrorMessage.current = errorMessage;
        }

        // Don't retry if user is not registered
        if (isUserNotRegistered) {
          console.log('⛔ User not registered in backend - stopping retry');
          return;
        }

        // Don't retry if we've exceeded max attempts - FORCE LOGOUT
        if (retryCount.current >= 3) {
          console.log('⛔ Max retry attempts reached - forcing logout');

          // Prevent multiple simultaneous logout attempts
          if (isLoggingOut.current) {
            console.log('⏳ Logout already in progress');
            return;
          }

          isLoggingOut.current = true;

          // LAYER 2 DEFENSE: Force logout from Clerk
          // This is a fallback in case middleware didn't catch the invalid token
          console.log('🚪 [Layer 2] Forcing Clerk sign-out due to persistent 401 errors');

          // Use async IIFE to handle promise
          (async () => {
            try {
              // Redirect to sign-out page with reason
              redirectOnce('/sign-out?reason=authentication_failed');

              // Force Clerk logout (this will clear all Clerk session data)
              await signOut();
            } catch (error) {
              console.error('❌ Logout failed:', error);
              // Even if logout fails, still redirect
              window.location.href = '/sign-in?reason=auth_error';
            } finally {
              isLoggingOut.current = false;
            }
          })();

          return;
        }

        // Increment retry counter and attempt token refresh
        retryCount.current += 1;
        console.log(`🔄 Attempting token refresh (attempt ${retryCount.current}/3)`);

        refreshToken().then((newToken) => {
          if (newToken && result.refetch) {
            console.log('✅ Token refreshed, retrying request');
            result.refetch();
          } else {
            console.log('❌ Token refresh failed');
          }
        });
      }
    }
  }, [result.isError, result.error, result.refetch, refreshToken]);

  // Reset retry count on successful response
  useEffect(() => {
    if (!result.isError && result.isSuccess) {
      if (retryCount.current > 0) {
        console.log('✅ Request successful, resetting retry count');
        retryCount.current = 0;
        lastErrorMessage.current = '';
      }
    }
  }, [result.isError, result.isSuccess]);

  return result;
}

/**
 * Simpler hook for queries without arguments
 * Usage: const result = useAuthQuerySimple(useGetCurrentUserQuery);
 */
export function useAuthQuerySimple<T>(useQueryHook: any) {
  return useAuthQuery(useQueryHook, undefined);
}
