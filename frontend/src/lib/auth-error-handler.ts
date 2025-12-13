/**
 * Authentication Error Handler
 *
 * Centralized error handling for authentication-related errors.
 * Provides auto-retry logic, token refresh, and error recovery.
 */

import { AuthError, AuthErrorType } from '@/types/auth';

/**
 * Error handler configuration
 */
export interface AuthErrorHandlerConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Delay between retry attempts in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Whether to use exponential backoff for retries
   * @default true
   */
  exponentialBackoff?: boolean;

  /**
   * Callback when authentication fails permanently
   */
  onAuthFailure?: () => void;

  /**
   * Callback when token needs refresh
   */
  onTokenRefreshNeeded?: () => Promise<string | null>;
}

/**
 * Default configuration
 */
const defaultConfig: Required<AuthErrorHandlerConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  onAuthFailure: () => {
    // Default: redirect to sign-in
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  },
  onTokenRefreshNeeded: async () => null,
};

/**
 * Auth error handler class
 */
export class AuthErrorHandler {
  private config: Required<AuthErrorHandlerConfig>;
  private retryCount: Map<string, number> = new Map();
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: AuthErrorHandlerConfig = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Handle authentication error with auto-retry logic
   *
   * @param error - The error to handle
   * @param requestId - Unique identifier for the request (for retry tracking)
   * @param retryFn - Function to retry the request
   * @returns Promise that resolves when error is handled
   */
  async handleError(
    error: Error,
    requestId: string,
    retryFn?: () => Promise<any>
  ): Promise<any> {
    // Check if it's a 403 error with "user account is inactive"
    if (this.is403InactiveUserError(error)) {
      return this.handle403InactiveUserError();
    }

    // Check if it's a 401 error
    if (this.is401Error(error)) {
      return this.handle401Error(requestId, retryFn);
    }

    // Check if it's an auth error
    if (this.isAuthError(error)) {
      return this.handleAuthError(error as AuthError);
    }

    // Not an auth error, rethrow
    throw error;
  }

  /**
   * Handle 401 Unauthorized error
   */
  private async handle401Error(
    requestId: string,
    retryFn?: () => Promise<any>
  ): Promise<any> {
    const currentRetries = this.retryCount.get(requestId) || 0;

    // Check if max retries exceeded
    if (currentRetries >= this.config.maxRetries) {
      this.retryCount.delete(requestId);
      this.config.onAuthFailure();
      throw new AuthError(
        AuthErrorType.AUTHENTICATION_REQUIRED,
        'Authentication failed after maximum retries'
      );
    }

    // Increment retry count
    this.retryCount.set(requestId, currentRetries + 1);

    // Try to refresh token
    const newToken = await this.refreshToken();

    if (!newToken) {
      // Token refresh failed
      this.retryCount.delete(requestId);
      this.config.onAuthFailure();
      throw new AuthError(
        AuthErrorType.TOKEN_EXPIRED,
        'Token refresh failed'
      );
    }

    // Retry the request if retry function provided
    if (retryFn) {
      try {
        // Calculate delay with exponential backoff
        const delay = this.config.exponentialBackoff
          ? this.config.retryDelay * Math.pow(2, currentRetries)
          : this.config.retryDelay;

        // Wait before retry
        await this.sleep(delay);

        // Retry request
        const result = await retryFn();

        // Success, reset retry count
        this.retryCount.delete(requestId);

        return result;
      } catch (retryError) {
        // Retry failed, handle recursively
        return this.handleError(retryError as Error, requestId, retryFn);
      }
    }

    // No retry function, just return new token
    return newToken;
  }

