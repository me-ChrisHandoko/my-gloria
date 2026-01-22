package main

import (
	"fmt"
	"log"
	"time"

	"backend/configs"
	"backend/internal/database"
	"backend/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Load configuration
	cfg := configs.LoadConfig()

	// Initialize database
	if err := database.InitDB(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db := database.GetDB()

	fmt.Println("✅ Connected to database successfully")

	// Delete existing permissions with CASCADE
	fmt.Println("🗑️  Deleting existing permissions...")

	// First delete dependent data
	fmt.Println("  Deleting role_permissions...")
	if err := db.Exec("DELETE FROM public.role_permissions").Error; err != nil {
		log.Printf("Warning: Error deleting role_permissions: %v", err)
	}

	fmt.Println("  Deleting user_permissions...")
	if err := db.Exec("DELETE FROM public.user_permissions").Error; err != nil {
		log.Printf("Warning: Error deleting user_permissions: %v", err)
	}

	fmt.Println("  Deleting permissions...")
	if err := db.Exec("DELETE FROM public.permissions").Error; err != nil {
		log.Fatal("Error deleting permissions:", err)
	}

	// Seed permissions
	permissions := getPermissions()

	fmt.Printf("📝 Creating %d permissions...\n", len(permissions))

	for i, perm := range permissions {
		if err := db.Create(&perm).Error; err != nil {
			log.Printf("Error creating permission %d (%s): %v", i+1, perm.Code, err)
			continue
		}

		if (i+1)%10 == 0 {
			fmt.Printf("  Created %d/%d permissions...\n", i+1, len(permissions))
		}
	}

	fmt.Println("✅ Permissions seed completed!")

	// Verify
	var count int64
	db.Model(&models.Permission{}).Count(&count)
	fmt.Printf("✅ Total permissions in database: %d\n", count)

	// Stats by category
	fmt.Println("\n📊 Permissions per Category:")
	var categoryStats []struct {
		Category string
		Count    int64
	}
	db.Model(&models.Permission{}).
		Select("category, count(*) as count").
		Group("category").
		Order("category").
		Find(&categoryStats)

	for _, stat := range categoryStats {
		fmt.Printf("  - %-15s: %d permissions\n", stat.Category, stat.Count)
	}

	// Stats by action
	fmt.Println("\n📋 Permissions per Action:")
	var actionStats []struct {
		Action models.PermissionAction
		Count  int64
	}
	db.Model(&models.Permission{}).
		Select("action, count(*) as count").
		Group("action").
		Order("action").
		Find(&actionStats)

	for _, stat := range actionStats {
		fmt.Printf("  - %-10s: %d permissions\n", stat.Action, stat.Count)
	}

	// Stats by scope
	fmt.Println("\n🎯 Permissions per Scope:")
	var scopeStats []struct {
		Scope models.PermissionScope
		Count int64
	}
	db.Model(&models.Permission{}).
		Select("scope, count(*) as count").
		Where("scope IS NOT NULL").
		Group("scope").
		Order("scope").
		Find(&scopeStats)

	for _, stat := range scopeStats {
		fmt.Printf("  - %-12s: %d permissions\n", stat.Scope, stat.Count)
	}

	// System permissions
	var systemCount int64
	db.Model(&models.Permission{}).Where("is_system_permission = ?", true).Count(&systemCount)
	fmt.Printf("\n🔒 System Permissions: %d\n", systemCount)
	fmt.Printf("👥 Regular Permissions: %d\n", count-systemCount)
}

func getPermissions() []models.Permission {
	now := time.Now()
	scopeAll := models.PermissionScopeAll
	scopeOwn := models.PermissionScopeOwn
	scopeDept := models.PermissionScopeDepartment
	scopeSchool := models.PermissionScopeSchool
	catSystem := models.ModuleCategorySystem
	catService := models.ModuleCategoryService
	catPerformance := models.ModuleCategoryPerformance
	catQuality := models.ModuleCategoryQuality

	return []models.Permission{
		// Dashboard
		{ID: "650e8400-e29b-41d4-a716-446655440001", Code: "PERM_DASHBOARD_READ", Name: "View Dashboard", Resource: "dashboard", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Akses untuk melihat dashboard utama"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Dashboard"), GroupIcon: strPtr("LayoutDashboard"), GroupSortOrder: intPtr(0), CreatedAt: now, UpdatedAt: now},

		// Users
		{ID: "650e8400-e29b-41d4-a716-446655440002", Code: "PERM_USERS_CREATE", Name: "Create User", Resource: "users", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Membuat pengguna baru"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Pengguna"), GroupIcon: strPtr("UserCog"), GroupSortOrder: intPtr(3), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440003", Code: "PERM_USERS_READ", Name: "View Users", Resource: "users", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail pengguna"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Pengguna"), GroupIcon: strPtr("UserCog"), GroupSortOrder: intPtr(3), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440004", Code: "PERM_USERS_UPDATE", Name: "Update User", Resource: "users", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data pengguna"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Pengguna"), GroupIcon: strPtr("UserCog"), GroupSortOrder: intPtr(3), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440005", Code: "PERM_USERS_DELETE", Name: "Delete User", Resource: "users", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus pengguna"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Pengguna"), GroupIcon: strPtr("UserCog"), GroupSortOrder: intPtr(3), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440056", Code: "PERM_USERS_EXPORT", Name: "Export Users", Resource: "users", Action: models.PermissionActionExport, Scope: &scopeAll, Description: strPtr("Export data pengguna ke Excel/CSV"), IsSystemPermission: false, IsActive: true, Category: &catSystem, GroupName: strPtr("Pengguna"), GroupIcon: strPtr("UserCog"), GroupSortOrder: intPtr(3), CreatedAt: now, UpdatedAt: now},

		// Roles
		{ID: "650e8400-e29b-41d4-a716-446655440006", Code: "PERM_ROLES_CREATE", Name: "Create Role", Resource: "roles", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Membuat role baru"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440007", Code: "PERM_ROLES_READ", Name: "View Roles", Resource: "roles", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail roles"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440008", Code: "PERM_ROLES_UPDATE", Name: "Update Role", Resource: "roles", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data role"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440009", Code: "PERM_ROLES_DELETE", Name: "Delete Role", Resource: "roles", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus role"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440010", Code: "PERM_ROLES_ASSIGN", Name: "Assign Role to User", Resource: "roles", Action: models.PermissionActionAssign, Scope: &scopeAll, Description: strPtr("Assign role ke pengguna"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},

		// Permissions
		{ID: "650e8400-e29b-41d4-a716-446655440011", Code: "PERM_PERMISSIONS_CREATE", Name: "Create Permission", Resource: "permissions", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Membuat permission baru"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440012", Code: "PERM_PERMISSIONS_READ", Name: "View Permissions", Resource: "permissions", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail permissions"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440013", Code: "PERM_PERMISSIONS_UPDATE", Name: "Update Permission", Resource: "permissions", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data permission"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440014", Code: "PERM_PERMISSIONS_DELETE", Name: "Delete Permission", Resource: "permissions", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus permission"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},

		// Modules
		{ID: "650e8400-e29b-41d4-a716-446655440015", Code: "PERM_MODULES_CREATE", Name: "Create Module", Resource: "modules", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Membuat module baru"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440016", Code: "PERM_MODULES_READ", Name: "View Modules", Resource: "modules", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail modules"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440017", Code: "PERM_MODULES_UPDATE", Name: "Update Module", Resource: "modules", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data module"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440018", Code: "PERM_MODULES_DELETE", Name: "Delete Module", Resource: "modules", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus module"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Akses & Roles"), GroupIcon: strPtr("Shield"), GroupSortOrder: intPtr(5), CreatedAt: now, UpdatedAt: now},

		// Delegations
		{ID: "650e8400-e29b-41d4-a716-446655440019", Code: "PERM_DELEGATIONS_CREATE", Name: "Create Delegation", Resource: "delegations", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Membuat delegasi wewenang baru"), IsSystemPermission: false, IsActive: true, Category: &catSystem, GroupName: strPtr("Delegasi"), GroupIcon: strPtr("GitBranch"), GroupSortOrder: intPtr(6), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440020", Code: "PERM_DELEGATIONS_READ", Name: "View Delegations", Resource: "delegations", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail delegasi"), IsSystemPermission: false, IsActive: true, Category: &catSystem, GroupName: strPtr("Delegasi"), GroupIcon: strPtr("GitBranch"), GroupSortOrder: intPtr(6), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440021", Code: "PERM_DELEGATIONS_UPDATE", Name: "Update Delegation", Resource: "delegations", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data delegasi"), IsSystemPermission: false, IsActive: true, Category: &catSystem, GroupName: strPtr("Delegasi"), GroupIcon: strPtr("GitBranch"), GroupSortOrder: intPtr(6), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440022", Code: "PERM_DELEGATIONS_DELETE", Name: "Delete Delegation", Resource: "delegations", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus delegasi"), IsSystemPermission: false, IsActive: true, Category: &catSystem, GroupName: strPtr("Delegasi"), GroupIcon: strPtr("GitBranch"), GroupSortOrder: intPtr(6), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440023", Code: "PERM_DELEGATIONS_APPROVE", Name: "Approve Delegation", Resource: "delegations", Action: models.PermissionActionApprove, Scope: &scopeAll, Description: strPtr("Menyetujui permintaan delegasi"), IsSystemPermission: true, IsActive: true, Category: &catSystem, GroupName: strPtr("Delegasi"), GroupIcon: strPtr("GitBranch"), GroupSortOrder: intPtr(6), CreatedAt: now, UpdatedAt: now},

		// Employees dengan berbagai scope
		{ID: "650e8400-e29b-41d4-a716-446655440024", Code: "PERM_EMPLOYEES_CREATE", Name: "Create Employee", Resource: "employees", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Menambahkan karyawan baru"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440025", Code: "PERM_EMPLOYEES_READ", Name: "View Employees", Resource: "employees", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail karyawan semua sekolah"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440026", Code: "PERM_EMPLOYEES_READ_OWN", Name: "View Own Employee Data", Resource: "employees", Action: models.PermissionActionRead, Scope: &scopeOwn, Description: strPtr("Melihat data karyawan sendiri"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440027", Code: "PERM_EMPLOYEES_READ_DEPT", Name: "View Department Employees", Resource: "employees", Action: models.PermissionActionRead, Scope: &scopeDept, Description: strPtr("Melihat karyawan dalam departemen yang sama"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440057", Code: "PERM_EMPLOYEES_READ_SCHOOL", Name: "View School Employees", Resource: "employees", Action: models.PermissionActionRead, Scope: &scopeSchool, Description: strPtr("Melihat karyawan dalam sekolah yang sama"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440028", Code: "PERM_EMPLOYEES_UPDATE", Name: "Update Employee", Resource: "employees", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data karyawan"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440029", Code: "PERM_EMPLOYEES_DELETE", Name: "Delete Employee", Resource: "employees", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus data karyawan"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440030", Code: "PERM_EMPLOYEES_EXPORT", Name: "Export Employees", Resource: "employees", Action: models.PermissionActionExport, Scope: &scopeAll, Description: strPtr("Export data karyawan ke Excel/CSV"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440058", Code: "PERM_EMPLOYEES_IMPORT", Name: "Import Employees", Resource: "employees", Action: models.PermissionActionImport, Scope: &scopeAll, Description: strPtr("Import data karyawan dari Excel/CSV"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440059", Code: "PERM_EMPLOYEES_PRINT", Name: "Print Employee Report", Resource: "employees", Action: models.PermissionActionPrint, Scope: &scopeAll, Description: strPtr("Cetak laporan data karyawan"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Karyawan"), GroupIcon: strPtr("Users"), GroupSortOrder: intPtr(2), CreatedAt: now, UpdatedAt: now},

		// Schools
		{ID: "650e8400-e29b-41d4-a716-446655440031", Code: "PERM_SCHOOLS_CREATE", Name: "Create School", Resource: "schools", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Menambahkan sekolah baru"), IsSystemPermission: true, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440032", Code: "PERM_SCHOOLS_READ", Name: "View Schools", Resource: "schools", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail semua sekolah"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440060", Code: "PERM_SCHOOLS_READ_SCHOOL", Name: "View Own School", Resource: "schools", Action: models.PermissionActionRead, Scope: &scopeSchool, Description: strPtr("Melihat data sekolah sendiri"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440033", Code: "PERM_SCHOOLS_UPDATE", Name: "Update School", Resource: "schools", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data sekolah"), IsSystemPermission: true, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440034", Code: "PERM_SCHOOLS_DELETE", Name: "Delete School", Resource: "schools", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus sekolah"), IsSystemPermission: true, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440061", Code: "PERM_SCHOOLS_EXPORT", Name: "Export Schools", Resource: "schools", Action: models.PermissionActionExport, Scope: &scopeAll, Description: strPtr("Export data sekolah ke Excel/CSV"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},

		// Departments
		{ID: "650e8400-e29b-41d4-a716-446655440035", Code: "PERM_DEPARTMENTS_CREATE", Name: "Create Department", Resource: "departments", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Menambahkan departemen baru"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440036", Code: "PERM_DEPARTMENTS_READ", Name: "View Departments", Resource: "departments", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail semua departemen"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440062", Code: "PERM_DEPARTMENTS_READ_SCHOOL", Name: "View School Departments", Resource: "departments", Action: models.PermissionActionRead, Scope: &scopeSchool, Description: strPtr("Melihat departemen dalam sekolah yang sama"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440063", Code: "PERM_DEPARTMENTS_READ_DEPT", Name: "View Own Department", Resource: "departments", Action: models.PermissionActionRead, Scope: &scopeDept, Description: strPtr("Melihat data departemen sendiri"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440037", Code: "PERM_DEPARTMENTS_UPDATE", Name: "Update Department", Resource: "departments", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data departemen"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440038", Code: "PERM_DEPARTMENTS_DELETE", Name: "Delete Department", Resource: "departments", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus departemen"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},

		// Positions
		{ID: "650e8400-e29b-41d4-a716-446655440039", Code: "PERM_POSITIONS_CREATE", Name: "Create Position", Resource: "positions", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Menambahkan posisi/jabatan baru"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440040", Code: "PERM_POSITIONS_READ", Name: "View Positions", Resource: "positions", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail posisi"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440041", Code: "PERM_POSITIONS_UPDATE", Name: "Update Position", Resource: "positions", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah data posisi"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440042", Code: "PERM_POSITIONS_DELETE", Name: "Delete Position", Resource: "positions", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus posisi"), IsSystemPermission: false, IsActive: true, Category: &catService, GroupName: strPtr("Organisasi"), GroupIcon: strPtr("Building2"), GroupSortOrder: intPtr(4), CreatedAt: now, UpdatedAt: now},

		// Workflow Rules
		{ID: "650e8400-e29b-41d4-a716-446655440043", Code: "PERM_WORKFLOW_RULES_CREATE", Name: "Create Workflow Rule", Resource: "workflow_rules", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Membuat aturan workflow baru"), IsSystemPermission: true, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440044", Code: "PERM_WORKFLOW_RULES_READ", Name: "View Workflow Rules", Resource: "workflow_rules", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail aturan workflow"), IsSystemPermission: false, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440045", Code: "PERM_WORKFLOW_RULES_UPDATE", Name: "Update Workflow Rule", Resource: "workflow_rules", Action: models.PermissionActionUpdate, Scope: &scopeAll, Description: strPtr("Mengubah aturan workflow"), IsSystemPermission: true, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440046", Code: "PERM_WORKFLOW_RULES_DELETE", Name: "Delete Workflow Rule", Resource: "workflow_rules", Action: models.PermissionActionDelete, Scope: &scopeAll, Description: strPtr("Menghapus aturan workflow"), IsSystemPermission: true, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},

		// Workflow Instances
		{ID: "650e8400-e29b-41d4-a716-446655440047", Code: "PERM_WORKFLOW_INSTANCES_READ", Name: "View Workflow Instances", Resource: "workflow_instances", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat daftar dan detail workflow instances"), IsSystemPermission: false, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440048", Code: "PERM_WORKFLOW_INSTANCES_READ_OWN", Name: "View Own Workflow Instances", Resource: "workflow_instances", Action: models.PermissionActionRead, Scope: &scopeOwn, Description: strPtr("Melihat workflow instances milik sendiri"), IsSystemPermission: false, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440064", Code: "PERM_WORKFLOW_INSTANCES_READ_DEPT", Name: "View Department Workflow Instances", Resource: "workflow_instances", Action: models.PermissionActionRead, Scope: &scopeDept, Description: strPtr("Melihat workflow instances dalam departemen yang sama"), IsSystemPermission: false, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440049", Code: "PERM_WORKFLOW_INSTANCES_APPROVE", Name: "Approve Workflow", Resource: "workflow_instances", Action: models.PermissionActionApprove, Scope: &scopeAll, Description: strPtr("Menyetujui workflow instance"), IsSystemPermission: false, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440050", Code: "PERM_WORKFLOW_INSTANCES_CLOSE", Name: "Close Workflow", Resource: "workflow_instances", Action: models.PermissionActionClose, Scope: &scopeAll, Description: strPtr("Menutup/membatalkan workflow instance"), IsSystemPermission: true, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},

		// Bulk Operations
		{ID: "650e8400-e29b-41d4-a716-446655440051", Code: "PERM_BULK_OPS_CREATE", Name: "Execute Bulk Operations", Resource: "bulk_operations", Action: models.PermissionActionCreate, Scope: &scopeAll, Description: strPtr("Menjalankan operasi massal"), IsSystemPermission: true, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440052", Code: "PERM_BULK_OPS_READ", Name: "View Bulk Operations", Resource: "bulk_operations", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat history operasi massal"), IsSystemPermission: false, IsActive: true, Category: &catPerformance, GroupName: strPtr("Workflow"), GroupIcon: strPtr("Workflow"), GroupSortOrder: intPtr(7), CreatedAt: now, UpdatedAt: now},

		// Audit Logs
		{ID: "650e8400-e29b-41d4-a716-446655440053", Code: "PERM_AUDIT_READ", Name: "View Audit Logs", Resource: "audit", Action: models.PermissionActionRead, Scope: &scopeAll, Description: strPtr("Melihat audit logs sistem"), IsSystemPermission: true, IsActive: true, Category: &catQuality, GroupName: strPtr("Audit Logs"), GroupIcon: strPtr("FileText"), GroupSortOrder: intPtr(8), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440054", Code: "PERM_AUDIT_READ_OWN", Name: "View Own Audit Logs", Resource: "audit", Action: models.PermissionActionRead, Scope: &scopeOwn, Description: strPtr("Melihat audit logs aktivitas sendiri"), IsSystemPermission: false, IsActive: true, Category: &catQuality, GroupName: strPtr("Audit Logs"), GroupIcon: strPtr("FileText"), GroupSortOrder: intPtr(8), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440065", Code: "PERM_AUDIT_READ_DEPT", Name: "View Department Audit Logs", Resource: "audit", Action: models.PermissionActionRead, Scope: &scopeDept, Description: strPtr("Melihat audit logs dalam departemen yang sama"), IsSystemPermission: false, IsActive: true, Category: &catQuality, GroupName: strPtr("Audit Logs"), GroupIcon: strPtr("FileText"), GroupSortOrder: intPtr(8), CreatedAt: now, UpdatedAt: now},
		{ID: "650e8400-e29b-41d4-a716-446655440055", Code: "PERM_AUDIT_EXPORT", Name: "Export Audit Logs", Resource: "audit", Action: models.PermissionActionExport, Scope: &scopeAll, Description: strPtr("Export audit logs ke Excel/CSV"), IsSystemPermission: true, IsActive: true, Category: &catQuality, GroupName: strPtr("Audit Logs"), GroupIcon: strPtr("FileText"), GroupSortOrder: intPtr(8), CreatedAt: now, UpdatedAt: now},
	}
}

func strPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}
