// lib/hooks/index.ts
/**
 * Custom Hooks Export
 *
 * Centralized exports for all custom hooks.
 */

// RBAC hooks
export { usePermission, usePermissions } from './usePermission';
export { useModuleAccess, useModulesAccess } from './useModuleAccess';
export { useRBAC, useInitializeRBAC } from './useRBAC';

// Other hooks
export { useBreadcrumbs } from './useBreadcrumbs';
export { useMutex } from './useMutex';