  /**
   * Handle specific auth errors
   */
  private async handleAuthError(error: AuthError): Promise<never> {
    switch (error.type) {
      case AuthErrorType.TOKEN_EXPIRED:
        // Try to refresh token
        const newToken = await this.refreshToken();
        if (!newToken) {
          this.config.onAuthFailure();
        }
        throw error;

      case AuthErrorType.INVALID_TOKEN:
      case AuthErrorType.AUTHENTICATION_REQUIRED:
        // Cannot recover, redirect to sign-in
        this.config.onAuthFailure();
        throw error;

      case AuthErrorType.PERMISSION_DENIED:
      case AuthErrorType.ROLE_REQUIRED:
      case AuthErrorType.MODULE_ACCESS_DENIED:
        // These are not auth failures, just access denied
        // Don't redirect, just rethrow
        throw error;

      default:
        throw error;
    }
  }

  /**
   * Refresh authentication token
   *
   * Implements queue to prevent multiple simultaneous refresh attempts
   */
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, wait in queue
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      // Call refresh callback
      const newToken = await this.config.onTokenRefreshNeeded();

      // Resolve all queued requests
      this.refreshQueue.forEach(({ resolve }) => resolve(newToken));
      this.refreshQueue = [];

      return newToken;
    } catch (error) {
      // Reject all queued requests
      this.refreshQueue.forEach(({ reject }) => reject(error as Error));
      this.refreshQueue = [];

      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Handle 403 Forbidden error for inactive user account
   *
   * When HR deactivates a user, backend returns 403 with "user account is inactive"
   * This handler triggers immediate logout and redirects to sign-in
   */
  private async handle403InactiveUserError(): Promise<never> {
    console.log('🚫 [Auth] User account is inactive - triggering logout');

    // Clear retry counts
    this.resetAllRetries();

    // Trigger auth failure callback (logout + redirect)
    this.config.onAuthFailure();

    throw new AuthError(
      AuthErrorType.AUTHENTICATION_REQUIRED,
      'User account has been deactivated by HR'
    );
  }

  /**
   * Check if error is a 403 error with "user account is inactive" message
   */
  private is403InactiveUserError(error: any): boolean {
    // Check for RTK Query error with 403 status
    if (error.status === 403) {
      const errorData = error.data;
      const errorMessage = errorData?.error?.toLowerCase() || '';

      // Check for inactive user message
      return (
        errorMessage.includes('user account is inactive') ||
        errorMessage.includes('akun pengguna tidak aktif') ||
        errorMessage.includes('inactive')
      );
    }

    // Check for fetch error
    if (error instanceof Response && error.status === 403) {
      // Try to parse response body
      return true; // Will be handled by onAuthFailure
    }

    // Check for axios error
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error?.toLowerCase() || '';
      return (
        errorMessage.includes('user account is inactive') ||
        errorMessage.includes('akun pengguna tidak aktif') ||
        errorMessage.includes('inactive')
      );
    }

    return false;
  }

  /**
   * Check if error is a 401 error
   */
  private is401Error(error: any): boolean {
    // Check for RTK Query error
    if (error.status === 401 || error.status === 'PARSING_ERROR') {
      return true;
    }

    // Check for fetch error
    if (error instanceof Response && error.status === 401) {
      return true;
    }

    // Check for axios error
    if (error.response?.status === 401) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is an auth error
   */
  private isAuthError(error: any): error is AuthError {
    return error instanceof AuthError || error.name === 'AuthError';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset retry count for a request
   */
  resetRetryCount(requestId: string): void {
    this.retryCount.delete(requestId);
  }

  /**
   * Reset all retry counts
   */
  resetAllRetries(): void {
    this.retryCount.clear();
  }
}

/**
 * Global auth error handler instance
 */
let globalHandler: AuthErrorHandler | null = null;

/**
 * Get or create global auth error handler
 */
export function getAuthErrorHandler(
  config?: AuthErrorHandlerConfig
): AuthErrorHandler {
  if (!globalHandler) {
    globalHandler = new AuthErrorHandler(config);
  }
  return globalHandler;
}

/**
 * Configure global auth error handler
 */
export function configureAuthErrorHandler(
  config: AuthErrorHandlerConfig
): void {
  globalHandler = new AuthErrorHandler(config);
}

/**
 * Reset global auth error handler
 */
export function resetAuthErrorHandler(): void {
  globalHandler = null;
}
