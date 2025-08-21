'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export function useDebugAuth() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();

  useEffect(() => {
    async function debugAuth() {
      console.log('🔍 Debug Auth State:', {
        isLoaded,
        isSignedIn,
        userId,
        hasGetToken: typeof getToken === 'function',
        hasGlobalGetToken: typeof (window as any).__getClerkToken === 'function',
      });

      if (isLoaded && isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            console.log('✅ Successfully retrieved token');
            console.log('📋 Token preview:', token.substring(0, 50) + '...');
            
            // Decode token header to check issuer
            const [header] = token.split('.');
            const decodedHeader = JSON.parse(atob(header));
            console.log('🔐 Token header:', decodedHeader);
          } else {
            console.warn('⚠️ No token available');
          }
        } catch (error) {
          console.error('❌ Error getting token:', error);
        }
      }
    }

    debugAuth();
  }, [isLoaded, isSignedIn, userId, getToken]);
}