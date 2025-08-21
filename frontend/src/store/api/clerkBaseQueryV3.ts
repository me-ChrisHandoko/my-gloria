import { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // milliseconds

// Request/Response interceptor for debugging
interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  hasAuth: boolean;
  body?: any;
}

interface ResponseLog extends RequestLog {
  status: number;
  duration: number;
  error?: any;
}

const requestLogs: RequestLog[] = [];
const responseLogs: ResponseLog[] = [];

// Make logs available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__apiLogs = {
    requests: requestLogs,
    responses: responseLogs,
    clear: () => {
      requestLogs.length = 0;
      responseLogs.length = 0;
    },
    getLast: (n = 10) => ({
      requests: requestLogs.slice(-n),
      responses: responseLogs.slice(-n),
    }),
  };
}

/**
 * Helper function to get Clerk token on client-side with retry logic
 * This avoids importing server-only modules
 */
async function getClerkToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.warn('getClerkToken called on server side - returning null');
    return null;
  }

  try {
    // First, try to use the AuthenticatedApiProvider's method
    const getTokenFn = (window as any).__getClerkToken;
    if (getTokenFn && typeof getTokenFn === 'function') {
      try {
        const token = await getTokenFn({ forceRefresh });
        if (token) {
          console.log('✅ Token retrieved via AuthenticatedApiProvider' + (forceRefresh ? ' (refreshed)' : ''));
          return token;
        }
      } catch (error) {
        console.warn('Failed to get token via AuthenticatedApiProvider:', error);
      }
    }

    // Fallback: Wait for Clerk to be loaded (max 5 seconds)
    const maxWaitTime = 5000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const clerk = (window as any).Clerk;
      
      if (clerk && clerk.loaded) {
        // Check if user is signed in
        if (clerk.user && clerk.session) {
          try {
            const token = await clerk.session.getToken({ skipCache: forceRefresh });
            if (token) {
              console.log('✅ Token retrieved from Clerk directly' + (forceRefresh ? ' (refreshed)' : ''));
              return token;
            }
          } catch (error) {
            console.warn('Failed to get token from Clerk session:', error);
          }
        } else {
          console.warn('User not signed in');
          return null;
        }
        break;
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn('Clerk did not load within timeout period');
    return null;
  } catch (error) {
    console.error('Error getting Clerk token:', error);
    return null;
  }
}

/**
 * Client-safe base query for RTK Query
 * This version avoids server-only imports
 */
/**
 * Sleep helper for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is retryable
 */
const isRetryableError = (status: number | string): boolean => {
  if (typeof status === 'string') {
    return status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR';
  }
  // Retry on 401 (might need token refresh), 429 (rate limit), 502-504 (gateway errors)
  return status === 401 || status === 429 || (status >= 502 && status <= 504);
};

