export interface DataKaryawan {
  nip: string;
  nama?: string;
  jenisKelamin?: string;
  tglMulaiBekerja?: Date;
  tglTetap?: Date;
  status?: string;
  waktuKerjaKependidikan?: string;
  bagianKerja?: string;
  lokasi?: string;
  bidangKerja?: string;
  jenisKaryawan?: string;
  statusAktif?: string;
  noPonsel?: string;
  email?: string;
  birthdate?: Date;
  rfid?: string;
}

export interface UserProfile {
  id: string;
  clerkUserId: string;
  nip: string;
  isSuperadmin: boolean;
  isActive: boolean;
  lastActive?: Date;
  preferences?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  dataKaryawan?: DataKaryawan;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface Permission {
  action: string;
  scope: 'OWN' | 'DEPARTMENT' | 'SCHOOL' | 'ALL';
}

export interface ModuleAccess {
  moduleId: string;
  moduleName: string;
  permissions: string[];
  validFrom: Date;
  validUntil?: Date;
}