// app/(protected)/organization/positions/page.tsx
/**
 * Positions Page - Hybrid SSR/CSR Pattern
 *
 * Server-side rendered page that attempts to fetch initial position data.
 * If auth fails (401), delegates to client-side for token refresh.
 *
 * Flow:
 * 1. SSR tries to fetch data with current access token
 * 2. If success → pass data to client component (fast initial load)
 * 3. If 401 → pass empty data, CSR will refresh token and fetch
 * 4. CSR handles all subsequent data fetching and auth refresh
 */

import { getPositions } from "@/lib/server/api";
import PositionsClient from "@/components/positions/PositionsClient";
import PositionsErrorFallback from "@/components/positions/PositionsErrorFallback";

// Empty initial data for CSR-only fetching
const EMPTY_INITIAL_DATA = {
  data: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};

export default async function PositionsPage() {
  // Fetch initial positions data on server with default params
  let initialData;

  try {
    const response = await getPositions({
      page: 1,
      page_size: 20,
      sort_by: 'code',
      sort_order: 'asc',
    });

    // On auth error: Don't redirect! Let CSR handle token refresh
    // This prevents race condition between SSR and CSR token rotation
    if (response.authError) {
      console.log('[Positions Page] Auth error - delegating to CSR for token refresh');
      // Return page with empty data, CSR will fetch after refreshing token
      return <PositionsClient initialData={EMPTY_INITIAL_DATA} />;
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Transform response to match PaginatedPositionsResponse format
    initialData = {
      data: response.data?.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      page_size: response.data?.page_size || 20,
      total_pages: response.data?.total_pages || 0,
    };
  } catch (error) {
    console.error('[Positions Page] Failed to fetch initial data:', error);

    // Pass only serializable error string to Client Component
    // This prevents React Server/Client Component boundary violations
    return (
      <PositionsErrorFallback
        error={error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data posisi'}
      />
    );
  }

  return <PositionsClient initialData={initialData} />;
}

// Revalidate on every request for real-time data
export const revalidate = 0;
