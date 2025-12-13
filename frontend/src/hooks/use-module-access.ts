/**
 * Module Access Hook
 *
 * Provides utilities for checking user module access in React components.
 * Integrates with the current user context from Redux store.
 */

'use client';

import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';
import type {
  Module,
  ModuleCode,
  ModuleAccessOptions,
  ModuleAccessResult,
  AuthError,
  AuthErrorType,
} from '@/types/auth';

/**
 * Hook for checking user module access
 *
 * @example
 * ```tsx
 * function AcademicModule() {
 *   const { hasAccess } = useModuleAccess();
 *
 *   if (!hasAccess('ACADEMIC')) {
 *     return <AccessDenied />;
 *   }
 *
 *   return <AcademicDashboard />;
 * }
 * ```
 */
export function useModuleAccess() {
  const { modules, isLoading, isError } = useCurrentUser();

  /**
   * Check if user has access to a specific module
   *
   * @param moduleCode - Module code to check (e.g., "ACADEMIC", "FINANCE")
   * @returns true if user has access, false otherwise
   *
   * @example
   * ```tsx
   * const canAccessAcademic = hasAccess('ACADEMIC');
   * const canAccessFinance = hasAccess('FINANCE');
   * ```
   */
  const hasAccess = useMemo(() => {
    return (moduleCode: ModuleCode): boolean => {
      if (isLoading || isError || !modules) {
        return false;
      }

      return modules.some((m: any) => m.code === moduleCode && m.is_active);
    };
  }, [modules, isLoading, isError]);

  /**
   * Check if user has access to any of the specified modules
   *
   * @param moduleList - Array of module codes
   * @returns true if user has access to at least one module, false otherwise
   *
   * @example
   * ```tsx
   * const hasAdminAccess = hasAnyAccess(['ADMIN', 'SUPER_ADMIN']);
   * ```
   */
  const hasAnyAccess = useMemo(() => {
    return (moduleList: ModuleCode[]): boolean => {
      if (isLoading || isError || !modules) {
        return false;
      }

      return moduleList.some((moduleCode: string) =>
        modules.some((m: any) => m.code === moduleCode && m.is_active)
      );
    };
  }, [modules, isLoading, isError]);

  /**
   * Check if user has access to all of the specified modules
   *
   * @param moduleList - Array of module codes
   * @returns true if user has access to all modules, false otherwise
   *
   * @example
   * ```tsx
   * const hasFullAccess = hasAllAccess(['ACADEMIC', 'FINANCE', 'HR']);
   * ```
   */
  const hasAllAccess = useMemo(() => {
    return (moduleList: ModuleCode[]): boolean => {
      if (isLoading || isError || !modules) {
        return false;
      }

      return moduleList.every((moduleCode: string) =>
        modules.some((m: any) => m.code === moduleCode && m.is_active)
      );
    };
  }, [modules, isLoading, isError]);

  /**
   * Advanced module access check with options
   *
   * @param moduleList - Single module or array of modules
   * @param options - Check options (requireAll, throwOnDenied, etc.)
   * @returns Module access result with accessible modules
   *
   * @example
   * ```tsx
   * // Check single module
   * const result = checkAccess('ACADEMIC');
   *
   * // Check multiple modules (require all)
   * const result = checkAccess(['ACADEMIC', 'FINANCE'], { requireAll: true });
   *
   * // Check with throw on denied
   * try {
   *   checkAccess('ADMIN', { throwOnDenied: true });
   * } catch (error) {
   *   console.error('Access denied:', error);
   * }
   * ```
   */
  const checkAccess = useMemo(() => {
    return (
      moduleList: ModuleCode | ModuleCode[],
      options: ModuleAccessOptions = {}
    ): ModuleAccessResult => {
      const {
        requireAll = false,
        throwOnDenied = false,
        deniedMessage = 'Module access denied',
      } = options;

      // Handle loading state
      if (isLoading) {
        return {
          hasAccess: false,
          modules: [],
          reason: 'Checking module access...',
        };
      }

      // Handle error state
      if (isError) {
        return {
          hasAccess: false,
          modules: [],
          reason: 'Failed to load modules',
        };
      }

      // Handle missing modules
      if (!modules) {
        return {
          hasAccess: false,
          modules: [],
          reason: 'No modules available',
        };
      }

      // Normalize to array
      const modulesToCheck = Array.isArray(moduleList) ? moduleList : [moduleList];

      // Empty array check
      if (modulesToCheck.length === 0) {
        return { hasAccess: true, modules: [] };
      }

      // Find accessible modules
      const accessibleModules = modules.filter(
        (m: any) => modulesToCheck.includes(m.code as ModuleCode) && m.is_active
      );

      // Check if requirement is met
      const hasAccess = requireAll
        ? accessibleModules.length === modulesToCheck.length
        : accessibleModules.length > 0;

      // Build result
      const result: ModuleAccessResult = {
        hasAccess,
        modules: accessibleModules,
        reason: hasAccess
          ? undefined
          : `Missing access to required module${modulesToCheck.length > 1 ? 's' : ''}: ${modulesToCheck.join(', ')}`,
      };

      // Throw if requested
      if (!hasAccess && throwOnDenied) {
        const error: AuthError = {
          name: 'AuthError',
          message: deniedMessage,
          type: 'MODULE_ACCESS_DENIED' as AuthErrorType,
          details: {
            required: modulesToCheck,
            accessible: accessibleModules.map((m: any) => m.code),
            requireAll,
          },
        } as AuthError;
        throw error;
      }

      return result;
    };
  }, [modules, isLoading, isError]);

  /**
   * Get all accessible module codes
   *
   * @returns Array of module codes user has access to
   *
   * @example
   * ```tsx
   * const accessibleModules = getAccessibleModuleCodes();
   * // Returns: ['ACADEMIC', 'LIBRARY']
   * ```
   */
  const getAccessibleModuleCodes = useMemo(() => {
    return (): ModuleCode[] => {
      if (isLoading || isError || !modules) {
        return [];
      }

      return modules
        .filter((m: any) => m.is_active)
        .map((m: any) => m.code as ModuleCode);
    };
  }, [modules, isLoading, isError]);

  /**
   * Get module by code
   *
   * @param moduleCode - Module code to find
   * @returns Module object or undefined
   *
   * @example
   * ```tsx
   * const academicModule = getModuleByCode('ACADEMIC');
   * console.log(academicModule?.name); // "Academic Management"
   * ```
   */
  const getModuleByCode = useMemo(() => {
    return (moduleCode: ModuleCode): Module | undefined => {
      if (isLoading || isError || !modules) {
        return undefined;
      }

      return modules.find((m: any) => m.code === moduleCode);
    };
  }, [modules, isLoading, isError]);

  /**
   * Get child modules of a parent module
   *
   * @param parentCode - Parent module code
   * @returns Array of child modules
   *
   * @example
   * ```tsx
   * const academicSubmodules = getChildModules('ACADEMIC');
   * // Returns: [{ code: 'COURSES', ... }, { code: 'GRADES', ... }]
   * ```
   */
  const getChildModules = useMemo(() => {
    return (parentCode: ModuleCode): Module[] => {
      if (isLoading || isError || !modules) {
        return [];
      }

      const parentModule = modules.find((m: any) => m.code === parentCode);
      if (!parentModule) {
        return [];
      }

      return modules
        .filter((m: any) => m.parent_id === parentModule.id && m.is_active)
        .sort((a: any, b: any) => a.order_index - b.order_index);
    };
  }, [modules, isLoading, isError]);

  /**
   * Get top-level modules (modules without parent)
   *
   * @returns Array of top-level modules
   *
   * @example
   * ```tsx
   * const mainModules = getTopLevelModules();
   * // Returns: [{ code: 'ACADEMIC', ... }, { code: 'FINANCE', ... }]
   * ```
   */
  const getTopLevelModules = useMemo(() => {
    return (): Module[] => {
      if (isLoading || isError || !modules) {
        return [];
      }

      return modules
        .filter((m: any) => m.parent_id === null && m.is_active)
        .sort((a: any, b: any) => a.order_index - b.order_index);
    };
  }, [modules, isLoading, isError]);

  /**
   * Get module navigation tree
   *
   * Builds a hierarchical tree structure of modules for navigation
   *
   * @returns Array of top-level modules with children
   *
   * @example
   * ```tsx
   * const moduleTree = getModuleTree();
   * // Returns hierarchical structure with children
   * ```
   */
  const getModuleTree = useMemo(() => {
    return (): Module[] => {
      if (isLoading || isError || !modules) {
        return [];
      }

      const topLevel = getTopLevelModules();

      // For each top-level module, attach its children recursively
      const buildTree = (module: Module): Module => {
        const children = getChildModules(module.code as ModuleCode);
        return {
          ...module,
          children: children.map(buildTree),
        } as Module;
      };

      return topLevel.map(buildTree);
    };
  }, [modules, isLoading, isError, getTopLevelModules, getChildModules]);

  return {
    // Module data
    modules,
    isLoading,
    isError,

    // Single module checks
    hasAccess,

    // Multiple module checks
    hasAnyAccess,
    hasAllAccess,

    // Advanced checking
    checkAccess,

    // Module retrieval
    getAccessibleModuleCodes,
    getModuleByCode,
    getChildModules,
    getTopLevelModules,
    getModuleTree,
  };
}

