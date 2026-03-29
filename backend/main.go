package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for WebSocket
	},
}

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// WSClient represents a connected WebSocket client
type WSClient struct {
	UserID uint
	Conn   *websocket.Conn
	Send   chan WSMessage
}

// WSManager manages WebSocket connections
type WSManager struct {
	clients    map[*WSClient]bool
	clientsMu  sync.RWMutex
	register   chan *WSClient
	unregister chan *WSClient
	broadcast  chan WSMessage
}

var wsManager = &WSManager{
	clients:    make(map[*WSClient]bool),
	register:   make(chan *WSClient),
	unregister: make(chan *WSClient),
	broadcast:  make(chan WSMessage, 100),
}

// Run starts the WebSocket manager
func (m *WSManager) Run() {
	for {
		select {
		case client := <-m.register:
			m.clientsMu.Lock()
			m.clients[client] = true
			m.clientsMu.Unlock()
			log.Printf("WebSocket client connected. Total: %d", len(m.clients))

		case client := <-m.unregister:
			m.clientsMu.Lock()
			if _, ok := m.clients[client]; ok {
				delete(m.clients, client)
				close(client.Send)
			}
			m.clientsMu.Unlock()
			log.Printf("WebSocket client disconnected. Total: %d", len(m.clients))

		case message := <-m.broadcast:
			var deadClients []*WSClient
			m.clientsMu.RLock()
			for client := range m.clients {
				select {
				case client.Send <- message:
				default:
					deadClients = append(deadClients, client)
				}
			}
			m.clientsMu.RUnlock()
			if len(deadClients) > 0 {
				m.clientsMu.Lock()
				for _, client := range deadClients {
					if _, ok := m.clients[client]; ok {
						delete(m.clients, client)
						close(client.Send)
					}
				}
				m.clientsMu.Unlock()
			}
		}
	}
}

// BroadcastToUser sends a message to all connections of a specific user
func (m *WSManager) BroadcastToUser(userID uint, msgType string, data interface{}) {
	message := WSMessage{Type: msgType, Data: data}
	m.clientsMu.RLock()
	for client := range m.clients {
		if client.UserID == userID {
			select {
			case client.Send <- message:
			default:
				// Channel full, skip
			}
		}
	}
	m.clientsMu.RUnlock()
}

// BroadcastAll sends a message to all connected clients
func (m *WSManager) BroadcastAll(msgType string, data interface{}) {
	message := WSMessage{Type: msgType, Data: data}
	select {
	case m.broadcast <- message:
	default:
		// Channel full, skip
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *WSClient) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			data, err := json.Marshal(message)
			if err != nil {
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *WSClient) readPump() {
	defer func() {
		wsManager.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// RateLimiter - simple in-memory rate limiter
type RateLimiter struct {
	requests map[string]*ClientInfo
	mu       sync.Mutex
}

type ClientInfo struct {
	count     int
	firstSeen time.Time
	blocked   bool
	blockedAt time.Time
}

var rateLimiter = &RateLimiter{
	requests: make(map[string]*ClientInfo),
}

var rateLimitStop = make(chan struct{})

// Cleanup old entries periodically
func startRateLimitCleanup() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				rateLimiter.mu.Lock()
				now := time.Now()
				for ip, info := range rateLimiter.requests {
					// Remove entries older than 1 hour
					if now.Sub(info.firstSeen) > time.Hour {
						delete(rateLimiter.requests, ip)
					}
					// Unblock after 5 minutes
					if info.blocked && now.Sub(info.blockedAt) > 5*time.Minute {
						info.blocked = false
						info.count = 0
						info.firstSeen = now
					}
				}
				rateLimiter.mu.Unlock()
			case <-rateLimitStop:
				return
			}
		}
	}()
}

