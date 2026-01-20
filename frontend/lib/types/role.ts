// Role and Permission Management Types

import { PermissionListResponse } from './permission';

// Role base interface
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  hierarchy_level: number;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// Role list response (for dropdown/table)
export interface RoleListResponse {
  id: string;
  code: string;
  name: string;
  hierarchy_level: number;
  is_system_role: boolean;
  is_active: boolean;
}

// Role with permissions
export interface RoleWithPermissions extends Role {
  permissions?: PermissionListResponse[];
}

// Role hierarchy
export interface RoleHierarchy {
  id: string;
  role_id: string;
  parent_role_id: string;
  inherit_permissions: boolean;
  created_at: string;
  updated_at: string;
}

// Role permission assignment
export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  is_granted: boolean;
  conditions?: string | null;
  granted_by?: string | null;
  grant_reason?: string | null;
  created_at: string;
  updated_at: string;
  effective_from: string;
  effective_until?: string | null;
}

// Requests for role operations
export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string | null;
  hierarchy_level: number;
  is_system_role?: boolean;
}

export interface UpdateRoleRequest {
  code?: string;
  name?: string;
  description?: string | null;
  hierarchy_level?: number;
  is_active?: boolean;
}

// Permission assignment to role
export interface AssignPermissionToRoleRequest {
  permission_id: string;
  is_granted?: boolean;
  conditions?: string | null;
  grant_reason?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
}

// Role filter for queries
export interface RoleFilter {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  is_system_role?: boolean;
  hierarchy_level?: number;
  sort_by?: 'code' | 'name' | 'hierarchy_level' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedRolesResponse {
  data: RoleListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
