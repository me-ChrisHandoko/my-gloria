package main

import (
	"log"

	"backend/internal/config"
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

	// Auto migrate
	if err := db.AutoMigrate(&domain.User{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Println("Database migration completed!")

	// Initialize layers
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService)

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
		users := api.Group("/users")
		{
			users.GET("", userHandler.GetAll)
			users.GET("/:id", userHandler.GetByID)
			users.POST("", userHandler.Create)
			users.PUT("/:id", userHandler.Update)
			users.DELETE("/:id", userHandler.Delete)
		}
	}

	// Start server
	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