// rateLimitMiddleware - limits requests per IP
func rateLimitMiddleware(maxRequests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rateLimiter.mu.Lock()
		defer rateLimiter.mu.Unlock()

		now := time.Now()
		info, exists := rateLimiter.requests[ip]

		if !exists {
			rateLimiter.requests[ip] = &ClientInfo{
				count:     1,
				firstSeen: now,
			}
			c.Next()
			return
		}

		// Check if blocked
		if info.blocked {
			c.JSON(http.StatusTooManyRequests, Response{
				Success:   false,
				Error:     "Too many requests. Please try again later.",
				ErrorCode: "RATE_LIMITED",
			})
			c.Abort()
			return
		}

		// Reset if window expired
		if now.Sub(info.firstSeen) > window {
			info.count = 1
			info.firstSeen = now
			c.Next()
			return
		}

		info.count++

		// Block if exceeded
		if info.count > maxRequests {
			info.blocked = true
			info.blockedAt = now
			c.JSON(http.StatusTooManyRequests, Response{
				Success:   false,
				Error:     "Too many requests. Please try again later.",
				ErrorCode: "RATE_LIMITED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// loginRateLimitMiddleware - stricter limits for auth endpoints
func loginRateLimitMiddleware() gin.HandlerFunc {
	return rateLimitMiddleware(10, time.Minute) // 10 login attempts per minute
}

// registerRateLimitMiddleware - limits for registration
func registerRateLimitMiddleware() gin.HandlerFunc {
	return rateLimitMiddleware(5, time.Hour) // 5 registrations per hour per IP
}

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
	Role      string    `json:"role" gorm:"size:20;default:user"`      // "admin" or "user"
	Disabled  bool      `json:"disabled" gorm:"default:false"`         // 禁用状态
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Todo model with user relation
// Note: Tasks do not have due dates - use Countdowns for time-based items
type Todo struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	UserID     uint       `json:"user_id" gorm:"index;not null"`
	Content    string     `json:"content" gorm:"size:500;not null"`
	Priority   string     `json:"priority" gorm:"size:10;default:medium"`
	Pinned     bool       `json:"pinned" gorm:"default:false"`
	Done       bool       `json:"done" gorm:"default:false"`
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

// SystemConfig 系统配置
type SystemConfig struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	Key          string `json:"key" gorm:"size:50;uniqueIndex;not null"`
	Value        string `json:"value" gorm:"size:500"`
	Description  string `json:"description" gorm:"size:200"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Ticket 工单模型
type Ticket struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      uint      `json:"user_id" gorm:"index;not null"`
	User        *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Title       string    `json:"title" gorm:"size:200;not null"`
	Description string    `json:"description" gorm:"size:2000"`
	Priority    string    `json:"priority" gorm:"size:10;default:medium"`  // high/medium/low
	Status      string    `json:"status" gorm:"size:20;default:open"`      // open/in_progress/resolved/closed
	Reply       string    `json:"reply" gorm:"size:2000"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
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
	db.AutoMigrate(&User{}, &Todo{}, &Countdown{}, &Category{}, &SystemConfig{}, &Ticket{})

	// Initialize default system config
	initSystemConfig()

	// Initialize admin user from environment variables
	initAdminUser()

	// Start rate limit cleanup goroutine
	startRateLimitCleanup()

	// Start WebSocket manager
	go wsManager.Run()

	fmt.Println("========================================")
	fmt.Println("       MemoPad API Server v2.2")
	fmt.Println("========================================")
	fmt.Printf("Database: %s\n", dbPath)
	fmt.Println("Register via /api/auth/register")
	fmt.Println("Login via /api/auth/login")
	fmt.Println("WebSocket: /ws")
	fmt.Println("Admin: /api/admin/*")
	fmt.Println("========================================\n")

	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware())

	// Health check (no auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, Response{Success: true, Data: map[string]string{"status": "ok"}})
	})

	// WebSocket endpoint
	r.GET("/ws", wsHandler)

	// Auth routes (no auth required)
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", registerRateLimitMiddleware(), registerHandler)
		auth.POST("/login", loginRateLimitMiddleware(), loginHandler)
		auth.GET("/verify", authMiddleware(), verifyHandler)
		auth.GET("/check-admin", checkAdminHandler) // 检查是否已配置管理员
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

		// Tickets (工单)
		api.GET("/tickets", getTickets)
		api.POST("/tickets", createTicket)
		api.GET("/tickets/:id", getTicket)

		// Account management
		api.DELETE("/auth/account", deleteOwnAccount)

		// API Key
		api.GET("/auth/api-key", getApiKeyHandler)
		api.POST("/auth/api-key/regenerate", regenerateApiKeyHandler)
	}

	// Admin routes (admin only)
	admin := r.Group("/api/admin")
	admin.Use(authMiddleware(), adminMiddleware())
	{
		// User management
		admin.GET("/users", adminGetUsers)
		admin.PATCH("/users/:id/disable", adminDisableUser)
		admin.PATCH("/users/:id/enable", adminEnableUser)
		admin.DELETE("/users/:id", adminDeleteUser)

		// System config
		admin.GET("/config", adminGetConfig)
		admin.PUT("/config", adminUpdateConfig)

		// Statistics
		admin.GET("/stats", adminGetStats)

		// Ticket management
		admin.GET("/tickets", adminGetTickets)
		admin.PUT("/tickets/:id", adminUpdateTicket)
		admin.DELETE("/tickets/:id", adminDeleteTicket)
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

// WebSocket handler
func wsHandler(c *gin.Context) {
	apiKey := c.Query("api_key")
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, Response{
			Success:   false,
			Error:     "API key required",
			ErrorCode: "AUTH_REQUIRED",
		})
		return
	}

	var user User
	if err := db.Where("api_key = ?", apiKey).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, Response{
			Success:   false,
			Error:     "Invalid API key",
			ErrorCode: "INVALID_API_KEY",
		})
		return
	}

	if user.Disabled {
		c.JSON(http.StatusForbidden, Response{
			Success:   false,
			Error:     "Account has been disabled",
			ErrorCode: "ACCOUNT_DISABLED",
		})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &WSClient{
		UserID: user.ID,
		Conn:   conn,
		Send:   make(chan WSMessage, 256),
	}

	wsManager.register <- client

	// Send connection confirmation
	client.Send <- WSMessage{Type: "connected", Data: map[string]interface{}{
		"user_id": user.ID,
		"message": "WebSocket connected successfully",
	}}

	// Start read and write pumps
	go client.writePump()
	go client.readPump()
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

		// Check if user is disabled
		if user.Disabled {
			c.JSON(http.StatusForbidden, Response{
				Success:   false,
				Error:     "Account has been disabled",
				ErrorCode: "ACCOUNT_DISABLED",
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

// Admin middleware
func adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.MustGet("user").(User)
		if user.Role != "admin" {
			c.JSON(http.StatusForbidden, Response{
				Success:   false,
				Error:     "Admin access required",
				ErrorCode: "ADMIN_REQUIRED",
			})
			c.Abort()
			return
		}
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
	// Check if registration is enabled
	var config SystemConfig
	if err := db.Where("key = ?", "registration_enabled").First(&config).Error; err == nil {
		if config.Value == "false" {
			c.JSON(http.StatusForbidden, errorResponse("Registration is currently disabled", "REGISTRATION_DISABLED"))
			return
		}
	}

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
		Role:     "user",
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
			"role":     user.Role,
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

	if user.Disabled {
		c.JSON(http.StatusForbidden, errorResponse("Account is disabled", "ACCOUNT_DISABLED"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"user": map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
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
			"role":     user.Role,
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

// deleteOwnAccount allows users to delete their own account (not for admins)
func deleteOwnAccount(c *gin.Context) {
	user := c.MustGet("user").(User)
	
	// Prevent admin from deleting their own account
	if user.Role == "admin" {
		c.JSON(http.StatusForbidden, errorResponse("Admin cannot delete their own account", "FORBIDDEN"))
		return
	}

	// Delete user's data first
	db.Where("user_id = ?", user.ID).Delete(&Todo{})
	db.Where("user_id = ?", user.ID).Delete(&Countdown{})
	db.Where("user_id = ?", user.ID).Delete(&Category{})
	db.Where("user_id = ?", user.ID).Delete(&Ticket{})

	// Delete user
	if err := db.Delete(&User{}, user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to delete account", "INTERNAL_ERROR"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Account deleted"}))
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "todo_created", todo)
	
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "todo_updated", todo)
	
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "todo_deleted", map[string]interface{}{"id": id})
	
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "todo_updated", todo)
	
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "todo_updated", todo)
	
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "countdown_created", countdown)
	
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
	// Re-fetch to get true DB state (GORM partial-update may not reflect all changes)
	db.First(&countdown, countdown.ID)

	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "countdown_updated", countdown)

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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "countdown_deleted", map[string]interface{}{"id": id})
	
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

	var existing Category
	if db.Where("user_id = ? AND name = ?", userID, category.Name).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, errorResponse("Category with this name already exists", "DUPLICATE"))
		return
	}

	category.UserID = userID
	db.Create(&category)
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "category_created", category)
	
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
		var dup Category
		if db.Where("user_id = ? AND name = ? AND id != ?", userID, name, id).First(&dup).Error == nil {
			c.JSON(http.StatusConflict, errorResponse("Category with this name already exists", "DUPLICATE"))
			return
		}
		updates["name"] = name
	}

	db.Model(&category).Updates(updates)
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "category_updated", category)
	
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
	
	// Broadcast to user's other connections
	wsManager.BroadcastToUser(userID, "category_deleted", map[string]interface{}{"id": id})
	
	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Category deleted"}))
}

