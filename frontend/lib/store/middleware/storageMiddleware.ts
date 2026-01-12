// lib/store/middleware/storageMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';

/**
 * Middleware to sync auth state to sessionStorage
 * Automatically saves on any auth state change
 */
export const storageMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);

  // Save auth state to sessionStorage on auth actions
  if (action.type?.startsWith('auth/')) {
    const authState = store.getState().auth;

    if (authState.isAuthenticated && authState.accessToken && authState.refreshToken) {
      sessionStorage.setItem(
        'gloria_auth',
        JSON.stringify({
          accessToken: authState.accessToken,
          refreshToken: authState.refreshToken,
          user: authState.user,
        })
      );
    } else {
      sessionStorage.removeItem('gloria_auth');
    }
  }

  return result;
};
