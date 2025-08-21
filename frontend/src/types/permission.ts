// Permission Module Types

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE',
  APPROVE = 'APPROVE',
  ASSIGN = 'ASSIGN',
  REVOKE = 'REVOKE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

export enum PermissionScope {
  SYSTEM = 'SYSTEM',
  ORGANIZATION = 'ORGANIZATION',
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
  TEAM = 'TEAM',
  SELF = 'SELF',
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  groupId: string | null;
  isSystem: boolean;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  group?: PermissionGroup;
}

export interface PermissionGroup {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentRoleId: string | null;
  hierarchyLevel: number;
  isSystemRole: boolean;
  isActive: boolean;
  permissions?: RolePermission[];
  parentRole?: Role;
  childRoles?: Role[];
  userRoles?: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  constraints: Record<string, any> | null;
  isInherited: boolean;
  grantedAt: string;
  grantedBy: string;
  role?: Role;
  permission?: Permission;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  schoolId: string | null;
  departmentId: string | null;
  assignedAt: string;
  assignedBy: string;
  expiresAt: string | null;
  isActive: boolean;
  role?: Role;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  grantType: 'DIRECT' | 'ROLE';
  sourceRoleId: string | null;
  constraints: Record<string, any> | null;
  grantedAt: string;
  grantedBy: string;
  expiresAt: string | null;
  isActive: boolean;
  permission?: Permission;
  sourceRole?: Role;
}

// DTOs for API requests
export interface CreatePermissionDto {
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  groupId?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePermissionDto {
  name?: string;
  description?: string;
  groupId?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
  parentRoleId?: string;
  hierarchyLevel: number;
  isActive?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  parentRoleId?: string;
  hierarchyLevel?: number;
  isActive?: boolean;
}

export interface AssignRoleDto {
  userId: string;
  schoolId?: string;
  departmentId?: string;
  expiresAt?: string;
}

export interface RevokeRoleDto {
  userId: string;
}

export interface RolePermissionDto {
  permissionId: string;
  constraints?: Record<string, any>;
}

export interface CheckPermissionDto {
  userId: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  schoolId?: string;
  departmentId?: string;
}

export interface PermissionCheckResultDto {
  hasPermission: boolean;
  source?: 'DIRECT' | 'ROLE' | 'INHERITED';
  roleId?: string;
  roleName?: string;
  constraints?: Record<string, any>;
}

// Filter DTOs
export interface PermissionFilterDto {
  resource?: string;
  action?: PermissionAction;
  scope?: PermissionScope;
  groupId?: string;
  isActive?: boolean;
}

export interface RoleFilterDto {
  hierarchyLevel?: number;
  isSystemRole?: boolean;
  isActive?: boolean;
  includePermissions?: boolean;
}

export interface PermissionGroupFilterDto {
  isActive?: boolean;
  includePermissions?: boolean;
}