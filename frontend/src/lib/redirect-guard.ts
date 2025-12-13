/**
 * Redirect Guard
 *
 * Singleton mechanism to prevent duplicate redirects during auto-logout.
 * Ensures only one redirect occurs even when multiple API calls fail simultaneously.
 */

/**
 * Global flag to track if redirect is in progress
 * This prevents race conditions when multiple API calls fail at the same time
 */
let isRedirecting = false;

/**
 * Timestamp of last redirect attempt for debugging
 */
let lastRedirectTimestamp: number | null = null;

/**
 * URL of last redirect for debugging
 */
let lastRedirectUrl: string | null = null;

/**
 * Redirect to URL only once, blocking duplicate attempts
 *
 * This function implements a singleton redirect pattern:
 * - First call: Executes redirect and sets guard flag
 * - Subsequent calls: Blocked and logged as duplicates
 *
 * @param url - URL to redirect to
 * @returns true if redirect was triggered, false if blocked as duplicate
 *
 * @example
 * ```typescript
 * // First call - executes redirect
 * redirectOnce('/sign-out?reason=account_deactivated'); // returns true
 *
 * // Subsequent calls - blocked
 * redirectOnce('/sign-out?reason=account_deactivated'); // returns false
 * ```
 */
export function redirectOnce(url: string): boolean {
  // Check if redirect already in progress
  if (isRedirecting) {
    const timeSinceLastRedirect = lastRedirectTimestamp
      ? Date.now() - lastRedirectTimestamp
      : null;

    console.log('⚠️ [RedirectGuard] Redirect already in progress, blocking duplicate', {
      inProgress: true,
      targetUrl: url,
      lastRedirectUrl,
      timeSinceLastRedirect: timeSinceLastRedirect
        ? `${timeSinceLastRedirect}ms ago`
        : 'unknown',
    });

    return false; // Blocked
  }

  // Set guard flag to prevent duplicates
  isRedirecting = true;
  lastRedirectTimestamp = Date.now();
  lastRedirectUrl = url;

  console.log('✅ [RedirectGuard] Triggering redirect', {
    url,
    timestamp: new Date().toISOString(),
  });

  // Perform redirect
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }

  return true; // Redirect triggered
}

/**
 * Reset redirect guard (for testing purposes only)
 *
 * WARNING: Do not use in production code!
 * This function is intended for test cleanup only.
 */
export function resetRedirectGuard(): void {
  console.log('🔄 [RedirectGuard] Resetting guard (test mode only)');
  isRedirecting = false;
  lastRedirectTimestamp = null;
  lastRedirectUrl = null;
}

/**
 * Check if redirect is currently in progress
 *
 * @returns true if redirect guard is active
 */
export function isRedirectInProgress(): boolean {
  return isRedirecting;
}

/**
 * Get redirect guard status for debugging
 *
 * @returns Object with guard status information
 */
export function getRedirectGuardStatus() {
  return {
    isRedirecting,
    lastRedirectUrl,
    lastRedirectTimestamp,
    timeSinceLastRedirect: lastRedirectTimestamp
      ? Date.now() - lastRedirectTimestamp
      : null,
  };
}
