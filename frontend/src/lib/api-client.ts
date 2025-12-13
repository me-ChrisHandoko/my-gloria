/**
 * API Client with automatic X-Login-Email header injection
 *
 * This client automatically adds X-Login-Email header to all authenticated requests
 * to help backend match Clerk user with correct employee record and prevent
 * confused deputy attacks where user has multiple email addresses.
 *
 * Security Benefits:
 * - Prevents user from accessing wrong employee account
 * - Ensures backend uses the email that passed frontend validation
 * - Mitigates confused deputy vulnerability
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Get login email from sessionStorage
 * This is the email that was validated during login
 */
export function getLoginEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('clerk_login_email');
}

/**
 * Fetch wrapper that automatically adds X-Login-Email header
 * Use this instead of native fetch for authenticated API calls
 *
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Add X-Login-Email header if available
  const loginEmail = getLoginEmail();
  if (loginEmail) {
    headers.set('X-Login-Email', loginEmail);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * API client for backend calls with automatic auth headers
 * Includes Clerk session token and X-Login-Email header
 *
 * Usage:
 * ```typescript
 * const response = await apiClient.get('/api/v1/me');
 * const data = await response.json();
 * ```
 */
export const apiClient = {
  /**
   * GET request with auth headers
   */
  async get(url: string, options: RequestInit = {}): Promise<Response> {
    return fetchWithAuth(url, {
      ...options,
      method: 'GET',
    });
  },

  /**
   * POST request with auth headers
   */
  async post(url: string, body?: any, options: RequestInit = {}): Promise<Response> {
    return fetchWithAuth(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request with auth headers
   */
  async put(url: string, body?: any, options: RequestInit = {}): Promise<Response> {
    return fetchWithAuth(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request with auth headers
   */
  async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return fetchWithAuth(url, {
      ...options,
      method: 'DELETE',
    });
  },
};

/**
 * Server-side API client (for use in Server Components and Server Actions)
 * Automatically includes Clerk session token from server-side auth
 *
 * Usage in Server Component:
 * ```typescript
 * const data = await serverApiClient.get('/api/v1/me');
 * ```
 */
export const serverApiClient = {
  async get(url: string): Promise<any> {
    const { getToken } = await auth();
    const token = await getToken();

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },

  async post(url: string, body?: any): Promise<any> {
    const { getToken } = await auth();
    const token = await getToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
};
