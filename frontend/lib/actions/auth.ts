// lib/actions/auth.ts
'use server';

/**
 * Server Actions for authentication
 *
 * NOTE: With httpOnly cookies implementation, authentication cookies are managed
 * entirely by the backend. These server actions are DEPRECATED and kept only for
 * backward compatibility during migration period.
 *
 * All authentication now uses:
 * - Backend sets cookies via Set-Cookie headers (httpOnly, secure)
 * - Frontend sends cookies automatically via credentials: 'include'
 * - Token rotation handled by backend transparently
 */

import { cookies } from 'next/headers';

/**
 * Get auth tokens from cookies (for server-side use)
 * This is the only method still relevant - for SSR authentication checks
 */
export async function getAuthTokens() {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get('gloria_access_token')?.value,
    refreshToken: cookieStore.get('gloria_refresh_token')?.value,
    csrfToken: cookieStore.get('gloria_csrf_token')?.value,
  };
}

/**
 * Check if user is authenticated (server-side)
 * Useful for SSR pages and middleware
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getAuthTokens();
  return !!tokens.accessToken;
}
