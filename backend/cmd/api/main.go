package main

import (
	"log"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/domain"
	"backend/internal/handler"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := config.InitDB(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	log.Println("Successfully connected to database!")

	// Run migrations only if enabled
	if cfg.RunMigrations {
		// Create schemas if they don't exist
		db.Exec("CREATE SCHEMA IF NOT EXISTS gloria_master")
		db.Exec("CREATE SCHEMA IF NOT EXISTS gloria_ops")
		log.Println("Database schemas ensured!")

		// Auto migrate all domain models
		if err := db.AutoMigrate(
			// gloria_master schema
			&domain.DataKaryawan{},
			// gloria_ops schema - organization
			&domain.School{},
			&domain.Department{},
			&domain.Position{},
			&domain.PositionHierarchy{},
			// gloria_ops schema - roles & permissions
			&domain.Role{},
			&domain.RoleHierarchy{},
			&domain.Permission{},
			&domain.ModulePermission{},
			&domain.RolePermission{},
			// gloria_ops schema - modules
			&domain.Module{},
			&domain.RoleModuleAccess{},
			&domain.UserModuleAccess{},
			// gloria_ops schema - users
			&domain.UserProfile{},
			&domain.UserRole{},
			&domain.UserPosition{},
			&domain.UserPermission{},
			// gloria_ops schema - delegations & api
			&domain.Delegation{},
			&domain.ApiKey{},
			// gloria_ops schema - audit & system
			&domain.AuditLog{},
			&domain.FeatureFlag{},
			&domain.FeatureFlagEvaluation{},
			&domain.Workflow{},
			&domain.BulkOperationProgress{},
			&domain.SystemConfiguration{},
		); err != nil {
			log.Fatal("Failed to migrate database:", err)
		}
		log.Println("Database migration completed!")

		// Run custom migrations (indexes with DESC sorting, composite constraints)
		if err := database.RunCustomMigrations(db); err != nil {
			log.Printf("Warning: Some custom migrations failed: %v", err)
		}
	} else {
		log.Println("Database migrations skipped (RUN_MIGRATIONS=false)")
	}

	// Initialize layers
	userProfileRepo := repository.NewUserProfileRepository(db)
	userProfileService := service.NewUserProfileService(userProfileRepo)
	userProfileHandler := handler.NewUserProfileHandler(userProfileService)

	// Setup router
	router := gin.Default()

	// Middleware
	router.Use(middleware.CORS())
	router.Use(middleware.Logger())

	// Health check
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// User Profile routes
		userProfiles := api.Group("/user-profiles")
		{
			userProfiles.GET("", userProfileHandler.GetAll)
			userProfiles.GET("/:id", userProfileHandler.GetByID)
			userProfiles.GET("/:id/full", userProfileHandler.GetWithFullDetails)
			userProfiles.GET("/clerk/:clerkUserId", userProfileHandler.GetByClerkUserID)
			userProfiles.GET("/nip/:nip", userProfileHandler.GetByNIP)
			userProfiles.POST("", userProfileHandler.Create)
			userProfiles.PUT("/:id", userProfileHandler.Update)
			userProfiles.DELETE("/:id", userProfileHandler.Delete)
		}
	}

	// Start server
	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
