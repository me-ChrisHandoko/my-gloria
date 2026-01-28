package main

import (
	"log"
	"time"

	"backend/configs"
	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/models"
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

	// Initialize Permission Services
	log.Println("Initializing permission services...")
	middleware.InitPermissionServices()

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

	// Inject RBAC services into services for escalation prevention and cache invalidation
	escalationPrevention := middleware.GetEscalationPrevention()
	permissionCache := middleware.GetPermissionCache()
	userService.SetRBACServices(escalationPrevention, permissionCache)
	roleService.SetRBACServices(escalationPrevention, permissionCache)
	moduleService.SetRBACServices(permissionCache, escalationPrevention)
	permissionService.SetRBACServices(permissionCache)

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
	accessHandler := handlers.NewAccessHandler()

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
				users.GET("", middleware.RequirePermission("users", models.PermissionActionRead), userHandler.GetUsers)
				users.GET("/:id", middleware.RequirePermission("users", models.PermissionActionRead), userHandler.GetUser)
				users.PUT("/:id", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.UpdateUser)
				users.DELETE("/:id", middleware.RequirePermission("users", models.PermissionActionDelete), userHandler.DeleteUser)

				// User role assignment routes
				users.GET("/:id/roles", middleware.RequirePermission("users", models.PermissionActionRead), userHandler.GetUserRoles)
				users.POST("/:id/roles", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.AssignRoleToUser)
				users.DELETE("/:id/roles/:role_id", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.RevokeRoleFromUser)

				// User position assignment routes
				users.GET("/:id/positions", middleware.RequirePermission("users", models.PermissionActionRead), userHandler.GetUserPositions)
				users.POST("/:id/positions", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.AssignPositionToUser)
				users.DELETE("/:id/positions/:position_id", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.RevokePositionFromUser)

				// User direct permission assignment routes
				users.GET("/:id/permissions", middleware.RequirePermission("users", models.PermissionActionRead), userHandler.GetUserPermissions)
				users.POST("/:id/permissions", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.AssignPermissionToUser)
				users.DELETE("/:id/permissions/:permission_id", middleware.RequirePermission("users", models.PermissionActionUpdate), userHandler.RevokePermissionFromUser)
			}

			// School routes
			schools := protected.Group("/schools")
			{
				schools.POST("", middleware.RequirePermission("schools", models.PermissionActionCreate), schoolHandler.CreateSchool)
				schools.GET("", middleware.RequirePermission("schools", models.PermissionActionRead), schoolHandler.GetSchools)
				schools.GET("/available-codes", middleware.RequirePermission("schools", models.PermissionActionRead), schoolHandler.GetAvailableSchoolCodes)
				schools.GET("/:id", middleware.RequirePermission("schools", models.PermissionActionRead), schoolHandler.GetSchoolByID)
				schools.PUT("/:id", middleware.RequirePermission("schools", models.PermissionActionUpdate), schoolHandler.UpdateSchool)
				schools.DELETE("/:id", middleware.RequirePermission("schools", models.PermissionActionDelete), schoolHandler.DeleteSchool)
			}

			// Department routes
			departments := protected.Group("/departments")
			{
				departments.POST("", middleware.RequirePermission("departments", models.PermissionActionCreate), departmentHandler.CreateDepartment)
				departments.GET("", middleware.RequirePermission("departments", models.PermissionActionRead), departmentHandler.GetDepartments)
				departments.GET("/tree", middleware.RequirePermission("departments", models.PermissionActionRead), departmentHandler.GetDepartmentTree)
				departments.GET("/available-codes", middleware.RequirePermission("departments", models.PermissionActionRead), departmentHandler.GetAvailableDepartmentCodes)
				departments.GET("/:id", middleware.RequirePermission("departments", models.PermissionActionRead), departmentHandler.GetDepartmentByID)
				departments.PUT("/:id", middleware.RequirePermission("departments", models.PermissionActionUpdate), departmentHandler.UpdateDepartment)
				departments.DELETE("/:id", middleware.RequirePermission("departments", models.PermissionActionDelete), departmentHandler.DeleteDepartment)
			}

			// Position routes
			positions := protected.Group("/positions")
			{
				positions.POST("", middleware.RequirePermission("positions", models.PermissionActionCreate), positionHandler.CreatePosition)
				positions.GET("", middleware.RequirePermission("positions", models.PermissionActionRead), positionHandler.GetPositions)
				positions.GET("/:id", middleware.RequirePermission("positions", models.PermissionActionRead), positionHandler.GetPositionByID)
				positions.PUT("/:id", middleware.RequirePermission("positions", models.PermissionActionUpdate), positionHandler.UpdatePosition)
				positions.DELETE("/:id", middleware.RequirePermission("positions", models.PermissionActionDelete), positionHandler.DeletePosition)
			}

			// Employee routes
			employees := protected.Group("/employees")
			{
				employees.GET("/filter-options", middleware.RequirePermission("employees", models.PermissionActionRead), karyawanHandler.GetFilterOptions)
				employees.GET("", middleware.RequirePermission("employees", models.PermissionActionRead), karyawanHandler.GetKaryawans)
				employees.GET("/:nip", middleware.RequirePermission("employees", models.PermissionActionRead), karyawanHandler.GetKaryawanByNIP)
			}

			// Workflow Rules routes
			workflowRules := protected.Group("/workflow-rules")
			{
				workflowRules.POST("", middleware.RequirePermission("workflow_rules", models.PermissionActionCreate), workflowRuleHandler.CreateWorkflowRule)
				workflowRules.POST("/bulk", middleware.RequirePermission("workflow_rules", models.PermissionActionCreate), workflowRuleHandler.BulkCreateWorkflowRules)
				workflowRules.GET("", middleware.RequirePermission("workflow_rules", models.PermissionActionRead), workflowRuleHandler.GetWorkflowRules)
				workflowRules.GET("/types", middleware.RequirePermission("workflow_rules", models.PermissionActionRead), workflowRuleHandler.GetWorkflowTypes)
				workflowRules.GET("/lookup", middleware.RequirePermission("workflow_rules", models.PermissionActionRead), workflowRuleHandler.GetWorkflowRuleByPositionAndType)
				workflowRules.GET("/:id", middleware.RequirePermission("workflow_rules", models.PermissionActionRead), workflowRuleHandler.GetWorkflowRuleByID)
				workflowRules.PUT("/:id", middleware.RequirePermission("workflow_rules", models.PermissionActionUpdate), workflowRuleHandler.UpdateWorkflowRule)
				workflowRules.DELETE("/:id", middleware.RequirePermission("workflow_rules", models.PermissionActionDelete), workflowRuleHandler.DeleteWorkflowRule)
			}

			// Role routes
			roles := protected.Group("/roles")
			{
				roles.POST("", middleware.RequirePermission("roles", models.PermissionActionCreate), roleHandler.CreateRole)
				roles.GET("", middleware.RequirePermission("roles", models.PermissionActionRead), roleHandler.GetRoles)
				roles.GET("/:id", middleware.RequirePermission("roles", models.PermissionActionRead), roleHandler.GetRoleByID)
				roles.GET("/:id/permissions", middleware.RequirePermission("roles", models.PermissionActionRead), roleHandler.GetRoleWithPermissions)
				roles.PUT("/:id", middleware.RequirePermission("roles", models.PermissionActionUpdate), roleHandler.UpdateRole)
				roles.DELETE("/:id", middleware.RequirePermission("roles", models.PermissionActionDelete), roleHandler.DeleteRole)
				roles.POST("/:id/permissions", middleware.RequirePermission("roles", models.PermissionActionUpdate), roleHandler.AssignPermissionToRole)
				roles.DELETE("/:id/permissions/:permission_id", middleware.RequirePermission("roles", models.PermissionActionUpdate), roleHandler.RevokePermissionFromRole)
				// Role Module Access routes
				roles.GET("/:id/modules", middleware.RequirePermission("roles", models.PermissionActionRead), moduleHandler.GetRoleModuleAccesses)
				roles.POST("/:id/modules", middleware.RequirePermission("roles", models.PermissionActionUpdate), moduleHandler.AssignModuleToRole)
				roles.DELETE("/:id/modules/:access_id", middleware.RequirePermission("roles", models.PermissionActionUpdate), moduleHandler.RevokeModuleFromRole)
			}

			// Permission routes
			permissions := protected.Group("/permissions")
			{
				permissions.POST("", middleware.RequirePermission("permissions", models.PermissionActionCreate), permissionHandler.CreatePermission)
				permissions.GET("", middleware.RequirePermission("permissions", models.PermissionActionRead), permissionHandler.GetPermissions)
				permissions.GET("/groups", middleware.RequirePermission("permissions", models.PermissionActionRead), permissionHandler.GetPermissionGroups)
				permissions.GET("/scopes", middleware.RequirePermission("permissions", models.PermissionActionRead), permissionHandler.GetPermissionScopes)
				permissions.GET("/actions", middleware.RequirePermission("permissions", models.PermissionActionRead), permissionHandler.GetPermissionActions)
				permissions.GET("/:id", middleware.RequirePermission("permissions", models.PermissionActionRead), permissionHandler.GetPermissionByID)
				permissions.PUT("/:id", middleware.RequirePermission("permissions", models.PermissionActionUpdate), permissionHandler.UpdatePermission)
				permissions.DELETE("/:id", middleware.RequirePermission("permissions", models.PermissionActionDelete), permissionHandler.DeletePermission)
			}

			// Module routes
			modules := protected.Group("/modules")
			{
				modules.POST("", middleware.RequirePermission("modules", models.PermissionActionCreate), moduleHandler.CreateModule)
				modules.GET("", middleware.RequirePermission("modules", models.PermissionActionRead), moduleHandler.GetModules)
				modules.GET("/tree", middleware.RequirePermission("modules", models.PermissionActionRead), moduleHandler.GetModuleTree)
				modules.GET("/:id", middleware.RequirePermission("modules", models.PermissionActionRead), moduleHandler.GetModuleByID)
				modules.PUT("/:id", middleware.RequirePermission("modules", models.PermissionActionUpdate), moduleHandler.UpdateModule)
				modules.DELETE("/:id", middleware.RequirePermission("modules", models.PermissionActionDelete), moduleHandler.DeleteModule)
			}

			// Access/Permission checking routes
			access := protected.Group("/access")
			{
				access.POST("/check", accessHandler.CheckPermission)
				access.POST("/check-batch", accessHandler.CheckPermissionBatch)
				access.GET("/modules", accessHandler.GetUserModules)
				access.GET("/permissions", accessHandler.GetUserPermissions)

				// Admin-only cache management
				access.GET("/cache/stats", accessHandler.GetCacheStats)
				access.POST("/cache/invalidate/:user_id", accessHandler.InvalidateUserCache)
				access.POST("/cache/invalidate-all", accessHandler.InvalidateAllCache)
			}
		}
	}

	return router
}
