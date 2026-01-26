-- Module Insert Script for Gloria System
-- Based on Frontend App Structure
-- Categories: SYSTEM
-- Run this in pgAdmin or any PostgreSQL client

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO public.modules (id, code, name, category, description, icon, path, parent_id, sort_order, is_active, is_visible, version, created_at, updated_at, created_by, updated_by)
VALUES
    -- 1. DASHBOARD (Root Module)
    (gen_random_uuid(), 'MOD_DASHBOARD', 'Dashboard', 'SYSTEM', 'Halaman utama dashboard untuk overview sistem', 'LayoutDashboard', '/dashboard', NULL, 1, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 2. PROFILE (Root Module)
    (gen_random_uuid(), 'MOD_PROFILE', 'Profil', 'SYSTEM', 'Halaman profil pengguna', 'User', '/profile', NULL, 2, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 3. CHANGE PASSWORD (Root Module)
    (gen_random_uuid(), 'MOD_CHANGE_PASSWORD', 'Ubah Password', 'SYSTEM', 'Halaman untuk mengubah password', 'Key', '/change-password', NULL, 3, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 4. ACCESS MANAGEMENT (Parent Module)
    (gen_random_uuid(), 'MOD_ACCESS', 'Manajemen Akses', 'SYSTEM', 'Modul induk untuk manajemen akses dan keamanan', 'Shield', '/access', NULL, 10, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 5. ORGANIZATION (Parent Module)
    (gen_random_uuid(), 'MOD_ORGANIZATION', 'Organisasi', 'SYSTEM', 'Modul induk untuk manajemen struktur organisasi', 'Building2', '/organization', NULL, 20, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 6. EMPLOYEES (Root Module)
    (gen_random_uuid(), 'MOD_EMPLOYEES', 'Karyawan', 'SYSTEM', 'Modul manajemen data karyawan', 'Users', '/employees', NULL, 30, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 7. WORKFLOW (Parent Module)
    (gen_random_uuid(), 'MOD_WORKFLOW', 'Workflow', 'SYSTEM', 'Modul induk untuk manajemen workflow', 'GitBranch', '/workflow', NULL, 40, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 8. USER MANAGEMENT (Parent Module)
    (gen_random_uuid(), 'MOD_USER', 'Manajemen User', 'SYSTEM', 'Modul induk untuk manajemen user sistem', 'UserCog', '/user', NULL, 50, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 9. AUDIT (Root Module)
    (gen_random_uuid(), 'MOD_AUDIT', 'Audit Log', 'SYSTEM', 'Modul untuk melihat audit log sistem', 'FileText', '/audit', NULL, 60, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 10. DELEGATIONS (Root Module)
    (gen_random_uuid(), 'MOD_DELEGATIONS', 'Delegasi', 'SYSTEM', 'Modul untuk manajemen delegasi tugas', 'Share2', '/delegations', NULL, 70, true, true, 1, NOW(), NOW(), 'system', 'system');

-- Child Modules (require parent_id reference)
INSERT INTO public.modules (id, code, name, category, description, icon, path, parent_id, sort_order, is_active, is_visible, version, created_at, updated_at, created_by, updated_by)
VALUES
    -- 11. ACCESS MANAGEMENT - Children (/access/*)
    (gen_random_uuid(), 'MOD_ACCESS_ROLES', 'Roles', 'SYSTEM', 'Manajemen roles dan hak akses', 'UserCheck', '/access/roles', (SELECT id FROM public.modules WHERE code = 'MOD_ACCESS'), 1, true, true, 1, NOW(), NOW(), 'system', 'system'),
    (gen_random_uuid(), 'MOD_ACCESS_PERMISSIONS', 'Permissions', 'SYSTEM', 'Manajemen permissions sistem', 'Lock', '/access/permissions', (SELECT id FROM public.modules WHERE code = 'MOD_ACCESS'), 2, true, true, 1, NOW(), NOW(), 'system', 'system'),
    (gen_random_uuid(), 'MOD_ACCESS_MODULES', 'Modules', 'SYSTEM', 'Manajemen modules sistem', 'LayoutGrid', '/access/modules', (SELECT id FROM public.modules WHERE code = 'MOD_ACCESS'), 3, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 12. ORGANIZATION - Children (/organization/*)
    (gen_random_uuid(), 'MOD_ORG_SCHOOLS', 'Sekolah', 'SYSTEM', 'Manajemen data sekolah', 'School', '/organization/schools', (SELECT id FROM public.modules WHERE code = 'MOD_ORGANIZATION'), 1, true, true, 1, NOW(), NOW(), 'system', 'system'),
    (gen_random_uuid(), 'MOD_ORG_DEPARTMENTS', 'Departemen', 'SYSTEM', 'Manajemen struktur departemen', 'Network', '/organization/departments', (SELECT id FROM public.modules WHERE code = 'MOD_ORGANIZATION'), 2, true, true, 1, NOW(), NOW(), 'system', 'system'),
    (gen_random_uuid(), 'MOD_ORG_POSITIONS', 'Jabatan', 'SYSTEM', 'Manajemen jabatan dan posisi', 'Briefcase', '/organization/positions', (SELECT id FROM public.modules WHERE code = 'MOD_ORGANIZATION'), 3, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 13. WORKFLOW - Children (/workflow/*)
    (gen_random_uuid(), 'MOD_WF_RULES', 'Workflow Rules', 'SYSTEM', 'Manajemen aturan workflow', 'Settings2', '/workflow/rules', (SELECT id FROM public.modules WHERE code = 'MOD_WORKFLOW'), 1, true, true, 1, NOW(), NOW(), 'system', 'system'),
    (gen_random_uuid(), 'MOD_WF_INSTANCES', 'Workflow Instances', 'SYSTEM', 'Monitoring instance workflow aktif', 'Activity', '/workflow/instances', (SELECT id FROM public.modules WHERE code = 'MOD_WORKFLOW'), 2, true, true, 1, NOW(), NOW(), 'system', 'system'),
    (gen_random_uuid(), 'MOD_WF_BULK', 'Bulk Operations', 'SYSTEM', 'Operasi workflow secara massal', 'Layers', '/workflow/bulk-operations', (SELECT id FROM public.modules WHERE code = 'MOD_WORKFLOW'), 3, true, true, 1, NOW(), NOW(), 'system', 'system'),

    -- 14. USER MANAGEMENT - Children (/user/*)
    (gen_random_uuid(), 'MOD_USER_USERS', 'Users', 'SYSTEM', 'Manajemen akun user', 'Users', '/user/users', (SELECT id FROM public.modules WHERE code = 'MOD_USER'), 1, true, true, 1, NOW(), NOW(), 'system', 'system');

-- Verification
SELECT code, name, path, (SELECT code FROM public.modules p WHERE p.id = m.parent_id) as parent_code, sort_order
FROM public.modules m WHERE deleted_at IS NULL ORDER BY sort_order, code;
