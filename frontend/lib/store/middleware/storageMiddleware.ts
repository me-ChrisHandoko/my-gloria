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

  // Only run on client-side (localStorage is not available on server)
  if (typeof window === 'undefined') {
    return result;
  }

  // Log all auth actions for debugging
  const actionType = action.type as string;
  if (actionType?.startsWith('auth/')) {
    console.log('[Auth Middleware] Action received:', actionType);
  }

  // Only handle setCredentials and logout actions for localStorage persistence
  // DO NOT handle initializeAuth or other auth actions that don't change auth state
  if (actionType === 'auth/setCredentials') {
    // User logged in - save to localStorage
    const authState = store.getState().auth;
    console.log('[Auth Middleware] setCredentials - authState:', {
      hasUser: !!authState.user,
      isAuthenticated: authState.isAuthenticated,
      email: authState.user?.email
    });

    if (authState.user) {
      try {
        const dataToStore = {
          user: authState.user,
          isAuthenticated: authState.isAuthenticated,
        };
        localStorage.setItem('gloria_user', JSON.stringify(dataToStore));
        console.log('[Auth Middleware] ✅ Saved to localStorage:', authState.user.email);

        // Verify it was saved
        const verify = localStorage.getItem('gloria_user');
        console.log('[Auth Middleware] Verification:', verify ? 'OK' : 'FAILED');
      } catch (error) {
        console.error('[Auth Middleware] ❌ Failed to save:', error);
      }
    } else {
      console.log('[Auth Middleware] ⚠️ No user in state, skipping save');
    }
  } else if (actionType === 'auth/logout') {
    // User logged out - remove from localStorage
    localStorage.removeItem('gloria_user');
    console.log('[Auth Middleware] 🚪 Removed from localStorage (logout)');
  }

  return result;
};
