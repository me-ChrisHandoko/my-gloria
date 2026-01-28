// components/rbac/RouteGuard.tsx
/**
 * Route Guard Component
 *
 * Protects entire pages based on module access or specific permissions.
 * Shows loading state while checking, then renders content or access denied.
 */

"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

import { usePermission } from "@/lib/hooks/usePermission";
import { useModuleAccess } from "@/lib/hooks/useModuleAccess";
import { PermissionAction } from "@/lib/types/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface RouteGuardProps {
  children: ReactNode;
  /** Module code to check access for */
  module?: string;
  /** Resource name for permission check */
  resource?: string;
  /** Required action for resource access */
  action?: PermissionAction;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom access denied component */
  accessDeniedComponent?: ReactNode;
  /** Redirect URL when access denied (optional) */
  redirectTo?: string;
  /** Whether to show back button on access denied */
  showBackButton?: boolean;
}

/**
 * Default Access Denied Component
 */
function AccessDenied({
  showBackButton = true,
  resource,
  module
}: {
  showBackButton?: boolean;
  resource?: string;
  module?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Akses Ditolak</CardTitle>
          <CardDescription>
            Anda tidak memiliki izin untuk mengakses {module ? `modul ${module}` : resource ? `resource ${resource}` : 'halaman ini'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {showBackButton && (
            <Button variant="outline" onClick={() => router.back()} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          )}
          <Button variant="default" onClick={() => router.push("/dashboard")} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Ke Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Default Loading Component
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner />
        <p className="text-muted-foreground text-sm">Memeriksa akses...</p>
      </div>
    </div>
  );
}

/**
 * Route Guard - Module-based access control
 */
export function ModuleRouteGuard({
  children,
  module,
  loadingComponent,
  accessDeniedComponent,
  redirectTo,
  showBackButton = true,
}: Omit<RouteGuardProps, 'resource' | 'action'> & { module: string }) {
  const router = useRouter();
  const { hasAccess, isLoading } = useModuleAccess(module);

  // Show loading state
  if (isLoading) {
    return <>{loadingComponent || <LoadingState />}</>;
  }

  // Redirect if specified
  if (!hasAccess && redirectTo) {
    router.replace(redirectTo);
    return <>{loadingComponent || <LoadingState />}</>;
  }

  // Show access denied
  if (!hasAccess) {
    return <>{accessDeniedComponent || <AccessDenied showBackButton={showBackButton} module={module} />}</>;
  }

  return <>{children}</>;
}

/**
 * Route Guard - Permission-based access control
 */
export function PermissionRouteGuard({
  children,
  resource,
  action = "READ",
  loadingComponent,
  accessDeniedComponent,
  redirectTo,
  showBackButton = true,
}: Omit<RouteGuardProps, 'module'> & { resource: string }) {
  const router = useRouter();
  const { hasPermission, isLoading } = usePermission(resource, action);

  // Show loading state
  if (isLoading) {
    return <>{loadingComponent || <LoadingState />}</>;
  }

  // Redirect if specified
  if (!hasPermission && redirectTo) {
    router.replace(redirectTo);
    return <>{loadingComponent || <LoadingState />}</>;
  }

  // Show access denied
  if (!hasPermission) {
    return <>{accessDeniedComponent || <AccessDenied showBackButton={showBackButton} resource={resource} />}</>;
  }

  return <>{children}</>;
}

/**
 * Generic Route Guard - Supports both module and permission checks
 */
export function RouteGuard({
  children,
  module,
  resource,
  action = "READ",
  loadingComponent,
  accessDeniedComponent,
  redirectTo,
  showBackButton = true,
}: RouteGuardProps) {
  // If module is specified, use module-based guard
  if (module) {
    return (
      <ModuleRouteGuard
        module={module}
        loadingComponent={loadingComponent}
        accessDeniedComponent={accessDeniedComponent}
        redirectTo={redirectTo}
        showBackButton={showBackButton}
      >
        {children}
      </ModuleRouteGuard>
    );
  }

  // If resource is specified, use permission-based guard
  if (resource) {
    return (
      <PermissionRouteGuard
        resource={resource}
        action={action}
        loadingComponent={loadingComponent}
        accessDeniedComponent={accessDeniedComponent}
        redirectTo={redirectTo}
        showBackButton={showBackButton}
      >
        {children}
      </PermissionRouteGuard>
    );
  }

  // No guard specified, render children
  return <>{children}</>;
}

export default RouteGuard;
