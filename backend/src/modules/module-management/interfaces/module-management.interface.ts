import { ModuleCategory, PermissionAction } from '@prisma/client';

/**
 * Core Module type from Prisma with strict typing
 */
export interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: ModuleCategory;
  icon: string | null;
  path: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  requiredPlan: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Module with relationships
 */
export interface ModuleWithRelations extends Module {
  parent?: Module | null;
  children?: Module[];
  permissions?: ModulePermission[];
  roleAccess?: RoleModuleAccess[];
  userAccess?: UserModuleAccess[];
  overrides?: UserOverride[];
}

/**
 * Module hierarchy tree structure
 */
export interface ModuleTreeNode extends Module {
  children: ModuleTreeNode[];
  level: number;
  hasAccess?: boolean;
  permissions?: PermissionAction[];
}

/**
 * Module permission
 */
export interface ModulePermission {
  id: string;
  moduleId: string;
  action: PermissionAction;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  module?: Module;
}

/**
 * Role module access
 */
export interface RoleModuleAccess {
  id: string;
  roleId: string;
  moduleId: string;
  positionId: string | null;
  permissions: PermissionAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: Role;
  module?: Module;
  position?: Position;
}

/**
 * User module access
 */
export interface UserModuleAccess {
  id: string;
  userProfileId: string;
  moduleId: string;
  permissions: PermissionAction[];
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  userProfile?: UserProfile;
  module?: Module;
}

/**
 * User override
 */
export interface UserOverride {
  id: string;
  userProfileId: string;
  moduleId: string;
  permissionType: PermissionAction;
  isGranted: boolean;
  validFrom: Date;
  validUntil: Date | null;
  reason: string;
  grantedBy: string;
  createdAt: Date;
  updatedAt: Date;
  userProfile?: UserProfile;
  module?: Module;
}

/**
 * Role type
 */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isSystemRole: boolean;
  hierarchy: number;
  maxUsers: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Position type
 */
export interface Position {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  reportsToId: string | null;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User profile type
 */
export interface UserProfile {
  id: string;
  clerkUserId: string;
  nip: string;
  karyawanId?: string | null;
  email?: string;
  name?: string | null;
  isSuperadmin: boolean;
  isActive: boolean;
  lastActive: Date | null;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

/**
 * User role relation
 */
export interface UserRole {
  id: string;
  userProfileId: string;
  roleId: string;
  positionId: string | null;
  assignedAt: Date;
  expiresAt: Date | null;
  assignedBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userProfile?: UserProfile;
  role?: Role;
  position?: Position;
}

/**
 * Module access summary for a user
 */
export interface UserModulePermissionSummary {
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  permissions: PermissionAction[];
  source: 'ROLE' | 'USER' | 'OVERRIDE';
  validUntil?: Date | null;
}

/**
 * Bulk module access result
 */
export interface BulkModuleAccessResult {
  success: string[];
  failed: Array<{
    moduleId: string;
    error: string;
  }>;
  totalProcessed: number;
}

/**
 * Module query parameters
 */
export interface ModuleQueryParams {
  isActive?: boolean;
  category?: ModuleCategory;
  parentId?: string | null;
  includeChildren?: boolean;
  includePermissions?: boolean;
  includeAccess?: boolean;
  search?: string;
  userId?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Type guards
 */
export function isModule(obj: unknown): obj is Module {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'code' in obj &&
    'name' in obj &&
    'category' in obj &&
    typeof (obj as Module).id === 'string' &&
    typeof (obj as Module).code === 'string' &&
    typeof (obj as Module).name === 'string'
  );
}

export function isModuleWithRelations(
  obj: unknown,
): obj is ModuleWithRelations {
  return isModule(obj);
}

export function isRoleModuleAccess(obj: unknown): obj is RoleModuleAccess {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'roleId' in obj &&
    'moduleId' in obj &&
    'permissions' in obj &&
    Array.isArray((obj as RoleModuleAccess).permissions)
  );
}

export function isUserModuleAccess(obj: unknown): obj is UserModuleAccess {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userProfileId' in obj &&
    'moduleId' in obj &&
    'permissions' in obj &&
    Array.isArray((obj as UserModuleAccess).permissions)
  );
}

export function isUserOverride(obj: unknown): obj is UserOverride {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userProfileId' in obj &&
    'moduleId' in obj &&
    'permissionType' in obj &&
    'isGranted' in obj &&
    typeof (obj as UserOverride).isGranted === 'boolean'
  );
}

/**
 * Permission aggregation helper
 */
export function aggregatePermissions(
  rolePermissions: PermissionAction[],
  userPermissions: PermissionAction[],
  overrides: UserOverride[],
): PermissionAction[] {
  const permissionSet = new Set<PermissionAction>([
    ...rolePermissions,
    ...userPermissions,
  ]);

  // Apply overrides
  overrides.forEach((override) => {
    if (override.isGranted) {
      permissionSet.add(override.permissionType);
    } else {
      permissionSet.delete(override.permissionType);
    }
  });

  return Array.from(permissionSet);
}

/**
 * Check if a date range is valid
 */
export function isDateRangeValid(
  validFrom?: Date | null,
  validUntil?: Date | null,
): boolean {
  const now = new Date();

  if (validFrom && validFrom > now) {
    return false;
  }

  if (validUntil && validUntil < now) {
    return false;
  }

  return true;
}
