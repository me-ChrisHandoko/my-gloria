package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

type Module struct {
	Code       string
	Name       string
	Category   string
	ParentCode *string
	ParentName *string
	SortOrder  int
	IsActive   bool
	IsVisible  bool
}

func main() {
	// Database connection
	connStr := "host=localhost port=3479 user=postgres password=testing123 dbname=gloria_v2 sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error connecting: %v", err)
	}
	defer db.Close()

	fmt.Println("📊 VERIFIKASI DATA MODULES")
	fmt.Println("=" + "==================================")

	// Count by category
	fmt.Println("\n📈 Jumlah Modules per Kategori:")
	rows, err := db.Query(`
		SELECT category, COUNT(*) as count
		FROM public.modules
		GROUP BY category
		ORDER BY category
	`)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var category string
		var count int
		rows.Scan(&category, &count)
		fmt.Printf("  %-15s: %d modules\n", category, count)
	}

	// Hierarchical structure
	fmt.Println("\n🌳 Struktur Hierarki Modules:")
	moduleRows, err := db.Query(`
		SELECT
			m.code,
			m.name,
			m.category,
			p.code as parent_code,
			p.name as parent_name,
			m.sort_order,
			m.is_active,
			m.is_visible
		FROM public.modules m
		LEFT JOIN public.modules p ON m.parent_id = p.id
		ORDER BY m.category, m.parent_id NULLS FIRST, m.sort_order
	`)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer moduleRows.Close()

	currentCategory := ""
	for moduleRows.Next() {
		var m Module
		err = moduleRows.Scan(&m.Code, &m.Name, &m.Category, &m.ParentCode, &m.ParentName, &m.SortOrder, &m.IsActive, &m.IsVisible)
		if err != nil {
			log.Printf("Error scanning: %v", err)
			continue
		}

		if m.Category != currentCategory {
			currentCategory = m.Category
			fmt.Printf("\n[%s]\n", m.Category)
		}

		status := "✅"
		if !m.IsActive {
			status = "❌"
		}
		visibility := "👁️"
		if !m.IsVisible {
			visibility = "🚫"
		}

		if m.ParentCode == nil {
			fmt.Printf("  %s %s %s - %s (Root)\n", status, visibility, m.Code, m.Name)
		} else {
			fmt.Printf("    %s %s %s - %s\n      └─ Child of: %s\n", status, visibility, m.Code, m.Name, *m.ParentCode)
		}
	}

	// Statistics
	var totalModules, rootModules, childModules int
	db.QueryRow("SELECT COUNT(*) FROM public.modules").Scan(&totalModules)
	db.QueryRow("SELECT COUNT(*) FROM public.modules WHERE parent_id IS NULL").Scan(&rootModules)
	db.QueryRow("SELECT COUNT(*) FROM public.modules WHERE parent_id IS NOT NULL").Scan(&childModules)

	fmt.Println("\n📊 Statistik:")
	fmt.Printf("  Total Modules    : %d\n", totalModules)
	fmt.Printf("  Root Modules     : %d\n", rootModules)
	fmt.Printf("  Child Modules    : %d\n", childModules)

	fmt.Println("\n✅ Verifikasi selesai!")
}
