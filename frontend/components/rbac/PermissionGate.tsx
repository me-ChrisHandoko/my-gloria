// components/rbac/PermissionGate.tsx
/**
 * PermissionGate Component
 *
 * Conditional rendering based on user permissions.
 * Shows children only if user has the required permission.
 */

'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { PermissionAction, PermissionScope } from '@/lib/types/access';

interface PermissionGateProps {
  /** Resource to check permission for (e.g., 'employees', 'schools') */
  resource: string;
  /** Action to check (e.g., 'READ', 'CREATE', 'UPDATE', 'DELETE') */
  action: PermissionAction;
  /** Optional scope for resource-level permissions */
  scope?: PermissionScope;
  /** Content to show when user has permission */
  children: ReactNode;
  /** Optional content to show while loading */
  loadingFallback?: ReactNode;
  /** Optional content to show when permission is denied */
  deniedFallback?: ReactNode;
  /** If true, renders nothing when denied instead of deniedFallback */
  hideOnDenied?: boolean;
}

/**
 * Conditionally render content based on user permissions
 *
 * @example
 * ```tsx
 * // Basic usage - hide content if no permission
 * <PermissionGate resource="employees" action="CREATE">
 *   <CreateEmployeeButton />
 * </PermissionGate>
 *
 * // With fallback content
 * <PermissionGate
 *   resource="employees"
 *   action="DELETE"
 *   deniedFallback={<span>You cannot delete employees</span>}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 *
 * // With loading state
 * <PermissionGate
 *   resource="employees"
 *   action="UPDATE"
 *   loadingFallback={<Skeleton />}
 * >
 *   <EditForm />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  resource,
  action,
  scope,
  children,
  loadingFallback = null,
  deniedFallback = null,
  hideOnDenied = false,
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermission(resource, action, scope);

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!hasPermission) {
    if (hideOnDenied) {
      return null;
    }
    return <>{deniedFallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of PermissionGate
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGate resource={resource} action={action} scope={scope} hideOnDenied>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Check multiple permissions - all must pass
 */
interface MultiPermissionGateProps {
  /** List of permissions to check - all must pass */
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
  }>;
  children: ReactNode;
  loadingFallback?: ReactNode;
  deniedFallback?: ReactNode;
  hideOnDenied?: boolean;
}

export function MultiPermissionGate({
  permissions,
  children,
  loadingFallback = null,
  deniedFallback = null,
  hideOnDenied = false,
}: MultiPermissionGateProps) {
  // Use the first permission's hook to get checkPermission function
  const { isLoading, checkPermission } = usePermission(
    permissions[0]?.resource || '',
    permissions[0]?.action || 'READ'
  );

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // Check all permissions
  const hasAllPermissions = permissions.every(({ resource, action, scope }) =>
    checkPermission(resource, action, scope)
  );

  if (!hasAllPermissions) {
    if (hideOnDenied) {
      return null;
    }
    return <>{deniedFallback}</>;
  }

  return <>{children}</>;
}

/**
 * Check multiple permissions - any one must pass
 */
interface AnyPermissionGateProps {
  /** List of permissions to check - any one must pass */
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
  }>;
  children: ReactNode;
  loadingFallback?: ReactNode;
  deniedFallback?: ReactNode;
  hideOnDenied?: boolean;
}

export function AnyPermissionGate({
  permissions,
  children,
  loadingFallback = null,
  deniedFallback = null,
  hideOnDenied = false,
}: AnyPermissionGateProps) {
  const { isLoading, checkPermission } = usePermission(
    permissions[0]?.resource || '',
    permissions[0]?.action || 'READ'
  );

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // Check if any permission passes
  const hasAnyPermission = permissions.some(({ resource, action, scope }) =>
    checkPermission(resource, action, scope)
  );

  if (!hasAnyPermission) {
    if (hideOnDenied) {
      return null;
    }
    return <>{deniedFallback}</>;
  }

  return <>{children}</>;
}

export default PermissionGate;
