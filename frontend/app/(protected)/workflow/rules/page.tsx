// app/(protected)/workflow/rules/page.tsx
/**
 * Workflow Rules Page - Hybrid SSR/CSR Pattern
 *
 * Server-side rendered page that attempts to fetch initial workflow rules data.
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

import { getWorkflowRules } from "@/lib/server/api";
import WorkflowRulesClient from "@/components/workflow-rules/WorkflowRulesClient";
import WorkflowRulesErrorFallback from "@/components/workflow-rules/WorkflowRulesErrorFallback";

// Empty initial data for CSR-only fetching
const EMPTY_INITIAL_DATA = {
  data: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};

export default async function WorkflowRulesPage() {
  // Fetch initial workflow rules data on server with default params
  let initialData;

  try {
    const response = await getWorkflowRules({
      page: 1,
      page_size: 20,
      sort_by: 'priority',
      sort_order: 'asc',
    });

    // On auth error: Don't redirect! Let CSR handle token refresh
    // This prevents race condition between SSR and CSR token rotation
    if (response.authError) {
      console.log('[Workflow Rules Page] Auth error - delegating to CSR for token refresh');
      // Return page with empty data, CSR will fetch after refreshing token
      return <WorkflowRulesClient initialData={EMPTY_INITIAL_DATA} />;
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Transform response to match PaginatedWorkflowRulesResponse format
    initialData = {
      data: response.data?.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      page_size: response.data?.page_size || 20,
      total_pages: response.data?.total_pages || 0,
    };
  } catch (error) {
    console.error('[Workflow Rules Page] Failed to fetch initial data:', error);

    // Pass only serializable error string to Client Component
    // This prevents React Server/Client Component boundary violations
    return (
      <WorkflowRulesErrorFallback
        error={error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data aturan workflow'}
      />
    );
  }

  return <WorkflowRulesClient initialData={initialData} />;
}

// Revalidate on every request for real-time data
export const revalidate = 0;
