// lib/store/ReduxProvider.tsx
'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { setCredentials } from './features/authSlice';

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
        if (stored) {
          const { user, isAuthenticated } = JSON.parse(stored);
          if (user && isAuthenticated) {
            // Restore user info (tokens are in httpOnly cookies)
            store.dispatch(setCredentials({ user }));
          }
        }
      } catch (error) {
        console.error('Failed to restore user state:', error);
        // Clear corrupted data
        localStorage.removeItem('gloria_user');
      }
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
