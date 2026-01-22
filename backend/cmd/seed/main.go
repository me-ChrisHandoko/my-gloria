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

	// Read SQL file (Version 3 - Match with sidebar menu labels)
	sqlFile := "seed_modules_v3.sql"
	sqlBytes, err := os.ReadFile(sqlFile)
	if err != nil {
		log.Fatalf("Error reading SQL file: %v", err)
	}

	sqlContent := string(sqlBytes)

	// Execute SQL
	fmt.Println("🔄 Executing seed SQL...")
	_, err = db.Exec(sqlContent)
	if err != nil {
		log.Fatalf("Error executing SQL: %v", err)
	}

	fmt.Println("✅ Seed data executed successfully!")

	// Verify data
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM public.modules").Scan(&count)
	if err != nil {
		log.Fatalf("Error counting modules: %v", err)
	}

	fmt.Printf("✅ Total modules in database: %d\n", count)

	// Show sample data
	fmt.Println("\n📊 Sample modules:")
	rows, err := db.Query("SELECT code, name, category FROM public.modules ORDER BY category, sort_order LIMIT 10")
	if err != nil {
		log.Fatalf("Error querying modules: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var code, name, category string
		err = rows.Scan(&code, &name, &category)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  - [%s] %s (%s)\n", category, name, code)
	}
}
