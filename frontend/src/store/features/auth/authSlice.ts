import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, AuthState } from '@/types/auth';
import { authApi } from '@/store/api/authApi';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Handle getCurrentUser query
    builder
      .addMatcher(
        authApi.endpoints.getCurrentUser.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        authApi.endpoints.getCurrentUser.matchFulfilled,
        (state, action) => {
          state.user = action.payload;
          state.isAuthenticated = true;
          state.isLoading = false;
          state.error = null;
        }
      )
      .addMatcher(
        authApi.endpoints.getCurrentUser.matchRejected,
        (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to fetch user';
          state.isAuthenticated = false;
        }
      );

    // Handle syncUser mutation
    builder
      .addMatcher(
        authApi.endpoints.syncUser.matchFulfilled,
        (state, action) => {
          if (action.payload.success && action.payload.user) {
            state.user = action.payload.user;
            state.isAuthenticated = true;
            state.error = null;
          }
        }
      );
  },
});

export const { setUser, clearUser, setAuthError, setAuthLoading } = authSlice.actions;

export default authSlice.reducer;