// Permission Types

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'assign'
  | 'revoke'
  | 'approve'
  | 'execute';

export type PermissionScope =
  | 'own'
  | 'department'
  | 'school'
  | 'organization'
  | 'all';

export type ModuleCategory =
  | 'core'
  | 'hr'
  | 'academic'
  | 'finance'
  | 'report'
  | 'admin';

// Permission base interface
export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope | null;
  conditions?: string | null;
  metadata?: string | null;
  is_system_permission: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  category?: ModuleCategory | null;
  group_icon?: string | null;
  group_name?: string | null;
  group_sort_order?: number | null;
}

// Permission list response (for dropdown/table)
export interface PermissionListResponse {
  id: string;
  code: string;
  name: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope | null;
  is_system_permission: boolean;
  is_active: boolean;
}

// Grouped permissions for UI
export interface PermissionGroupResponse {
  group_name: string;
  group_icon?: string | null;
  sort_order: number;
  permissions: PermissionListResponse[];
}

// Requests for permission operations
export interface CreatePermissionRequest {
  code: string;
  name: string;
  description?: string | null;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope | null;
  conditions?: string | null;
  metadata?: string | null;
  is_system_permission?: boolean;
  category?: ModuleCategory | null;
  group_icon?: string | null;
  group_name?: string | null;
  group_sort_order?: number | null;
}

export interface UpdatePermissionRequest {
  code?: string;
  name?: string;
  description?: string | null;
  resource?: string;
  action?: PermissionAction;
  scope?: PermissionScope | null;
  conditions?: string | null;
  metadata?: string | null;
  is_active?: boolean;
  category?: ModuleCategory | null;
  group_icon?: string | null;
  group_name?: string | null;
  group_sort_order?: number | null;
}

// Permission filter for queries
export interface PermissionFilter {
  page?: number;
  page_size?: number;
  search?: string;
  resource?: string;
  action?: PermissionAction;
  scope?: PermissionScope;
  category?: ModuleCategory;
  is_active?: boolean;
  is_system_permission?: boolean;
  sort_by?: 'code' | 'name' | 'resource' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedPermissionsResponse {
  data: PermissionListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
