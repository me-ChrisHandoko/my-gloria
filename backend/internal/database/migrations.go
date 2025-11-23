package database

import (
	"log"

	"gorm.io/gorm"
)

// RunCustomMigrations runs custom SQL migrations that GORM AutoMigrate doesn't support
// This includes indexes with DESC sorting, composite unique constraints, cross-schema FKs, and other PostgreSQL-specific features
func RunCustomMigrations(db *gorm.DB) error {
	log.Println("Running custom migrations...")

	// Execute all custom indexes
	for _, migration := range customIndexes {
		if err := db.Exec(migration.SQL).Error; err != nil {
			log.Printf("Warning: Failed to create index %s: %v", migration.Name, err)
			// Continue with other migrations, don't fail completely
		}
	}

	// Execute cross-schema foreign key constraints
	for _, migration := range crossSchemaForeignKeys {
		if err := db.Exec(migration.SQL).Error; err != nil {
			log.Printf("Warning: Failed to create cross-schema FK %s: %v", migration.Name, err)
		}
	}

	// Execute composite unique constraints
	for _, migration := range compositeUniqueConstraints {
		if err := db.Exec(migration.SQL).Error; err != nil {
			log.Printf("Warning: Failed to create constraint %s: %v", migration.Name, err)
		}
	}

	log.Println("Custom migrations completed!")
	return nil
}

type migration struct {
	Name string
	SQL  string
}

