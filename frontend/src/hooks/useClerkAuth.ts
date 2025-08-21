'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback } from 'react';

/**
 * Custom hook for Clerk authentication in client components
 * Provides easy access to auth token and user state
 */
export function useClerkAuth() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();

  /**
   * Get auth token with error handling
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!isLoaded) {
      console.warn('Clerk is still loading');
      return null;
    }

    if (!isSignedIn) {
      console.warn('User is not signed in');
      return null;
    }

    try {
      const token = await getToken();
      if (token) {
        console.log('✅ Token retrieved successfully');
        return token;
      }
      console.warn('No token available from Clerk');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, [getToken, isLoaded, isSignedIn]);

  /**
   * Create headers with auth token
   */
  const createAuthHeaders = useCallback(async (additionalHeaders?: HeadersInit): Promise<Headers> => {
    const headers = new Headers(additionalHeaders);
    
    const token = await getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('X-Requested-With', 'XMLHttpRequest');
    
    return headers;
  }, [getAuthToken]);

  return {
    getAuthToken,
    createAuthHeaders,
    isLoaded,
    isSignedIn,
    userId,
  };
}