export const clerkBaseQueryV3: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, _api, extraOptions) => {
  let retryCount = 0;
  const maxRetries = (extraOptions as any)?.maxRetries ?? MAX_RETRY_ATTEMPTS;
  
  while (retryCount <= maxRetries) {
    // Prepare the request arguments
    const fetchArgs = typeof args === 'string' ? { url: args } : args;
    const { url, method = 'GET', body, params } = fetchArgs;

    // Build the full URL
    const fullUrl = new URL(`${API_URL}${url}`);
    if (params) {
      Object.keys(params).forEach(key => {
        fullUrl.searchParams.append(key, params[key]);
      });
    }

    // Prepare headers
    const headers = new Headers(fetchArgs.headers as HeadersInit || {});
    
    // Add common headers
    if (!headers.has('Content-Type') && body) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('X-Requested-With', 'XMLHttpRequest');
    
    // Track request start time for logging
    const startTime = Date.now();

    // Get Clerk token (with refresh on retry for 401)
    const forceRefresh = retryCount > 0 && (extraOptions as any)?.lastError?.status === 401;
    let hasAuth = false;
    
    try {
      const token = await getClerkToken(forceRefresh);
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        hasAuth = true;
        console.log(`🔐 Making authenticated request to: ${url}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
      } else {
        // Special handling for certain endpoints
        const isImpersonationEndpoint = url.includes('/admin/impersonation');
        const isPublicEndpoint = url.includes('/public');
        
        if (isImpersonationEndpoint) {
          // For impersonation endpoints, if no token, return early with null
          console.info('Skipping impersonation request - no auth token available');
          return { data: null };
        }
        
        if (!isPublicEndpoint) {
          console.warn(`⚠️ Making unauthenticated request to: ${url}`);
        }
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    
    // Log request (debugging)
    const requestLog: RequestLog = {
      timestamp: new Date().toISOString(),
      method,
      url: url,
      hasAuth,
      body,
    };
    requestLogs.push(requestLog);
    if (requestLogs.length > 100) requestLogs.shift(); // Keep only last 100

    // Make the fetch request with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(fullUrl.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Parse response
      const responseText = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        // If not JSON, return as text
        data = responseText;
      }
      
      // Log response (debugging)
      const responseLog: ResponseLog = {
        timestamp: requestLog.timestamp,
        method,
        url: url,
        hasAuth,
        status: response.status,
        duration: Date.now() - startTime,
      };
      responseLogs.push(responseLog);
      if (responseLogs.length > 100) responseLogs.shift();

      // Handle errors
      if (!response.ok) {
        // Special handling for specific endpoints
        const isImpersonationEndpoint = url.includes('/admin/impersonation');
        
        if (isImpersonationEndpoint) {
          if (response.status === 404) {
            // API not implemented yet - return null gracefully
            // Don't log to console to avoid noise
            return { data: null };
          }
          
          if (response.status === 401) {
            // User might not have admin permissions - return null silently
            return { data: null };
          }
        }
        
        // Check if error is retryable
        if (isRetryableError(response.status) && retryCount < maxRetries) {
          retryCount++;
          const delay = RETRY_DELAY * Math.pow(2, retryCount - 1); // Exponential backoff
          
          console.warn(`🔄 Retrying request (${retryCount}/${maxRetries}) after ${delay}ms...`, {
            url,
            status: response.status,
            reason: data?.message || response.statusText,
          });
          
          await sleep(delay);
          (extraOptions as any) = { ...extraOptions, lastError: { status: response.status } };
          continue; // Retry the request
        }
        
        // Log error details
        if (response.status === 401) {
          console.error('🔒 Authentication Error:', {
            url: url,
            status: response.status,
            message: data?.message || response.statusText,
            retryCount,
          });
        } else {
          console.error(`API Error ${response.status}:`, {
            url: url,
            message: data?.message || response.statusText,
            retryCount,
          });
        }
        
        responseLog.error = data?.message || response.statusText;
        
        return {
          error: {
            status: response.status,
            data: data || response.statusText,
          } as FetchBaseQueryError,
        };
      }

      // Success!
      if (retryCount > 0) {
        console.log(`✅ Request succeeded after ${retryCount} retries`);
      }
      
      return { data };
    } catch (error: any) {
      // Log error response
      const responseLog: ResponseLog = {
        timestamp: requestLog.timestamp,
        method,
        url: url,
        hasAuth,
        status: error.name === 'AbortError' ? 408 : 0,
        duration: Date.now() - startTime,
        error: error.message,
      };
      responseLogs.push(responseLog);
      if (responseLogs.length > 100) responseLogs.shift();
      
      // Check if error is retryable
      const errorStatus = error.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'FETCH_ERROR';
      if (isRetryableError(errorStatus) && retryCount < maxRetries) {
        retryCount++;
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
        
        console.warn(`🔄 Retrying request (${retryCount}/${maxRetries}) after ${delay}ms...`, {
          url,
          error: error.message,
        });
        
        await sleep(delay);
        continue; // Retry the request
      }
      
      console.error('Network error:', error, { retryCount });
      return {
        error: {
          status: errorStatus,
          error: error.message,
        } as FetchBaseQueryError,
      };
    }
  }
  
  // Should never reach here
  return {
    error: {
      status: 'FETCH_ERROR',
      error: 'Max retries exceeded',
    } as FetchBaseQueryError,
  };
};

export default clerkBaseQueryV3;