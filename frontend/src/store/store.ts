import { configureStore, isAnyOf, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './api/apiSlice';
import authReducer from './features/auth/authSlice';
import notificationReducer from './features/notification/notificationSlice';
import uiReducer from './features/ui/uiSlice';
import organizationReducer from './features/organization/organizationSlice';

/**
 * Redux Store Configuration
 * 
 * Note: We disable serialization checks for RTK Query actions because they
 * intentionally include non-serializable values like Request/Response objects
 * for debugging purposes. This is safe and recommended by RTK Query docs.
 */
export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    notification: notificationReducer,
    ui: uiReducer,
    organization: organizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          // RTK Query actions
          'api/executeQuery/fulfilled',
          'api/executeQuery/pending',
          'api/executeQuery/rejected',
          'api/executeMutation/fulfilled',
          'api/executeMutation/pending',
          'api/executeMutation/rejected',
        ],
        // Ignore these action paths
        ignoredActionPaths: [
          'meta.arg', 
          'payload.timestamp',
          // RTK Query specific paths
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response',
          'meta.baseQueryMeta',
        ],
        // Ignore these state paths
        ignoredPaths: [
          'items.dates',
          // RTK Query cache
          'api.queries',
          'api.mutations',
          'api.provided',
          'api.subscriptions',
        ],
      },
    }).concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;