// Ticket handlers
func getTickets(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var tickets []Ticket
	db.Where("user_id = ?", userID).Order("created_at DESC").Find(&tickets)
	c.JSON(http.StatusOK, successResponse(tickets))
}

func getTicket(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var ticket Ticket
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	c.JSON(http.StatusOK, successResponse(ticket))
}

func createTicket(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input struct {
		Title       string `json:"title" binding:"required,min=3,max=200"`
		Description string `json:"description" binding:"max=2000"`
		Priority    string `json:"priority"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid input: "+err.Error(), "VALIDATION_ERROR"))
		return
	}

	if !validatePriority(input.Priority) {
		input.Priority = "medium"
	}

	ticket := Ticket{
		UserID:      userID,
		Title:       sanitizeString(input.Title),
		Description: sanitizeString(input.Description),
		Priority:    input.Priority,
		Status:      "open",
	}

	if err := db.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to create ticket", "INTERNAL_ERROR"))
		return
	}

	c.JSON(http.StatusCreated, successResponse(ticket))
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

// Admin ticket handlers
func adminGetTickets(c *gin.Context) {
	status := c.Query("status")
	
	var tickets []Ticket
	query := db.Preload("User").Order("created_at DESC")
	
	if status != "" {
		query = query.Where("status = ?", status)
	}
	
	query.Find(&tickets)

	// Return user info without sensitive data
	type TicketWithUser struct {
		ID          uint      `json:"id"`
		UserID      uint      `json:"user_id"`
		Username    string    `json:"username"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		Priority    string    `json:"priority"`
		Status      string    `json:"status"`
		Reply       string    `json:"reply"`
		CreatedAt   time.Time `json:"created_at"`
		UpdatedAt   time.Time `json:"updated_at"`
	}

	var result []TicketWithUser
	for _, t := range tickets {
		username := ""
		if t.User != nil {
			username = t.User.Username
		}
		result = append(result, TicketWithUser{
			ID:          t.ID,
			UserID:      t.UserID,
			Username:    username,
			Title:       t.Title,
			Description: t.Description,
			Priority:    t.Priority,
			Status:      t.Status,
			Reply:       t.Reply,
			CreatedAt:   t.CreatedAt,
			UpdatedAt:   t.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, successResponse(result))
}

func adminUpdateTicket(c *gin.Context) {
	id := c.Param("id")

	var ticket Ticket
	if err := db.First(&ticket, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	// Validate status
	if status, ok := updates["status"].(string); ok {
		validStatuses := map[string]bool{"open": true, "in_progress": true, "resolved": true, "closed": true}
		if !validStatuses[status] {
			c.JSON(http.StatusBadRequest, errorResponse("Invalid status", "VALIDATION_ERROR"))
			return
		}
	}

	// Validate priority
	if priority, ok := updates["priority"].(string); ok {
		if !validatePriority(priority) {
			c.JSON(http.StatusBadRequest, errorResponse("Invalid priority", "VALIDATION_ERROR"))
			return
		}
	}

	db.Model(&ticket).Updates(updates)
	db.First(&ticket, id)
	c.JSON(http.StatusOK, successResponse(ticket))
}

func adminDeleteTicket(c *gin.Context) {
	id := c.Param("id")

	result := db.Delete(&Ticket{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Ticket deleted"}))
}

// ==================== Admin Functions ====================

// initAdminUser initializes admin user from environment variables
func initAdminUser() {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminUsername == "" || adminPassword == "" {
		return // No admin configured via env
	}

	var existingUser User
	if err := db.Where("username = ?", adminUsername).First(&existingUser).Error; err == nil {
		// Admin already exists, update password if needed
		if !checkPassword(adminPassword, existingUser.Password) {
			db.Model(&existingUser).Update("password", hashPassword(adminPassword))
			fmt.Printf("Admin password updated for: %s\n", adminUsername)
		}
		return
	}

	// Create admin user
	admin := User{
		Username: adminUsername,
		Password: hashPassword(adminPassword),
		APIKey:   generateAPIKey(),
		Role:     "admin",
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("Failed to create admin user: %v", err)
		return
	}

	fmt.Println("========================================")
	fmt.Println("  Admin user created from environment")
	fmt.Printf("  Username: %s\n", adminUsername)
	fmt.Println("========================================")
}

// initSystemConfig initializes default system config
func initSystemConfig() {
	defaults := []SystemConfig{
		{Key: "registration_enabled", Value: "true", Description: "是否开放用户注册"},
	}

	for _, cfg := range defaults {
		var existing SystemConfig
		if err := db.Where("key = ?", cfg.Key).First(&existing).Error; err != nil {
			db.Create(&cfg)
		}
	}
}

// checkAdminHandler checks if admin is configured
func checkAdminHandler(c *gin.Context) {
	var count int64
	db.Model(&User{}).Where("role = ?", "admin").Count(&count)
	c.JSON(http.StatusOK, successResponse(map[string]bool{"has_admin": count > 0}))
}

// Admin handlers

func adminGetUsers(c *gin.Context) {
	type UserWithStats struct {
		ID             uint      `json:"id"`
		Username       string    `json:"username"`
		Email          string    `json:"email"`
		Role           string    `json:"role"`
		Disabled       bool      `json:"disabled"`
		TodoCount      int64     `json:"todo_count"`
		CountdownCount int64     `json:"countdown_count"`
		CreatedAt      time.Time `json:"created_at"`
		UpdatedAt      time.Time `json:"updated_at"`
	}

	var result []UserWithStats
	db.Raw(`
		SELECT
			u.id, u.username, u.email, u.role, u.disabled,
			u.created_at, u.updated_at,
			COUNT(DISTINCT t.id)  AS todo_count,
			COUNT(DISTINCT cd.id) AS countdown_count
		FROM users u
		LEFT JOIN todos      t  ON t.user_id  = u.id AND t.deleted_at  IS NULL
		LEFT JOIN countdowns cd ON cd.user_id = u.id AND cd.deleted_at IS NULL
		WHERE u.deleted_at IS NULL
		GROUP BY u.id
		ORDER BY u.created_at DESC
	`).Scan(&result)

	c.JSON(http.StatusOK, successResponse(result))
}

func adminDisableUser(c *gin.Context) {
	id := c.Param("id")
	currentUser := c.MustGet("user").(User)

	// Prevent disabling self
	if fmt.Sprintf("%d", currentUser.ID) == id {
		c.JSON(http.StatusBadRequest, errorResponse("Cannot disable yourself", "INVALID_OPERATION"))
		return
	}

	// Check if target is admin
	var targetUser User
	if err := db.First(&targetUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("User not found", "NOT_FOUND"))
		return
	}
	if targetUser.Role == "admin" {
		c.JSON(http.StatusBadRequest, errorResponse("Cannot disable admin user", "INVALID_OPERATION"))
		return
	}

	result := db.Model(&User{}).Where("id = ?", id).Update("disabled", true)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("User not found", "NOT_FOUND"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "User disabled"}))
}

func adminEnableUser(c *gin.Context) {
	id := c.Param("id")

	result := db.Model(&User{}).Where("id = ?", id).Update("disabled", false)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("User not found", "NOT_FOUND"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "User enabled"}))
}

