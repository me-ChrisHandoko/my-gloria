/**
 * CSRF Token Utility
 * Helper functions untuk read dan manage CSRF token dari cookies
 */

/**
 * Get CSRF token dari cookie (client-side only)
 * Cookie name: gloria_csrf_token
 */
export function getCSRFToken(): string | null {
  // Server-side: tidak ada document.cookie
  if (typeof window === 'undefined') {
    return null;
  }

  // Parse document.cookie untuk find gloria_csrf_token
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'gloria_csrf_token') {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Check jika CSRF token valid (not empty, not expired)
 */
export function hasValidCSRFToken(): boolean {
  const token = getCSRFToken();
  return token !== null && token.length > 0;
}
