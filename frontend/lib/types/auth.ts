// lib/types/auth.ts

// DataKaryawanInfo represents simplified employee data for auth response
export interface DataKaryawanInfo {
  nip: string;
  firstname: string;
  lastname: string;
  full_name: string;
  departemen?: string;
  jabatan?: string;
  jenis_karyawan?: string;
  // Legacy field names for backward compatibility
  nama?: string;
  bagian_kerja?: string;
  bidang_kerja?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  is_active: boolean;  // Backend uses snake_case
  data_karyawan?: DataKaryawanInfo;
  roles?: Array<{ id: string; name: string }>;
  positions?: Array<{
    id: string;
    name?: string;
    position?: { name: string };
    is_plt?: boolean;
    is_active?: boolean;
    sk_number?: string;
    school?: { name: string };
    department?: { name: string };
  }>;
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
