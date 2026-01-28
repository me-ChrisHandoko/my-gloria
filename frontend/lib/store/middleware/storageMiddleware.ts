// lib/store/middleware/storageMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';

/**
 * Auth state middleware
 *
 * NOTE: With httpOnly cookies implementation, we DO NOT store tokens in localStorage
 * or any JavaScript-accessible storage. This prevents XSS token theft.
 *
 * Tokens are:
 * - Stored in httpOnly cookies by backend (JavaScript cannot access)
 * - Automatically sent with requests via credentials: 'include'
 * - Rotated transparently by backend
 *
 * We only persist user info (non-sensitive) for UI state management.
 * Using localStorage instead of sessionStorage to share auth state across browser tabs.
 */
export const storageMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);

  // Save only user info to localStorage on auth actions (NO TOKENS)
  // localStorage is shared across all tabs, enabling multi-tab sessions
  if (action.type?.startsWith('auth/')) {
    const authState = store.getState().auth;

    if (authState.isAuthenticated && authState.user) {
      // SECURITY: Only store non-sensitive user info, NEVER tokens
      localStorage.setItem(
        'gloria_user',
        JSON.stringify({
          user: authState.user,
          isAuthenticated: authState.isAuthenticated,
        })
      );
    } else {
      localStorage.removeItem('gloria_user');
    }
  }

  return result;
};
