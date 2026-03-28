package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// Response represents standard API response
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Models

type Todo struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Content    string    `json:"content" gorm:"size:500;not null"`
	Priority   string    `json:"priority" gorm:"size:10;default:medium"`
	Pinned     bool      `json:"pinned" gorm:"default:false"`
	Done       bool      `json:"done" gorm:"default:false"`
	DueDate    *time.Time `json:"due_date"`
	CategoryID *uint     `json:"category_id"`
	Category   *Category `json:"category" gorm:"foreignKey:CategoryID"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Countdown struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Title      string    `json:"title" gorm:"size:200;not null"`
	TargetDate time.Time `json:"target_date" gorm:"not null"`
	Priority   string    `json:"priority" gorm:"size:10;default:medium"`
	Pinned     bool      `json:"pinned" gorm:"default:false"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Category struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	Color     string    `json:"color" gorm:"size:20;default:#3B82F6"`
	CreatedAt time.Time `json:"created_at"`
}

type Stats struct {
	Todos      TodoStats      `json:"todos"`
	Countdowns CountdownStats `json:"countdowns"`
}

type TodoStats struct {
	Total          int            `json:"total"`
	Done           int            `json:"done"`
	Pending        int            `json:"pending"`
	CompletionRate float64        `json:"completion_rate"`
	ByPriority     map[string]int `json:"by_priority"`
	Pinned         int            `json:"pinned"`
}

type CountdownStats struct {
	Total    int `json:"total"`
	DueSoon  int `json:"due_soon"`
	Overdue  int `json:"overdue"`
	Pinned   int `json:"pinned"`
}

