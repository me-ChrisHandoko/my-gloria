package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	"backend/configs"
	"backend/internal/database"

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
	fmt.Println("✅ Connected to database")

	// Read SQL file and execute INSERT statements ONLY (no DELETE)
	fmt.Println("\n📝 Reading and executing seed file...")
	file, err := os.Open("seed_permissions.sql")
	if err != nil {
		log.Fatal("Error reading file:", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	var currentInsert strings.Builder
	insertCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		// Skip comments, empty lines, TRUNCATE, and DELETE
		if trimmed == "" ||
		   strings.HasPrefix(trimmed, "--") ||
		   strings.Contains(strings.ToUpper(trimmed), "TRUNCATE") ||
		   strings.Contains(strings.ToUpper(trimmed), "DELETE") {
			continue
		}

		currentInsert.WriteString(line)
		currentInsert.WriteString("\n")

		// Execute when we hit a semicolon
		if strings.HasSuffix(trimmed, ";") {
			sql := currentInsert.String()
			if strings.Contains(strings.ToUpper(sql), "INSERT") {
				// Convert to INSERT ... ON CONFLICT to handle duplicates
				sql = strings.Replace(sql, "INSERT INTO", "INSERT INTO", 1)
				sql = strings.TrimSuffix(strings.TrimSpace(sql), ";")
				sql += " ON CONFLICT (id) DO UPDATE SET " +
					"code = EXCLUDED.code, " +
					"name = EXCLUDED.name, " +
					"resource = EXCLUDED.resource, " +
					"action = EXCLUDED.action, " +
					"scope = EXCLUDED.scope, " +
					"description = EXCLUDED.description, " +
					"is_system_permission = EXCLUDED.is_system_permission, " +
					"is_active = EXCLUDED.is_active, " +
					"category = EXCLUDED.category, " +
					"group_name = EXCLUDED.group_name, " +
					"group_icon = EXCLUDED.group_icon, " +
					"group_sort_order = EXCLUDED.group_sort_order, " +
					"updated_at = NOW();"

				result := db.Exec(sql)
				if result.Error != nil {
					log.Printf("Error: %v", result.Error)
					fmt.Println("SQL:", sql[:100])
				} else {
					insertCount++
					if insertCount%10 == 0 {
						fmt.Printf("  Processed %d statements...\n", insertCount)
					}
				}
			}
			currentInsert.Reset()
		}
	}

	fmt.Printf("✅ Processed %d INSERT statements\n", insertCount)

	// Verify
	fmt.Println("\n📊 Verification:")
	type CategoryCount struct {
		Category string
		Total    int64
	}

	var results []CategoryCount
	db.Raw(`
		SELECT category, COUNT(*) as total
		FROM public.permissions
		GROUP BY category
		ORDER BY category
	`).Scan(&results)

	total := int64(0)
	for _, row := range results {
		fmt.Printf("  - %-15s: %d\n", row.Category, row.Total)
		total += row.Total
	}

	fmt.Printf("\n✅ Total: %d permissions\n", total)

	if total == 65 {
		fmt.Println("🎉 SUCCESS!")
	} else {
		fmt.Printf("⚠️  Expected 65, got %d\n", total)
	}
}
