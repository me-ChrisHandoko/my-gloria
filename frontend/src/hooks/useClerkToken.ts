'use client';

import { useAuth } from '@clerk/nextjs';

export function useClerkToken() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const getAuthToken = async () => {
    if (!isLoaded || !isSignedIn) {
      console.warn('Clerk not loaded or user not signed in');
      return null;
    }

    try {
      const token = await getToken();
      if (token) {
        console.log('✅ Successfully retrieved Clerk token');
        return token;
      } else {
        console.warn('⚠️ No token available from Clerk');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting Clerk token:', error);
      return null;
    }
  };

  return { getAuthToken, isLoaded, isSignedIn };
}