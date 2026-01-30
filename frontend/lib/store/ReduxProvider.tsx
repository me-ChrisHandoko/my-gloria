// lib/store/ReduxProvider.tsx
'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { setCredentials, initializeAuth } from './features/authSlice';

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Restore user info from localStorage (if exists)
    // NOTE: We DO NOT store tokens anymore - they're in httpOnly cookies
    // This only restores non-sensitive user info for UI state
    // Using localStorage to share auth state across all browser tabs
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('gloria_user');
        console.log('[Auth] ReduxProvider checking localStorage:', stored ? 'found' : 'empty');

        if (stored) {
          const { user, isAuthenticated } = JSON.parse(stored);
          console.log('[Auth] Parsed localStorage:', { user: user?.email, isAuthenticated });

          if (user && isAuthenticated) {
            // Restore user info (tokens are in httpOnly cookies)
            console.log('[Auth] Restoring credentials from localStorage');
            store.dispatch(setCredentials({ user }));
          } else {
            // No valid auth data, mark as initialized anyway
            console.log('[Auth] Invalid data in localStorage, initializing without auth');
            store.dispatch(initializeAuth());
          }
        } else {
          // No stored data, mark as initialized
          console.log('[Auth] No localStorage data, initializing without auth');
          store.dispatch(initializeAuth());
        }
      } catch (error) {
        console.error('[Auth] Failed to restore user state:', error);
        // Clear corrupted data
        localStorage.removeItem('gloria_user');
        // Mark as initialized even on error
        store.dispatch(initializeAuth());
      }
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
