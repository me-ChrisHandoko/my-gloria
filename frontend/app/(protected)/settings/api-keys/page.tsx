// app/(protected)/settings/api-keys/page.tsx
/**
 * API Keys Management Page
 *
 * Allows users to manage their API keys for external integrations (n8n, etc.)
 * Pure CSR pattern since this is user-specific data with no SEO requirements.
 */

import ApiKeysClient from "@/components/api-keys/ApiKeysClient";

export default function ApiKeysPage() {
  return <ApiKeysClient />;
}

// Disable caching for user-specific data
export const dynamic = 'force-dynamic';
