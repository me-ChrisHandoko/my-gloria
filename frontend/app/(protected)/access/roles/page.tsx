// app/(protected)/access/roles/page.tsx
/**
 * Roles Page - Hybrid SSR/CSR Pattern
 *
 * Server-side rendered page that attempts to fetch initial role data.
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

import { getRoles } from "@/lib/server/api";
import RolesClient from "@/components/roles/RolesClient";
import RolesErrorFallback from "@/components/roles/RolesErrorFallback";

// Empty initial data for CSR-only fetching
const EMPTY_INITIAL_DATA = {
  data: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};

export default async function RolesPage() {
  // Fetch initial roles data on server with default params
  let initialData;

  try {
    const response = await getRoles({
      page: 1,
      page_size: 20,
      sort_by: 'code',
      sort_order: 'asc',
    });

    // On auth error: Don't redirect! Let CSR handle token refresh
    // This prevents race condition with token rotation
    if (response.authError) {
      console.log('[Roles Page] Auth error - delegating to CSR for token refresh');
      // Return page with empty data, CSR will fetch after refreshing token
      return <RolesClient initialData={EMPTY_INITIAL_DATA} />;
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Transform response to match PaginatedRolesResponse format
    initialData = {
      data: response.data?.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      page_size: response.data?.page_size || 20,
      total_pages: response.data?.total_pages || 0,
    };
  } catch (error) {
    console.error('[Roles Page] Failed to fetch initial data:', error);

    // Pass only serializable error string to Client Component
    // This prevents React Server/Client Component boundary violations
    return (
      <RolesErrorFallback
        error={error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data role'}
      />
    );
  }

  return <RolesClient initialData={initialData} />;
}

// Revalidate on every request for real-time data
export const revalidate = 0;