func adminDeleteUser(c *gin.Context) {
	id := c.Param("id")
	currentUser := c.MustGet("user").(User)

	// Prevent deleting self
	if fmt.Sprintf("%d", currentUser.ID) == id {
		c.JSON(http.StatusBadRequest, errorResponse("Cannot delete yourself", "INVALID_OPERATION"))
		return
	}

	// Check if target is admin
	var targetUser User
	if err := db.First(&targetUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("User not found", "NOT_FOUND"))
		return
	}
	if targetUser.Role == "admin" {
		c.JSON(http.StatusBadRequest, errorResponse("Cannot delete admin user", "INVALID_OPERATION"))
		return
	}

	// Delete user's data first
	db.Where("user_id = ?", id).Delete(&Todo{})
	db.Where("user_id = ?", id).Delete(&Countdown{})
	db.Where("user_id = ?", id).Delete(&Category{})
	db.Where("user_id = ?", id).Delete(&Ticket{})

	// Delete user
	result := db.Delete(&User{}, id)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, errorResponse("User not found", "NOT_FOUND"))
		return
	}

	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "User deleted"}))
}

func adminGetConfig(c *gin.Context) {
	var configs []SystemConfig
	db.Find(&configs)

	result := make(map[string]interface{})
	for _, cfg := range configs {
		// Convert string "true"/"false" to boolean
		if cfg.Value == "true" || cfg.Value == "false" {
			result[cfg.Key] = cfg.Value == "true"
		} else {
			result[cfg.Key] = cfg.Value
		}
	}

	c.JSON(http.StatusOK, successResponse(result))
}

