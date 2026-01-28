// components/rbac/index.ts
/**
 * RBAC Components Export
 *
 * Centralized exports for all RBAC-related components.
 */

export {
  PermissionGate,
  MultiPermissionGate,
  AnyPermissionGate,
  withPermission,
} from './PermissionGate';

export {
  ActionButton,
  CreateButton,
  ReadButton,
  UpdateButton,
  DeleteButton,
  ApproveButton,
  ExportButton,
  ImportButton,
} from './ActionButton';

export {
  ModuleMenu,
  StaticModuleMenu,
  type StaticNavItem,
} from './ModuleMenu';

export {
  RouteGuard,
  ModuleRouteGuard,
  PermissionRouteGuard,
} from './RouteGuard';
