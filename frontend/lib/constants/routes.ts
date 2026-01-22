/**
 * Centralized Route Constants
 *
 * Migration: Indonesian → English Standardization
 * Date: 2026-01-20
 *
 * This file defines all application routes with their old Indonesian paths
 * for backward compatibility redirects.
 */

// ============================================
// Route Mapping (Old → New)
// ============================================

export const ROUTE_MIGRATION = {
  // Employee Management
  '/employees': '/employees',
  '/employees/create': '/employees/create',
  // Dynamic routes handled by pattern matching

  // User Management
  '/users': '/user/users',
  '/users/create': '/user/users/create',

  // Organization - Schools
  '/organization/schools': '/organization/schools',
  '/organization/schools/create': '/organization/schools/create',

  // Organization - Departments
  '/organization/departments': '/organization/departments',
  '/organization/departments/create': '/organization/departments/create',

  // Organization - Positions
  '/organization/positions': '/organization/positions',
  '/organization/positions/create': '/organization/positions/create',

  // Delegation
  '/delegations': '/delegations',
  '/delegations/create': '/delegations/create',

  // Workflow Rules
  '/workflow/rules': '/workflow/rules',
  '/workflow/rules/create': '/workflow/rules/create',
  '/workflow/rules/bulk': '/workflow/rules/bulk',

  // Access Control
  '/access': '/access',
  '/access/roles': '/access/roles',
  '/access/permissions': '/access/permissions',
  '/access/modules': '/access/modules',
} as const;

// ============================================
// Application Routes (New English Structure)
// ============================================

