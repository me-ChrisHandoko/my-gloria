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

	// Step 1: Clean existing data (fast DELETE, not TRUNCATE)
	fmt.Println("\n🗑️  Cleaning...")

	db.Exec("DELETE FROM public.role_permissions")
	db.Exec("DELETE FROM public.user_permissions")
	db.Exec("DELETE FROM public.permissions")

	fmt.Println("✅ Cleaned")

	// Step 2: Read SQL file and execute INSERT statements only
	fmt.Println("\n📝 Reading seed file...")
	file, err := os.Open("seed_permissions.sql")
	if err != nil {
		log.Fatal("Error reading file:", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024) // 1MB buffer for large lines

	var currentInsert strings.Builder
	insertCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		// Skip comments, empty lines, and TRUNCATE
		if trimmed == "" || strings.HasPrefix(trimmed, "--") || strings.HasPrefix(trimmed, "TRUNCATE") {
			continue
		}

		// Build INSERT statement
		currentInsert.WriteString(line)
		currentInsert.WriteString("\n")

		// Execute when we hit a semicolon
		if strings.HasSuffix(trimmed, ";") {
			sql := currentInsert.String()
			if strings.Contains(sql, "INSERT") {
				result := db.Exec(sql)
				if result.Error != nil {
					log.Printf("Error executing INSERT: %v", result.Error)
				} else {
					insertCount++
					if insertCount%10 == 0 {
						fmt.Printf("  Inserted %d...\n", insertCount)
					}
				}
			}
			currentInsert.Reset()
		}
	}

	fmt.Printf("✅ Executed %d INSERT statements\n", insertCount)

	// Step 3: Verify
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
