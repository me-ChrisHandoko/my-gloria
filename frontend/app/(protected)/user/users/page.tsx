// app/(protected)/users/page.tsx
/**
 * Users Page - Hybrid SSR/CSR Pattern
 *
 * Server-side rendered page that attempts to fetch initial users data.
 * If auth fails (401), delegates to client-side for token refresh.
 *
 * Flow:
 * 1. SSR tries to fetch data with current access token
 * 2. If success → pass data to client component (fast initial load)
 * 3. If 401 → pass empty data, CSR will refresh token and fetch
 * 4. CSR handles all subsequent data fetching and auth refresh
 *
 * Benefits:
 * - Fast initial load when token is valid
 * - No race condition with token rotation (CSR handles refresh)
 * - Seamless UX (no redirect on token expiry)
 */

import { getUsers } from "@/lib/server/api";
import UsersClient from "@/components/users/UsersClient";
import UsersErrorFallback from "@/components/users/UsersErrorFallback";

// Empty initial data for CSR-only fetching
const EMPTY_INITIAL_DATA = {
  data: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};

export default async function UsersPage() {
  // Fetch initial users data on server with default params
  let initialData;

  try {
    const response = await getUsers({
      page: 1,
      page_size: 20,
      sort_by: 'email',
      sort_order: 'asc',
    });

    // On auth error: Don't redirect! Let CSR handle token refresh
    // This prevents race condition with token rotation
    if (response.authError) {
      console.log('[Users Page] Auth error - delegating to CSR for token refresh');
      // Return page with empty data, CSR will fetch after refreshing token
      return <UsersClient initialData={EMPTY_INITIAL_DATA} />;
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Transform response to match PaginatedUsersResponse format
    initialData = {
      data: response.data?.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      page_size: response.data?.page_size || 20,
      total_pages: response.data?.total_pages || 0,
    };
  } catch (error) {
    console.error('[Users Page] Failed to fetch initial data:', error);

    // Pass only serializable error string to Client Component
    // This prevents React Server/Client Component boundary violations
    return (
      <UsersErrorFallback
        error={error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data pengguna'}
      />
    );
  }

  return <UsersClient initialData={initialData} />;
}

// Revalidate on every request for real-time data
export const revalidate = 0;
