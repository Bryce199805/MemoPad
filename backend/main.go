package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Response represents standard API response
type Response struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	ErrorCode string      `json:"error_code,omitempty"`
}

// User model
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"size:50;uniqueIndex;not null"`
	Email     string    `json:"email" gorm:"size:100;index"`
	Password  string    `json:"-" gorm:"size:255;not null"`
	APIKey    string    `json:"-" gorm:"size:64;uniqueIndex;not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Todo model with user relation
type Todo struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	UserID     uint       `json:"user_id" gorm:"index;not null"`
	Content    string     `json:"content" gorm:"size:500;not null"`
	Priority   string     `json:"priority" gorm:"size:10;default:medium"`
	Pinned     bool       `json:"pinned" gorm:"default:false"`
	Done       bool       `json:"done" gorm:"default:false"`
	DueDate    *time.Time `json:"due_date"`
	CategoryID *uint      `json:"category_id"`
	Category   *Category  `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// Countdown model with user relation
type Countdown struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"user_id" gorm:"index;not null"`
	Title      string    `json:"title" gorm:"size:200;not null"`
	TargetDate time.Time `json:"target_date" gorm:"not null"`
	Priority   string    `json:"priority" gorm:"size:10;default:medium"`
	Pinned     bool      `json:"pinned" gorm:"default:false"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Category model with user relation
type Category struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index;not null"`
	Name      string    `json:"name" gorm:"size:100;not null"`
	Color     string    `json:"color" gorm:"size:20;default:#6366f1"`
	CreatedAt time.Time `json:"created_at"`
}

// Stats for dashboard
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
	Total   int `json:"total"`
	DueSoon int `json:"due_soon"`
	Overdue int `json:"overdue"`
	Pinned  int `json:"pinned"`
}

var db *gorm.DB

func main() {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	var err error
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "/app/data"
	}

	// Ensure data directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatal("Failed to create data directory:", err)
	}

	dbPath := filepath.Join(dataDir, "memo.db")
	db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate
	db.AutoMigrate(&User{}, &Todo{}, &Countdown{}, &Category{})

	fmt.Println("========================================")
	fmt.Println("       MemoPad API Server v2.0")
	fmt.Println("========================================")
	fmt.Printf("Database: %s\n", dbPath)
	fmt.Println("========================================")
	fmt.Println("Register via /api/auth/register")
	fmt.Println("Login via /api/auth/login")
	fmt.Println("========================================\n")

	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware())

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, Response{Success: true, Data: map[string]string{"status": "ok"}})
	})

	// Auth routes (no auth required)
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", registerHandler)
		auth.POST("/login", loginHandler)
		auth.GET("/verify", authMiddleware(), verifyHandler)
	}

	// API routes (auth required)
	api := r.Group("/api")
	api.Use(authMiddleware())
	{
		// Todos
		api.GET("/todos", getTodos)
		api.POST("/todos", createTodo)
		api.PUT("/todos/:id", updateTodo)
		api.DELETE("/todos/:id", deleteTodo)
		api.PATCH("/todos/:id/toggle", toggleTodo)
		api.PATCH("/todos/:id/pin", pinTodo)

		// Countdowns
		api.GET("/countdowns", getCountdowns)
		api.POST("/countdowns", createCountdown)
		api.PUT("/countdowns/:id", updateCountdown)
		api.DELETE("/countdowns/:id", deleteCountdown)

		// Categories
		api.GET("/categories", getCategories)
		api.POST("/categories", createCategory)
		api.PUT("/categories/:id", updateCategory)
		api.DELETE("/categories/:id", deleteCategory)

		// Stats
		api.GET("/stats", getStats)

		// API Key
		api.GET("/auth/api-key", getApiKeyHandler)
		api.POST("/auth/api-key/regenerate", regenerateApiKeyHandler)
	}

	r.Run(":3000")
}

// CORS middleware
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// In development, allow all origins
		if gin.Mode() != gin.ReleaseMode {
			c.Header("Access-Control-Allow-Origin", "*")
		} else if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// Auth middleware
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			c.JSON(http.StatusUnauthorized, Response{
				Success:   false,
				Error:     "API key required",
				ErrorCode: "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		var user User
		if err := db.Where("api_key = ?", apiKey).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, Response{
				Success:   false,
				Error:     "Invalid API key",
				ErrorCode: "INVALID_API_KEY",
			})
			c.Abort()
			return
		}

		// Store user in context
		c.Set("user", user)
		c.Set("userID", user.ID)
		c.Next()
	}
}

