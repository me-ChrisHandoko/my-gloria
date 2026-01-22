package main

import (
	"fmt"
	"log"
	"os"

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

	fmt.Println("✅ Connected to database successfully")

	// Step 1: Clean existing data
	fmt.Println("\n🗑️  Cleaning existing permissions...")

	result := db.Exec("DELETE FROM public.role_permissions")
	if result.Error != nil {
		log.Fatal("Error deleting role_permissions:", result.Error)
	}
	fmt.Printf("  Deleted %d role_permissions\n", result.RowsAffected)

	result = db.Exec("DELETE FROM public.user_permissions")
	if result.Error != nil {
		log.Fatal("Error deleting user_permissions:", result.Error)
	}
	fmt.Printf("  Deleted %d user_permissions\n", result.RowsAffected)

	result = db.Exec("DELETE FROM public.permissions")
	if result.Error != nil {
		log.Fatal("Error deleting permissions:", result.Error)
	}
	fmt.Printf("  Deleted %d permissions\n", result.RowsAffected)

	// Step 2: Read and execute seed file
	fmt.Println("\n📝 Reading seed SQL file...")
	sqlContent, err := os.ReadFile("seed_permissions.sql")
	if err != nil {
		log.Fatal("Error reading seed file:", err)
	}

	fmt.Println("🔄 Executing seed SQL...")
	result = db.Exec(string(sqlContent))
	if result.Error != nil {
		log.Fatal("Error executing seed SQL:", result.Error)
	}

	fmt.Println("✅ Seed executed successfully!")

	// Step 3: Verify
	fmt.Println("\n📊 Verification:")
	type CategoryCount struct {
		Category string
		Total    int64
	}

	var results []CategoryCount
	db.Raw(`
		SELECT
			category,
			COUNT(*) as total
		FROM public.permissions
		GROUP BY category
		ORDER BY category
	`).Scan(&results)

	total := int64(0)
	for _, row := range results {
		fmt.Printf("  - %-15s: %d permissions\n", row.Category, row.Total)
		total += row.Total
	}

	fmt.Printf("\n✅ Total permissions: %d\n", total)

	if total == 65 {
		fmt.Println("🎉 SUCCESS! All 65 permissions seeded correctly!")
	} else {
		fmt.Printf("⚠️  WARNING: Expected 65 permissions, got %d\n", total)
	}
}
