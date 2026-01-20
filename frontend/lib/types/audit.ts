// Audit type definitions based on backend models

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'ASSIGN'
  | 'GRANT'
  | 'REVOKE';

export type AuditCategory =
  | 'PERMISSION'
  | 'MODULE'
  | 'WORKFLOW'
  | 'SYSTEM_CONFIG'
  | 'USER_MANAGEMENT'
  | 'DATA_CHANGE'
  | 'SECURITY';

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_profile_id?: string | null;
  actor_name?: string | null;
  action: AuditAction;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_display?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  changed_fields?: string[] | null;
  target_user_id?: string | null;
  target_user_name?: string | null;
  metadata?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  category?: AuditCategory | null;
}

export interface AuditLogListResponse {
  id: string;
  actor_id: string;
  actor_name?: string | null;
  action: AuditAction;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_display?: string | null;
  created_at: string;
  category?: AuditCategory | null;
}

export interface AuditLogResponse extends AuditLog {
  actor?: {
    id: string;
    email: string;
    username?: string | null;
  };
  target_user?: {
    id: string;
    email: string;
    username?: string | null;
  };
}

export interface AuditLogFilter {
  page?: number;
  page_size?: number;
  actor_id?: string;
  action?: AuditAction;
  module?: string;
  entity_type?: string;
  entity_id?: string;
  category?: AuditCategory;
  target_user_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
