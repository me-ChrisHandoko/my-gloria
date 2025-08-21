/**
 * Centralized Clerk authentication client for API requests
 * This ensures consistent token retrieval across the application
 */

// Note: Server-side auth functions have been moved to clerkServer.ts
// This file now only contains client-side functions to avoid Next.js errors

/**
 * Get Clerk token for client-side requests
 * Use this in client components and hooks
 */
export async function getClientAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.warn('getClientAuthToken called on server side');
    return null;
  }

  try {
    // Wait for Clerk to be ready
    await waitForClerk();
    
    const clerk = (window as any).Clerk;
    if (!clerk || !clerk.loaded || !clerk.user) {
      console.warn('Clerk not ready or user not signed in');
      return null;
    }

    const session = clerk.session;
    if (!session) {
      console.warn('No active Clerk session');
      return null;
    }

    // Get fresh token
    const token = await session.getToken();
    if (token) {
      console.log('✅ Successfully retrieved Clerk token');
      return token;
    }

    console.warn('Failed to get token from Clerk session');
    return null;
  } catch (error) {
    console.error('Error getting client auth token:', error);
    return null;
  }
}

/**
 * Wait for Clerk to be fully loaded on the client
 */
async function waitForClerk(maxWaitTime = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const clerk = (window as any).Clerk;
    
    if (clerk && clerk.loaded) {
      return true;
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('Clerk did not load within timeout period');
  return false;
}

/**
 * Create headers with authentication token (CLIENT ONLY)
 */
export async function createAuthHeaders(additionalHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(additionalHeaders);
  
  // Get token for client-side requests
  const token = await getClientAuthToken();
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn('No auth token available for request');
  }
  
  // Add default headers
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  return headers;
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers = await createAuthHeaders(options?.headers);
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}