type APIKeyConfig struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Key       string    `json:"key" gorm:"size:64;unique"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	db            *gorm.DB
	apiKey        = ""
	configFile    = "api_key.txt"
	allowedOrigins = []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
		"http://127.0.0.1:3000",
	}
)

func main() {
	var err error
	db, err = gorm.Open(sqlite.Open("memo.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db.AutoMigrate(&Todo{}, &Countdown{}, &Category{}, &APIKeyConfig{})

	// Load or generate API Key
	apiKey = loadOrGenerateAPIKey()

	// Print startup info
	fmt.Println("========================================")
	fmt.Println("       MemoDesk API Server")
	fmt.Println("========================================")
	fmt.Printf("API Key: %s\n", apiKey)
	fmt.Println("========================================")
	fmt.Println("Copy this API Key and save it safely.")
	fmt.Println("You will need it to access the API.")
	fmt.Println("========================================\n")

	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware())

	// Auth middleware for /api routes
	authMiddleware := func(c *gin.Context) {
		key := c.GetHeader("X-API-Key")
		if key == "" {
			c.JSON(http.StatusUnauthorized, Response{Success: false, Error: "API key required"})
			c.Abort()
			return
		}
		if key != apiKey {
			c.JSON(http.StatusUnauthorized, Response{Success: false, Error: "Invalid API key"})
			c.Abort()
			return
		}
		c.Next()
	}

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, Response{Success: true, Data: gin.H{"status": "ok"}})
	})

	// API routes (with auth)
	api := r.Group("/api")
	api.Use(authMiddleware)
	{
		api.GET("/verify", func(c *gin.Context) {
			c.JSON(http.StatusOK, Response{Success: true, Data: gin.H{"status": "valid"}})
		})

		api.GET("/todos", getTodos)
		api.POST("/todos", createTodo)
		api.PUT("/todos/:id", updateTodo)
		api.DELETE("/todos/:id", deleteTodo)
		api.PATCH("/todos/:id/toggle", toggleTodo)
		api.PATCH("/todos/:id/pin", pinTodo)

		api.GET("/countdowns", getCountdowns)
		api.POST("/countdowns", createCountdown)
		api.PUT("/countdowns/:id", updateCountdown)
		api.DELETE("/countdowns/:id", deleteCountdown)

		api.GET("/categories", getCategories)
		api.POST("/categories", createCategory)
		api.PUT("/categories/:id", updateCategory)
		api.DELETE("/categories/:id", deleteCategory)

		api.GET("/stats", getStats)
	}

	r.Run(":3000")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, o := range allowedOrigins {
			if o == origin {
				allowed = true
				break
			}
		}
		
		// Allow if no origin (mobile apps, desktop) or in allowed list
		if origin == "" || allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
		c.Header("Access-Control-Max-Age", "86400")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func loadOrGenerateAPIKey() string {
	// Try to load existing key from config file
	if data, err := os.ReadFile(configFile); err == nil {
		key := string(data)
		if len(key) >= 32 {
			return key
		}
	}

	// Generate new key
	key := generateAPIKey()

	// Save to config file
	os.WriteFile(configFile, []byte(key), 0600)

	return key
}

func generateAPIKey() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatal("Failed to generate API key:", err)
	}
	return "sk-memo-" + hex.EncodeToString(bytes)
}

// Helper functions

func successResponse(data interface{}) Response {
	return Response{Success: true, Data: data}
}

func errorResponse(err string) Response {
	return Response{Success: false, Error: err}
}

func validatePriority(priority string) bool {
	return priority == "high" || priority == "medium" || priority == "low"
}

func sanitizeString(s string) string {
	return strings.TrimSpace(s)
}

// Todo handlers

func getTodos(c *gin.Context) {
	var todos []Todo
	db.Order("pinned DESC, created_at DESC").Preload("Category").Find(&todos)
	c.JSON(http.StatusOK, successResponse(todos))
}

func createTodo(c *gin.Context) {
	var todo Todo
	if err := c.ShouldBindJSON(&todo); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: "+err.Error()))
		return
	}

	// Validate content
	todo.Content = sanitizeString(todo.Content)
	if todo.Content == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Content is required"))
		return
	}

	// Validate priority
	if !validatePriority(todo.Priority) {
		todo.Priority = "medium"
	}

	db.Create(&todo)
	db.Preload("Category").First(&todo, todo.ID)
	c.JSON(http.StatusCreated, successResponse(todo))
}

func updateTodo(c *gin.Context) {
	var todo Todo
	id := c.Param("id")
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: "+err.Error()))
		return
	}

	// Validate content if provided
	if content, ok := updates["content"].(string); ok {
		content = sanitizeString(content)
		if content == "" {
			c.JSON(http.StatusBadRequest, errorResponse("Content cannot be empty"))
			return
		}
		updates["content"] = content
	}

	// Validate priority if provided
	if priority, ok := updates["priority"].(string); ok {
		if !validatePriority(priority) {
			c.JSON(http.StatusBadRequest, errorResponse("Invalid priority. Must be high, medium, or low"))
			return
		}
	}

	db.Model(&todo).Updates(updates)
	db.Preload("Category").First(&todo, id)
	c.JSON(http.StatusOK, successResponse(todo))
}

func deleteTodo(c *gin.Context) {
	id := c.Param("id")
	if db.Delete(&Todo{}, id).RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found"))
		return
	}
	c.JSON(http.StatusOK, successResponse(gin.H{"message": "Todo deleted"}))
}

func toggleTodo(c *gin.Context) {
	var todo Todo
	id := c.Param("id")
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found"))
		return
	}
	todo.Done = !todo.Done
	db.Save(&todo)
	c.JSON(http.StatusOK, successResponse(todo))
}

func pinTodo(c *gin.Context) {
	var todo Todo
	id := c.Param("id")
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found"))
		return
	}
	todo.Pinned = !todo.Pinned
	db.Save(&todo)
	c.JSON(http.StatusOK, successResponse(todo))
}

// Countdown handlers

func getCountdowns(c *gin.Context) {
	var countdowns []Countdown
	db.Order("pinned DESC, target_date ASC").Find(&countdowns)
	c.JSON(http.StatusOK, successResponse(countdowns))
}

func createCountdown(c *gin.Context) {
	var countdown Countdown
	if err := c.ShouldBindJSON(&countdown); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: "+err.Error()))
		return
	}

	// Validate title
	countdown.Title = sanitizeString(countdown.Title)
	if countdown.Title == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Title is required"))
		return
	}

	// Validate target date
	if countdown.TargetDate.IsZero() {
		c.JSON(http.StatusBadRequest, errorResponse("Target date is required"))
		return
	}

	// Validate priority
	if !validatePriority(countdown.Priority) {
		countdown.Priority = "medium"
	}

	db.Create(&countdown)
	c.JSON(http.StatusCreated, successResponse(countdown))
}

func updateCountdown(c *gin.Context) {
	var countdown Countdown
	id := c.Param("id")
	if err := db.First(&countdown, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Countdown not found"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: "+err.Error()))
		return
	}

	// Validate title if provided
	if title, ok := updates["title"].(string); ok {
		title = sanitizeString(title)
		if title == "" {
			c.JSON(http.StatusBadRequest, errorResponse("Title cannot be empty"))
			return
		}
		updates["title"] = title
	}

	// Validate priority if provided
	if priority, ok := updates["priority"].(string); ok {
		if !validatePriority(priority) {
			c.JSON(http.StatusBadRequest, errorResponse("Invalid priority. Must be high, medium, or low"))
			return
		}
	}

	db.Model(&countdown).Updates(updates)
	c.JSON(http.StatusOK, successResponse(countdown))
}

func deleteCountdown(c *gin.Context) {
	id := c.Param("id")
	if db.Delete(&Countdown{}, id).RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Countdown not found"))
		return
	}
	c.JSON(http.StatusOK, successResponse(gin.H{"message": "Countdown deleted"}))
}

// Category handlers

func getCategories(c *gin.Context) {
	var categories []Category
	db.Find(&categories)
	c.JSON(http.StatusOK, successResponse(categories))
}

func createCategory(c *gin.Context) {
	var category Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: "+err.Error()))
		return
	}

	// Validate name
	category.Name = sanitizeString(category.Name)
	if category.Name == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Name is required"))
		return
	}

	// Validate color (basic hex color check)
	if category.Color == "" {
		category.Color = "#3B82F6"
	}

	db.Create(&category)
	c.JSON(http.StatusCreated, successResponse(category))
}

func updateCategory(c *gin.Context) {
	var category Category
	id := c.Param("id")
	if err := db.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Category not found"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: "+err.Error()))
		return
	}

	// Validate name if provided
	if name, ok := updates["name"].(string); ok {
		name = sanitizeString(name)
		if name == "" {
			c.JSON(http.StatusBadRequest, errorResponse("Name cannot be empty"))
			return
		}
		updates["name"] = name
	}

	db.Model(&category).Updates(updates)
	c.JSON(http.StatusOK, successResponse(category))
}

func deleteCategory(c *gin.Context) {
	id := c.Param("id")
	db.Model(&Todo{}).Where("category_id = ?", id).Update("category_id", nil)
	if db.Delete(&Category{}, id).RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Category not found"))
		return
	}
	c.JSON(http.StatusOK, successResponse(gin.H{"message": "Category deleted"}))
}

// Stats handler

func getStats(c *gin.Context) {
	var totalTodos int64
	var doneTodos int64
	var highPriority, mediumPriority, lowPriority int64
	var pinnedTodos, pinnedCountdowns int64
	var totalCountdowns int64

	db.Model(&Todo{}).Count(&totalTodos)
	db.Model(&Todo{}).Where("done = ?", true).Count(&doneTodos)
	db.Model(&Todo{}).Where("priority = ? AND done = ?", "high", false).Count(&highPriority)
	db.Model(&Todo{}).Where("priority = ? AND done = ?", "medium", false).Count(&mediumPriority)
	db.Model(&Todo{}).Where("priority = ? AND done = ?", "low", false).Count(&lowPriority)
	db.Model(&Todo{}).Where("pinned = ?", true).Count(&pinnedTodos)
	db.Model(&Countdown{}).Where("pinned = ?", true).Count(&pinnedCountdowns)
	db.Model(&Countdown{}).Count(&totalCountdowns)

	now := time.Now()
	sevenDaysLater := now.AddDate(0, 0, 7)
	var dueSoon int64
	db.Model(&Countdown{}).Where("target_date >= ? AND target_date <= ?", now, sevenDaysLater).Count(&dueSoon)

	var overdue int64
	db.Model(&Countdown{}).Where("target_date < ?", now).Count(&overdue)

	completionRate := 0.0
	if totalTodos > 0 {
		completionRate = float64(doneTodos) / float64(totalTodos) * 100
	}

	stats := Stats{
		Todos: TodoStats{
			Total:          int(totalTodos),
			Done:           int(doneTodos),
			Pending:        int(totalTodos - doneTodos),
			CompletionRate: completionRate,
			ByPriority: map[string]int{
				"high":   int(highPriority),
				"medium": int(mediumPriority),
				"low":    int(lowPriority),
			},
			Pinned: int(pinnedTodos),
		},
		Countdowns: CountdownStats{
			Total:    int(totalCountdowns),
			DueSoon:  int(dueSoon),
			Overdue:  int(overdue),
			Pinned:   int(pinnedCountdowns),
		},
	}

	c.JSON(http.StatusOK, successResponse(stats))
}
