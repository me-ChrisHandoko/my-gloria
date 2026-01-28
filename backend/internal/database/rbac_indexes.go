package database

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// RBACIndex represents an index to be created for RBAC optimization
type RBACIndex struct {
	Name       string
	Table      string
	Columns    string
	Unique     bool
	Where      string // Partial index condition
	Using      string // Index method (btree, hash, gin, etc.)
}

// rbacIndexes defines all RBAC-related indexes for performance optimization
var rbacIndexes = []RBACIndex{
	// ===== User Permissions =====
	{
		Name:    "idx_user_permissions_user_effective",
		Table:   "public.user_permissions",
		Columns: "user_id, effective_from, effective_until",
	},
	{
		Name:    "idx_user_permissions_permission_user",
		Table:   "public.user_permissions",
		Columns: "permission_id, user_id",
	},
	{
		Name:    "idx_user_permissions_priority",
		Table:   "public.user_permissions",
		Columns: "user_id, priority, is_granted",
	},
	{
		Name:    "idx_user_permissions_active_effective",
		Table:   "public.user_permissions",
		Columns: "user_id, is_granted",
		Where:   "effective_from <= NOW() AND (effective_until IS NULL OR effective_until >= NOW())",
	},

	// ===== User Roles =====
	{
		Name:    "idx_user_roles_user_active",
		Table:   "public.user_roles",
		Columns: "user_id, is_active",
	},
	{
		Name:    "idx_user_roles_effective_dates",
		Table:   "public.user_roles",
		Columns: "user_id, effective_from, effective_until",
	},
	{
		Name:    "idx_user_roles_active_effective",
		Table:   "public.user_roles",
		Columns: "user_id, role_id",
		Where:   "is_active = true AND effective_from <= NOW() AND (effective_until IS NULL OR effective_until >= NOW())",
	},

	// ===== User Positions =====
	{
		Name:    "idx_user_positions_user_active",
		Table:   "public.user_positions",
		Columns: "user_id, is_active",
	},
	{
		Name:    "idx_user_positions_dates",
		Table:   "public.user_positions",
		Columns: "user_id, start_date, end_date",
	},
	{
		Name:    "idx_user_positions_active_effective",
		Table:   "public.user_positions",
		Columns: "user_id, position_id",
		Where:   "is_active = true AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW())",
	},

	// ===== Role Permissions =====
	{
		Name:    "idx_role_permissions_role_effective",
		Table:   "public.role_permissions",
		Columns: "role_id, is_granted, effective_from, effective_until",
	},
	{
		Name:    "idx_role_permissions_permission",
		Table:   "public.role_permissions",
		Columns: "permission_id, role_id",
	},
	{
		Name:    "idx_role_permissions_active_granted",
		Table:   "public.role_permissions",
		Columns: "role_id, permission_id",
		Where:   "is_granted = true AND effective_from <= NOW() AND (effective_until IS NULL OR effective_until >= NOW())",
	},

	// ===== Role Hierarchy =====
	{
		Name:    "idx_role_hierarchy_role_parent",
		Table:   "public.role_hierarchy",
		Columns: "role_id, parent_role_id",
	},
	{
		Name:    "idx_role_hierarchy_inherit",
		Table:   "public.role_hierarchy",
		Columns: "role_id, parent_role_id, inherit_permissions",
		Where:   "inherit_permissions = true",
	},
	{
		Name:    "idx_role_hierarchy_parent_children",
		Table:   "public.role_hierarchy",
		Columns: "parent_role_id, role_id",
	},

	// ===== Role Module Access =====
	{
		Name:    "idx_role_module_access_position",
		Table:   "public.role_module_access",
		Columns: "position_id, module_id, is_active",
	},
	{
		Name:    "idx_role_module_access_role",
		Table:   "public.role_module_access",
		Columns: "role_id, module_id, is_active",
	},
	{
		Name:    "idx_role_module_access_active",
		Table:   "public.role_module_access",
		Columns: "position_id, role_id, module_id",
		Where:   "is_active = true",
	},

	// ===== User Module Access =====
	{
		Name:    "idx_user_module_access_user_effective",
		Table:   "public.user_module_access",
		Columns: "user_id, module_id, is_active, effective_from, effective_until",
	},
	{
		Name:    "idx_user_module_access_active",
		Table:   "public.user_module_access",
		Columns: "user_id, module_id",
		Where:   "is_active = true AND effective_from <= NOW() AND (effective_until IS NULL OR effective_until >= NOW())",
	},

	// ===== Permissions =====
	{
		Name:    "idx_permissions_resource_action",
		Table:   "public.permissions",
		Columns: "resource, action, is_active",
	},
	{
		Name:    "idx_permissions_code_active",
		Table:   "public.permissions",
		Columns: "code",
		Where:   "is_active = true",
	},

	// ===== Roles =====
	{
		Name:    "idx_roles_hierarchy_level",
		Table:   "public.roles",
		Columns: "hierarchy_level, is_active",
	},
	{
		Name:    "idx_roles_code_active",
		Table:   "public.roles",
		Columns: "code",
		Where:   "is_active = true",
	},

	// ===== Modules =====
	{
		Name:    "idx_modules_code_active",
		Table:   "public.modules",
		Columns: "code, is_active",
	},
	{
		Name:    "idx_modules_parent_active",
		Table:   "public.modules",
		Columns: "parent_id, is_active, is_visible, sort_order",
	},

	// ===== Positions =====
	{
		Name:    "idx_positions_hierarchy",
		Table:   "public.positions",
		Columns: "hierarchy_level, is_active",
	},
	{
		Name:    "idx_positions_school_dept",
		Table:   "public.positions",
		Columns: "school_id, department_id, is_active",
	},
}