func adminUpdateConfig(c *gin.Context) {
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	for key, value := range updates {
		var strValue string
		switch v := value.(type) {
		case bool:
			if v {
				strValue = "true"
			} else {
				strValue = "false"
			}
		case string:
			strValue = v
		default:
			continue
		}
		db.Model(&SystemConfig{}).Where("key = ?", key).Update("value", strValue)
	}

	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Config updated"}))
}

func adminGetStats(c *gin.Context) {
	var totalUsers, activeUsers, disabledUsers int64
	var totalTodos, totalCategories, totalCountdowns int64

	db.Model(&User{}).Count(&totalUsers)
	db.Model(&User{}).Where("disabled = ?", false).Count(&activeUsers)
	db.Model(&User{}).Where("disabled = ?", true).Count(&disabledUsers)
	db.Model(&Todo{}).Count(&totalTodos)
	db.Model(&Category{}).Count(&totalCategories)
	db.Model(&Countdown{}).Count(&totalCountdowns)

	// Recent registrations (last 7 days)
	var recentUsers int64
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	db.Model(&User{}).Where("created_at > ?", sevenDaysAgo).Count(&recentUsers)

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"users": map[string]int64{
			"total":    totalUsers,
			"active":   activeUsers,
			"disabled": disabledUsers,
			"recent":   recentUsers,
		},
		"data": map[string]int64{
			"todos":      totalTodos,
			"countdowns": totalCountdowns,
			"categories": totalCategories,
		},
	}))
}
