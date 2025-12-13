import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types (inline for now, will move to types/auth.ts later)
interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Employee {
  nip: string;
  nama: string;
  email: string;
  department: string;
  position: string;
  location: string;
  status: string;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  parent_id?: string;
}

interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  parent_id?: string;
  is_active: boolean;
}

interface CurrentUserContext {
  user: UserProfile;
  employee: Employee | null;
  roles: Role[];
  permissions: string[];
  modules: Module[];
}

interface AuthState {
  userContext: CurrentUserContext | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  userContext: null,
  isLoading: true,
  error: null,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUserContext: (state, action: PayloadAction<CurrentUserContext>) => {
      state.userContext = action.payload;
      state.isLoading = false;
      state.error = null;
      state.isInitialized = true;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isInitialized = true;
    },
    clearAuth: (state) => {
      state.userContext = null;
      state.isLoading = false;
      state.error = null;
      state.isInitialized = false;
    },
  },
});

export const { setUserContext, setLoading, setError, clearAuth } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUserContext = (state: { auth: AuthState }) => state.auth.userContext;
export const selectPermissions = (state: { auth: AuthState }) =>
  state.auth.userContext?.permissions ?? [];
export const selectRoles = (state: { auth: AuthState }) =>
  state.auth.userContext?.roles ?? [];
export const selectModules = (state: { auth: AuthState }) =>
  state.auth.userContext?.modules ?? [];
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectIsInitialized = (state: { auth: AuthState }) => state.auth.isInitialized;
export const selectError = (state: { auth: AuthState }) => state.auth.error;
