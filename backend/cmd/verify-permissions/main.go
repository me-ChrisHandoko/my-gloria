package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
)

type Permission struct {
	Code               string
	Name               string
	Resource           string
	Action             string
	Scope              *string
	IsSystemPermission bool
	GroupName          string
}

func main() {
	// Database connection
	connStr := "host=localhost port=3479 user=postgres password=testing123 dbname=gloria_v2 sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer db.Close()

	fmt.Println("📋 VERIFIKASI PERMISSIONS")
	fmt.Println(strings.Repeat("=", 80))

	// List by group
	fmt.Println("\n🗂️  Permissions by Group:")
	groupRows, err := db.Query(`
		SELECT
			group_name,
			category,
			COUNT(*) as total,
			SUM(CASE WHEN is_system_permission THEN 1 ELSE 0 END) as system_perms
		FROM public.permissions
		GROUP BY group_name, category
		ORDER BY category, group_name
	`)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer groupRows.Close()

	currentCategory := ""
	for groupRows.Next() {
		var groupName, category string
		var total, systemPerms int
		groupRows.Scan(&groupName, &category, &total, &systemPerms)

		if category != currentCategory {
			currentCategory = category
			fmt.Printf("\n[%s]\n", category)
		}

		systemIcon := ""
		if systemPerms > 0 {
			systemIcon = fmt.Sprintf(" (🔒 %d system)", systemPerms)
		}
		fmt.Printf("  %-20s: %d permissions%s\n", groupName, total, systemIcon)
	}

	// Detailed permissions list
	fmt.Println("\n\n📄 Detailed Permissions List:")
	fmt.Println(strings.Repeat("-", 80))

	permRows, err := db.Query(`
		SELECT
			code,
			name,
			resource,
			action,
			scope,
			is_system_permission,
			group_name
		FROM public.permissions
		ORDER BY category, group_name, action
	`)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer permRows.Close()

	currentGroup := ""
	for permRows.Next() {
		var p Permission
		err = permRows.Scan(&p.Code, &p.Name, &p.Resource, &p.Action, &p.Scope, &p.IsSystemPermission, &p.GroupName)
		if err != nil {
			log.Printf("Error: %v", err)
			continue
		}

		if p.GroupName != currentGroup {
			currentGroup = p.GroupName
			fmt.Printf("\n%-20s\n", p.GroupName)
		}

		scope := "ALL"
		if p.Scope != nil {
			scope = *p.Scope
		}

		systemIcon := " "
		if p.IsSystemPermission {
			systemIcon = "🔒"
		}

		fmt.Printf("  %s %-10s [%-4s] %-35s (%s)\n",
			systemIcon,
			p.Action,
			scope,
			p.Name,
			p.Code,
		)
	}

	// Statistics
	var totalPerms, systemPerms, regularPerms int
	db.QueryRow("SELECT COUNT(*) FROM public.permissions").Scan(&totalPerms)
	db.QueryRow("SELECT COUNT(*) FROM public.permissions WHERE is_system_permission = true").Scan(&systemPerms)
	regularPerms = totalPerms - systemPerms

	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Println("📊 STATISTIK:")
	fmt.Printf("  Total Permissions     : %d\n", totalPerms)
	fmt.Printf("  🔒 System Permissions  : %d\n", systemPerms)
	fmt.Printf("  👥 Regular Permissions : %d\n", regularPerms)

	// Resource coverage
	var resourceCount int
	db.QueryRow("SELECT COUNT(DISTINCT resource) FROM public.permissions").Scan(&resourceCount)
	fmt.Printf("  📦 Resources Covered   : %d\n", resourceCount)

	// Group count
	var groupCount int
	db.QueryRow("SELECT COUNT(DISTINCT group_name) FROM public.permissions").Scan(&groupCount)
	fmt.Printf("  🗂️  Permission Groups   : %d\n", groupCount)

	fmt.Println(strings.Repeat("=", 80))
	fmt.Println("✅ Verifikasi selesai!")
}
