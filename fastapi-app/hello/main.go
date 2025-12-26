package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"hello/config"
	"hello/handlers"
	"hello/middleware"
)

func main() {
	// Initialize database
	config.InitDB()
	
	// Initialize Gin router
	r := gin.Default()
	
	// Add middleware
	r.Use(middleware.CORS())
	r.Use(middleware.JSON())
	
	// Health check endpoint
	r.GET("/health", handlers.HealthCheck)
	
	// API routes
	api := r.Group("/api/v1")
	{
		// User routes
		users := api.Group("/users")
		{
			users.GET("", handlers.GetUsers)
			users.GET("/:id", handlers.GetUser)
			users.POST("", handlers.CreateUser)
			users.PUT("/:id", handlers.UpdateUser)
			users.DELETE("/:id", handlers.DeleteUser)
		}
	}
	
	// Get port from environment or use default
	port := getPort()
	
	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(":" + port))
}