// MigrateRBACIndexes creates all RBAC performance indexes
func MigrateRBACIndexes() error {
	log.Println("Creating RBAC performance indexes...")

	for _, idx := range rbacIndexes {
		if err := createIndex(DB, idx); err != nil {
			// Log warning but continue - index might already exist
			log.Printf("Warning: Could not create index %s: %v", idx.Name, err)
		}
	}

	log.Println("RBAC index migration completed")
	return nil
}

// createIndex creates a single index
func createIndex(db *gorm.DB, idx RBACIndex) error {
	// Check if index already exists
	var exists bool
	checkQuery := `
		SELECT EXISTS (
			SELECT 1 FROM pg_indexes
			WHERE schemaname = 'public'
			AND indexname = $1
		)
	`
	if err := db.Raw(checkQuery, idx.Name).Scan(&exists).Error; err != nil {
		return fmt.Errorf("failed to check index existence: %w", err)
	}

	if exists {
		log.Printf("  ✓ Index %s already exists", idx.Name)
		return nil
	}

	// Build CREATE INDEX statement
	var sql string
	if idx.Unique {
		sql = "CREATE UNIQUE INDEX"
	} else {
		sql = "CREATE INDEX"
	}

	sql += fmt.Sprintf(" IF NOT EXISTS %s ON %s", idx.Name, idx.Table)

	if idx.Using != "" {
		sql += fmt.Sprintf(" USING %s", idx.Using)
	}

	sql += fmt.Sprintf(" (%s)", idx.Columns)

	if idx.Where != "" {
		sql += fmt.Sprintf(" WHERE %s", idx.Where)
	}

	// Execute CREATE INDEX
	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	log.Printf("  ✓ Created index %s", idx.Name)
	return nil
}

// DropRBACIndexes drops all RBAC indexes (for maintenance)
func DropRBACIndexes() error {
	log.Println("Dropping RBAC indexes...")

	for _, idx := range rbacIndexes {
		sql := fmt.Sprintf("DROP INDEX IF EXISTS %s", idx.Name)
		if err := DB.Exec(sql).Error; err != nil {
			log.Printf("Warning: Could not drop index %s: %v", idx.Name, err)
		} else {
			log.Printf("  ✓ Dropped index %s", idx.Name)
		}
	}

	log.Println("RBAC indexes dropped")
	return nil
}

// AnalyzeRBACTables runs ANALYZE on RBAC tables for query optimization
func AnalyzeRBACTables() error {
	log.Println("Analyzing RBAC tables...")

	tables := []string{
		"public.user_permissions",
		"public.user_roles",
		"public.user_positions",
		"public.role_permissions",
		"public.role_hierarchy",
		"public.role_module_access",
		"public.user_module_access",
		"public.permissions",
		"public.roles",
		"public.modules",
		"public.positions",
	}

	for _, table := range tables {
		sql := fmt.Sprintf("ANALYZE %s", table)
		if err := DB.Exec(sql).Error; err != nil {
			log.Printf("Warning: Could not analyze %s: %v", table, err)
		} else {
			log.Printf("  ✓ Analyzed %s", table)
		}
	}

	log.Println("RBAC table analysis completed")
	return nil
}

// GetRBACIndexStats returns statistics for RBAC indexes
func GetRBACIndexStats() ([]map[string]interface{}, error) {
	query := `
		SELECT
			indexrelname AS index_name,
			relname AS table_name,
			idx_scan AS scans,
			idx_tup_read AS tuples_read,
			idx_tup_fetch AS tuples_fetched,
			pg_size_pretty(pg_relation_size(indexrelid)) AS size
		FROM pg_stat_user_indexes
		WHERE schemaname = 'public'
		AND (
			relname LIKE 'user_%'
			OR relname LIKE 'role_%'
			OR relname = 'permissions'
			OR relname = 'roles'
			OR relname = 'modules'
			OR relname = 'positions'
		)
		ORDER BY idx_scan DESC
	`

	var results []map[string]interface{}
	if err := DB.Raw(query).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to get index stats: %w", err)
	}

	return results, nil
}
