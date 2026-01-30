// lib/store/features/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/lib/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Flag to track if localStorage has been checked
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false, // Start as false, set to true after localStorage check
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set user credentials (tokens handled by httpOnly cookies, not Redux)
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.error = null;
    },
    // Logout (cookies cleared by backend)
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true; // Keep initialized after logout
      state.error = null;
    },
    // Mark auth state as initialized (after localStorage check)
    initializeAuth: (state) => {
      state.isInitialized = true;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setCredentials, logout, initializeAuth, setError, clearError } = authSlice.actions;
export default authSlice.reducer;
