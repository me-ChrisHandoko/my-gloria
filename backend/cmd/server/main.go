package main

import (
	"backend/configs"
	"backend/internal/handler"
	"backend/internal/infrastructure/database"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

var (
	// Version is set during build
	Version = "1.0.0-mvp"
	// BuildTime is set during build
	BuildTime = "unknown"
)

func main() {
	// Print version info
	fmt.Printf("🚀 My Gloria Backend v%s (built %s)\n", Version, BuildTime)

	// Load configuration
	cfg, err := configs.Load()
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}
	fmt.Printf("✅ Configuration loaded (env: %s)\n", cfg.App.Env)

	// Initialize database connection
	db, err := database.NewPostgresDB(&cfg.Database)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer database.Close(db)
	fmt.Println("✅ Database connected")

	// Run auto-migration
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("❌ Failed to run auto-migration: %v", err)
	}

	// Initialize handlers
	healthHandler := handler.NewHealthHandler()

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Health check endpoint
	r.Get("/health", healthHandler.HandleHealth)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// TODO: Add your API endpoints here
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"message": "My Gloria API v1", "status": "ready"}`))
		})
	})

	// Start server
	addr := fmt.Sprintf(":%d", cfg.App.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Server run context
	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	// Listen for syscall signals for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sig

		// Shutdown signal with grace period
		shutdownCtx, cancel := context.WithTimeout(serverCtx, 30*time.Second)
		defer cancel()

		go func() {
			<-shutdownCtx.Done()
			if shutdownCtx.Err() == context.DeadlineExceeded {
				log.Fatal("⏱️  Graceful shutdown timed out, forcing exit")
			}
		}()

		// Trigger graceful shutdown
		fmt.Println("\n🛑 Shutting down server...")
		err := srv.Shutdown(shutdownCtx)
		if err != nil {
			log.Fatal(err)
		}
		serverStopCtx()
	}()

	// Run the server
	fmt.Printf("🌐 Server starting on %s\n", addr)
	err = srv.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Fatalf("❌ Server error: %v", err)
	}

	// Wait for server context to be stopped
	<-serverCtx.Done()
	fmt.Println("✅ Server stopped gracefully")
}
