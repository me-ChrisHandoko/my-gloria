package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
)

func main() {
	// Database connection
	connStr := "host=localhost port=3479 user=postgres password=testing123 dbname=gloria_v2 sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer db.Close()

	fmt.Println("🗺️  DAFTAR URL MODULES YANG TERSEDIA")
	fmt.Println("=" + strings.Repeat("=", 70))

	// Get all modules with paths
	rows, err := db.Query(`
		SELECT
			m.code,
			m.name,
			m.category,
			m.path,
			p.name as parent_name,
			m.is_active,
			m.is_visible
		FROM public.modules m
		LEFT JOIN public.modules p ON m.parent_id = p.id
		WHERE m.path IS NOT NULL
		ORDER BY m.category, m.path
	`)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer rows.Close()

	currentCategory := ""
	categoryCount := make(map[string]int)

	for rows.Next() {
		var code, name, category, path string
		var parentName *string
		var isActive, isVisible bool

		err = rows.Scan(&code, &name, &category, &path, &parentName, &isActive, &isVisible)
		if err != nil {
			log.Printf("Error: %v", err)
			continue
		}

		if category != currentCategory {
			if currentCategory != "" {
				fmt.Printf("\nTotal: %d URLs\n", categoryCount[currentCategory])
			}
			currentCategory = category
			fmt.Printf("\n[%s]\n", category)
			categoryCount[category] = 0
		}

		categoryCount[category]++

		status := "✅"
		if !isActive || !isVisible {
			status = "⚠️"
		}

		indent := ""
		if parentName != nil {
			indent = "  "
		}

		fmt.Printf("%s%s %-25s → %s\n", indent, status, code, path)
	}

	if currentCategory != "" {
		fmt.Printf("\nTotal: %d URLs\n", categoryCount[currentCategory])
	}

	// Summary
	var totalWithPaths int
	db.QueryRow("SELECT COUNT(*) FROM public.modules WHERE path IS NOT NULL").Scan(&totalWithPaths)

	fmt.Println("\n" + strings.Repeat("=", 72))
	fmt.Printf("📊 RINGKASAN: %d modules memiliki URL path\n", totalWithPaths)
	fmt.Println(strings.Repeat("=", 72))
}
