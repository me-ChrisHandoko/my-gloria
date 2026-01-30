// lib/auth/ProtectedRoute.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { clearRbac } from '@/lib/store/features/rbacSlice';
import {
  useLazyGetUserModulesQuery,
  useLazyGetUserPermissionsQuery,
} from '@/lib/store/services/accessApi';
import { ModuleAccessResponse } from '@/lib/types/access';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Routes that don't require module access check (always accessible when authenticated)
const PUBLIC_AUTHENTICATED_ROUTES = [
  '/profile',
  '/change-password',
  '/unauthorized',
];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Check if a path is accessible based on user's modules
 * Returns true if user has access to the module that matches the path
 */
function isPathAccessible(pathname: string, modules: ModuleAccessResponse[]): boolean {
  // Check if path is a public authenticated route
  if (PUBLIC_AUTHENTICATED_ROUTES.some(route => pathname.startsWith(route))) {
    return true;
  }

  // Flatten all modules including children
  const flattenModules = (mods: ModuleAccessResponse[]): ModuleAccessResponse[] => {
    const result: ModuleAccessResponse[] = [];
    for (const mod of mods) {
      result.push(mod);
      if (mod.children) {
        result.push(...flattenModules(mod.children));
      }
    }
    return result;
  };

  const allModules = flattenModules(modules);

  // Check if any module's path matches the current pathname
  for (const mod of allModules) {
    if (mod.path) {
      // Exact match or pathname starts with module path
      if (pathname === mod.path || pathname.startsWith(mod.path + '/')) {
        return true;
      }
    }
  }

  return false;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading: isAuthLoading, isInitialized } = useAppSelector((state) => state.auth);
  const { modules, modulesLastFetched, permissionsLastFetched } = useAppSelector((state) => state.rbac);
  const [isMounted, setIsMounted] = useState(false);

  // Lazy queries for fetching RBAC data
  const [fetchModules, { isLoading: isLoadingModules }] = useLazyGetUserModulesQuery();
  const [fetchPermissions, { isLoading: isLoadingPermissions }] = useLazyGetUserPermissionsQuery();

  // Only render after component is mounted on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to login if not authenticated
  // IMPORTANT: Wait for isInitialized to prevent race condition with localStorage restore
  useEffect(() => {
    if (isMounted && isInitialized && !isAuthLoading && !isAuthenticated) {
      // Clear RBAC data on logout
      dispatch(clearRbac());
      router.push('/login');
    }
  }, [isMounted, isInitialized, isAuthLoading, isAuthenticated, router, dispatch]);

  // Fetch RBAC data when authenticated (only once per session)
  useEffect(() => {
    if (isMounted && isAuthenticated && !isAuthLoading) {
      // Fetch modules if not already fetched
      if (!modulesLastFetched) {
        fetchModules();
      }
      // Fetch permissions if not already fetched
      if (!permissionsLastFetched) {
        fetchPermissions();
      }
    }
  }, [
    isMounted,
    isAuthenticated,
    isAuthLoading,
    modulesLastFetched,
    permissionsLastFetched,
    fetchModules,
    fetchPermissions,
  ]);

  // Check module access for current path
  const hasModuleAccess = useMemo(() => {
    // Still loading - allow temporarily
    if (!modulesLastFetched) {
      return true;
    }
    // Modules loaded - check access
    return isPathAccessible(pathname, modules);
  }, [pathname, modules, modulesLastFetched]);

  // Redirect to unauthorized if no module access
  useEffect(() => {
    if (isMounted && isAuthenticated && modulesLastFetched && !hasModuleAccess) {
      router.push('/unauthorized');
    }
  }, [isMounted, isAuthenticated, modulesLastFetched, hasModuleAccess, router]);

  // Check if RBAC data has been fetched (not just loading)
  // This fixes race condition where isLoadingModules/isLoadingPermissions are false
  // before the lazy queries are triggered, causing children to render with empty permissionCache
  const rbacInitialized = modulesLastFetched !== null && permissionsLastFetched !== null;

  // Combined loading state - wait for both auth AND rbac initialization
  const isLoading = !isInitialized || isAuthLoading || isLoadingModules || isLoadingPermissions || !rbacInitialized;

  // Show loading on server-side render, initial client mount, or while initializing auth
  if (!isMounted || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (!hasModuleAccess) {
    return null; // Will redirect to unauthorized in useEffect
  }

  return <>{children}</>;
}
