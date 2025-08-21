'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

/**
 * This provider ensures Clerk token is available for API calls
 */
export function AuthenticatedApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    // Set up a global function to get the token
    if (typeof window !== 'undefined') {
      (window as any).__getClerkToken = async (options?: { forceRefresh?: boolean }) => {
        if (!isSignedIn) {
          console.warn('User not signed in, cannot get token');
          return null;
        }
        
        try {
          // Pass skipCache option to force token refresh when needed
          const token = await getToken({ skipCache: options?.forceRefresh });
          if (token) {
            console.log('✅ Token retrieved via AuthenticatedApiProvider' + (options?.forceRefresh ? ' (refreshed)' : ''));
            return token;
          } else {
            console.warn('⚠️ No token available from Clerk');
            return null;
          }
        } catch (error) {
          console.error('❌ Error getting token:', error);
          return null;
        }
      };
      
      console.log('🔐 AuthenticatedApiProvider initialized');
    }
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}