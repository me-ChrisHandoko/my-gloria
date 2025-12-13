/**
 * Auth Error Boundary Component
 *
 * Catches and handles authentication-related errors gracefully.
 * Provides fallback UI and recovery options for auth failures.
 */

'use client';

import { Component, type ReactNode } from 'react';
import { AuthError, AuthErrorType } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary specifically for authentication errors.
 * Catches auth-related errors and provides recovery UI.
 *
 * @example
 * ```tsx
 * <AuthErrorBoundary>
 *   <ProtectedContent />
 * </AuthErrorBoundary>
 * ```
 *
 * @example
 * ```tsx
 * <AuthErrorBoundary
 *   fallback={(error, reset) => (
 *     <CustomErrorUI error={error} onRetry={reset} />
 *   )}
 *   onError={(error, errorInfo) => {
 *     logErrorToService(error, errorInfo);
 *   }}
 * >
 *   <ProtectedContent />
 * </AuthErrorBoundary>
 * ```
 */
export class AuthErrorBoundary extends Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleSignOut = () => {
    // Clear all auth state and redirect to sign-in
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();
      // Redirect to sign-in
      window.location.href = '/sign-in';
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default error UI
      return (
        <DefaultAuthErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          onSignOut={this.handleSignOut}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback UI for auth errors
 */
function DefaultAuthErrorFallback({
  error,
  onReset,
  onSignOut,
}: {
  error: Error;
  onReset: () => void;
  onSignOut: () => void;
}) {
  const isAuthError = error instanceof AuthError || error.name === 'AuthError';
  const authError = error as AuthError;

  // Determine error type and message
  const getErrorDetails = () => {
    if (!isAuthError) {
      return {
        title: 'Something went wrong',
        message: error.message || 'An unexpected error occurred',
        canRetry: true,
      };
    }

    switch (authError.type) {
      case AuthErrorType.PERMISSION_DENIED:
        return {
          title: 'Access Denied',
          message: 'You do not have permission to access this resource.',
          canRetry: false,
        };

      case AuthErrorType.ROLE_REQUIRED:
        return {
          title: 'Role Required',
          message: 'This feature requires a specific role that you do not have.',
          canRetry: false,
        };

      case AuthErrorType.MODULE_ACCESS_DENIED:
        return {
          title: 'Module Access Denied',
          message: 'You do not have access to this module.',
          canRetry: false,
        };

      case AuthErrorType.AUTHENTICATION_REQUIRED:
        return {
          title: 'Authentication Required',
          message: 'Please sign in to access this resource.',
          canRetry: false,
        };

      case AuthErrorType.TOKEN_EXPIRED:
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please sign in again.',
          canRetry: true,
        };

      case AuthErrorType.INVALID_TOKEN:
        return {
          title: 'Invalid Session',
          message: 'Your session is invalid. Please sign in again.',
          canRetry: false,
        };

      default:
        return {
          title: 'Authentication Error',
          message: authError.message || 'An authentication error occurred.',
          canRetry: true,
        };
    }
  };

  const { title, message, canRetry } = getErrorDetails();

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Error Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Technical Details (Development Only)
            </summary>
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(
                {
                  name: error.name,
                  message: error.message,
                  type: (error as AuthError).type,
                  details: (error as AuthError).details,
                  stack: error.stack?.split('\n').slice(0, 5).join('\n'),
                },
                null,
                2
              )}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {canRetry && (
            <Button onClick={onReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}

          <Button
            onClick={onSignOut}
            variant={canRetry ? 'outline' : 'default'}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to manually trigger error boundary
 *
 * Useful for throwing auth errors from event handlers or async functions
 *
 * @example
 * ```tsx
 * function ProtectedAction() {
 *   const throwError = useAuthErrorBoundary();
 *
 *   const handleAction = async () => {
 *     try {
 *       await performAction();
 *     } catch (error) {
 *       throwError(new AuthError(
 *         AuthErrorType.PERMISSION_DENIED,
 *         'You cannot perform this action'
 *       ));
 *     }
 *   };
 *
 *   return <button onClick={handleAction}>Action</button>;
 * }
 * ```
 */
export function useAuthErrorBoundary() {
  return (error: Error) => {
    // In React, throwing an error in a component will trigger error boundary
    // For event handlers, we need to use state to trigger re-render
    throw error;
  };
}
