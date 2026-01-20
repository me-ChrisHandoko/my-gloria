// User Management Types

import { RoleListResponse } from './role';
import { PositionListResponse } from './organization';

// User base interface
export interface User {
  id: string;
  email: string;
  username?: string | null;
  email_verified: boolean;
  is_active: boolean;
  last_active?: string | null;
  preferences?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  roles?: RoleListResponse[];
  positions?: UserPositionResponse[];
  data_karyawan?: DataKaryawanInfo | null;
}

// User list response (for table view)
export interface UserListResponse {
  id: string;
  email: string;
  username?: string | null;
  name?: string | null;
  is_active: boolean;
  email_verified: boolean;
  last_active?: string | null;
}

// User Role assignment
export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string | null;
  is_active: boolean;
  effective_from: string;
  effective_until?: string | null;
}

export interface UserRoleResponse {
  id: string;
  role_id: string;
  role?: RoleListResponse;
  assigned_at: string;
  assigned_by?: string | null;
  is_active: boolean;
  effective_from: string;
  effective_until?: string | null;
}

// User Position assignment
export interface UserPosition {
  id: string;
  user_id: string;
  position_id: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  is_plt: boolean;
  appointed_by?: string | null;
  sk_number?: string | null;
  notes?: string | null;
  permission_scope?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPositionResponse {
  id: string;
  position_id: string;
  position?: PositionListResponse;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  is_plt: boolean;
  sk_number?: string | null;
  permission_scope?: string | null;
}

// Data Karyawan info for user
export interface DataKaryawanInfo {
  nip: string;
  firstname: string;
  lastname: string;
  full_name: string;
  departemen?: string | null;
  jabatan?: string | null;
  jenis_karyawan?: string | null;
  // Legacy field names for backward compatibility
  nama?: string | null;
  bagian_kerja?: string | null;
  bidang_kerja?: string | null;
}

// Requests for user operations
export interface CreateUserRequest {
  email: string;
  password: string;
  username?: string | null;
  preferences?: Record<string, any> | null;
}

export interface UpdateUserRequest {
  username?: string | null;
  is_active?: boolean;
  preferences?: Record<string, any> | null;
}

// Role assignment requests
export interface AssignRoleToUserRequest {
  role_id: string;
  effective_from?: string | null;
  effective_until?: string | null;
}

// Position assignment requests
export interface AssignPositionToUserRequest {
  position_id: string;
  start_date: string;
  end_date?: string | null;
  is_plt?: boolean;
  sk_number?: string | null;
  notes?: string | null;
  permission_scope?: string | null;
}

// User filter for queries
export interface UserFilter {
  page?: number;
  page_size?: number;
  search?: string;
  role_id?: string;
  is_active?: boolean;
  email_verified?: boolean;
  sort_by?: 'email' | 'created_at' | 'last_active' | 'username';
  sort_order?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedUsersResponse {
  data: UserListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
