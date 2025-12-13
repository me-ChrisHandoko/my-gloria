/**
 * Auth Initializer Component
 *
 * Bridges Clerk authentication with backend user context.
 * This component:
 * 1. Monitors Clerk authentication state
 * 2. Fetches user context from backend when authenticated
 * 3. Syncs user data to Redux store
 * 4. Handles loading and error states with retry mechanism
 * 5. Clears Redux on logout
 * 6. Invalidates RTK Query cache on logout
 *
 * Place this component in the app layout after ClerkProvider and ReduxProvider.
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuthSync } from '@/hooks/use-auth-sync';
import { useAppDispatch } from '@/store/hooks';
import { setUserContext, clearAuth, setError, setLoading } from '@/store/slices/authSlice';
import { apiSlice } from '@/store/api/apiSlice';
import { LoadingUserContextScreen } from './auth-loading-states';
import { AuthErrorBoundary } from './auth-error-boundary';
import { UserNotFoundError } from './user-not-found-error';
import { AuthProgressiveLoadingScreen } from './auth-skeleton-loaders';

/**
 * AuthInitializer Component
 *
 * Automatically fetches and syncs user context from backend after Clerk authentication.
 * Includes retry mechanism and enhanced error handling.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: clerkIsLoaded } = useAuth();
  const dispatch = useAppDispatch();
  const [isUserNotFound, setIsUserNotFound] = useState(false);
  const [userNotFoundErrorMessage, setUserNotFoundErrorMessage] = useState<string>('');
  const [loadingStage, setLoadingStage] = useState<'authenticating' | 'fetching' | 'processing' | 'finalizing'>('authenticating');

  // Enable cross-tab authentication synchronization
  useAuthSync();

  // Fetch user context from backend when authenticated
  // This hook automatically injects Clerk token via useAuthQuery wrapper
  const {
    user,
    employee,
    roles,
    permissions,
    modules,
    isLoading: backendIsLoading,
    isError,
    error,
    refetch,
  } = useCurrentUser();

  useEffect(() => {
    // Wait for Clerk to initialize
    if (!clerkIsLoaded) {
      setLoadingStage('authenticating');
      dispatch(setLoading(true));
      return;
    }

    // User logged out → clear Redux state and invalidate RTK Query cache
    if (!userId) {
      dispatch(clearAuth());
      dispatch(apiSlice.util.resetApiState());
      setIsUserNotFound(false);
      setUserNotFoundErrorMessage('');
      setLoadingStage('authenticating');
      return;
    }

    // User authenticated but backend data still loading
    if (userId && backendIsLoading) {
      setLoadingStage('fetching');
      dispatch(setLoading(true));
      return;
    }

    // Backend returned error
    if (isError && error) {
      console.log('🔍 AuthInitializer: Error received =', error);
      console.log('🔍 AuthInitializer: Error status =', 'status' in error ? error.status : 'no status');
      console.log('🔍 AuthInitializer: Error data =', 'data' in error ? error.data : 'no data');

      // Check if error is 404 or 401 with "not found" message (user not in database)
      const is404 = 'status' in error && error.status === 404;
      const is401NotFound =
        'status' in error && error.status === 401 &&
        'data' in error && typeof error.data === 'object' && error.data !== null &&
        'error' in error.data && typeof error.data.error === 'string' &&
        (error.data.error.includes('not found') ||
         error.data.error.includes('record not found') ||
         error.data.error.includes('tidak terdaftar') ||  // Indonesian: "not registered"
         error.data.error.includes('tidak ditemukan'));   // Indonesian: "not found"

      console.log('🔍 AuthInitializer: is404 =', is404);
      console.log('🔍 AuthInitializer: is401NotFound =', is401NotFound);

      if (is404 || is401NotFound) {
        console.log('✅ AuthInitializer: Detected user not found - showing error screen');

        // Extract error message from backend
        const backendErrorMessage =
          'data' in error && typeof error.data === 'object' && error.data !== null &&
          'error' in error.data && typeof error.data.error === 'string'
            ? error.data.error
            : 'User profile not found in database';

        setIsUserNotFound(true);
        setUserNotFoundErrorMessage(backendErrorMessage);
        dispatch(setError(backendErrorMessage));
        return;
      }

      // Other errors (network, 401, 500, etc.)
      const errorMessage =
        'message' in error && typeof error.message === 'string'
          ? error.message
          : 'data' in error && typeof error.data === 'object' && error.data !== null && 'error' in error.data
          ? String(error.data.error)
          : 'Failed to load user context from backend';

      dispatch(setError(errorMessage));
      return;
    }

    // User authenticated & backend data loaded → sync to Redux
    if (userId && user && !backendIsLoading) {
      setIsUserNotFound(false);
      setLoadingStage('processing');

      // Simulate processing stage for better UX
      setTimeout(() => {
        setLoadingStage('finalizing');
        dispatch(
          setUserContext({
            user,
            employee,
            roles,
            permissions,
            modules,
          })
        );
      }, 300);
    }
  }, [
    clerkIsLoaded,
    userId,
    user,
    employee,
    roles,
    permissions,
    modules,
    backendIsLoading,
    isError,
    error,
    dispatch,
  ]);

  // Show progressive loading screen while initializing
  // Display when:
  // 1. Clerk is still loading, OR
  // 2. User is authenticated and backend data is loading
  if (!clerkIsLoaded || (userId && backendIsLoading)) {
    return <AuthProgressiveLoadingScreen stage={loadingStage} />;
  }

  // Show user not found error with retry option
  if (isUserNotFound) {
    return (
      <UserNotFoundError
        onRetry={() => {
          setIsUserNotFound(false);
          setUserNotFoundErrorMessage('');
          refetch();
        }}
        errorMessage={userNotFoundErrorMessage}
      />
    );
  }

  // Wrap children with error boundary for graceful error handling
  return <AuthErrorBoundary>{children}</AuthErrorBoundary>;
}
