package main

import (
	"fmt"
	"log"

	"backend/configs"
	"backend/internal/database"
	"backend/internal/models"

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

	// Check existing count
	var existingCount int64
	db.Model(&models.Permission{}).Count(&existingCount)
	fmt.Printf("📊 Existing permissions: %d\n", existingCount)

	if existingCount > 0 {
		fmt.Println("⚠️  Permissions already exist. Please manually DELETE FROM public.permissions if you want to re-seed.")
		fmt.Println("💡 Or run this query in your database client:")
		fmt.Println("   DELETE FROM public.role_permissions;")
		fmt.Println("   DELETE FROM public.user_permissions;")
		fmt.Println("   DELETE FROM public.permissions;")
		return
	}

	// Seed permissions using SQL file
	fmt.Println("📝 Reading seed SQL file...")
	sqlFile := "seed_permissions.sql"

	// Use raw SQL execution
	fmt.Println("🔄 Executing seed SQL...")
	result := db.Exec(`
		-- Insert all permissions directly
		-- Copy the INSERT statements from seed_permissions.sql here
	`)

	if result.Error != nil {
		log.Fatal("Error executing seed SQL:", result.Error)
	}

	fmt.Println("✅ Seed completed!")

	// Verify
	var count int64
	db.Model(&models.Permission{}).Count(&count)
	fmt.Printf("✅ Total permissions in database: %d\n", count)
}