export const ROUTES = {
  // ========== Authentication ==========
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },

  // ========== Dashboard & Profile ==========
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/change-password',

  // ========== Employees ==========
  EMPLOYEES: {
    LIST: '/employees',
    CREATE: '/employees/create',
    DETAIL: (nip: string) => `/employees/${nip}`,
    EDIT: (nip: string) => `/employees/${nip}/edit`,
  },

  // ========== Users ==========
  USERS: {
    LIST: '/user/users',
    CREATE: '/user/users/create',
    DETAIL: (id: string) => `/user/users/${id}`,
  },

  // ========== Organization ==========
  ORGANIZATION: {
    // Schools
    SCHOOLS: {
      LIST: '/organization/schools',
      CREATE: '/organization/schools/create',
      DETAIL: (id: string) => `/organization/schools/${id}`,
      EDIT: (id: string) => `/organization/schools/${id}/edit`,
    },

    // Departments
    DEPARTMENTS: {
      LIST: '/organization/departments',
      CREATE: '/organization/departments/create',
      DETAIL: (id: string) => `/organization/departments/${id}`,
      EDIT: (id: string) => `/organization/departments/${id}/edit`,
    },

    // Positions
    POSITIONS: {
      LIST: '/organization/positions',
      CREATE: '/organization/positions/create',
      DETAIL: (id: string) => `/organization/positions/${id}`,
      EDIT: (id: string) => `/organization/positions/${id}/edit`,
    },
  },

  // ========== Access Control ==========
  ACCESS: {
    ROLES: {
      LIST: '/access/roles',
      CREATE: '/access/roles/create',
      DETAIL: (id: string) => `/access/roles/${id}`,
      EDIT: (id: string) => `/access/roles/${id}/edit`,
    },

    PERMISSIONS: {
      LIST: '/access/permissions',
      CREATE: '/access/permissions/create',
      DETAIL: (id: string) => `/access/permissions/${id}`,
      EDIT: (id: string) => `/access/permissions/${id}/edit`,
    },

    MODULES: {
      LIST: '/access/modules',
      CREATE: '/access/modules/create',
      DETAIL: (id: string) => `/access/modules/${id}`,
      EDIT: (id: string) => `/access/modules/${id}/edit`,
    },
  },

  // ========== Delegations ==========
  DELEGATIONS: {
    LIST: '/delegations',
    CREATE: '/delegations/create',
    DETAIL: (id: string) => `/delegations/${id}`,
  },

  // ========== Workflow ==========
  WORKFLOW: {
    RULES: {
      LIST: '/workflow/rules',
      CREATE: '/workflow/rules/create',
      DETAIL: (id: string) => `/workflow/rules/${id}`,
      EDIT: (id: string) => `/workflow/rules/${id}/edit`,
      BULK: '/workflow/rules/bulk',
    },
    INSTANCES: {
      LIST: '/workflow/instances',
      DETAIL: (id: string) => `/workflow/instances/${id}`,
    },
    BULK_OPERATIONS: '/workflow/bulk-operations',
  },

  // ========== Audit ==========
  AUDIT: {
    LIST: '/audit',
    DETAIL: (id: string) => `/audit/${id}`,
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get new English route for old Indonesian route
 * Used for redirects and migration
 */
export function getNewRoute(oldPath: string): string | null {
  // Handle exact matches
  if (oldPath in ROUTE_MIGRATION) {
    return ROUTE_MIGRATION[oldPath as keyof typeof ROUTE_MIGRATION];
  }

  // Handle dynamic routes with patterns
  const patterns = [
    { from: /^\/employees\/([^/]+)\/edit$/, to: (nip: string) => `/employees/${nip}/edit` },
    { from: /^\/employees\/([^/]+)$/, to: (nip: string) => `/employees/${nip}` },
    { from: /^\/users\/([^/]+)$/, to: (id: string) => `/user/users/${id}` },
    { from: /^\/organization\/sekolah\/([^/]+)\/edit$/, to: (id: string) => `/organization/schools/${id}/edit` },
    { from: /^\/organization\/sekolah\/([^/]+)$/, to: (id: string) => `/organization/schools/${id}` },
    { from: /^\/organization\/departemen\/([^/]+)\/edit$/, to: (id: string) => `/organization/departments/${id}/edit` },
    { from: /^\/organization\/departemen\/([^/]+)$/, to: (id: string) => `/organization/departments/${id}` },
    { from: /^\/organization\/posisi\/([^/]+)\/edit$/, to: (id: string) => `/organization/positions/${id}/edit` },
    { from: /^\/organization\/posisi\/([^/]+)$/, to: (id: string) => `/organization/positions/${id}` },
    { from: /^\/delegations\/([^/]+)$/, to: (id: string) => `/delegations/${id}` },
    { from: /^\/workflow\/aturan\/([^/]+)\/edit$/, to: (id: string) => `/workflow/rules/${id}/edit` },
    { from: /^\/workflow\/aturan\/([^/]+)$/, to: (id: string) => `/workflow/rules/${id}` },
    { from: /^\/access\/roles\/([^/]+)\/edit$/, to: (id: string) => `/access/roles/${id}/edit` },
    { from: /^\/access\/roles\/([^/]+)$/, to: (id: string) => `/access/roles/${id}` },
    { from: /^\/access\/permissions\/([^/]+)\/edit$/, to: (id: string) => `/access/permissions/${id}/edit` },
    { from: /^\/access\/permissions\/([^/]+)$/, to: (id: string) => `/access/permissions/${id}` },
    { from: /^\/access\/modules\/([^/]+)\/edit$/, to: (id: string) => `/access/modules/${id}/edit` },
    { from: /^\/access\/modules\/([^/]+)$/, to: (id: string) => `/access/modules/${id}` },
  ];

  for (const pattern of patterns) {
    const match = oldPath.match(pattern.from);
    if (match) {
      return pattern.to(match[1]);
    }
  }

  return null;
}

/**
 * Check if a path is an old Indonesian route that needs redirect
 */
export function isLegacyRoute(path: string): boolean {
  return getNewRoute(path) !== null;
}

/**
 * Get old Indonesian route for new English route
 * Used for checking backward compatibility
 */
export function getOldRoute(newPath: string): string | null {
  for (const [oldPath, mappedNewPath] of Object.entries(ROUTE_MIGRATION)) {
    if (mappedNewPath === newPath) {
      return oldPath;
    }
  }
  return null;
}
