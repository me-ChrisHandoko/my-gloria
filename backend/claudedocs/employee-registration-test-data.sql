-- ============================================================
-- Employee Registration Validation - Test Data
-- ============================================================
-- Purpose: Test data untuk validasi employee registration
-- Database: gloria_v2
-- Created: 2026-01-08
-- ============================================================

-- Cleanup existing test data
DELETE FROM public.refresh_tokens WHERE user_profile_id IN (
    SELECT id FROM public.users WHERE email IN (
        'active@gloria.com',
        'active2@gloria.com',
        'inactive@gloria.com',
        'nullstatus@gloria.com',
        'test@example.com'
    )
);

DELETE FROM public.users WHERE email IN (
    'active@gloria.com',
    'active2@gloria.com',
    'inactive@gloria.com',
    'nullstatus@gloria.com',
    'test@example.com'
);

DELETE FROM public.data_karyawan WHERE nip IN (
    'TEST001',
    'TEST002',
    'TEST003',
    'TEST004'
);

-- ============================================================
-- Insert Test Employee Data
-- ============================================================

-- 1. Active Employee (status: Aktif) - SHOULD ALLOW REGISTRATION
INSERT INTO public.data_karyawan (
    nip,
    nama,
    email,
    status_aktif,
    jenis_kelamin,
    bagian_kerja,
    bidang_kerja,
    jenis_karyawan,
    lokasi
) VALUES (
    'TEST001',
    'Karyawan Aktif Test',
    'active@gloria.com',
    'Aktif',  -- lowercase aktif
    'L',
    'IT Department',
    'Software Development',
    'Tetap',
    'Jakarta'
);

-- 2. Active Employee (status: AKTIF uppercase) - SHOULD ALLOW REGISTRATION
INSERT INTO public.data_karyawan (
    nip,
    nama,
    email,
    status_aktif,
    jenis_kelamin,
    bagian_kerja,
    bidang_kerja,
    jenis_karyawan,
    lokasi
) VALUES (
    'TEST002',
    'Karyawan Aktif Test 2',
    'active2@gloria.com',
    'AKTIF',  -- uppercase AKTIF
    'P',
    'HR Department',
    'Human Resources',
    'Tetap',
    'Jakarta'
);

-- 3. Inactive Employee (status: Non Aktif) - SHOULD REJECT REGISTRATION
INSERT INTO public.data_karyawan (
    nip,
    nama,
    email,
    status_aktif,
    jenis_kelamin,
    bagian_kerja,
    bidang_kerja,
    jenis_karyawan,
    lokasi
) VALUES (
    'TEST003',
    'Karyawan Non Aktif Test',
    'inactive@gloria.com',
    'Non Aktif',  -- inactive status
    'L',
    'Finance Department',
    'Accounting',
    'Kontrak',
    'Bandung'
);

-- 4. Employee with NULL status - SHOULD REJECT REGISTRATION
INSERT INTO public.data_karyawan (
    nip,
    nama,
    email,
    status_aktif,  -- will be NULL
    jenis_kelamin,
    bagian_kerja,
    bidang_kerja,
    jenis_karyawan,
    lokasi
) VALUES (
    'TEST004',
    'Karyawan Null Status Test',
    'nullstatus@gloria.com',
    NULL,  -- NULL status
    'P',
    'Admin',
    'General Administration',
    'Tetap',
    'Jakarta'
);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check inserted test data
SELECT
    nip,
    nama,
    email,
    status_aktif,
    bagian_kerja,
    CASE
        WHEN status_aktif = 'Aktif' OR status_aktif = 'AKTIF' THEN 'Should Allow'
        WHEN status_aktif = 'Non Aktif' THEN 'Should Reject (Inactive)'
        WHEN status_aktif IS NULL THEN 'Should Reject (NULL)'
        ELSE 'Unknown'
    END as expected_behavior
FROM public.data_karyawan
WHERE nip IN ('TEST001', 'TEST002', 'TEST003', 'TEST004')
ORDER BY nip;

-- ============================================================
-- Expected Test Results
-- ============================================================

/*
TEST SCENARIOS:

1. Register dengan active@gloria.com
   Expected: HTTP 201 Created
   Reason: Employee exists dengan status 'Aktif'

2. Register dengan active2@gloria.com
   Expected: HTTP 201 Created
   Reason: Employee exists dengan status 'AKTIF' (uppercase)

3. Register dengan inactive@gloria.com
   Expected: HTTP 403 Forbidden
   Error: "Akun karyawan tidak aktif"
   Reason: Employee exists tapi status 'Non Aktif'

4. Register dengan nullstatus@gloria.com
   Expected: HTTP 403 Forbidden
   Error: "Akun karyawan tidak aktif"
   Reason: Employee exists tapi status NULL

5. Register dengan random@gmail.com
   Expected: HTTP 403 Forbidden
   Error: "Email tidak terdaftar sebagai karyawan"
   Reason: Email tidak ada di data_karyawan

6. Register dengan active@gloria.com (kedua kali)
   Expected: HTTP 400 Bad Request
   Error: "Email sudah terdaftar"
   Reason: User sudah dibuat di tabel users
*/

-- ============================================================
-- Cleanup Script (untuk reset after testing)
-- ============================================================

/*
-- Run this to clean up test data after testing:

DELETE FROM public.refresh_tokens WHERE user_profile_id IN (
    SELECT id FROM public.users WHERE email LIKE '%@gloria.com'
);

DELETE FROM public.users WHERE email IN (
    'active@gloria.com',
    'active2@gloria.com',
    'inactive@gloria.com',
    'nullstatus@gloria.com'
);

DELETE FROM public.data_karyawan WHERE nip IN (
    'TEST001', 'TEST002', 'TEST003', 'TEST004'
);
*/
