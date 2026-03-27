package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Models

type Todo struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Content    string    `json:"content" gorm:"size:500;not null"`
	Priority   string    `json:"priority" gorm:"size:10;default:medium"`
	Pinned     bool      `json:"pinned" gorm:"default:false"`
	Done       bool      `json:"done" gorm:"default:false"`
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
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Auth middleware for /api routes
	authMiddleware := func(c *gin.Context) {
		key := c.GetHeader("X-API-Key")
		if key == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API key required", "hint": "Add X-API-Key header"})
			c.Abort()
			return
		}
		if key != apiKey {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			c.Abort()
			return
		}
		c.Next()
	}

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes (with auth)
	api := r.Group("/api")
	api.Use(authMiddleware)
	{
		api.GET("/verify", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "valid"})
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
	rand.Read(bytes)
	return "sk-memo-" + hex.EncodeToString(bytes)
}

// Todo handlers

func getTodos(c *gin.Context) {
	var todos []Todo
	db.Order("pinned DESC, created_at DESC").Preload("Category").Find(&todos)
	c.JSON(http.StatusOK, todos)
}

func createTodo(c *gin.Context) {
	var todo Todo
	if err := c.ShouldBindJSON(&todo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&todo)
	c.JSON(http.StatusCreated, todo)
}

func updateTodo(c *gin.Context) {
	var todo Todo
	id := c.Param("id")
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Model(&todo).Updates(updates)
	db.Preload("Category").First(&todo, id)
	c.JSON(http.StatusOK, todo)
}

func deleteTodo(c *gin.Context) {
	id := c.Param("id")
	if db.Delete(&Todo{}, id).RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

func toggleTodo(c *gin.Context) {
	var todo Todo
	id := c.Param("id")
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}
	todo.Done = !todo.Done
	db.Save(&todo)
	c.JSON(http.StatusOK, todo)
}

func pinTodo(c *gin.Context) {
	var todo Todo
	id := c.Param("id")
	if err := db.First(&todo, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Todo not found"})
		return
	}
	todo.Pinned = !todo.Pinned
	db.Save(&todo)
	c.JSON(http.StatusOK, todo)
}

// Countdown handlers

func getCountdowns(c *gin.Context) {
	var countdowns []Countdown
	db.Order("pinned DESC, target_date ASC").Find(&countdowns)
	c.JSON(http.StatusOK, countdowns)
}

func createCountdown(c *gin.Context) {
	var countdown Countdown
	if err := c.ShouldBindJSON(&countdown); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&countdown)
	c.JSON(http.StatusCreated, countdown)
}

func updateCountdown(c *gin.Context) {
	var countdown Countdown
	id := c.Param("id")
	if err := db.First(&countdown, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Countdown not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Model(&countdown).Updates(updates)
	c.JSON(http.StatusOK, countdown)
}

func deleteCountdown(c *gin.Context) {
	id := c.Param("id")
	if db.Delete(&Countdown{}, id).RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Countdown not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

// Category handlers

func getCategories(c *gin.Context) {
	var categories []Category
	db.Find(&categories)
	c.JSON(http.StatusOK, categories)
}

func createCategory(c *gin.Context) {
	var category Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&category)
	c.JSON(http.StatusCreated, category)
}

func updateCategory(c *gin.Context) {
	var category Category
	id := c.Param("id")
	if err := db.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Model(&category).Updates(updates)
	c.JSON(http.StatusOK, category)
}

func deleteCategory(c *gin.Context) {
	id := c.Param("id")
	db.Model(&Todo{}).Where("category_id = ?", id).Update("category_id", nil)
	if db.Delete(&Category{}, id).RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	c.Status(http.StatusNoContent)
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
			Total:  int(totalCountdowns),
			DueSoon: int(dueSoon),
			Overdue: int(overdue),
			Pinned:  int(pinnedCountdowns),
		},
	}

	c.JSON(http.StatusOK, stats)
}
