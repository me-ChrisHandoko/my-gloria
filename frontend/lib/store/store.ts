// lib/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './features/authSlice';
import rbacReducer from './features/rbacSlice';
import { authApi } from './services/authApi';
import { karyawanApi } from './services/karyawanApi';
import { usersApi } from './services/usersApi';
import { rolesApi } from './services/rolesApi';
import { organizationApi } from './services/organizationApi';
import { modulesApi } from './services/modulesApi';
import { permissionsApi } from './services/permissionsApi';
import { delegationsApi } from './services/delegationsApi';
import { workflowsApi } from './services/workflowsApi';
import { auditApi } from './services/auditApi';
import { accessApi } from './services/accessApi';
import { storageMiddleware } from './middleware/storageMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rbac: rbacReducer,
    [authApi.reducerPath]: authApi.reducer,
    [karyawanApi.reducerPath]: karyawanApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
    [organizationApi.reducerPath]: organizationApi.reducer,
    [modulesApi.reducerPath]: modulesApi.reducer,
    [permissionsApi.reducerPath]: permissionsApi.reducer,
    [delegationsApi.reducerPath]: delegationsApi.reducer,
    [workflowsApi.reducerPath]: workflowsApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [accessApi.reducerPath]: accessApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(karyawanApi.middleware)
      .concat(usersApi.middleware)
      .concat(rolesApi.middleware)
      .concat(organizationApi.middleware)
      .concat(modulesApi.middleware)
      .concat(permissionsApi.middleware)
      .concat(delegationsApi.middleware)
      .concat(workflowsApi.middleware)
      .concat(auditApi.middleware)
      .concat(accessApi.middleware)
      .concat(storageMiddleware),
  // Don't preload state to avoid hydration mismatch
  // State will be loaded by storageMiddleware after client mount
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
// This will automatically refetch data when:
// - Window regains focus (user comes back to tab)
// - Network reconnects after being offline
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
