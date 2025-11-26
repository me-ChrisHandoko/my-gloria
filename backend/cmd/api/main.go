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

	// Validate JWT configuration for security
	if err := jwtConfig.ValidateConfig(); err != nil {
		log.Printf("WARNING: JWT configuration issue: %v", err)
		log.Println("External API authentication (JWT) will not work properly!")
	} else {
		log.Println("JWT authentication configured successfully")
	}

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

	// Set permission checker for middleware (enables DB-based permission checks)
	middleware.SetPermissionChecker(permissionService)

	// Initialize handlers
	userProfileHandler := handler.NewUserProfileHandler(userProfileService)
	authHandler := handler.NewAuthHandler(authService, auditService)
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

	// Setup router
	router := gin.Default()

	// Global middleware
	router.Use(middleware.CORS(cfg))
	router.Use(middleware.Logger())

	// Health check
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// API routes
	api := router.Group("/api/v1")

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
	}

	// ==========================================
	// Web routes (Clerk authentication)
	// ==========================================
	web := api.Group("/web")
	if cfg.ClerkSecretKey != "" {
		web.Use(middleware.ClerkAuth(authLookupAdapter))
	}
	{
		// Current user endpoint
		web.GET("/me", func(c *gin.Context) {
			authCtx := middleware.GetAuthContext(c)
			if authCtx == nil {
				handler.ErrorResponse(c, 401, "not authenticated")
				return
			}

			// Get full user profile
			profile, err := userProfileService.GetWithFullDetails(authCtx.UserID)
			if err != nil {
				handler.ErrorResponse(c, 404, "user not found")
				return
			}

			handler.SuccessResponse(c, 200, "", profile)
		})

		// User Profile routes
		userProfiles := web.Group("/user-profiles")
		{
			userProfiles.GET("", userProfileHandler.GetAll)
			userProfiles.GET("/:id", userProfileHandler.GetByID)
			userProfiles.GET("/:id/full", userProfileHandler.GetWithFullDetails)
			userProfiles.GET("/clerk/:clerkUserId", userProfileHandler.GetByClerkUserID)
			userProfiles.GET("/nip/:nip", userProfileHandler.GetByNIP)
			userProfiles.POST("", middleware.RequirePermission("user:create"), userProfileHandler.Create)
			userProfiles.PUT("/:id", middleware.RequirePermission("user:update"), userProfileHandler.Update)
			userProfiles.DELETE("/:id", middleware.RequirePermission("user:delete"), userProfileHandler.Delete)

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
		{
			employees.GET("", employeeHandler.GetAll)
			employees.GET("/active", employeeHandler.GetActive)
			employees.GET("/search", employeeHandler.Search)
			employees.GET("/statistics", employeeHandler.GetStatistics)
			employees.GET("/department/:department", employeeHandler.GetByDepartment)
			employees.GET("/location/:location", employeeHandler.GetByLocation)
			employees.GET("/:nip", employeeHandler.GetByNIP)
		}

		// Dashboard routes
		dashboard := web.Group("/dashboard")
		{
			dashboard.GET("/statistics", dashboardHandler.GetStatistics)
			dashboard.GET("/statistics/employees", dashboardHandler.GetEmployeeStatistics)
			dashboard.GET("/statistics/organization", dashboardHandler.GetOrganizationStatistics)
			dashboard.GET("/statistics/system", dashboardHandler.GetSystemStatistics)
		}
	}

	// ==========================================
	// External API routes (JWT authentication)
	// ==========================================
	external := api.Group("/external")
	external.Use(middleware.JWTAuth(jwtConfig))
	external.Use(middleware.RateLimit(cfg.RateLimitDefault))
	{
		// Employee endpoints (read-only for external systems)
		external.GET("/employees", middleware.RequirePermission("employee:read"), func(c *gin.Context) {
			profiles, err := userProfileService.GetAll()
			if err != nil {
				handler.ErrorResponse(c, 500, err.Error())
				return
			}
			handler.SuccessResponse(c, 200, "", profiles)
		})

		external.GET("/employees/:nip", middleware.RequirePermission("employee:read"), func(c *gin.Context) {
			nip := c.Param("nip")
			profile, err := userProfileService.GetByNIP(nip)
			if err != nil {
				handler.ErrorResponse(c, 404, "employee not found")
				return
			}
			handler.SuccessResponse(c, 200, "", profile)
		})

		// School endpoints (read-only for external systems)
		external.GET("/schools", middleware.RequirePermission("school:read"), func(c *gin.Context) {
			schools, err := schoolService.GetAll()
			if err != nil {
				handler.ErrorResponse(c, 500, err.Error())
				return
			}
			handler.SuccessResponse(c, 200, "", schools)
		})

		external.GET("/schools/:id", middleware.RequirePermission("school:read"), func(c *gin.Context) {
			id := c.Param("id")
			school, err := schoolService.GetByID(id)
			if err != nil {
				handler.ErrorResponse(c, 404, "school not found")
				return
			}
			handler.SuccessResponse(c, 200, "", school)
		})

		// Department endpoints (read-only for external systems)
		external.GET("/departments", middleware.RequirePermission("department:read"), func(c *gin.Context) {
			schoolID := c.Query("school_id")
			var departments interface{}
			var err error
			if schoolID != "" {
				departments, err = departmentService.GetBySchoolID(schoolID)
			} else {
				departments, err = departmentService.GetAll()
			}
			if err != nil {
				handler.ErrorResponse(c, 500, err.Error())
				return
			}
			handler.SuccessResponse(c, 200, "", departments)
		})

		external.GET("/departments/:id", middleware.RequirePermission("department:read"), func(c *gin.Context) {
			id := c.Param("id")
			department, err := departmentService.GetByID(id)
			if err != nil {
				handler.ErrorResponse(c, 404, "department not found")
				return
			}
			handler.SuccessResponse(c, 200, "", department)
		})

		// Position endpoints (read-only for external systems)
		external.GET("/positions", middleware.RequirePermission("position:read"), func(c *gin.Context) {
			schoolID := c.Query("school_id")
			departmentID := c.Query("department_id")
			var positions interface{}
			var err error
			if departmentID != "" {
				positions, err = positionService.GetByDepartmentID(departmentID)
			} else if schoolID != "" {
				positions, err = positionService.GetBySchoolID(schoolID)
			} else {
				positions, err = positionService.GetAll()
			}
			if err != nil {
				handler.ErrorResponse(c, 500, err.Error())
				return
			}
			handler.SuccessResponse(c, 200, "", positions)
		})

		external.GET("/positions/:id", middleware.RequirePermission("position:read"), func(c *gin.Context) {
			id := c.Param("id")
			position, err := positionService.GetByID(id)
			if err != nil {
				handler.ErrorResponse(c, 404, "position not found")
				return
			}
			handler.SuccessResponse(c, 200, "", position)
		})
	}

	// ==========================================
	// Legacy routes (for backward compatibility)
	// READ operations without auth, WRITE operations protected
	// ==========================================
	legacy := api.Group("/user-profiles")
	{
		// Public read operations (backward compatible)
		legacy.GET("", userProfileHandler.GetAll)
		legacy.GET("/:id", userProfileHandler.GetByID)
		legacy.GET("/:id/full", userProfileHandler.GetWithFullDetails)
		legacy.GET("/clerk/:clerkUserId", userProfileHandler.GetByClerkUserID)
		legacy.GET("/nip/:nip", userProfileHandler.GetByNIP)
		// WRITE operations require Clerk auth for security
		if cfg.ClerkSecretKey != "" {
			legacyProtected := legacy.Group("")
			legacyProtected.Use(middleware.ClerkAuth(authLookupAdapter))
			legacyProtected.POST("", middleware.RequirePermission("user:create"), userProfileHandler.Create)
			legacyProtected.PUT("/:id", middleware.RequirePermission("user:update"), userProfileHandler.Update)
			legacyProtected.DELETE("/:id", middleware.RequirePermission("user:delete"), userProfileHandler.Delete)
		}
	}

	// Start server
	log.Printf("Server starting on port %s", cfg.ServerPort)
	log.Printf("Routes configured:")
	log.Printf("  - Public:   /api/v1/public/*")
	log.Printf("  - Web:      /api/v1/web/* (Clerk auth)")
	log.Printf("  - External: /api/v1/external/* (JWT auth)")
	log.Printf("  - Legacy:   /api/v1/user-profiles/* (no auth)")

	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
