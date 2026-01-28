// lib/store/features/rbacSlice.ts
/**
 * RBAC Redux Slice
 *
 * State management for Role-Based Access Control.
 * Includes:
 * - User's accessible modules
 * - Resolved permissions
 * - Permission cache for O(1) lookup
 * - Active roles and positions
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import { accessApi } from '../services/accessApi';
import {
  RBACState,
  ModuleAccessResponse,
  ResolvedPermissionResponse,
  RoleAccessResponse,
  PositionAccessResponse,
  CachedPermission,
  PermissionAction,
  PermissionScope,
  getPermissionKey,
  isCacheValid,
} from '@/lib/types/access';
import type { RootState } from '../store';

// ============================================================================
// Initial State
// ============================================================================

const initialState: RBACState = {
  modules: [],
  permissions: [],
  roles: [],
  positions: [],
  permissionCache: {},
  isLoadingModules: false,
  isLoadingPermissions: false,
  modulesLastFetched: null,
  permissionsLastFetched: null,
  modulesError: null,
  permissionsError: null,
};

// ============================================================================
// Slice Definition
// ============================================================================

const rbacSlice = createSlice({
  name: 'rbac',
  initialState,
  reducers: {
    /**
     * Set user's accessible modules
     */
    setModules: (state, action: PayloadAction<ModuleAccessResponse[]>) => {
      state.modules = action.payload;
      state.modulesLastFetched = Date.now();
      state.modulesError = null;

      // Build permission cache from modules
      action.payload.forEach((module) => {
        buildModulePermissionCache(state, module);
      });
    },

    /**
     * Set user's resolved permissions
     */
    setPermissions: (
      state,
      action: PayloadAction<{
        permissions: ResolvedPermissionResponse[];
        roles: RoleAccessResponse[];
        positions: PositionAccessResponse[];
      }>
    ) => {
      state.permissions = action.payload.permissions;
      state.roles = action.payload.roles;
      state.positions = action.payload.positions;
      state.permissionsLastFetched = Date.now();
      state.permissionsError = null;

      // Build permission cache from resolved permissions
      action.payload.permissions.forEach((perm) => {
        if (perm.is_granted) {
          const key = getPermissionKey(perm.resource, perm.action, perm.scope || undefined);
          state.permissionCache[key] = {
            allowed: true,
            source: perm.source,
            sourceId: perm.source_id,
            sourceName: perm.source_name,
            cachedAt: Date.now(),
          };
        }
      });
    },

    /**
     * Update a single permission in cache
     */
    updatePermissionCache: (
      state,
      action: PayloadAction<{
        resource: string;
        action: PermissionAction;
        scope?: PermissionScope;
        result: CachedPermission;
      }>
    ) => {
      const key = getPermissionKey(
        action.payload.resource,
        action.payload.action,
        action.payload.scope
      );
      state.permissionCache[key] = action.payload.result;
    },

    /**
     * Clear all RBAC data (for logout)
     */
    clearRbac: (state) => {
      state.modules = [];
      state.permissions = [];
      state.roles = [];
      state.positions = [];
      state.permissionCache = {};
      state.isLoadingModules = false;
      state.isLoadingPermissions = false;
      state.modulesLastFetched = null;
      state.permissionsLastFetched = null;
      state.modulesError = null;
      state.permissionsError = null;
    },

    /**
     * Set loading state for modules
     */
    setModulesLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoadingModules = action.payload;
    },

    /**
     * Set loading state for permissions
     */
    setPermissionsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoadingPermissions = action.payload;
    },

    /**
     * Set modules error
     */
    setModulesError: (state, action: PayloadAction<string | null>) => {
      state.modulesError = action.payload;
    },

    /**
     * Set permissions error
     */
    setPermissionsError: (state, action: PayloadAction<string | null>) => {
      state.permissionsError = action.payload;
    },
  },

  // Extra reducers to sync with RTK Query
  extraReducers: (builder) => {
    // Handle getUserModules query states
    builder.addMatcher(
      accessApi.endpoints.getUserModules.matchPending,
      (state) => {
        state.isLoadingModules = true;
        state.modulesError = null;
      }
    );
    builder.addMatcher(
      accessApi.endpoints.getUserModules.matchFulfilled,
      (state, action) => {
        state.modules = action.payload;
        state.modulesLastFetched = Date.now();
        state.isLoadingModules = false;
        state.modulesError = null;

        // Build permission cache from modules
        action.payload.forEach((module) => {
          buildModulePermissionCache(state, module);
        });
      }
    );
    builder.addMatcher(
      accessApi.endpoints.getUserModules.matchRejected,
      (state, action) => {
        state.isLoadingModules = false;
        state.modulesError = action.error?.message || 'Failed to fetch modules';
      }
    );

    // Handle getUserPermissions query states
    builder.addMatcher(
      accessApi.endpoints.getUserPermissions.matchPending,
      (state) => {
        state.isLoadingPermissions = true;
        state.permissionsError = null;
      }
    );
    builder.addMatcher(
      accessApi.endpoints.getUserPermissions.matchFulfilled,
      (state, action) => {
        state.permissions = action.payload.permissions;
        state.roles = action.payload.roles;
        state.positions = action.payload.positions;
        state.permissionsLastFetched = Date.now();
        state.isLoadingPermissions = false;
        state.permissionsError = null;

        // Build permission cache from resolved permissions
        action.payload.permissions.forEach((perm) => {
          if (perm.is_granted) {
            const key = getPermissionKey(perm.resource, perm.action, perm.scope || undefined);
            state.permissionCache[key] = {
              allowed: true,
              source: perm.source,
              sourceId: perm.source_id,
              sourceName: perm.source_name,
              cachedAt: Date.now(),
            };
          }
        });
      }
    );
    builder.addMatcher(
      accessApi.endpoints.getUserPermissions.matchRejected,
      (state, action) => {
        state.isLoadingPermissions = false;
        state.permissionsError = action.error?.message || 'Failed to fetch permissions';
      }
    );
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build permission cache entries from a module's permissions
 */
function buildModulePermissionCache(state: RBACState, module: ModuleAccessResponse): void {
  module.permissions.forEach((action) => {
    const key = getPermissionKey(module.code, action as PermissionAction);
    state.permissionCache[key] = {
      allowed: true,
      source: 'module',
      sourceName: module.name,
      cachedAt: Date.now(),
    };
  });

  // Recursively process children
  if (module.children) {
    module.children.forEach((child) => {
      buildModulePermissionCache(state, child);
    });
  }
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select all accessible modules
 */
export const selectModules = (state: RootState) => state.rbac.modules;

/**
 * Select all resolved permissions
 */
export const selectPermissions = (state: RootState) => state.rbac.permissions;

/**
 * Select user's roles
 */
export const selectRoles = (state: RootState) => state.rbac.roles;

/**
 * Select user's positions
 */
export const selectPositions = (state: RootState) => state.rbac.positions;

/**
 * Select permission cache
 */
export const selectPermissionCache = (state: RootState) => state.rbac.permissionCache;

/**
 * Select loading state
 */
export const selectIsLoading = (state: RootState) =>
  state.rbac.isLoadingModules || state.rbac.isLoadingPermissions;

/**
 * Select if RBAC data has been fetched
 */
export const selectIsInitialized = (state: RootState) =>
  state.rbac.modulesLastFetched !== null && state.rbac.permissionsLastFetched !== null;

/**
 * Memoized selector to check if user has a specific permission
 * Uses permission cache for O(1) lookup
 */
export const selectHasPermission = createSelector(
  [
    selectPermissionCache,
    (_state: RootState, resource: string) => resource,
    (_state: RootState, _resource: string, action: PermissionAction) => action,
    (_state: RootState, _resource: string, _action: PermissionAction, scope?: PermissionScope) => scope,
  ],
  (cache, resource, action, scope): boolean => {
    const key = getPermissionKey(resource, action, scope);
    const cached = cache[key];

    if (cached && isCacheValid(cached.cachedAt)) {
      return cached.allowed;
    }

    // If no scope specified, also check without scope
    if (!scope) {
      return !!cached?.allowed;
    }

    // Check with scope
    return !!cached?.allowed;
  }
);

/**
 * Memoized selector to check if user has access to a module
 */
export const selectHasModuleAccess = createSelector(
  [selectModules, (_state: RootState, moduleCode: string) => moduleCode],
  (modules, moduleCode): boolean => {
    const findModule = (mods: ModuleAccessResponse[]): boolean => {
      for (const mod of mods) {
        if (mod.code.toLowerCase() === moduleCode.toLowerCase()) {
          return true;
        }
        if (mod.children && findModule(mod.children)) {
          return true;
        }
      }
      return false;
    };
    return findModule(modules);
  }
);

/**
 * Memoized selector to get a specific module
 */
export const selectModule = createSelector(
  [selectModules, (_state: RootState, moduleCode: string) => moduleCode],
  (modules, moduleCode): ModuleAccessResponse | undefined => {
    const findModule = (mods: ModuleAccessResponse[]): ModuleAccessResponse | undefined => {
      for (const mod of mods) {
        if (mod.code.toLowerCase() === moduleCode.toLowerCase()) {
          return mod;
        }
        if (mod.children) {
          const found = findModule(mod.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findModule(modules);
  }
);

/**
 * Get flattened list of all modules (including children)
 */
export const selectFlatModules = createSelector([selectModules], (modules): ModuleAccessResponse[] => {
  const flatten = (mods: ModuleAccessResponse[]): ModuleAccessResponse[] => {
    const result: ModuleAccessResponse[] = [];
    for (const mod of mods) {
      result.push(mod);
      if (mod.children) {
        result.push(...flatten(mod.children));
      }
    }
    return result;
  };
  return flatten(modules);
});

// ============================================================================
// Exports
// ============================================================================

export const {
  setModules,
  setPermissions,
  updatePermissionCache,
  clearRbac,
  setModulesLoading,
  setPermissionsLoading,
  setModulesError,
  setPermissionsError,
} = rbacSlice.actions;

export default rbacSlice.reducer;
