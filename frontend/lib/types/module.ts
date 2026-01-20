// Module type definitions based on backend models

export type ModuleCategory =
  | 'SERVICE'
  | 'PERFORMANCE'
  | 'QUALITY'
  | 'FEEDBACK'
  | 'TRAINING'
  | 'SYSTEM';

export interface Module {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  description?: string | null;
  icon?: string | null;
  path?: string | null;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
  parent?: ModuleListResponse | null;
  children?: ModuleListResponse[];
}

export interface ModuleListResponse {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  icon?: string | null;
  path?: string | null;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
}

export interface ModuleTreeResponse {
  id: string;
  code: string;
  name: string;
  category: ModuleCategory;
  icon?: string | null;
  path?: string | null;
  sort_order: number;
  is_active: boolean;
  children?: ModuleTreeResponse[];
}

export interface RoleModuleAccess {
  id: string;
  role_id: string;
  module_id: string;
  position_id?: string | null;
  permissions: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  role?: {
    id: string;
    code: string;
    name: string;
  };
  module?: ModuleListResponse;
}

export interface RoleModuleAccessResponse {
  id: string;
  role_id: string;
  module_id: string;
  position_id?: string | null;
  permissions: Record<string, any>;
  is_active: boolean;
  module?: ModuleListResponse;
}

export interface UserModuleAccess {
  id: string;
  user_id: string;
  module_id: string;
  permissions: Record<string, any>;
  granted_by: string;
  reason?: string | null;
  is_active: boolean;
  effective_from: string;
  effective_until?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revoke_reason?: string | null;
  created_at: string;
  updated_at: string;
  module?: ModuleListResponse;
  granted_by_user?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface UserModuleAccessResponse {
  id: string;
  user_id: string;
  module_id: string;
  permissions: Record<string, any>;
  granted_by: string;
  reason?: string | null;
  is_active: boolean;
  effective_from: string;
  effective_until?: string | null;
  module?: ModuleListResponse;
}

export interface CreateModuleRequest {
  code: string;
  name: string;
  category: ModuleCategory;
  description?: string | null;
  icon?: string | null;
  path?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_visible?: boolean;
}

export interface UpdateModuleRequest {
  code?: string;
  name?: string;
  category?: ModuleCategory;
  description?: string | null;
  icon?: string | null;
  path?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_visible?: boolean;
}

export interface AssignModuleToRoleRequest {
  module_id: string;
  position_id?: string | null;
  permissions: Record<string, any>;
  is_active?: boolean;
}

export interface GrantModuleAccessToUserRequest {
  module_id: string;
  permissions: Record<string, any>;
  reason?: string | null;
  effective_from?: string;
  effective_until?: string | null;
}

export interface ModuleFilter {
  page?: number;
  page_size?: number;
  search?: string;
  category?: ModuleCategory;
  parent_id?: string | null;
  is_active?: boolean;
  is_visible?: boolean;
  sort_by?: 'code' | 'name' | 'sort_order' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedModulesResponse {
  data: ModuleListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
