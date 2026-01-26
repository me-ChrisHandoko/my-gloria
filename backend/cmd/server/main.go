package main

import (
	"log"
	"time"

	"backend/configs"
	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	// In production, environment variables should be set by the system
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Load configuration
	cfg := configs.LoadConfig()

	// Initialize database
	log.Println("Connecting to database...")
	if err := database.InitDB(cfg); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if cfg.Server.Env == "development" {
		log.Println("Running auto migrations...")
		if err := database.AutoMigrate(); err != nil {
			log.Fatal("Failed to run migrations:", err)
		}
	}

	// Initialize JWT
	log.Println("Initializing JWT authentication...")
	auth.InitJWT(cfg.JWT.Secret)

	// Initialize CSRF protection
	log.Println("Initializing CSRF protection...")
	auth.InitCSRFSecret(cfg.CSRF.Secret)

	// Setup router
	router := setupRouter()

	// Start server
	port := cfg.Server.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s (environment: %s)", port, cfg.Server.Env)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupRouter() *gin.Engine {
	router := gin.Default()

	// Apply security headers middleware to all routes
	router.Use(middleware.SecurityHeaders())

	// Initialize services
	db := database.GetDB()
	schoolService := services.NewSchoolService(db)
	positionService := services.NewPositionService(db)
	departmentService := services.NewDepartmentService(db)
	karyawanService := services.NewKaryawanService(db)
	workflowRuleService := services.NewWorkflowRuleService(db)
	roleService := services.NewRoleService(db)
	permissionService := services.NewPermissionService(db)
	moduleService := services.NewModuleService(db)
	userService := services.NewUserService(db)

	// Initialize handlers
	schoolHandler := handlers.NewSchoolHandler(schoolService)
	positionHandler := handlers.NewPositionHandler(positionService)
	departmentHandler := handlers.NewDepartmentHandler(departmentService)
	karyawanHandler := handlers.NewKaryawanHandler(karyawanService)
	workflowRuleHandler := handlers.NewWorkflowRuleHandler(workflowRuleService)
	roleHandler := handlers.NewRoleHandler(roleService)
	permissionHandler := handlers.NewPermissionHandler(permissionService)
	moduleHandler := handlers.NewModuleHandler(moduleService)
	userHandler := handlers.NewUserHandler(userService)

	// Configure CORS
	// In development: Allow localhost origins for testing
	// In production: Should be configured with specific frontend origin via environment variable
	corsConfig := cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",  // Next.js default
			"http://localhost:5173",  // Vite default
			"http://localhost:8080",  // Alternative dev server
		},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
			"PATCH",
		},
		AllowHeaders: []string{
			"Authorization",
			"Content-Type",
			"Accept",
			"X-CSRF-Token", // CSRF protection header
		},
		ExposeHeaders: []string{
			"Content-Length",
		},
		AllowCredentials: true, // Enable credentials for cookie-based auth and CSRF protection
		MaxAge:           12 * time.Hour,
	}

	// In production, override with environment-specific origins
	if gin.Mode() == gin.ReleaseMode {
		// TODO: Configure via environment variable
		// Example: corsConfig.AllowOrigins = []string{os.Getenv("FRONTEND_URL")}
		log.Println("WARNING: Using default CORS origins in production. Configure FRONTEND_URL environment variable.")
	}

	router.Use(cors.New(corsConfig))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "Server is running"})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes
		authPublic := v1.Group("/auth")
		{
			authPublic.POST("/register", handlers.Register)
			authPublic.POST("/login", handlers.Login)
			authPublic.POST("/refresh", handlers.RefreshToken)
			authPublic.POST("/forgot-password", handlers.ForgotPassword)
			authPublic.POST("/reset-password", handlers.ResetPassword)
		}

		// Protected routes (requires JWT token from Bearer header OR httpOnly cookies)
		protected := v1.Group("/")
		protected.Use(middleware.AuthRequiredHybrid()) // Hybrid SSR support - checks auth first
		protected.Use(middleware.CSRFProtection())     // CSRF protection for state-changing requests
		{
			// Auth routes (protected)
			authProtected := protected.Group("/auth")
			{
				authProtected.GET("/me", handlers.GetMe)
				authProtected.POST("/logout", handlers.Logout)
				authProtected.POST("/change-password", handlers.ChangePassword)
			}
			// User routes
			users := protected.Group("/users")
			{
				users.GET("", userHandler.GetUsers)
				users.GET("/:id", userHandler.GetUser)
				users.PUT("/:id", userHandler.UpdateUser)
				users.DELETE("/:id", userHandler.DeleteUser)

				// User role assignment routes
				users.GET("/:id/roles", userHandler.GetUserRoles)
				users.POST("/:id/roles", userHandler.AssignRoleToUser)
				users.DELETE("/:id/roles/:role_id", userHandler.RevokeRoleFromUser)

				// User position assignment routes
				users.GET("/:id/positions", userHandler.GetUserPositions)
				users.POST("/:id/positions", userHandler.AssignPositionToUser)
				users.DELETE("/:id/positions/:position_id", userHandler.RevokePositionFromUser)
			}

			// School routes
			schools := protected.Group("/schools")
			{
				schools.POST("", schoolHandler.CreateSchool)
				schools.GET("", schoolHandler.GetSchools)
				schools.GET("/available-codes", schoolHandler.GetAvailableSchoolCodes)
				schools.GET("/:id", schoolHandler.GetSchoolByID)
				schools.PUT("/:id", schoolHandler.UpdateSchool)
				schools.DELETE("/:id", schoolHandler.DeleteSchool)
			}

			// Department routes
			departments := protected.Group("/departments")
			{
				departments.POST("", departmentHandler.CreateDepartment)
				departments.GET("", departmentHandler.GetDepartments)
				departments.GET("/tree", departmentHandler.GetDepartmentTree)
				departments.GET("/available-codes", departmentHandler.GetAvailableDepartmentCodes)
				departments.GET("/:id", departmentHandler.GetDepartmentByID)
				departments.PUT("/:id", departmentHandler.UpdateDepartment)
				departments.DELETE("/:id", departmentHandler.DeleteDepartment)
			}

			// Position routes
			positions := protected.Group("/positions")
			{
				positions.POST("", positionHandler.CreatePosition)
				positions.GET("", positionHandler.GetPositions)
				positions.GET("/:id", positionHandler.GetPositionByID)
				positions.PUT("/:id", positionHandler.UpdatePosition)
				positions.DELETE("/:id", positionHandler.DeletePosition)
			}

			// Employee routes
			employees := protected.Group("/employees")
			{
				employees.GET("/filter-options", karyawanHandler.GetFilterOptions)
				employees.GET("", karyawanHandler.GetKaryawans)
				employees.GET("/:nip", karyawanHandler.GetKaryawanByNIP)
			}

			// Workflow Rules routes
			workflowRules := protected.Group("/workflow-rules")
			{
				workflowRules.POST("", workflowRuleHandler.CreateWorkflowRule)
				workflowRules.POST("/bulk", workflowRuleHandler.BulkCreateWorkflowRules)
				workflowRules.GET("", workflowRuleHandler.GetWorkflowRules)
				workflowRules.GET("/types", workflowRuleHandler.GetWorkflowTypes)
				workflowRules.GET("/lookup", workflowRuleHandler.GetWorkflowRuleByPositionAndType)
				workflowRules.GET("/:id", workflowRuleHandler.GetWorkflowRuleByID)
				workflowRules.PUT("/:id", workflowRuleHandler.UpdateWorkflowRule)
				workflowRules.DELETE("/:id", workflowRuleHandler.DeleteWorkflowRule)
			}

			// Role routes
			roles := protected.Group("/roles")
			{
				roles.POST("", roleHandler.CreateRole)
				roles.GET("", roleHandler.GetRoles)
				roles.GET("/:id", roleHandler.GetRoleByID)
				roles.GET("/:id/permissions", roleHandler.GetRoleWithPermissions)
				roles.PUT("/:id", roleHandler.UpdateRole)
				roles.DELETE("/:id", roleHandler.DeleteRole)
				roles.POST("/:id/permissions", roleHandler.AssignPermissionToRole)
				roles.DELETE("/:id/permissions/:permission_id", roleHandler.RevokePermissionFromRole)
				// Role Module Access routes
				roles.GET("/:id/modules", moduleHandler.GetRoleModuleAccesses)
				roles.POST("/:id/modules", moduleHandler.AssignModuleToRole)
				roles.DELETE("/:id/modules/:access_id", moduleHandler.RevokeModuleFromRole)
			}

			// Permission routes
			permissions := protected.Group("/permissions")
			{
				permissions.POST("", permissionHandler.CreatePermission)
				permissions.GET("", permissionHandler.GetPermissions)
				permissions.GET("/groups", permissionHandler.GetPermissionGroups)
				permissions.GET("/scopes", permissionHandler.GetPermissionScopes)
				permissions.GET("/actions", permissionHandler.GetPermissionActions)
				permissions.GET("/:id", permissionHandler.GetPermissionByID)
				permissions.PUT("/:id", permissionHandler.UpdatePermission)
				permissions.DELETE("/:id", permissionHandler.DeletePermission)
			}

			// Module routes
			modules := protected.Group("/modules")
			{
				modules.POST("", moduleHandler.CreateModule)
				modules.GET("", moduleHandler.GetModules)
				modules.GET("/tree", moduleHandler.GetModuleTree)
				modules.GET("/:id", moduleHandler.GetModuleByID)
				modules.PUT("/:id", moduleHandler.UpdateModule)
				modules.DELETE("/:id", moduleHandler.DeleteModule)
			}
		}
	}

	return router
}
