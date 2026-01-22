-- Permission Insert Script (Updated with Backend Enum Actions)
-- Generated for YPK Gloria RBAC System
-- Actions: CREATE, READ, UPDATE, DELETE, APPROVE, EXPORT, IMPORT, PRINT, ASSIGN, CLOSE
-- Scopes: OWN, DEPARTMENT, SCHOOL, ALL

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO permissions (id, code, name, description, resource, action, scope, is_system_permission, is_active, category, group_name, group_icon, group_sort_order, created_at, updated_at)
VALUES
    -- 1. DASHBOARD (READ, EXPORT per scope)
    (gen_random_uuid(), 'dashboard.read.own', 'View Own Dashboard', 'Akses untuk melihat dashboard sendiri', 'dashboard', 'READ', 'OWN', true, true, 'core', 'Dashboard', 'LayoutDashboard', 1, NOW(), NOW()),
    (gen_random_uuid(), 'dashboard.read.department', 'View Department Dashboard', 'Akses untuk melihat dashboard departemen', 'dashboard', 'READ', 'DEPARTMENT', true, true, 'core', 'Dashboard', 'LayoutDashboard', 1, NOW(), NOW()),
    (gen_random_uuid(), 'dashboard.read.school', 'View School Dashboard', 'Akses untuk melihat dashboard sekolah', 'dashboard', 'READ', 'SCHOOL', true, true, 'core', 'Dashboard', 'LayoutDashboard', 1, NOW(), NOW()),
    (gen_random_uuid(), 'dashboard.read.all', 'View All Dashboards', 'Akses untuk melihat semua dashboard', 'dashboard', 'READ', 'ALL', true, true, 'core', 'Dashboard', 'LayoutDashboard', 1, NOW(), NOW()),
    (gen_random_uuid(), 'dashboard.export.all', 'Export Dashboard Data', 'Akses untuk export data dashboard', 'dashboard', 'EXPORT', 'ALL', true, true, 'core', 'Dashboard', 'LayoutDashboard', 1, NOW(), NOW()),

    -- 2. KARYAWAN (CREATE, READ, UPDATE, DELETE, EXPORT, IMPORT per scope)
    (gen_random_uuid(), 'employees.create.own', 'Create Own Employee', 'Membuat data karyawan sendiri', 'employees', 'CREATE', 'OWN', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.create.department', 'Create Department Employee', 'Membuat data karyawan di departemen', 'employees', 'CREATE', 'DEPARTMENT', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.create.school', 'Create School Employee', 'Membuat data karyawan di sekolah', 'employees', 'CREATE', 'SCHOOL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.create.all', 'Create All Employees', 'Membuat data karyawan di semua scope', 'employees', 'CREATE', 'ALL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.read.own', 'Read Own Employee', 'Melihat data karyawan sendiri', 'employees', 'READ', 'OWN', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.read.department', 'Read Department Employees', 'Melihat data karyawan di departemen', 'employees', 'READ', 'DEPARTMENT', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.read.school', 'Read School Employees', 'Melihat data karyawan di sekolah', 'employees', 'READ', 'SCHOOL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.read.all', 'Read All Employees', 'Melihat semua data karyawan', 'employees', 'READ', 'ALL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.update.own', 'Update Own Employee', 'Mengubah data karyawan sendiri', 'employees', 'UPDATE', 'OWN', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.update.department', 'Update Department Employees', 'Mengubah data karyawan di departemen', 'employees', 'UPDATE', 'DEPARTMENT', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.update.school', 'Update School Employees', 'Mengubah data karyawan di sekolah', 'employees', 'UPDATE', 'SCHOOL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.update.all', 'Update All Employees', 'Mengubah semua data karyawan', 'employees', 'UPDATE', 'ALL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.delete.own', 'Delete Own Employee', 'Menghapus data karyawan sendiri', 'employees', 'DELETE', 'OWN', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.delete.department', 'Delete Department Employees', 'Menghapus data karyawan di departemen', 'employees', 'DELETE', 'DEPARTMENT', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.delete.school', 'Delete School Employees', 'Menghapus data karyawan di sekolah', 'employees', 'DELETE', 'SCHOOL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.delete.all', 'Delete All Employees', 'Menghapus semua data karyawan', 'employees', 'DELETE', 'ALL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.export.all', 'Export Employees', 'Export data karyawan', 'employees', 'EXPORT', 'ALL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),
    (gen_random_uuid(), 'employees.import.all', 'Import Employees', 'Import data karyawan', 'employees', 'IMPORT', 'ALL', true, true, 'hr', 'Karyawan', 'Users', 2, NOW(), NOW()),

    -- 3. PENGGUNA (CREATE, READ, UPDATE, DELETE, ASSIGN per scope)
    (gen_random_uuid(), 'users.create.department', 'Create Department Users', 'Membuat pengguna di departemen', 'users', 'CREATE', 'DEPARTMENT', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.create.school', 'Create School Users', 'Membuat pengguna di sekolah', 'users', 'CREATE', 'SCHOOL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.create.all', 'Create All Users', 'Membuat pengguna di semua scope', 'users', 'CREATE', 'ALL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.read.own', 'Read Own User', 'Melihat data pengguna sendiri', 'users', 'READ', 'OWN', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.read.department', 'Read Department Users', 'Melihat pengguna di departemen', 'users', 'READ', 'DEPARTMENT', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.read.school', 'Read School Users', 'Melihat pengguna di sekolah', 'users', 'READ', 'SCHOOL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.read.all', 'Read All Users', 'Melihat semua pengguna', 'users', 'READ', 'ALL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.update.own', 'Update Own User', 'Mengubah data pengguna sendiri', 'users', 'UPDATE', 'OWN', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.update.department', 'Update Department Users', 'Mengubah pengguna di departemen', 'users', 'UPDATE', 'DEPARTMENT', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.update.school', 'Update School Users', 'Mengubah pengguna di sekolah', 'users', 'UPDATE', 'SCHOOL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.update.all', 'Update All Users', 'Mengubah semua pengguna', 'users', 'UPDATE', 'ALL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.delete.department', 'Delete Department Users', 'Menghapus pengguna di departemen', 'users', 'DELETE', 'DEPARTMENT', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.delete.school', 'Delete School Users', 'Menghapus pengguna di sekolah', 'users', 'DELETE', 'SCHOOL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.delete.all', 'Delete All Users', 'Menghapus semua pengguna', 'users', 'DELETE', 'ALL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),
    (gen_random_uuid(), 'users.assign.all', 'Assign User Roles', 'Menugaskan role ke pengguna', 'users', 'ASSIGN', 'ALL', true, true, 'core', 'Pengguna', 'UserCog', 3, NOW(), NOW()),

    -- 4. ORGANISASI - Departments, Schools, Positions (CREATE, READ, UPDATE, DELETE per scope)
    (gen_random_uuid(), 'departments.create.school', 'Create School Departments', 'Membuat departemen di sekolah', 'departments', 'CREATE', 'SCHOOL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.create.all', 'Create All Departments', 'Membuat departemen di semua scope', 'departments', 'CREATE', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.read.own', 'Read Own Department', 'Melihat departemen sendiri', 'departments', 'READ', 'OWN', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.read.school', 'Read School Departments', 'Melihat departemen di sekolah', 'departments', 'READ', 'SCHOOL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.read.all', 'Read All Departments', 'Melihat semua departemen', 'departments', 'READ', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.update.own', 'Update Own Department', 'Mengubah departemen sendiri', 'departments', 'UPDATE', 'OWN', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.update.school', 'Update School Departments', 'Mengubah departemen di sekolah', 'departments', 'UPDATE', 'SCHOOL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.update.all', 'Update All Departments', 'Mengubah semua departemen', 'departments', 'UPDATE', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.delete.school', 'Delete School Departments', 'Menghapus departemen di sekolah', 'departments', 'DELETE', 'SCHOOL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'departments.delete.all', 'Delete All Departments', 'Menghapus semua departemen', 'departments', 'DELETE', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),

    (gen_random_uuid(), 'schools.create.all', 'Create Schools', 'Membuat data sekolah', 'schools', 'CREATE', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'schools.read.all', 'Read All Schools', 'Melihat semua sekolah', 'schools', 'READ', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'schools.update.all', 'Update Schools', 'Mengubah data sekolah', 'schools', 'UPDATE', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'schools.delete.all', 'Delete Schools', 'Menghapus data sekolah', 'schools', 'DELETE', 'ALL', true, true, 'core', 'Organisasi', 'Building2', 4, NOW(), NOW()),

    (gen_random_uuid(), 'positions.create.school', 'Create School Positions', 'Membuat posisi di sekolah', 'positions', 'CREATE', 'SCHOOL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.create.all', 'Create All Positions', 'Membuat posisi di semua scope', 'positions', 'CREATE', 'ALL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.read.school', 'Read School Positions', 'Melihat posisi di sekolah', 'positions', 'READ', 'SCHOOL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.read.all', 'Read All Positions', 'Melihat semua posisi', 'positions', 'READ', 'ALL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.update.school', 'Update School Positions', 'Mengubah posisi di sekolah', 'positions', 'UPDATE', 'SCHOOL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.update.all', 'Update All Positions', 'Mengubah semua posisi', 'positions', 'UPDATE', 'ALL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.delete.school', 'Delete School Positions', 'Menghapus posisi di sekolah', 'positions', 'DELETE', 'SCHOOL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),
    (gen_random_uuid(), 'positions.delete.all', 'Delete All Positions', 'Menghapus semua posisi', 'positions', 'DELETE', 'ALL', true, true, 'hr', 'Organisasi', 'Building2', 4, NOW(), NOW()),

    -- 5. AKSES & ROLES - Modules, Roles, Permissions (CREATE, READ, UPDATE, DELETE, ASSIGN per scope)
    (gen_random_uuid(), 'modules.create.all', 'Create Modules', 'Membuat modul sistem', 'modules', 'CREATE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'modules.read.all', 'Read All Modules', 'Melihat semua modul', 'modules', 'READ', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'modules.update.all', 'Update Modules', 'Mengubah modul sistem', 'modules', 'UPDATE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'modules.delete.all', 'Delete Modules', 'Menghapus modul sistem', 'modules', 'DELETE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),

    (gen_random_uuid(), 'permissions.create.all', 'Create Permissions', 'Membuat permission baru', 'permissions', 'CREATE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'permissions.read.all', 'Read All Permissions', 'Melihat semua permission', 'permissions', 'READ', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'permissions.update.all', 'Update Permissions', 'Mengubah permission', 'permissions', 'UPDATE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'permissions.delete.all', 'Delete Permissions', 'Menghapus permission', 'permissions', 'DELETE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),

    (gen_random_uuid(), 'roles.create.school', 'Create School Roles', 'Membuat role di sekolah', 'roles', 'CREATE', 'SCHOOL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.create.all', 'Create All Roles', 'Membuat role di semua scope', 'roles', 'CREATE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.read.school', 'Read School Roles', 'Melihat role di sekolah', 'roles', 'READ', 'SCHOOL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.read.all', 'Read All Roles', 'Melihat semua role', 'roles', 'READ', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.update.school', 'Update School Roles', 'Mengubah role di sekolah', 'roles', 'UPDATE', 'SCHOOL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.update.all', 'Update All Roles', 'Mengubah semua role', 'roles', 'UPDATE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.delete.school', 'Delete School Roles', 'Menghapus role di sekolah', 'roles', 'DELETE', 'SCHOOL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.delete.all', 'Delete All Roles', 'Menghapus semua role', 'roles', 'DELETE', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),
    (gen_random_uuid(), 'roles.assign.all', 'Assign Role Permissions', 'Menugaskan permission ke role', 'roles', 'ASSIGN', 'ALL', true, true, 'admin', 'Akses & Roles', 'Shield', 5, NOW(), NOW()),

    -- 6. DELEGASI (CREATE, READ, UPDATE, DELETE, APPROVE per scope)
    (gen_random_uuid(), 'delegations.create.own', 'Create Own Delegation', 'Membuat delegasi sendiri', 'delegations', 'CREATE', 'OWN', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.create.department', 'Create Department Delegations', 'Membuat delegasi di departemen', 'delegations', 'CREATE', 'DEPARTMENT', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.create.school', 'Create School Delegations', 'Membuat delegasi di sekolah', 'delegations', 'CREATE', 'SCHOOL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.create.all', 'Create All Delegations', 'Membuat delegasi di semua scope', 'delegations', 'CREATE', 'ALL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.read.own', 'Read Own Delegations', 'Melihat delegasi sendiri', 'delegations', 'READ', 'OWN', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.read.department', 'Read Department Delegations', 'Melihat delegasi di departemen', 'delegations', 'READ', 'DEPARTMENT', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.read.school', 'Read School Delegations', 'Melihat delegasi di sekolah', 'delegations', 'READ', 'SCHOOL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.read.all', 'Read All Delegations', 'Melihat semua delegasi', 'delegations', 'READ', 'ALL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.update.own', 'Update Own Delegations', 'Mengubah delegasi sendiri', 'delegations', 'UPDATE', 'OWN', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.update.department', 'Update Department Delegations', 'Mengubah delegasi di departemen', 'delegations', 'UPDATE', 'DEPARTMENT', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.update.school', 'Update School Delegations', 'Mengubah delegasi di sekolah', 'delegations', 'UPDATE', 'SCHOOL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.update.all', 'Update All Delegations', 'Mengubah semua delegasi', 'delegations', 'UPDATE', 'ALL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.delete.own', 'Delete Own Delegations', 'Menghapus delegasi sendiri', 'delegations', 'DELETE', 'OWN', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.delete.department', 'Delete Department Delegations', 'Menghapus delegasi di departemen', 'delegations', 'DELETE', 'DEPARTMENT', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.delete.school', 'Delete School Delegations', 'Menghapus delegasi di sekolah', 'delegations', 'DELETE', 'SCHOOL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.delete.all', 'Delete All Delegations', 'Menghapus semua delegasi', 'delegations', 'DELETE', 'ALL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),
    (gen_random_uuid(), 'delegations.approve.all', 'Approve Delegations', 'Menyetujui delegasi', 'delegations', 'APPROVE', 'ALL', true, true, 'admin', 'Delegasi', 'GitBranch', 6, NOW(), NOW()),

    -- 7. WORKFLOW (CREATE, READ, UPDATE, DELETE, APPROVE per scope)
    (gen_random_uuid(), 'workflows.create.department', 'Create Department Workflows', 'Membuat workflow di departemen', 'workflows', 'CREATE', 'DEPARTMENT', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.create.school', 'Create School Workflows', 'Membuat workflow di sekolah', 'workflows', 'CREATE', 'SCHOOL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.create.all', 'Create All Workflows', 'Membuat workflow di semua scope', 'workflows', 'CREATE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.read.own', 'Read Own Workflows', 'Melihat workflow sendiri', 'workflows', 'READ', 'OWN', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.read.department', 'Read Department Workflows', 'Melihat workflow di departemen', 'workflows', 'READ', 'DEPARTMENT', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.read.school', 'Read School Workflows', 'Melihat workflow di sekolah', 'workflows', 'READ', 'SCHOOL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.read.all', 'Read All Workflows', 'Melihat semua workflow', 'workflows', 'READ', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.update.department', 'Update Department Workflows', 'Mengubah workflow di departemen', 'workflows', 'UPDATE', 'DEPARTMENT', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.update.school', 'Update School Workflows', 'Mengubah workflow di sekolah', 'workflows', 'UPDATE', 'SCHOOL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.update.all', 'Update All Workflows', 'Mengubah semua workflow', 'workflows', 'UPDATE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.delete.department', 'Delete Department Workflows', 'Menghapus workflow di departemen', 'workflows', 'DELETE', 'DEPARTMENT', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.delete.school', 'Delete School Workflows', 'Menghapus workflow di sekolah', 'workflows', 'DELETE', 'SCHOOL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.delete.all', 'Delete All Workflows', 'Menghapus semua workflow', 'workflows', 'DELETE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflows.approve.all', 'Approve Workflows', 'Menyetujui workflow', 'workflows', 'APPROVE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),

    (gen_random_uuid(), 'workflow-rules.create.all', 'Create Workflow Rules', 'Membuat aturan workflow', 'workflow-rules', 'CREATE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflow-rules.read.all', 'Read All Workflow Rules', 'Melihat semua aturan workflow', 'workflow-rules', 'READ', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflow-rules.update.all', 'Update Workflow Rules', 'Mengubah aturan workflow', 'workflow-rules', 'UPDATE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),
    (gen_random_uuid(), 'workflow-rules.delete.all', 'Delete Workflow Rules', 'Menghapus aturan workflow', 'workflow-rules', 'DELETE', 'ALL', true, true, 'admin', 'Workflow', 'Workflow', 7, NOW(), NOW()),

    -- 8. AUDIT LOGS (READ, EXPORT per scope)
    (gen_random_uuid(), 'audit-logs.read.own', 'Read Own Audit Logs', 'Melihat log audit sendiri', 'audit-logs', 'READ', 'OWN', true, true, 'admin', 'Audit Logs', 'FileText', 8, NOW(), NOW()),
    (gen_random_uuid(), 'audit-logs.read.department', 'Read Department Audit Logs', 'Melihat log audit departemen', 'audit-logs', 'READ', 'DEPARTMENT', true, true, 'admin', 'Audit Logs', 'FileText', 8, NOW(), NOW()),
    (gen_random_uuid(), 'audit-logs.read.school', 'Read School Audit Logs', 'Melihat log audit sekolah', 'audit-logs', 'READ', 'SCHOOL', true, true, 'admin', 'Audit Logs', 'FileText', 8, NOW(), NOW()),
    (gen_random_uuid(), 'audit-logs.read.all', 'Read All Audit Logs', 'Melihat semua log audit', 'audit-logs', 'READ', 'ALL', true, true, 'admin', 'Audit Logs', 'FileText', 8, NOW(), NOW()),
    (gen_random_uuid(), 'audit-logs.export.all', 'Export Audit Logs', 'Export log audit', 'audit-logs', 'EXPORT', 'ALL', true, true, 'admin', 'Audit Logs', 'FileText', 8, NOW(), NOW());
