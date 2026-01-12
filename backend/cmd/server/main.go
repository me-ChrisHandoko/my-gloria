package main

import (
	"log"
	"time"

	"backend/configs"
	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"

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

	// Configure CORS
	// In development: Allow localhost origins for testing
	// In production: Should be configured with specific frontend origin via environment variable
	corsConfig := cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",  // React default
			"http://localhost:5173",  // Vite default
			"http://localhost:8080",  // Alternative dev server
		},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Authorization",
			"Content-Type",
			"Accept",
		},
		ExposeHeaders: []string{
			"Content-Length",
		},
		AllowCredentials: false, // JWT in header doesn't need credentials
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

		// Protected routes (requires JWT token)
		protected := v1.Group("/")
		protected.Use(middleware.AuthRequired())
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
				users.GET("", handlers.GetUsers)
				users.GET("/:id", handlers.GetUser)
				users.PUT("/:id", handlers.UpdateUser)
				users.DELETE("/:id", handlers.DeleteUser)
			}

			// Student routes
			students := protected.Group("/students")
			{
				students.POST("", handlers.CreateStudent)
				students.GET("", handlers.GetStudents)
				students.GET("/:id", handlers.GetStudent)
				students.PUT("/:id", handlers.UpdateStudent)
				students.DELETE("/:id", handlers.DeleteStudent)
			}

			// Teacher routes
			teachers := protected.Group("/teachers")
			{
				teachers.POST("", handlers.CreateTeacher)
				teachers.GET("", handlers.GetTeachers)
				teachers.GET("/:id", handlers.GetTeacher)
				teachers.PUT("/:id", handlers.UpdateTeacher)
				teachers.DELETE("/:id", handlers.DeleteTeacher)
			}

			// Class routes
			classes := protected.Group("/classes")
			{
				classes.POST("", handlers.CreateClass)
				classes.GET("", handlers.GetClasses)
				classes.GET("/:id", handlers.GetClass)
				classes.PUT("/:id", handlers.UpdateClass)
				classes.DELETE("/:id", handlers.DeleteClass)
			}
		}
	}

	return router
}
