package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// Database connection string
	connStr := "host=localhost port=3479 user=postgres password=testing123 dbname=gloria_v2 sslmode=disable"

	// Connect to database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer db.Close()

	// Test connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Error ping database: %v", err)
	}

	fmt.Println("✅ Connected to database successfully")

	// Read SQL file
	sqlFile := "seed_permissions.sql"
	sqlBytes, err := os.ReadFile(sqlFile)
	if err != nil {
		log.Fatalf("Error reading SQL file: %v", err)
	}

	sqlContent := string(sqlBytes)

	// Execute SQL
	fmt.Println("🔄 Executing permissions seed SQL...")
	_, err = db.Exec(sqlContent)
	if err != nil {
		log.Fatalf("Error executing SQL: %v", err)
	}

	fmt.Println("✅ Permissions seed data executed successfully!")

	// Verify data
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM public.permissions").Scan(&count)
	if err != nil {
		log.Fatalf("Error counting permissions: %v", err)
	}

	fmt.Printf("✅ Total permissions in database: %d\n", count)

	// Count by category
	fmt.Println("\n📊 Permissions per Category:")
	rows, err := db.Query(`
		SELECT category, COUNT(*) as total
		FROM public.permissions
		GROUP BY category
		ORDER BY category
	`)
	if err != nil {
		log.Fatalf("Error querying permissions: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var category string
		var total int
		err = rows.Scan(&category, &total)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  - %-15s: %d permissions\n", category, total)
	}

	// Count by action
	fmt.Println("\n📋 Permissions per Action:")
	actionRows, err := db.Query(`
		SELECT action, COUNT(*) as total
		FROM public.permissions
		GROUP BY action
		ORDER BY total DESC
	`)
	if err != nil {
		log.Fatalf("Error querying permissions by action: %v", err)
	}
	defer actionRows.Close()

	for actionRows.Next() {
		var action string
		var total int
		err = actionRows.Scan(&action, &total)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  - %-10s: %d permissions\n", action, total)
	}

	// System permissions count
	var systemPerms int
	db.QueryRow("SELECT COUNT(*) FROM public.permissions WHERE is_system_permission = true").Scan(&systemPerms)
	fmt.Printf("\n🔒 System Permissions: %d\n", systemPerms)
	fmt.Printf("👥 Regular Permissions: %d\n", count-systemPerms)
}
