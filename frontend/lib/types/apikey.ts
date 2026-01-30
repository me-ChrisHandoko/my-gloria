// API Key Types for External API Access (n8n, third-party integrations)

// API Key base interface
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_four_chars: string;
  description?: string | null;
  permissions?: Record<string, unknown> | null;
  rate_limit?: number | null;
  allowed_ips?: string[] | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  usage_count: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
}

// API Key list response (for table display)
export interface ApiKeyListResponse {
  id: string;
  name: string;
  prefix: string;
  last_four_chars: string;
  last_used_at?: string | null;
  usage_count: number;
  expires_at?: string | null;
  is_active: boolean;
}

// API Key created response (includes plain text key - shown only once!)
export interface ApiKeyCreatedResponse extends ApiKey {
  key: string; // Plain text key - ONLY returned during creation!
}

// Create API Key request
export interface CreateApiKeyRequest {
  name: string;
  description?: string | null;
  permissions?: Record<string, unknown> | null;
  rate_limit?: number | null;
  allowed_ips?: string[];
  expires_at?: string | null;
}

// API Key filter for queries
export interface ApiKeyFilter {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  sort_by?: 'name' | 'created_at' | 'last_used_at' | 'usage_count' | 'expires_at';
  sort_order?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedApiKeysResponse {
  data: ApiKeyListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// API response wrapper (for create endpoint)
export interface CreateApiKeyApiResponse {
  message: string;
  data: ApiKeyCreatedResponse;
}

// Helper function to display masked key
export function displayApiKey(prefix: string, lastFour: string): string {
  return `${prefix}_****${lastFour}`;
}

// Helper function to check if key is expired
export function isApiKeyExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

// Helper function to format expiry date
export function formatExpiryDate(expiresAt?: string | null): string {
  if (!expiresAt) return 'Tidak ada';
  const date = new Date(expiresAt);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
