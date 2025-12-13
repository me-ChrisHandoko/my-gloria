package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	// Initialize Clerk (if secret key is provided)
	if cfg.ClerkSecretKey != "" {
		middleware.InitClerk(cfg.ClerkSecretKey)
		log.Println("Clerk authentication initialized")
	} else {
		log.Println("Warning: CLERK_SECRET_KEY not set, Clerk authentication disabled")
	}

	// Initialize JWT configuration
	jwtConfig := &middleware.JWTConfig{
		SecretKey:    cfg.JWTSecretKey,
		Issuer:       cfg.JWTIssuer,
		Audience:     []string{"gloria-external"},
		ExpiryHours:  cfg.JWTExpiryHours,
		RefreshHours: 168, // 7 days
	}

	// Validate JWT configuration for security - CRITICAL: fail if not properly configured
	if err := jwtConfig.ValidateConfig(); err != nil {
		log.Fatalf("FATAL: JWT configuration error: %v\nPlease set JWT_SECRET_KEY environment variable with a secure 32+ character key", err)
	}
	log.Println("JWT authentication configured successfully")

	// Initialize repositories
	userProfileRepo := repository.NewUserProfileRepository(db)
	apiKeyRepo := repository.NewApiKeyRepository(db)
	permissionRepo := repository.NewPermissionRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	schoolRepo := repository.NewSchoolRepository(db)
	departmentRepo := repository.NewDepartmentRepository(db)
	positionRepo := repository.NewPositionRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	moduleRepo := repository.NewModuleRepository(db)
	employeeRepo := repository.NewEmployeeRepository(db)

	// Initialize services
	userProfileService := service.NewUserProfileService(userProfileRepo)
	apiKeyService := service.NewApiKeyService(apiKeyRepo)
	// AuthService now depends on ApiKeyService for key validation (reduces code duplication)
	// Also uses permissionRepo for hierarchy-based permission loading
	authService := service.NewAuthService(apiKeyService, userProfileRepo, permissionRepo, jwtConfig)
	authLookupAdapter := service.NewAuthLookupAdapter(userProfileRepo, employeeRepo)
	permissionService := service.NewPermissionService(permissionRepo)
	roleService := service.NewRoleService(roleRepo, permissionRepo)
	schoolService := service.NewSchoolService(schoolRepo)
	departmentService := service.NewDepartmentService(departmentRepo)
	positionService := service.NewPositionService(positionRepo)
	auditService := service.NewAuditService(auditRepo)
	moduleService := service.NewModuleService(moduleRepo)
	employeeService := service.NewEmployeeService(employeeRepo)
	dashboardService := service.NewDashboardService(
		employeeRepo,
		schoolRepo,
		departmentRepo,
		positionRepo,
		roleRepo,
		userProfileRepo,
		moduleRepo,
	)
	meService := service.NewMeService(userProfileRepo, permissionRepo, moduleRepo, employeeRepo)

	// Set permission checker for middleware (enables DB-based permission checks)
	middleware.SetPermissionChecker(permissionService)

	// Initialize handlers
	userProfileHandler := handler.NewUserProfileHandler(userProfileService)
	authHandler := handler.NewAuthHandler(authService, auditService, employeeRepo)
	permissionHandler := handler.NewPermissionHandler(permissionService)
	roleHandler := handler.NewRoleHandler(roleService, auditService)
	schoolHandler := handler.NewSchoolHandler(schoolService, auditService)
	departmentHandler := handler.NewDepartmentHandler(departmentService, auditService)
	positionHandler := handler.NewPositionHandler(positionService, auditService)
	apiKeyHandler := handler.NewApiKeyHandler(apiKeyService, auditService)
	auditHandler := handler.NewAuditHandler(auditService)
	moduleHandler := handler.NewModuleHandler(moduleService, auditService)
	employeeHandler := handler.NewEmployeeHandler(employeeService)
	dashboardHandler := handler.NewDashboardHandler(dashboardService)
	meHandler := handler.NewMeHandler(meService)
	monitoringHandler := handler.NewMonitoringHandler()

	// Setup router
	router := gin.Default()

	// Global middleware
	router.Use(middleware.CORS(cfg))
	router.Use(middleware.SecurityHeaders()) // ✅ Security headers for all responses
	router.Use(middleware.Logger())

	// Health check
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// API routes
	api := router.Group("/api/v1")

	// ==========================================
	// Current User routes (/api/v1/me) - Clerk authentication
	// This is the primary endpoint for frontend to get user context
	// ==========================================
	if cfg.ClerkSecretKey != "" {
		me := api.Group("/me")
		me.Use(middleware.ClerkAuth(authLookupAdapter))
		{
			me.GET("", meHandler.GetMe)
			me.GET("/permissions", meHandler.GetMyPermissions)
			me.GET("/modules", meHandler.GetMyModules)
		}
	}

	// ==========================================
	// Public routes (no auth required)
	// ==========================================
	public := api.Group("/public")
	public.Use(middleware.RateLimitStrict(cfg.RateLimitStrict)) // Strict rate limit for auth endpoints
	{
		// Token exchange endpoint
		public.POST("/auth/token", authHandler.ExchangeToken)
		// Token refresh endpoint
		public.POST("/auth/refresh", authHandler.RefreshToken)
		// Email validation endpoint (check if email is registered as employee)
		public.GET("/auth/validate-email", authHandler.ValidateEmail)
	}

	// ==========================================
	// Web routes (Clerk authentication)
	// ==========================================
	web := api.Group("/web")
	if cfg.ClerkSecretKey != "" {
		web.Use(middleware.ClerkAuth(authLookupAdapter))
	}
	web.Use(middleware.RateLimit(cfg.RateLimitDefault)) // Rate limiting for web endpoints
	{
		// User Profile routes (sensitive data - stricter rate limit for modifications)
		userProfiles := web.Group("/user-profiles")
		{
			userProfiles.GET("", userProfileHandler.GetAll)
			userProfiles.GET("/:id", userProfileHandler.GetByID)
			userProfiles.GET("/:id/full", userProfileHandler.GetWithFullDetails)
			userProfiles.GET("/clerk/:clerkUserId", userProfileHandler.GetByClerkUserID)
			userProfiles.GET("/nip/:nip", userProfileHandler.GetByNIP)

			// Create/Update/Delete with stricter rate limit (200 req/hour)
			userProfiles.POST("", middleware.RateLimitSensitive(), middleware.RequirePermission("user:create"), userProfileHandler.Create)
			userProfiles.PUT("/:id", middleware.RateLimitSensitive(), middleware.RequirePermission("user:update"), userProfileHandler.Update)
			userProfiles.DELETE("/:id", middleware.RateLimitSensitive(), middleware.RequirePermission("user:delete"), userProfileHandler.Delete)

			// Role management for users
			userProfiles.GET("/:id/roles", userProfileHandler.GetUserRoles)
			userProfiles.POST("/:id/roles", middleware.RequirePermission("user:assign-role"), userProfileHandler.AssignRole)
			userProfiles.DELETE("/:id/roles/:roleId", middleware.RequirePermission("user:assign-role"), userProfileHandler.RemoveRole)

			// Position management for users
			userProfiles.GET("/:id/positions", userProfileHandler.GetUserPositions)
			userProfiles.POST("/:id/positions", middleware.RequirePermission("user:assign-position"), userProfileHandler.AssignPosition)
			userProfiles.DELETE("/:id/positions/:positionId", middleware.RequirePermission("user:assign-position"), userProfileHandler.RemovePosition)

			// Permission management for users
			userProfiles.GET("/:id/permissions", middleware.RequirePermission("permission:read"), userProfileHandler.GetUserDirectPermissions)
			userProfiles.POST("/:id/permissions", middleware.RequirePermission("user:grant-permission"), userProfileHandler.GrantPermission)
			userProfiles.DELETE("/:id/permissions/:permissionId", middleware.RequirePermission("user:grant-permission"), userProfileHandler.RevokePermission)
		}

		// Permission routes
		permissions := web.Group("/permissions")
		{
			permissions.GET("", permissionHandler.GetAll)
			permissions.GET("/me", permissionHandler.GetMyPermissions)
			permissions.GET("/check", permissionHandler.CheckPermission)
			permissions.GET("/resource/:resource", permissionHandler.GetByResource)
			permissions.GET("/user/:userId", middleware.RequirePermission("permission:read"), permissionHandler.GetUserPermissions)
			permissions.GET("/:id", permissionHandler.GetByID)
		}

		// Role routes
		roles := web.Group("/roles")
		{
			roles.GET("", roleHandler.GetAll)
			roles.GET("/active", roleHandler.GetActive)
			roles.GET("/code/:code", roleHandler.GetByCode)
			roles.GET("/:id", roleHandler.GetByID)
			roles.GET("/:id/permissions", roleHandler.GetWithPermissions)
			roles.POST("", middleware.RequirePermission("role:create"), roleHandler.Create)
			roles.PUT("/:id", middleware.RequirePermission("role:update"), roleHandler.Update)
			roles.DELETE("/:id", middleware.RequirePermission("role:delete"), roleHandler.Delete)
			roles.POST("/:id/permissions", middleware.RequirePermission("role:update"), roleHandler.AssignPermission)
			roles.DELETE("/:id/permissions/:permissionId", middleware.RequirePermission("role:update"), roleHandler.RemovePermission)
		}

		// School routes
		schools := web.Group("/schools")
		{
			schools.GET("", schoolHandler.GetAll)
			schools.GET("/active", schoolHandler.GetActive)
			schools.GET("/code/:code", schoolHandler.GetByCode)
			schools.GET("/:id", schoolHandler.GetByID)
			schools.POST("", middleware.RequirePermission("school:create"), schoolHandler.Create)
			schools.PUT("/:id", middleware.RequirePermission("school:update"), schoolHandler.Update)
			schools.DELETE("/:id", middleware.RequirePermission("school:delete"), schoolHandler.Delete)
		}

		// Department routes
		departments := web.Group("/departments")
		{
			departments.GET("", departmentHandler.GetAll)
			departments.GET("/active", departmentHandler.GetActive)
			departments.GET("/tree", departmentHandler.GetTree)
			departments.GET("/code/:code", departmentHandler.GetByCode)
			departments.GET("/school/:schoolId", departmentHandler.GetBySchoolID)
			departments.GET("/parent/:parentId", departmentHandler.GetByParentID)
			departments.GET("/:id", departmentHandler.GetByID)
			departments.POST("", middleware.RequirePermission("department:create"), departmentHandler.Create)
			departments.PUT("/:id", middleware.RequirePermission("department:update"), departmentHandler.Update)
			departments.DELETE("/:id", middleware.RequirePermission("department:delete"), departmentHandler.Delete)
		}

		// Position routes
		positions := web.Group("/positions")
		{
			positions.GET("", positionHandler.GetAll)
			positions.GET("/active", positionHandler.GetActive)
			positions.GET("/code/:code", positionHandler.GetByCode)
			positions.GET("/department/:departmentId", positionHandler.GetByDepartmentID)
			positions.GET("/school/:schoolId", positionHandler.GetBySchoolID)
			positions.GET("/level/:level", positionHandler.GetByHierarchyLevel)
			positions.GET("/:id", positionHandler.GetByID)
			positions.GET("/:id/hierarchy", positionHandler.GetWithHierarchy)
			positions.POST("", middleware.RequirePermission("position:create"), positionHandler.Create)
			positions.PUT("/:id", middleware.RequirePermission("position:update"), positionHandler.Update)
			positions.DELETE("/:id", middleware.RequirePermission("position:delete"), positionHandler.Delete)
		}

		// API Key management routes
		apiKeys := web.Group("/api-keys")
		{
			apiKeys.GET("", apiKeyHandler.GetAll)
			apiKeys.GET("/active", apiKeyHandler.GetActive)
			apiKeys.GET("/:id", apiKeyHandler.GetByID)
			apiKeys.POST("", apiKeyHandler.Create)
			apiKeys.POST("/:id/revoke", apiKeyHandler.Revoke)
			apiKeys.DELETE("/:id", apiKeyHandler.Delete)
		}

		// Audit log routes
		auditLogs := web.Group("/audit-logs")
		{
			auditLogs.GET("", middleware.RequirePermission("audit:read"), auditHandler.GetAll)
			auditLogs.GET("/me", auditHandler.GetMyAuditLogs)
			auditLogs.GET("/modules", auditHandler.GetModules)
			auditLogs.GET("/entity-types", auditHandler.GetEntityTypes)
			auditLogs.GET("/actions", auditHandler.GetActions)
			auditLogs.GET("/categories", auditHandler.GetCategories)
			auditLogs.GET("/actor/:actorId", middleware.RequirePermission("audit:read"), auditHandler.GetByActorID)
			auditLogs.GET("/module/:module", middleware.RequirePermission("audit:read"), auditHandler.GetByModule)
			auditLogs.GET("/entity/:entityType/:entityId", middleware.RequirePermission("audit:read"), auditHandler.GetByEntity)
			auditLogs.GET("/:id", middleware.RequirePermission("audit:read"), auditHandler.GetByID)
		}

		// Module routes
		modules := web.Group("/modules")
		{
			modules.GET("", moduleHandler.GetAll)
			modules.GET("/active", moduleHandler.GetActive)
			modules.GET("/tree", moduleHandler.GetTree)
			modules.GET("/categories", moduleHandler.GetCategories)
			modules.GET("/code/:code", moduleHandler.GetByCode)
			modules.GET("/category/:category", moduleHandler.GetByCategory)
			modules.GET("/parent/:parentId", moduleHandler.GetByParentID)
			modules.GET("/me", moduleHandler.GetMyModules)
			modules.GET("/:id", moduleHandler.GetByID)
			modules.POST("", middleware.RequirePermission("module:create"), moduleHandler.Create)
			modules.PUT("/:id", middleware.RequirePermission("module:update"), moduleHandler.Update)
			modules.DELETE("/:id", middleware.RequirePermission("module:delete"), moduleHandler.Delete)

			// Role module access
			modules.GET("/role/:roleId/access", middleware.RequirePermission("module:read"), moduleHandler.GetRoleModuleAccess)
			modules.POST("/role/:roleId/access", middleware.RequirePermission("module:assign"), moduleHandler.AssignRoleModuleAccess)
			modules.DELETE("/role/:roleId/access/:moduleId", middleware.RequirePermission("module:assign"), moduleHandler.RemoveRoleModuleAccess)

			// User module access
			modules.GET("/user/:userId/access", middleware.RequirePermission("module:read"), moduleHandler.GetUserModuleAccess)
			modules.POST("/user/:userId/access", middleware.RequirePermission("module:assign"), moduleHandler.AssignUserModuleAccess)
			modules.DELETE("/user/:userId/access/:moduleId", middleware.RequirePermission("module:assign"), moduleHandler.RemoveUserModuleAccess)
		}

		// Employee routes (master data from gloria_master schema)
		employees := web.Group("/employees")
		employees.Use(middleware.RateLimit(cfg.RateLimitDefault))
		{
			employees.GET("", employeeHandler.GetAll)
			employees.GET("/active", employeeHandler.GetActive)
			employees.GET("/search", employeeHandler.Search)
			employees.GET("/statistics", employeeHandler.GetStatistics)
			employees.GET("/department/:department", employeeHandler.GetByDepartment)
			employees.GET("/location/:location", employeeHandler.GetByLocation)
			employees.GET("/:nip", employeeHandler.GetByNIP)
		}

		// Dashboard routes (expensive queries - lower rate limit)
		dashboard := web.Group("/dashboard")
		dashboard.Use(middleware.RateLimitCritical()) // 100 req/hour for expensive aggregations
		{
			dashboard.GET("/statistics", dashboardHandler.GetStatistics)
			dashboard.GET("/statistics/employees", dashboardHandler.GetEmployeeStatistics)
			dashboard.GET("/statistics/organization", dashboardHandler.GetOrganizationStatistics)
			dashboard.GET("/statistics/system", dashboardHandler.GetSystemStatistics)
		}
	}

	// ==========================================
	// Monitoring routes (internal use, optional auth)
	// ==========================================
	monitoring := api.Group("/monitoring")
	{
		monitoring.GET("/health", monitoringHandler.GetSystemHealth)
		monitoring.GET("/metrics/rate-limit", monitoringHandler.GetRateLimitMetrics)
		monitoring.GET("/metrics/cache", monitoringHandler.GetAuthCacheStats)
	}

	// ==========================================
	// External API routes (JWT authentication)
	// For external web applications integration
	// ==========================================
	external := api.Group("/external")
	external.Use(middleware.JWTAuth(jwtConfig))
	external.Use(middleware.RateLimit(cfg.RateLimitDefault))
	{
		// Employee email lookup endpoint (for external system email verification)
		external.GET("/employees/email/:email", middleware.RequirePermission("employee:read"), employeeHandler.GetByEmail)
	}

	// =====================================================
	// Initialize HR Status Listener for real-time cache invalidation
	// =====================================================
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Build PostgreSQL connection string for listener
	connString := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	hrListener := middleware.NewHRStatusListener(db, connString)
	if err := hrListener.Start(ctx); err != nil {
		log.Printf("⚠️  [Startup] Failed to start HR listener: %v", err)
		log.Println("   └─ Continuing without real-time sync (will use 30s cache TTL)")
	} else {
		log.Println("✅ [Startup] HR status listener initialized successfully")
		log.Println("   └─ Real-time cache invalidation enabled (instant user logout)")
	}

	// Setup graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server in goroutine
	go func() {
		log.Printf("🚀 Server starting on port %s", cfg.ServerPort)
		log.Printf("📋 Routes configured:")
		log.Printf("  - Me:       /api/v1/me/* (Clerk auth) - Current user context")
		log.Printf("  - Public:   /api/v1/public/*")
		log.Printf("  - Web:      /api/v1/web/* (Clerk auth)")
		log.Printf("  - External: /api/v1/external/* (JWT auth)")
		log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		log.Println("✅ Server ready to accept requests")
		log.Println("🔔 HR status changes will trigger instant cache invalidation")
		log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

		if err := router.Run(":" + cfg.ServerPort); err != nil {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	<-quit
	log.Println("")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🛑 Shutdown signal received - graceful shutdown initiated")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Stop HR listener
	log.Println("🛑 Stopping HR status listener...")
	hrListener.Stop()
	log.Println("✅ HR status listener stopped")

	// Cancel context
	cancel()

	// Give connections time to close
	time.Sleep(2 * time.Second)

	log.Println("✅ Server shutdown complete")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}
