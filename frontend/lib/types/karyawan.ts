// lib/types/employees.ts

export interface DataKaryawan {
  nip: string;
  nama: string | null;
  jenis_kelamin: string | null;
  tgl_mulai_bekerja: string | null;
  tgl_tetap: string | null;
  status: string | null;
  waktu_kerja_kependidikan: string | null;
  bagian_kerja: string | null;
  lokasi: string | null;
  bidang_kerja: string | null;
  jenis_karyawan: string | null;
  status_aktif: string | null;
  no_ponsel: string | null;
  email: string | null;
  birthdate: string | null;
  rfid: string | null;
}

export interface DataKaryawanListItem {
  nip: string;
  nama: string | null;
  email: string | null;
  bagian_kerja: string | null;
  jenis_karyawan: string | null;
  status_aktif: string | null;
}

export interface CreateKaryawanRequest {
  nip: string;
  nama?: string;
  jenis_kelamin?: string;
  tgl_mulai_bekerja?: string;
  tgl_tetap?: string;
  status?: string;
  waktu_kerja_kependidikan?: string;
  bagian_kerja?: string;
  lokasi?: string;
  bidang_kerja?: string;
  jenis_karyawan?: string;
  status_aktif?: string;
  no_ponsel?: string;
  email?: string;
  birthdate?: string;
  rfid?: string;
}

export interface UpdateKaryawanRequest {
  nama?: string;
  jenis_kelamin?: string;
  tgl_mulai_bekerja?: string;
  tgl_tetap?: string;
  status?: string;
  waktu_kerja_kependidikan?: string;
  bagian_kerja?: string;
  lokasi?: string;
  bidang_kerja?: string;
  jenis_karyawan?: string;
  status_aktif?: string;
  no_ponsel?: string;
  email?: string;
  birthdate?: string;
  rfid?: string;
}

export interface KaryawanFilter {
  bagian_kerja?: string;
  jenis_karyawan?: string;
  status_aktif?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
