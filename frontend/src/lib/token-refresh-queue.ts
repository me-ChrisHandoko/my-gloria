/**
 * Token Refresh Queue
 *
 * Manages token refresh requests to prevent multiple simultaneous refresh attempts.
 * Implements a queue system where all pending requests wait for a single refresh operation.
 */

'use client';

type TokenRefreshCallback = () => Promise<string | null>;

interface QueuedRequest {
  resolve: (token: string | null) => void;
  reject: (error: Error) => void;
}

/**
 * Token refresh queue manager
 */
export class TokenRefreshQueue {
  private isRefreshing = false;
  private refreshQueue: QueuedRequest[] = [];
  private currentToken: string | null = null;
  private refreshCallback: TokenRefreshCallback;

  constructor(refreshCallback: TokenRefreshCallback) {
    this.refreshCallback = refreshCallback;
  }

  /**
   * Request a token refresh
   *
   * If a refresh is already in progress, the request is queued.
   * Once refresh completes, all queued requests receive the new token.
   *
   * @returns Promise resolving to the refreshed token
   */
  async refreshToken(): Promise<string | null> {
    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    // Start refresh process
    this.isRefreshing = true;

    try {
      // Call refresh callback
      const newToken = await this.refreshCallback();

      // Update current token
      this.currentToken = newToken;

      // Resolve all queued requests with new token
      this.refreshQueue.forEach(({ resolve }) => {
        resolve(newToken);
      });

      // Clear queue
      this.refreshQueue = [];

      return newToken;
    } catch (error) {
      // Reject all queued requests
      this.refreshQueue.forEach(({ reject }) => {
        reject(error as Error);
      });

      // Clear queue
      this.refreshQueue = [];

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get current token without refreshing
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Set current token manually
   */
  setCurrentToken(token: string | null): void {
    this.currentToken = token;
  }

  /**
   * Check if refresh is in progress
   */
  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /**
   * Get number of queued requests
   */
  getQueueLength(): number {
    return this.refreshQueue.length;
  }

  /**
   * Clear all queued requests
   */
  clearQueue(): void {
    this.refreshQueue.forEach(({ reject }) => {
      reject(new Error('Token refresh queue cleared'));
    });
    this.refreshQueue = [];
  }

  /**
   * Reset queue state
   */
  reset(): void {
    this.isRefreshing = false;
    this.currentToken = null;
    this.clearQueue();
  }
}

/**
 * Global token refresh queue instance
 */
let globalQueue: TokenRefreshQueue | null = null;

/**
 * Get or create global token refresh queue
 *
 * @param refreshCallback - Function to call when token needs refresh
 * @returns TokenRefreshQueue instance
 */
export function getTokenRefreshQueue(
  refreshCallback: TokenRefreshCallback
): TokenRefreshQueue {
  if (!globalQueue) {
    globalQueue = new TokenRefreshQueue(refreshCallback);
  }
  return globalQueue;
}

/**
 * Reset global token refresh queue
 */
export function resetTokenRefreshQueue(): void {
  if (globalQueue) {
    globalQueue.reset();
  }
  globalQueue = null;
}

/**
 * Hook to use token refresh queue with Clerk
 *
 * Integrates with Clerk's getToken method for automatic token refresh
 */
export function createClerkTokenRefreshQueue(
  getToken: () => Promise<string | null>
): TokenRefreshQueue {
  return getTokenRefreshQueue(async () => {
    try {
      // Force token refresh
      const token = await getToken();
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  });
}