// Custom indexes with DESC sorting (from Prisma schema)
var customIndexes = []migration{
	// AuditLog indexes with DESC sorting
	{
		Name: "idx_audit_logs_actor_module_action_created",
		SQL: `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_module_action_created
			  ON gloria_ops.audit_logs(actor_profile_id, module, action, created_at DESC)`,
	},
	{
		Name: "idx_audit_logs_category_entity_created",
		SQL: `CREATE INDEX IF NOT EXISTS idx_audit_logs_category_entity_created
			  ON gloria_ops.audit_logs(category, entity_type, created_at DESC)`,
	},
	{
		Name: "idx_audit_logs_created_at_desc",
		SQL: `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc
			  ON gloria_ops.audit_logs(created_at DESC)`,
	},
	{
		Name: "idx_audit_logs_entity_type_id_created",
		SQL: `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id_created
			  ON gloria_ops.audit_logs(entity_type, entity_id, created_at DESC)`,
	},

	// Workflow indexes with DESC sorting
	{
		Name: "idx_workflow_started_at_desc",
		SQL: `CREATE INDEX IF NOT EXISTS idx_workflow_started_at_desc
			  ON gloria_ops.workflow(started_at DESC)`,
	},

	// BulkOperationProgress indexes
	{
		Name: "idx_bulk_operation_progress_initiated_started",
		SQL: `CREATE INDEX IF NOT EXISTS idx_bulk_operation_progress_initiated_started
			  ON gloria_ops.bulk_operation_progress(initiated_by, started_at)`,
	},
	{
		Name: "idx_bulk_operation_progress_status_started",
		SQL: `CREATE INDEX IF NOT EXISTS idx_bulk_operation_progress_status_started
			  ON gloria_ops.bulk_operation_progress(status, started_at)`,
	},

	// Additional performance indexes for common queries
	{
		Name: "idx_user_profiles_clerk_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_active
			  ON gloria_ops.user_profiles(clerk_user_id, is_active)`,
	},
	{
		Name: "idx_user_profiles_nip_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_profiles_nip_active
			  ON gloria_ops.user_profiles(nip, is_active)`,
	},

	// DataKaryawan indexes (gloria_master schema)
	{
		Name: "idx_data_karyawan_nip",
		SQL: `CREATE INDEX IF NOT EXISTS idx_data_karyawan_nip
			  ON gloria_master.data_karyawan(nip)`,
	},

	// Delegation indexes
	{
		Name: "idx_delegations_delegate_type_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_delegations_delegate_type_active
			  ON gloria_ops.delegations(delegate_id, type, is_active)`,
	},
	{
		Name: "idx_delegations_delegator_type_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_delegations_delegator_type_active
			  ON gloria_ops.delegations(delegator_id, type, is_active)`,
	},
	{
		Name: "idx_delegations_type_effective",
		SQL: `CREATE INDEX IF NOT EXISTS idx_delegations_type_effective
			  ON gloria_ops.delegations(type, effective_from, effective_until)`,
	},

	// Position indexes
	{
		Name: "idx_positions_dept_hierarchy_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_positions_dept_hierarchy_active
			  ON gloria_ops.positions(department_id, hierarchy_level, is_active)`,
	},
	{
		Name: "idx_positions_school_dept_hierarchy_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_positions_school_dept_hierarchy_active
			  ON gloria_ops.positions(school_id, department_id, hierarchy_level, is_active)`,
	},

	// UserPosition indexes
	{
		Name: "idx_user_positions_position_active_dates",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_positions_position_active_dates
			  ON gloria_ops.user_positions(position_id, is_active, start_date, end_date)`,
	},
	{
		Name: "idx_user_positions_user_active_dates",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_positions_user_active_dates
			  ON gloria_ops.user_positions(user_profile_id, is_active, start_date, end_date)`,
	},

	// UserPermission indexes
	{
		Name: "idx_user_permissions_effective_dates",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_permissions_effective_dates
			  ON gloria_ops.user_permissions(effective_from, effective_until)`,
	},
	{
		Name: "idx_user_permissions_resource",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_permissions_resource
			  ON gloria_ops.user_permissions(resource_type, resource_id)`,
	},
	{
		Name: "idx_user_permissions_user_granted",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_permissions_user_granted
			  ON gloria_ops.user_permissions(user_profile_id, is_granted)`,
	},

	// Module indexes
	{
		Name: "idx_modules_category_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_modules_category_active
			  ON gloria_ops.modules(category, is_active)`,
	},
	{
		Name: "idx_modules_visible_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_modules_visible_active
			  ON gloria_ops.modules(is_visible, is_active)`,
	},
	{
		Name: "idx_modules_parent_active_sort",
		SQL: `CREATE INDEX IF NOT EXISTS idx_modules_parent_active_sort
			  ON gloria_ops.modules(parent_id, is_active, sort_order)`,
	},
	{
		Name: "idx_modules_id_version",
		SQL: `CREATE INDEX IF NOT EXISTS idx_modules_id_version
			  ON gloria_ops.modules(id, version)`,
	},

	// RoleModuleAccess indexes
	{
		Name: "idx_role_module_access_id_version",
		SQL: `CREATE INDEX IF NOT EXISTS idx_role_module_access_id_version
			  ON gloria_ops.role_module_access(id, version)`,
	},

	// UserModuleAccess indexes
	{
		Name: "idx_user_module_access_user_module_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_module_access_user_module_active
			  ON gloria_ops.user_module_access(user_profile_id, module_id, is_active)`,
	},
	{
		Name: "idx_user_module_access_id_version",
		SQL: `CREATE INDEX IF NOT EXISTS idx_user_module_access_id_version
			  ON gloria_ops.user_module_access(id, version)`,
	},

	// Permission indexes
	{
		Name: "idx_permissions_category_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_permissions_category_active
			  ON gloria_ops.permissions(category, is_active)`,
	},
	{
		Name: "idx_permissions_resource_action",
		SQL: `CREATE INDEX IF NOT EXISTS idx_permissions_resource_action
			  ON gloria_ops.permissions(resource, action)`,
	},

	// RolePermission indexes
	{
		Name: "idx_role_permissions_role_granted",
		SQL: `CREATE INDEX IF NOT EXISTS idx_role_permissions_role_granted
			  ON gloria_ops.role_permissions(role_id, is_granted)`,
	},

	// ApiKey indexes
	{
		Name: "idx_api_keys_active_expires",
		SQL: `CREATE INDEX IF NOT EXISTS idx_api_keys_active_expires
			  ON gloria_ops.api_keys(is_active, expires_at)`,
	},

	// School indexes
	{
		Name: "idx_schools_lokasi_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_schools_lokasi_active
			  ON gloria_ops.schools(lokasi, is_active)`,
	},

	// Department indexes
	{
		Name: "idx_departments_school_active",
		SQL: `CREATE INDEX IF NOT EXISTS idx_departments_school_active
			  ON gloria_ops.departments(school_id, is_active)`,
	},
}

