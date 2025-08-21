/**
 * Server-side Clerk authentication functions
 * This file should only be imported in Server Components and API routes
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Get Clerk token for server-side requests
 * Use this in API routes and server components ONLY
 */
export async function getServerAuthToken() {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    return token;
  } catch (error) {
    console.error('Failed to get server auth token:', error);
    return null;
  }
}

/**
 * Create headers with authentication token for server-side requests
 */
export async function createServerAuthHeaders(additionalHeaders?: HeadersInit): Promise<Headers> {
  const headers = new Headers(additionalHeaders);
  
  // Get token for server-side requests
  const token = await getServerAuthToken();
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn('No auth token available for server request');
  }
  
  // Add default headers
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  return headers;
}

/**
 * Make authenticated API request from server-side
 */
export async function authenticatedServerFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers = await createServerAuthHeaders(options?.headers);
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}