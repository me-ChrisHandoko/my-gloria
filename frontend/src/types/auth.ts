/**
 * Authentication Type Definitions
 *
 * Core types for the authentication and authorization system.
 * These types define the structure of user context, permissions, roles, and modules.
 */

// ============================================================================
// User Context Types
// ============================================================================

/**
 * Main user information from the users table
 */
export interface User {
  id: number;
  clerk_user_id: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Employee information from the employees table (if user is an employee)
 */
export interface Employee {
  id: number;
  user_id: number;
  employee_number: string;
  position: string;
  department: string;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Permission definition
 * Format: "resource:action" (e.g., "user:create", "course:read")
 */
export interface Permission {
  id: number;
  code: string; // Format: "resource:action"
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Role definition
 */
export interface Role {
  id: number;
  code: string; // e.g., "ADMIN", "TEACHER", "STUDENT"
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Module access definition
 */
export interface Module {
  id: number;
  code: string; // e.g., "ACADEMIC", "FINANCE", "HR"
  name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  parent_id: number | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Complete user context returned by /api/v1/me
 * Contains all authentication and authorization information
 */
export interface CurrentUserContext {
  user: User;
  employee: Employee | null;
  roles: Role[];
  permissions: Permission[];
  modules: Module[];
}

// ============================================================================
// Permission Checking Types
// ============================================================================

/**
 * Permission code type
 * Format: "resource:action"
 * Examples: "user:create", "course:read", "grade:update"
 */
export type PermissionCode = string;

/**
 * Role code type
 * Examples: "ADMIN", "TEACHER", "STUDENT", "PARENT"
 */
export type RoleCode = string;

/**
 * Module code type
 * Examples: "ACADEMIC", "FINANCE", "HR", "LIBRARY"
 */
export type ModuleCode = string;

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  /**
   * If true, user must have ALL specified permissions
   * If false, user must have AT LEAST ONE permission
   * @default true
   */
  requireAll?: boolean;

  /**
   * If true, throws error when permission is denied
   * If false, returns false when permission is denied
   * @default false
   */
  throwOnDenied?: boolean;

  /**
   * Custom error message when permission is denied
   */
  deniedMessage?: string;
}

// ============================================================================
// Role Checking Types
// ============================================================================

/**
 * Role check result
 */
export interface RoleCheckResult {
  hasRole: boolean;
  matchedRoles: RoleCode[];
  reason?: string;
}

/**
 * Role check options
 */
export interface RoleCheckOptions {
  /**
   * If true, user must have ALL specified roles
   * If false, user must have AT LEAST ONE role
   * @default false
   */
  requireAll?: boolean;

  /**
   * If true, throws error when role check fails
   * If false, returns false when role check fails
   * @default false
   */
  throwOnDenied?: boolean;

  /**
   * Custom error message when role check fails
   */
  deniedMessage?: string;
}

// ============================================================================
// Module Access Types
// ============================================================================

/**
 * Module access result
 */
export interface ModuleAccessResult {
  hasAccess: boolean;
  modules: Module[];
  reason?: string;
}

/**
 * Module access options
 */
export interface ModuleAccessOptions {
  /**
   * If true, user must have access to ALL specified modules
   * If false, user must have access to AT LEAST ONE module
   * @default false
   */
  requireAll?: boolean;

  /**
   * If true, throws error when access is denied
   * If false, returns false when access is denied
   * @default false
   */
  throwOnDenied?: boolean;

  /**
   * Custom error message when access is denied
   */
  deniedMessage?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for PermissionGate component
 */
export interface PermissionGateProps {
  /**
   * Required permission(s) to render children
   * Can be a single permission or array of permissions
   */
  permissions: PermissionCode | PermissionCode[];

  /**
   * If true, user must have ALL specified permissions
   * If false, user must have AT LEAST ONE permission
   * @default true
   */
  requireAll?: boolean;

  /**
   * Content to render when user has permission
   */
  children: React.ReactNode;

  /**
   * Optional fallback content when user lacks permission
   * If not provided, renders null
   */
  fallback?: React.ReactNode;

  /**
   * Optional loading content while checking permissions
   */
  loading?: React.ReactNode;
}

/**
 * Props for RoleGate component
 */
export interface RoleGateProps {
  /**
   * Required role(s) to render children
   * Can be a single role or array of roles
   */
  roles: RoleCode | RoleCode[];

  /**
   * If true, user must have ALL specified roles
   * If false, user must have AT LEAST ONE role
   * @default false
   */
  requireAll?: boolean;

  /**
   * Content to render when user has role
   */
  children: React.ReactNode;

  /**
   * Optional fallback content when user lacks role
   * If not provided, renders null
   */
  fallback?: React.ReactNode;

  /**
   * Optional loading content while checking roles
   */
  loading?: React.ReactNode;
}

/**
 * Props for ModuleGate component
 */
export interface ModuleGateProps {
  /**
   * Required module(s) to render children
   * Can be a single module code or array of module codes
   */
  modules: ModuleCode | ModuleCode[];

  /**
   * If true, user must have access to ALL specified modules
   * If false, user must have access to AT LEAST ONE module
   * @default false
   */
  requireAll?: boolean;

  /**
   * Content to render when user has module access
   */
  children: React.ReactNode;

  /**
   * Optional fallback content when user lacks module access
   * If not provided, renders null
   */
  fallback?: React.ReactNode;

  /**
   * Optional loading content while checking module access
   */
  loading?: React.ReactNode;
}

// ============================================================================
// Auth Error Types
// ============================================================================

/**
 * Authentication error types
 */
export enum AuthErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  MODULE_ACCESS_DENIED = 'MODULE_ACCESS_DENIED',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
}

/**
 * Authentication error
 */
export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract permission resource from permission code
 * Example: "user:create" → "user"
 */
export type PermissionResource<T extends string> = T extends `${infer R}:${string}` ? R : never;

/**
 * Extract permission action from permission code
 * Example: "user:create" → "create"
 */
export type PermissionAction<T extends string> = T extends `${string}:${infer A}` ? A : never;
