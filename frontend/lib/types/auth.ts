// lib/types/auth.ts
export interface DataKaryawan {
  nip: string;
  firstname: string;
  lastname: string;
  departemen?: string;
  jabatan?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  email_verified: boolean;  // Backend uses snake_case
  is_active: boolean;        // Backend uses snake_case
  data_karyawan?: DataKaryawan;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