// Helper functions
func successResponse(data interface{}) Response {
	return Response{Success: true, Data: data}
}

func errorResponse(err string, code string) Response {
	return Response{Success: false, Error: err, ErrorCode: code}
}

func generateAPIKey() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatal("Failed to generate API key:", err)
	}
	return "mp_" + hex.EncodeToString(bytes)
}

func hashPassword(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}
	return string(hash)
}

func checkPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func validatePriority(priority string) bool {
	return priority == "high" || priority == "medium" || priority == "low"
}

func sanitizeString(s string) string {
	return strings.TrimSpace(s)
}

// Auth handlers
func registerHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required,min=3,max=50"`
		Password string `json:"password" binding:"required,min=6"`
		Email    string `json:"email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid input: "+err.Error(), "VALIDATION_ERROR"))
		return
	}

	// Check if username exists
	var existing User
	if db.Where("username = ?", input.Username).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, errorResponse("Username already exists", "USERNAME_EXISTS"))
		return
	}

	// Create user
	user := User{
		Username: sanitizeString(input.Username),
		Password: hashPassword(input.Password),
		Email:    sanitizeString(input.Email),
		APIKey:   generateAPIKey(),
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to create user", "INTERNAL_ERROR"))
		return
	}

	c.JSON(http.StatusCreated, successResponse(map[string]interface{}{
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
		"api_key": user.APIKey,
	}))
}

func loginHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid input", "VALIDATION_ERROR"))
		return
	}

	var user User
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, errorResponse("Invalid credentials", "INVALID_CREDENTIALS"))
		return
	}

	if !checkPassword(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, errorResponse("Invalid credentials", "INVALID_CREDENTIALS"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
		"api_key": user.APIKey,
	}))
}

func verifyHandler(c *gin.Context) {
	user := c.MustGet("user").(User)
	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"valid": true,
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	}))
}

func getApiKeyHandler(c *gin.Context) {
	user := c.MustGet("user").(User)
	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"api_key": user.APIKey,
	}))
}

func regenerateApiKeyHandler(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	newKey := generateAPIKey()
	if err := db.Model(&User{}).Where("id = ?", userID).Update("api_key", newKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to regenerate API key", "INTERNAL_ERROR"))
		return
	}
	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"api_key": newKey,
	}))
}

// Todo handlers
func getTodos(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var todos []Todo
	db.Where("user_id = ?", userID).Order("pinned DESC, created_at DESC").Preload("Category").Find(&todos)
	c.JSON(http.StatusOK, successResponse(todos))
}

func createTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var todo Todo
	if err := c.ShouldBindJSON(&todo); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	todo.Content = sanitizeString(todo.Content)
	if todo.Content == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Content is required", "VALIDATION_ERROR"))
		return
	}

	if !validatePriority(todo.Priority) {
		todo.Priority = "medium"
	}

	todo.UserID = userID
	db.Create(&todo)
	db.Preload("Category").First(&todo, todo.ID)
	c.JSON(http.StatusCreated, successResponse(todo))
}

func updateTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var todo Todo
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found", "NOT_FOUND"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	if content, ok := updates["content"].(string); ok {
		content = sanitizeString(content)
		if content == "" {
			c.JSON(http.StatusBadRequest, errorResponse("Content cannot be empty", "VALIDATION_ERROR"))
			return
		}
		updates["content"] = content
	}

	if priority, ok := updates["priority"].(string); ok {
		if !validatePriority(priority) {
			c.JSON(http.StatusBadRequest, errorResponse("Invalid priority", "VALIDATION_ERROR"))
			return
		}
	}

	db.Model(&todo).Updates(updates)
	db.Preload("Category").First(&todo, id)
	c.JSON(http.StatusOK, successResponse(todo))
}

func deleteTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&Todo{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found", "NOT_FOUND"))
		return
	}
	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Todo deleted"}))
}

func toggleTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var todo Todo
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found", "NOT_FOUND"))
		return
	}

	todo.Done = !todo.Done
	db.Save(&todo)
	c.JSON(http.StatusOK, successResponse(todo))
}

func pinTodo(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var todo Todo
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Todo not found", "NOT_FOUND"))
		return
	}

	todo.Pinned = !todo.Pinned
	db.Save(&todo)
	c.JSON(http.StatusOK, successResponse(todo))
}

// Countdown handlers
func getCountdowns(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var countdowns []Countdown
	db.Where("user_id = ?", userID).Order("pinned DESC, target_date ASC").Find(&countdowns)
	c.JSON(http.StatusOK, successResponse(countdowns))
}

func createCountdown(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var countdown Countdown
	if err := c.ShouldBindJSON(&countdown); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	countdown.Title = sanitizeString(countdown.Title)
	if countdown.Title == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Title is required", "VALIDATION_ERROR"))
		return
	}

	if countdown.TargetDate.IsZero() {
		c.JSON(http.StatusBadRequest, errorResponse("Target date is required", "VALIDATION_ERROR"))
		return
	}

	if !validatePriority(countdown.Priority) {
		countdown.Priority = "medium"
	}

	countdown.UserID = userID
	db.Create(&countdown)
	c.JSON(http.StatusCreated, successResponse(countdown))
}

func updateCountdown(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var countdown Countdown
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&countdown).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Countdown not found", "NOT_FOUND"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	if title, ok := updates["title"].(string); ok {
		title = sanitizeString(title)
		if title == "" {
			c.JSON(http.StatusBadRequest, errorResponse("Title cannot be empty", "VALIDATION_ERROR"))
			return
		}
		updates["title"] = title
	}

	db.Model(&countdown).Updates(updates)
	c.JSON(http.StatusOK, successResponse(countdown))
}

func deleteCountdown(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&Countdown{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Countdown not found", "NOT_FOUND"))
		return
	}
	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Countdown deleted"}))
}

// Category handlers
func getCategories(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var categories []Category
	db.Where("user_id = ?", userID).Find(&categories)
	c.JSON(http.StatusOK, successResponse(categories))
}

func createCategory(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var category Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	category.Name = sanitizeString(category.Name)
	if category.Name == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Name is required", "VALIDATION_ERROR"))
		return
	}

	if category.Color == "" {
		category.Color = "#6366f1"
	}

	category.UserID = userID
	db.Create(&category)
	c.JSON(http.StatusCreated, successResponse(category))
}

func updateCategory(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var category Category
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&category).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Category not found", "NOT_FOUND"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	if name, ok := updates["name"].(string); ok {
		name = sanitizeString(name)
		if name == "" {
			c.JSON(http.StatusBadRequest, errorResponse("Name cannot be empty", "VALIDATION_ERROR"))
			return
		}
		updates["name"] = name
	}

	db.Model(&category).Updates(updates)
	c.JSON(http.StatusOK, successResponse(category))
}

func deleteCategory(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	// Unlink todos from this category
	db.Model(&Todo{}).Where("category_id = ? AND user_id = ?", id, userID).Update("category_id", nil)

	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&Category{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Category not found", "NOT_FOUND"))
		return
	}
	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Category deleted"}))
}

// Stats handler
func getStats(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var totalTodos, doneTodos int64
	var highPriority, mediumPriority, lowPriority int64
	var pinnedTodos, pinnedCountdowns int64
	var totalCountdowns int64

	db.Model(&Todo{}).Where("user_id = ?", userID).Count(&totalTodos)
	db.Model(&Todo{}).Where("user_id = ? AND done = ?", userID, true).Count(&doneTodos)
	db.Model(&Todo{}).Where("user_id = ? AND priority = ? AND done = ?", userID, "high", false).Count(&highPriority)
	db.Model(&Todo{}).Where("user_id = ? AND priority = ? AND done = ?", userID, "medium", false).Count(&mediumPriority)
	db.Model(&Todo{}).Where("user_id = ? AND priority = ? AND done = ?", userID, "low", false).Count(&lowPriority)
	db.Model(&Todo{}).Where("user_id = ? AND pinned = ?", userID, true).Count(&pinnedTodos)
	db.Model(&Countdown{}).Where("user_id = ? AND pinned = ?", userID, true).Count(&pinnedCountdowns)
	db.Model(&Countdown{}).Where("user_id = ?", userID).Count(&totalCountdowns)

	now := time.Now()
	sevenDaysLater := now.AddDate(0, 0, 7)
	var dueSoon, overdue int64
	db.Model(&Countdown{}).Where("user_id = ? AND target_date >= ? AND target_date <= ?", userID, now, sevenDaysLater).Count(&dueSoon)
	db.Model(&Countdown{}).Where("user_id = ? AND target_date < ?", userID, now).Count(&overdue)

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
			Total:   int(totalCountdowns),
			DueSoon: int(dueSoon),
			Overdue: int(overdue),
			Pinned:  int(pinnedCountdowns),
		},
	}

	c.JSON(http.StatusOK, successResponse(stats))
}
