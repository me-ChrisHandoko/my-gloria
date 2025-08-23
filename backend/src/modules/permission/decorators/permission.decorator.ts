import { SetMetadata } from '@nestjs/common';
import {
  PermissionAction,
  PermissionScope as PrismaPermissionScope,
} from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_SCOPE_KEY = 'permission_scope';
export const PERMISSION_MODE_KEY = 'permission_mode';

/**
 * Decorator to require specific permissions for accessing a route
 * Can be used in two ways:
 * 1. With permission code: @RequirePermission('permission.template.create')
 * 2. With resource/action/scope: @RequirePermission('template', PermissionAction.CREATE, PermissionScope.SYSTEM)
 * 
 * @param resourceOrCode - Either a permission code or the resource being protected
 * @param action - The action being performed (optional if using permission code)
 * @param scope - Optional scope for the permission
 */
export function RequirePermission(permissionCode: string): any;
export function RequirePermission(
  resource: string,
  action: PermissionAction,
  scope?: PrismaPermissionScope,
): any;
export function RequirePermission(
  resourceOrCode: string,
  action?: PermissionAction,
  scope?: PrismaPermissionScope,
): any {
  // If only one parameter is provided, treat it as a permission code
  if (action === undefined) {
    return SetMetadata(PERMISSIONS_KEY, [{ permissionCode: resourceOrCode }]);
  }
  
  // Otherwise, use the traditional resource/action/scope format
  return SetMetadata(PERMISSIONS_KEY, [{ resource: resourceOrCode, action, scope }]);
}

/**
 * Decorator to require multiple permissions (ALL must be satisfied)
 * @param permissions - Array of required permissions
 */
export const RequireAllPermissions = (
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PrismaPermissionScope;
  }>,
) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to require at least one of the specified permissions
 * @param permissions - Array of possible permissions
 */
export const RequireAnyPermission = (
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PrismaPermissionScope;
  }>,
) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(
      target,
      propertyKey!,
      descriptor!,
    );
    SetMetadata(PERMISSION_MODE_KEY, 'ANY')(target, propertyKey!, descriptor!);
    return descriptor;
  };
};

/**
 * Decorator to override the permission scope
 * @param scope - The scope to use for all permission checks
 */
export const SetPermissionScope = (scope: PrismaPermissionScope) =>
  SetMetadata(PERMISSION_SCOPE_KEY, scope);

/**
 * Shorthand decorators for common permission patterns
 */

// CRUD operations
export const CanCreate = (resource: string, scope?: PrismaPermissionScope) =>
  RequirePermission(resource, PermissionAction.CREATE, scope);

export const CanRead = (resource: string, scope?: PrismaPermissionScope) =>
  RequirePermission(resource, PermissionAction.READ, scope);

export const CanUpdate = (resource: string, scope?: PrismaPermissionScope) =>
  RequirePermission(resource, PermissionAction.UPDATE, scope);

export const CanDelete = (resource: string, scope?: PrismaPermissionScope) =>
  RequirePermission(resource, PermissionAction.DELETE, scope);

export const CanApprove = (resource: string, scope?: PrismaPermissionScope) =>
  RequirePermission(resource, PermissionAction.APPROVE, scope);

// Combination decorators
export const CanManage = (resource: string, scope?: PrismaPermissionScope) =>
  RequireAllPermissions([
    { resource, action: PermissionAction.CREATE, scope },
    { resource, action: PermissionAction.READ, scope },
    { resource, action: PermissionAction.UPDATE, scope },
    { resource, action: PermissionAction.DELETE, scope },
  ]);

export const CanView = (resource: string, scope?: PrismaPermissionScope) =>
  RequireAnyPermission([
    { resource, action: PermissionAction.READ, scope },
    { resource, action: PermissionAction.UPDATE, scope },
    { resource, action: PermissionAction.DELETE, scope },
  ]);

export const CanModify = (resource: string, scope?: PrismaPermissionScope) =>
  RequireAnyPermission([
    { resource, action: PermissionAction.UPDATE, scope },
    { resource, action: PermissionAction.DELETE, scope },
  ]);
