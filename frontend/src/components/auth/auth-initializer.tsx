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
 * 7. **LAYER 3 DEFENSE**: Blocks rendering on persistent 401 errors
 *
 * Security: Defense-in-Depth Layer 3
 * -----------------------------------
 * This component implements the LAST LINE OF DEFENSE in the authentication system:
 *
 * Layer 1 (Primary): middleware.ts - Server-side validation BEFORE page render
 * Layer 2 (Fallback): use-auth-query.ts - Auto-logout after 3 failed retries
 * Layer 3 (Defensive): THIS COMPONENT - Blocks rendering on authentication failures
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

  // LAYER 3 DEFENSE: Track persistent authentication failures
  const [hasAuthenticationError, setHasAuthenticationError] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('');

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

      // LAYER 3 DEFENSE: Check for persistent 401 authentication errors
      const is401 = 'status' in error && error.status === 401;

      if (is401) {
        // Extract error message
        const errorData = 'data' in error ? error.data : {};
        const errorMessage =
          typeof errorData === 'object' && errorData !== null && 'error' in errorData
            ? String(errorData.error)
            : '';

        // Check if this is "invalid or expired token" from backend
        const isInvalidToken =
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('token');

        if (isInvalidToken) {
          console.log('🛡️ [Layer 3] Invalid token detected - blocking rendering');

          // Set authentication error state - this blocks rendering
          setHasAuthenticationError(true);
          setAuthErrorMessage(errorMessage || 'Authentication token is invalid or expired');
          dispatch(setError(errorMessage));
          return;
        }
      }

      // Other errors (network, 500, etc.)
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

  // LAYER 3 DEFENSE: Block rendering on authentication errors
  // This prevents UI exposure when token is invalid
  if (hasAuthenticationError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Authentication Failed</h1>
            <p className="text-sm text-muted-foreground">
              Your session is invalid or has expired
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 text-left">
            <p className="text-sm font-medium">Error Details:</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {authErrorMessage || 'Unable to authenticate your session'}
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                window.location.href = '/sign-in';
              }}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In Again
            </button>
            <button
              onClick={() => {
                setHasAuthenticationError(false);
                setAuthErrorMessage('');
                refetch();
              }}
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Retry
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            🛡️ Security Layer 3: Authentication validation
          </p>
        </div>
      </div>
    );
  }

  // Wrap children with error boundary for graceful error handling
  return <AuthErrorBoundary>{children}</AuthErrorBoundary>;
}
