// lib/hooks/useModuleAccess.ts
/**
 * useModuleAccess Hook
 *
 * Check module access and get module permissions.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import {
  PermissionAction,
  ModuleAccessResponse,
  UseModuleAccessResult,
} from '@/lib/types/access';
import {
  selectModules,
  selectIsLoading,
  selectIsInitialized,
} from '@/lib/store/features/rbacSlice';

/**
 * Find a module by code in a hierarchical module structure
 */
function findModule(
  modules: ModuleAccessResponse[],
  moduleCode: string
): ModuleAccessResponse | undefined {
  for (const mod of modules) {
    if (mod.code.toLowerCase() === moduleCode.toLowerCase()) {
      return mod;
    }
    if (mod.children) {
      const found = findModule(mod.children, moduleCode);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Hook to check if the current user has access to a specific module
 *
 * @param moduleCode - The module code to check access for (e.g., 'EMPLOYEES', 'SCHOOLS')
 *
 * @example
 * ```tsx
 * const { hasAccess, permissions, canPerform } = useModuleAccess('EMPLOYEES');
 *
 * if (!hasAccess) return <AccessDenied />;
 *
 * return (
 *   <div>
 *     {canPerform('CREATE') && <CreateButton />}
 *     {canPerform('DELETE') && <DeleteButton />}
 *   </div>
 * );
 * ```
 */
export function useModuleAccess(moduleCode: string): UseModuleAccessResult {
  const modules = useAppSelector(selectModules);
  const isLoading = useAppSelector(selectIsLoading);
  const isInitialized = useAppSelector(selectIsInitialized);

  /**
   * Find the module in the accessible modules list
   */
  const module = useMemo(() => {
    if (!isInitialized) return undefined;
    return findModule(modules, moduleCode);
  }, [modules, moduleCode, isInitialized]);

  /**
   * Check if user has access to the module
   */
  const hasAccess = useMemo(() => {
    return !!module;
  }, [module]);

  /**
   * Get list of permissions user has on this module
   */
  const permissions = useMemo(() => {
    return module?.permissions || [];
  }, [module]);

  /**
   * Check if user can perform a specific action on this module
   */
  const canPerform = useCallback(
    (action: PermissionAction): boolean => {
      if (!module) return false;
      return module.permissions.includes(action);
    },
    [module]
  );

  return {
    hasAccess,
    isLoading: isLoading || !isInitialized,
    module,
    permissions,
    canPerform,
  };
}

/**
 * Hook to check access for multiple modules
 *
 * @example
 * ```tsx
 * const moduleAccess = useModulesAccess(['EMPLOYEES', 'SCHOOLS', 'DEPARTMENTS']);
 *
 * // Get accessible modules
 * const accessibleModules = Object.entries(moduleAccess)
 *   .filter(([_, access]) => access.hasAccess)
 *   .map(([code]) => code);
 * ```
 */
export function useModulesAccess(
  moduleCodes: string[]
): Record<string, UseModuleAccessResult> {
  const modules = useAppSelector(selectModules);
  const isLoading = useAppSelector(selectIsLoading);
  const isInitialized = useAppSelector(selectIsInitialized);

  return useMemo(() => {
    const result: Record<string, UseModuleAccessResult> = {};

    for (const code of moduleCodes) {
      const module = isInitialized ? findModule(modules, code) : undefined;
      const permissions = module?.permissions || [];

      result[code] = {
        hasAccess: !!module,
        isLoading: isLoading || !isInitialized,
        module,
        permissions,
        canPerform: (action: PermissionAction) => permissions.includes(action),
      };
    }

    return result;
  }, [moduleCodes, modules, isLoading, isInitialized]);
}

export default useModuleAccess;