// Cross-schema foreign key constraints
// These are added manually because GORM's DisableForeignKeyConstraintWhenMigrating is enabled
var crossSchemaForeignKeys = []migration{
	// UserProfile.NIP -> DataKaryawan.NIP (cross-schema: gloria_ops -> gloria_master)
	// Note: ON DELETE RESTRICT because NIP is required (not null) in UserProfile
	{
		Name: "fk_user_profiles_data_karyawan_nip",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_profiles_data_karyawan_nip') THEN
			      ALTER TABLE gloria_ops.user_profiles
			      ADD CONSTRAINT fk_user_profiles_data_karyawan_nip
			      FOREIGN KEY (nip) REFERENCES gloria_master.data_karyawan(nip)
			      ON UPDATE CASCADE ON DELETE RESTRICT;
			    END IF;
			  END $$`,
	},
}

// Composite unique constraints that need manual creation
var compositeUniqueConstraints = []migration{
	// RoleHierarchy unique constraint
	{
		Name: "uq_role_hierarchy_role_parent",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_role_hierarchy_role_parent') THEN
			      ALTER TABLE gloria_ops.role_hierarchy
			      ADD CONSTRAINT uq_role_hierarchy_role_parent UNIQUE (role_id, parent_role_id);
			    END IF;
			  END $$`,
	},

	// RoleModuleAccess unique constraint
	{
		Name: "uq_role_module_access_role_module",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_role_module_access_role_module') THEN
			      ALTER TABLE gloria_ops.role_module_access
			      ADD CONSTRAINT uq_role_module_access_role_module UNIQUE (role_id, module_id);
			    END IF;
			  END $$`,
	},

	// RolePermission unique constraint
	{
		Name: "uq_role_permissions_role_permission",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_role_permissions_role_permission') THEN
			      ALTER TABLE gloria_ops.role_permissions
			      ADD CONSTRAINT uq_role_permissions_role_permission UNIQUE (role_id, permission_id);
			    END IF;
			  END $$`,
	},

	// UserRole unique constraint
	{
		Name: "uq_user_roles_user_role",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_roles_user_role') THEN
			      ALTER TABLE gloria_ops.user_roles
			      ADD CONSTRAINT uq_user_roles_user_role UNIQUE (user_profile_id, role_id);
			    END IF;
			  END $$`,
	},

	// UserPosition unique constraint
	{
		Name: "uq_user_positions_user_position_start",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_positions_user_position_start') THEN
			      ALTER TABLE gloria_ops.user_positions
			      ADD CONSTRAINT uq_user_positions_user_position_start UNIQUE (user_profile_id, position_id, start_date);
			    END IF;
			  END $$`,
	},

	// UserPermission unique constraint
	{
		Name: "uq_user_permissions_user_permission_resource",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_permissions_user_permission_resource') THEN
			      ALTER TABLE gloria_ops.user_permissions
			      ADD CONSTRAINT uq_user_permissions_user_permission_resource
			      UNIQUE (user_profile_id, permission_id, resource_type, resource_id);
			    END IF;
			  END $$`,
	},

	// ModulePermission unique constraint
	{
		Name: "uq_module_permissions_module_action_scope",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_module_permissions_module_action_scope') THEN
			      ALTER TABLE gloria_ops.module_permissions
			      ADD CONSTRAINT uq_module_permissions_module_action_scope UNIQUE (module_id, action, scope);
			    END IF;
			  END $$`,
	},

	// Permission unique constraint
	{
		Name: "uq_permissions_resource_action_scope",
		SQL: `DO $$
			  BEGIN
			    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_permissions_resource_action_scope') THEN
			      ALTER TABLE gloria_ops.permissions
			      ADD CONSTRAINT uq_permissions_resource_action_scope UNIQUE (resource, action, scope);
			    END IF;
			  END $$`,
	},
}

// DropCustomIndexes removes all custom indexes (useful for clean migrations)
func DropCustomIndexes(db *gorm.DB) error {
	log.Println("Dropping custom indexes...")

	for _, idx := range customIndexes {
		// Extract index name from the migration name
		sql := "DROP INDEX IF EXISTS gloria_ops." + idx.Name
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("Warning: Failed to drop index %s: %v", idx.Name, err)
		}
	}

	log.Println("Custom indexes dropped!")
	return nil
}
