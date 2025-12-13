/**
 * Permission Gate Component
 *
 * Declarative component for permission-based UI rendering.
 * Wraps children and only renders them if user has required permissions.
 */

'use client';

import type { PermissionGateProps, RoleGateProps, ModuleGateProps } from '@/types/auth';
import { useMultiplePermissions } from '@/hooks/use-permissions';
import { useMultipleRoles } from '@/hooks/use-role-check';
import { useMultipleModules } from '@/hooks/use-module-access';

/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions.
 * Supports loading and fallback states.
 *
 * @example
 * ```tsx
 * // Single permission
 * <PermissionGate permissions="user:create">
 *   <CreateUserButton />
 * </PermissionGate>
 *
 * // Multiple permissions (require all)
 * <PermissionGate permissions={['user:create', 'user:update']} requireAll={true}>
 *   <UserManagementPanel />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate
 *   permissions="admin:access"
 *   fallback={<AccessDenied />}
 * >
 *   <AdminPanel />
 * </PermissionGate>
 *
 * // With loading state
 * <PermissionGate
 *   permissions="course:read"
 *   loading={<Skeleton />}
 * >
 *   <CourseList />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permissions,
  requireAll = true,
  children,
  fallback = null,
  loading = null,
}: PermissionGateProps) {
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  const { granted, isLoading, isError } = useMultiplePermissions(permissionList, {
    requireAll,
  });

  // Show loading state
  if (isLoading) {
    return <>{loading}</>;
  }

  // Show fallback on error or denied
  if (isError || !granted) {
    return <>{fallback}</>;
  }

  // Render children
  return <>{children}</>;
}

/**
 * RoleGate Component
 *
 * Conditionally renders children based on user roles.
 * Supports loading and fallback states.
 *
 * @example
 * ```tsx
 * // Single role
 * <RoleGate roles="ADMIN">
 *   <AdminDashboard />
 * </RoleGate>
 *
 * // Multiple roles (any)
 * <RoleGate roles={['ADMIN', 'TEACHER']} requireAll={false}>
 *   <StaffArea />
 * </RoleGate>
 *
 * // With fallback
 * <RoleGate
 *   roles="SUPER_ADMIN"
 *   fallback={<AccessDenied />}
 * >
 *   <SuperAdminPanel />
 * </RoleGate>
 *
 * // With loading state
 * <RoleGate
 *   roles="TEACHER"
 *   loading={<Skeleton />}
 * >
 *   <TeacherDashboard />
 * </RoleGate>
 * ```
 */
export function RoleGate({
  roles,
  requireAll = false,
  children,
  fallback = null,
  loading = null,
}: RoleGateProps) {
  const roleList = Array.isArray(roles) ? roles : [roles];

  const { hasRole, isLoading, isError } = useMultipleRoles(roleList, {
    requireAll,
  });

  // Show loading state
  if (isLoading) {
    return <>{loading}</>;
  }

  // Show fallback on error or denied
  if (isError || !hasRole) {
    return <>{fallback}</>;
  }

  // Render children
  return <>{children}</>;
}

/**
 * ModuleGate Component
 *
 * Conditionally renders children based on user module access.
 * Supports loading and fallback states.
 *
 * @example
 * ```tsx
 * // Single module
 * <ModuleGate modules="ACADEMIC">
 *   <AcademicDashboard />
 * </ModuleGate>
 *
 * // Multiple modules (any)
 * <ModuleGate modules={['ACADEMIC', 'FINANCE']} requireAll={false}>
 *   <MultiModuleArea />
 * </ModuleGate>
 *
 * // With fallback
 * <ModuleGate
 *   modules="ADMIN"
 *   fallback={<AccessDenied />}
 * >
 *   <AdminModule />
 * </ModuleGate>
 *
 * // With loading state
 * <ModuleGate
 *   modules="LIBRARY"
 *   loading={<Skeleton />}
 * >
 *   <LibraryModule />
 * </ModuleGate>
 * ```
 */
export function ModuleGate({
  modules,
  requireAll = false,
  children,
  fallback = null,
  loading = null,
}: ModuleGateProps) {
  const moduleList = Array.isArray(modules) ? modules : [modules];

  const { hasAccess, isLoading, isError } = useMultipleModules(moduleList, {
    requireAll,
  });

  // Show loading state
  if (isLoading) {
    return <>{loading}</>;
  }

  // Show fallback on error or denied
  if (isError || !hasAccess) {
    return <>{fallback}</>;
  }

  // Render children
  return <>{children}</>;
}

/**
 * CombinedGate Component
 *
 * Advanced gate that supports checking permissions, roles, and modules together.
 * All checks must pass for children to render.
 *
 * @example
 * ```tsx
 * <CombinedGate
 *   permissions={['user:create', 'user:update']}
 *   roles="ADMIN"
 *   modules="ACADEMIC"
 *   fallback={<AccessDenied />}
 * >
 *   <AdvancedFeature />
 * </CombinedGate>
 * ```
 */
export function CombinedGate({
  permissions,
  roles,
  modules,
  requireAllPermissions = true,
  requireAllRoles = false,
  requireAllModules = false,
  children,
  fallback = null,
  loading = null,
}: {
  permissions?: PermissionGateProps['permissions'];
  roles?: RoleGateProps['roles'];
  modules?: ModuleGateProps['modules'];
  requireAllPermissions?: boolean;
  requireAllRoles?: boolean;
  requireAllModules?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}) {
  const permissionList = permissions
    ? Array.isArray(permissions)
      ? permissions
      : [permissions]
    : [];
  const roleList = roles ? (Array.isArray(roles) ? roles : [roles]) : [];
  const moduleList = modules ? (Array.isArray(modules) ? modules : [modules]) : [];

  const permissionCheck = useMultiplePermissions(permissionList, {
    requireAll: requireAllPermissions,
  });
  const roleCheck = useMultipleRoles(roleList, { requireAll: requireAllRoles });
  const moduleCheck = useMultipleModules(moduleList, {
    requireAll: requireAllModules,
  });

  // Check loading state
  const isLoading =
    (permissionList.length > 0 && permissionCheck.isLoading) ||
    (roleList.length > 0 && roleCheck.isLoading) ||
    (moduleList.length > 0 && moduleCheck.isLoading);

  if (isLoading) {
    return <>{loading}</>;
  }

  // Check error state
  const isError =
    (permissionList.length > 0 && permissionCheck.isError) ||
    (roleList.length > 0 && roleCheck.isError) ||
    (moduleList.length > 0 && moduleCheck.isError);

  if (isError) {
    return <>{fallback}</>;
  }

  // Check all conditions
  const permissionGranted = permissionList.length === 0 || permissionCheck.granted;
  const roleGranted = roleList.length === 0 || roleCheck.hasRole;
  const moduleGranted = moduleList.length === 0 || moduleCheck.hasAccess;

  const allGranted = permissionGranted && roleGranted && moduleGranted;

  if (!allGranted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
