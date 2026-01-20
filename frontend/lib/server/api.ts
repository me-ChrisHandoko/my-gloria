// lib/server/api.ts
/**
 * Server-side API utilities for Next.js Server Components
 * Handles authenticated requests using cookies
 */

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
  skipRefresh?: boolean; // Internal flag to prevent infinite refresh loops
}

/**
 * DISABLED: Server-side token refresh
 *
 * REASON: Race condition between SSR and CSR when using token rotation.
 * When both SSR and CSR try to refresh tokens simultaneously:
 * 1. SSR refreshes first → old token revoked, new token created
 * 2. CSR still has old token in browser cookies
 * 3. CSR tries to refresh with old (revoked) token
 * 4. Backend detects "token reuse attack" → revokes ALL tokens
 * 5. User gets logged out unexpectedly
 *
 * SOLUTION: Only CSR (browser) should handle token refresh because:
 * - Browser can properly update its own cookies
 * - No race condition possible with single refresh handler
 * - Token rotation works correctly
 *
 * @deprecated Do not use - let CSR handle token refresh
 */
// async function refreshAccessToken(): Promise<string | null> {
//   // DISABLED - See comment above
//   return null;
// }

/**
 * Server-side fetch with authentication from cookies
 *
 * NOTE: Server-side does NOT attempt token refresh on 401.
 * Token refresh is delegated to CSR (browser) to avoid race conditions.
 * See comment above for detailed explanation.
 */
export async function serverFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<{ data?: T; error?: string; authError?: boolean }> {
  const { requireAuth = true, ...fetchOptions } = options;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('gloria_access_token')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add authorization header if required and token exists
    if (requireAuth && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      cache: 'no-store', // Disable caching for authenticated requests
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;

      // Detect authentication errors for special handling
      const isAuthError =
        response.status === 401 ||
        response.status === 403 ||
        errorMessage.toLowerCase().includes('token') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('authentication') ||
        errorMessage.toLowerCase().includes('expired');

      // On 401: Do NOT refresh server-side, delegate to CSR
      // This prevents race condition with token rotation
      if (response.status === 401 && requireAuth) {
        console.log('[Server Fetch] 401 detected - delegating token refresh to client-side');
      }

      return {
        error: errorMessage,
        authError: isAuthError
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Server fetch error:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ============================================
// SCHOOLS API
// ============================================

/**
 * Get schools list with pagination, filters, and sorting
 */
export async function getSchools(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  lokasi?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.lokasi) queryParams.append('lokasi', params.lokasi);
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/schools${query}`);
}

/**
 * Get school by ID
 */
export async function getSchoolById(id: string) {
  return serverFetch<any>(`/schools/${id}`);
}

// ============================================
// DEPARTMENTS API
// ============================================

/**
 * Get departments list with pagination, filters, and sorting
 */
export async function getDepartments(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  school_id?: string;
  parent_id?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.school_id) queryParams.append('school_id', params.school_id);
  if (params?.parent_id) queryParams.append('parent_id', params.parent_id);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/departments${query}`);
}

/**
 * Get department by ID
 */
export async function getDepartmentById(id: string) {
  return serverFetch<any>(`/departments/${id}`);
}

// ============================================
// POSITIONS API
// ============================================

/**
 * Get positions list with pagination, filters, and sorting
 */
export async function getPositions(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  department_id?: string;
  school_id?: string;
  hierarchy_level?: number;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.department_id) queryParams.append('department_id', params.department_id);
  if (params?.school_id) queryParams.append('school_id', params.school_id);
  if (params?.hierarchy_level !== undefined) queryParams.append('hierarchy_level', params.hierarchy_level.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/positions${query}`);
}

/**
 * Get position by ID
 */
export async function getPositionById(id: string) {
  return serverFetch<any>(`/positions/${id}`);
}

// ============================================
// WORKFLOW RULES API
// ============================================

/**
 * Get workflow rules list with pagination, filters, and sorting
 */
export async function getWorkflowRules(params?: {
  page?: number;
  page_size?: number;
  workflow_type?: string;
  position_id?: string;
  school_id?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.workflow_type) queryParams.append('workflow_type', params.workflow_type);
  if (params?.position_id) queryParams.append('position_id', params.position_id);
  if (params?.school_id) queryParams.append('school_id', params.school_id);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/workflow-rules${query}`);
}

/**
 * Get workflow rule by ID
 */
export async function getWorkflowRuleById(id: string) {
  return serverFetch<any>(`/workflow-rules/${id}`);
}

// ============================================
// ROLES API
// ============================================

/**
 * Get roles list with pagination, filters, and sorting
 */
export async function getRoles(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  is_system_role?: boolean;
  hierarchy_level?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.is_system_role !== undefined) queryParams.append('is_system_role', params.is_system_role.toString());
  if (params?.hierarchy_level !== undefined) queryParams.append('hierarchy_level', params.hierarchy_level.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/roles${query}`);
}

/**
 * Get role by ID
 */
export async function getRoleById(id: string) {
  return serverFetch<any>(`/roles/${id}`);
}

// ============================================
// PERMISSIONS API
// ============================================

/**
 * Get permissions list with pagination, filters, and sorting
 */
export async function getPermissions(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  resource?: string;
  action?: string;
  scope?: string;
  category?: string;
  is_active?: boolean;
  is_system_permission?: boolean;
  sort_by?: 'code' | 'name' | 'resource' | 'created_at';
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.resource) queryParams.append('resource', params.resource);
  if (params?.action) queryParams.append('action', params.action);
  if (params?.scope) queryParams.append('scope', params.scope);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.is_system_permission !== undefined)
    queryParams.append('is_system_permission', params.is_system_permission.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/permissions${query}`);
}

/**
 * Get permission by ID
 */
export async function getPermissionById(id: string) {
  return serverFetch<any>(`/permissions/${id}`);
}

// ============================================
// MODULES API
// ============================================

/**
 * Get modules list with pagination, filters, and sorting
 */
export async function getModules(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  parent_id?: string | null;
  is_active?: boolean;
  is_visible?: boolean;
  sort_by?: 'code' | 'name' | 'sort_order' | 'created_at';
  sort_order?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.parent_id !== undefined) queryParams.append('parent_id', params.parent_id || '');
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
  if (params?.is_visible !== undefined) queryParams.append('is_visible', params.is_visible.toString());
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return serverFetch<any>(`/modules${query}`);
}

/**
 * Get module by ID
 */
export async function getModuleById(id: string) {
  return serverFetch<any>(`/modules/${id}`);
}

// ============================================
// AUTH API
// ============================================

/**
 * Get current authenticated user (for server components)
 */
export async function getCurrentUser() {
  return serverFetch<any>('/auth/me');
}

/**
 * Check if user is authenticated (has valid token in cookies)
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('gloria_access_token')?.value;
  return !!accessToken;
}