/**
 * Hook for checking specific module access with loading state
 *
 * Useful for components that need to check module access immediately
 * and handle loading/error states explicitly.
 *
 * @param moduleCode - Module code to check
 * @returns Object with hasAccess status and loading/error states
 *
 * @example
 * ```tsx
 * function AcademicModule() {
 *   const { hasAccess, isLoading, isError } = useModule('ACADEMIC');
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *   if (!hasAccess) return <AccessDenied />;
 *
 *   return <AcademicDashboard />;
 * }
 * ```
 */
export function useModule(moduleCode: ModuleCode) {
  const { hasAccess: checkAccess, isLoading, isError, getModuleByCode } = useModuleAccess();

  const hasAccess = useMemo(() => {
    return checkAccess(moduleCode);
  }, [checkAccess, moduleCode]);

  const module = useMemo(() => {
    return getModuleByCode(moduleCode);
  }, [getModuleByCode, moduleCode]);

  return {
    hasAccess,
    module,
    isLoading,
    isError,
  };
}

/**
 * Hook for checking multiple modules with loading state
 *
 * @param moduleList - Array of module codes
 * @param options - Check options
 * @returns Object with hasAccess status and loading/error states
 *
 * @example
 * ```tsx
 * function AdminArea() {
 *   const { hasAccess, isLoading, modules } = useMultipleModules(
 *     ['ADMIN', 'SETTINGS'],
 *     { requireAll: true }
 *   );
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!hasAccess) return <AccessDenied />;
 *
 *   return <AdminDashboard modules={modules} />;
 * }
 * ```
 */
export function useMultipleModules(
  moduleList: ModuleCode[],
  options: ModuleAccessOptions = {}
) {
  const { checkAccess, isLoading, isError } = useModuleAccess();

  const result = useMemo(() => {
    return checkAccess(moduleList, options);
  }, [checkAccess, moduleList, options]);

  return {
    hasAccess: result.hasAccess,
    modules: result.modules,
    reason: result.reason,
    isLoading,
    isError,
  };
}
