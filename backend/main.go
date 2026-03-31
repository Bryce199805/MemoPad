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
	"regexp"
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

// WebSocket upgrader — initialized in main() after gin.SetMode() so origin checking is correct
var upgrader websocket.Upgrader

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

// CountUserConnections returns the number of active WS connections for a given user
func (m *WSManager) CountUserConnections(userID uint) int {
	m.clientsMu.RLock()
	defer m.clientsMu.RUnlock()
	count := 0
	for client := range m.clients {
		if client.UserID == userID {
			count++
		}
	}
	return count
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

				// Also clean up login failure tracker
				loginFailLimiter.mu.Lock()
				for ip, info := range loginFailLimiter.failures {
					if now.Sub(info.firstSeen) > time.Hour {
						delete(loginFailLimiter.failures, ip)
					}
					if info.blocked && now.Sub(info.blockedAt) > 5*time.Minute {
						info.blocked = false
						info.count = 0
						info.firstSeen = now
					}
				}
				loginFailLimiter.mu.Unlock()

				// Auto-close resolved tickets after 3 days
				db.Model(&Ticket{}).
					Where("status = ? AND resolved_at IS NOT NULL AND resolved_at < ?",
						"resolved", time.Now().Add(-3*24*time.Hour)).
					Updates(map[string]interface{}{"status": "closed"})
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

		// Check if blocked — also check in real-time if the block period has expired
		if info.blocked {
			if now.Sub(info.blockedAt) > 5*time.Minute {
				// Block expired: reset and allow
				info.blocked = false
				info.count = 1
				info.firstSeen = now
				c.Next()
				return
			}
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

// loginRateLimiter tracks failed login attempts separately from general rate limiting
type loginRateLimiter struct {
	failures map[string]*ClientInfo
	mu       sync.Mutex
}

var loginFailLimiter = &loginRateLimiter{
	failures: make(map[string]*ClientInfo),
}

// recordLoginFailure increments the failed-attempt counter for the given IP.
// Returns true if the IP should be blocked (too many failures).
func (l *loginRateLimiter) recordFailure(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	info, exists := l.failures[ip]
	if !exists {
		l.failures[ip] = &ClientInfo{count: 1, firstSeen: now}
		return false
	}

	// Unblock after 5 minutes
	if info.blocked && now.Sub(info.blockedAt) > 5*time.Minute {
		info.blocked = false
		info.count = 1
		info.firstSeen = now
		return false
	}
	if info.blocked {
		return true
	}

	// Reset window after 15 minutes of no failures
	if now.Sub(info.firstSeen) > 15*time.Minute {
		info.count = 1
		info.firstSeen = now
		return false
	}

	info.count++
	if info.count > 10 {
		info.blocked = true
		info.blockedAt = now
		return true
	}
	return false
}

func (l *loginRateLimiter) isBlocked(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	info, exists := l.failures[ip]
	if !exists {
		return false
	}
	if info.blocked && time.Since(info.blockedAt) > 5*time.Minute {
		info.blocked = false
		info.count = 0
		return false
	}
	return info.blocked
}

func (l *loginRateLimiter) resetOnSuccess(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failures, ip)
}

// loginRateLimitMiddleware - only checks if IP is currently blocked; counting happens in loginHandler
func loginRateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if loginFailLimiter.isBlocked(c.ClientIP()) {
			c.JSON(http.StatusTooManyRequests, Response{
				Success:   false,
				Error:     "Too many failed attempts. Please try again in 5 minutes.",
				ErrorCode: "RATE_LIMITED",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// registerRateLimitMiddleware - limits for registration
func registerRateLimitMiddleware() gin.HandlerFunc {
	return rateLimitMiddleware(5, time.Hour) // 5 registrations per hour per IP
}

// apiRateLimitMiddleware - general API rate limit (60 req/min per IP)
func apiRateLimitMiddleware() gin.HandlerFunc {
	return rateLimitMiddleware(60, time.Minute)
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
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      uint           `json:"user_id" gorm:"index;not null"`
	User        *User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Title       string         `json:"title" gorm:"size:200;not null"`
	Description string         `json:"description" gorm:"size:2000"`
	Priority    string         `json:"priority" gorm:"size:10;default:medium"`  // high/medium/low
	Status      string         `json:"status" gorm:"size:20;default:open"`      // open/in_progress/resolved/closed
	Reply       string         `json:"reply" gorm:"size:2000"`                  // legacy field, kept for compatibility
	ReplyReadAt *time.Time     `json:"reply_read_at" gorm:"default:null"`
	ResolvedAt  *time.Time     `json:"resolved_at" gorm:"default:null"`
	Replies     []TicketReply  `json:"replies" gorm:"foreignKey:TicketID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// TicketReply 工单回复模型
type TicketReply struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	TicketID  uint      `json:"ticket_id" gorm:"index;not null"`
	Content   string    `json:"content" gorm:"size:2000;not null"`
	IsAdmin   bool      `json:"is_admin" gorm:"default:false"`
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

// BatchIDsInput is used for batch operations
type BatchIDsInput struct {
	IDs []uint `json:"ids" binding:"required,min=1,max=100"`
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

	// Configure SQLite for production use
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get underlying sql.DB:", err)
	}
	sqlDB.SetMaxOpenConns(1) // SQLite supports only one concurrent writer
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(0)             // Never expire connections
	sqlDB.Exec("PRAGMA journal_mode=WAL")   // WAL mode: better concurrent reads
	sqlDB.Exec("PRAGMA busy_timeout=5000")  // Wait up to 5s on locked DB instead of failing
	sqlDB.Exec("PRAGMA foreign_keys=ON")    // Enforce FK constraints (off by default in SQLite)

	// Auto migrate
	db.AutoMigrate(&User{}, &Todo{}, &Countdown{}, &Category{}, &SystemConfig{}, &Ticket{}, &TicketReply{})

	// Initialize default system config
	initSystemConfig()

	// Initialize admin user from environment variables
	initAdminUser()

	// Start rate limit cleanup goroutine
	startRateLimitCleanup()

	// Start WebSocket manager
	go wsManager.Run()

	// Initialize WebSocket upgrader with origin checking
	allowedOrigins := getAllowedOrigins()
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			if allowedOrigins == nil {
				return true // Development: allow all origins
			}
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true // Non-browser clients don't send Origin
			}
			return allowedOrigins[origin]
		},
	}

	fmt.Println("========================================")
	fmt.Println("       MemoPad API Server v2.3")
	fmt.Println("========================================")
	fmt.Printf("Database: %s\n", dbPath)
	fmt.Println("Register via /api/auth/register")
	fmt.Println("Login via /api/auth/login")
	fmt.Println("WebSocket: /ws")
	fmt.Println("Admin: /api/admin/*")
	fmt.Println("========================================\n")

	r := gin.Default()
	setupMiddleware(r)
	setupRoutes(r)

	r.Run(":3000")
}

// ==================== Middleware Setup ====================

func setupMiddleware(r *gin.Engine) {
	r.Use(corsMiddleware())
	r.Use(securityHeadersMiddleware())
	r.Use(bodySizeLimitMiddleware(1 << 20)) // 1MB body size limit
}

// ==================== Route Setup ====================

func setupRoutes(r *gin.Engine) {
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
		auth.GET("/check-admin", checkAdminHandler)
	}

	// API routes (auth required)
	api := r.Group("/api")
	api.Use(authMiddleware())
	api.Use(apiRateLimitMiddleware())
	{
		// Todos — single operations
		api.GET("/todos", getTodos)
		api.POST("/todos", createTodo)
		api.PUT("/todos/:id", updateTodo)
		api.DELETE("/todos/:id", deleteTodo)
		api.PATCH("/todos/:id/toggle", toggleTodo)
		api.PATCH("/todos/:id/pin", pinTodo)

		// Todos — batch operations (static routes registered before :id params)
		api.DELETE("/todos/batch", batchDeleteTodos)
		api.PATCH("/todos/batch/toggle", batchToggleTodos)
		api.PATCH("/todos/batch/done", batchMarkDoneTodos)

		// Countdowns — single operations
		api.GET("/countdowns", getCountdowns)
		api.POST("/countdowns", createCountdown)
		api.PUT("/countdowns/:id", updateCountdown)
		api.DELETE("/countdowns/:id", deleteCountdown)

		// Countdowns — batch operations
		api.DELETE("/countdowns/batch", batchDeleteCountdowns)

		// Categories
		api.GET("/categories", getCategories)
		api.POST("/categories", createCategory)
		api.PUT("/categories/:id", updateCategory)
		api.DELETE("/categories/:id", deleteCategory)

		// Stats
		api.GET("/stats", getStats)

		// Tickets
		api.GET("/tickets", getTickets)
		api.POST("/tickets", createTicket)
		api.GET("/tickets/unread-count", getTicketUnreadCount)
		api.GET("/tickets/:id", getTicket)
		api.PUT("/tickets/:id/read", markTicketRead)
		api.PUT("/tickets/:id/close", closeTicket)
		api.POST("/tickets/:id/replies", addUserTicketReply)

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
		admin.POST("/tickets/:id/replies", adminAddTicketReply)
		admin.DELETE("/tickets/:id/replies/:replyId", adminDeleteTicketReply)
	}
}

// getAllowedOrigins returns the set of allowed CORS origins.
// In development mode returns nil (all origins allowed).
// In release mode reads from ALLOWED_ORIGINS env var (comma-separated).
// If ALLOWED_ORIGINS is unset in release mode, returns an empty map (fail-closed).
func getAllowedOrigins() map[string]bool {
	if gin.Mode() != gin.ReleaseMode {
		return nil // nil means allow all in dev
	}
	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		return map[string]bool{} // empty = no origins allowed (fail-closed)
	}
	origins := make(map[string]bool)
	for _, o := range strings.Split(raw, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = true
		}
	}
	return origins
}

// corsMiddleware handles CORS headers with proper origin whitelisting in production
func corsMiddleware() gin.HandlerFunc {
	allowedOrigins := getAllowedOrigins()

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if allowedOrigins == nil {
			// Development mode: allow all
			c.Header("Access-Control-Allow-Origin", "*")
		} else if origin != "" && allowedOrigins[origin] {
			// Release mode: only whitelisted origins
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin") // Prevent incorrect cache reuse across origins
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

// securityHeadersMiddleware adds security-related HTTP response headers
func securityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.Header("Cache-Control", "no-store")
		}
		c.Next()
	}
}

// bodySizeLimitMiddleware rejects request bodies larger than maxBytes
func bodySizeLimitMiddleware(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBytes {
			c.JSON(http.StatusRequestEntityTooLarge, errorResponse("Request body too large", "PAYLOAD_TOO_LARGE"))
			c.Abort()
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
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

	// Limit connections per user to prevent resource exhaustion
	const maxConnectionsPerUser = 5
	if wsManager.CountUserConnections(user.ID) >= maxConnectionsPerUser {
		c.JSON(http.StatusTooManyRequests, Response{
			Success:   false,
			Error:     "Too many active connections",
			ErrorCode: "TOO_MANY_CONNECTIONS",
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

	// Validate username format: letters, numbers, underscores only
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	if !usernameRegex.MatchString(input.Username) {
		c.JSON(http.StatusBadRequest, errorResponse("Username can only contain letters, numbers, and underscores", "INVALID_USERNAME"))
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

	ip := c.ClientIP()

	var user User
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		loginFailLimiter.recordFailure(ip)
		c.JSON(http.StatusUnauthorized, errorResponse("Invalid credentials", "INVALID_CREDENTIALS"))
		return
	}

	if !checkPassword(input.Password, user.Password) {
		loginFailLimiter.recordFailure(ip)
		c.JSON(http.StatusUnauthorized, errorResponse("Invalid credentials", "INVALID_CREDENTIALS"))
		return
	}

	if user.Disabled {
		c.JSON(http.StatusForbidden, errorResponse("Account is disabled", "ACCOUNT_DISABLED"))
		return
	}

	// Successful login — clear failure counter for this IP
	loginFailLimiter.resetOnSuccess(ip)

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

	// Delete user's data and account in a single transaction
	if err := db.Transaction(func(tx *gorm.DB) error {
		// Delete ticket replies before tickets (no user_id on replies)
		tx.Where("ticket_id IN (SELECT id FROM tickets WHERE user_id = ?)", user.ID).Delete(&TicketReply{})
		for _, model := range []interface{}{&Todo{}, &Countdown{}, &Category{}, &Ticket{}} {
			if err := tx.Where("user_id = ?", user.ID).Delete(model).Error; err != nil {
				return err
			}
		}
		return tx.Delete(&User{}, user.ID).Error
	}); err != nil {
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

	// Use strict input struct to prevent ID injection (IDOR)
	var input struct {
		Content    string `json:"content"`
		Priority   string `json:"priority"`
		CategoryID *uint  `json:"category_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	content := sanitizeString(input.Content)
	if content == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Content is required", "VALIDATION_ERROR"))
		return
	}

	priority := input.Priority
	if !validatePriority(priority) {
		priority = "medium"
	}

	todo := Todo{
		UserID:     userID,
		Content:    content,
		Priority:   priority,
		CategoryID: input.CategoryID,
	}
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

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	// Whitelist allowed fields to prevent mass-assignment (e.g. user_id, id overwrite)
	allowed := map[string]bool{"content": true, "priority": true, "pinned": true, "done": true, "category_id": true}
	updates := make(map[string]interface{})
	for k, v := range input {
		if allowed[k] {
			updates[k] = v
		}
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
	// Use targeted update to avoid overwriting all columns (db.Save would update everything)
	db.Model(&todo).Update("done", todo.Done)

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
	// Use targeted update to avoid overwriting all columns (db.Save would update everything)
	db.Model(&todo).Update("pinned", todo.Pinned)

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

	// Use strict input struct to prevent ID injection (IDOR)
	var input struct {
		Title      string    `json:"title"`
		TargetDate time.Time `json:"target_date"`
		Priority   string    `json:"priority"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	title := sanitizeString(input.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Title is required", "VALIDATION_ERROR"))
		return
	}

	if input.TargetDate.IsZero() {
		c.JSON(http.StatusBadRequest, errorResponse("Target date is required", "VALIDATION_ERROR"))
		return
	}

	priority := input.Priority
	if !validatePriority(priority) {
		priority = "medium"
	}

	countdown := Countdown{
		UserID:     userID,
		Title:      title,
		TargetDate: input.TargetDate,
		Priority:   priority,
	}
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

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	// Whitelist allowed fields to prevent mass-assignment
	allowed := map[string]bool{"title": true, "target_date": true, "priority": true, "pinned": true}
	updates := make(map[string]interface{})
	for k, v := range input {
		if allowed[k] {
			updates[k] = v
		}
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

	// Use strict input struct to prevent ID injection (IDOR)
	var input struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	name := sanitizeString(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, errorResponse("Name is required", "VALIDATION_ERROR"))
		return
	}

	color := input.Color
	if color == "" {
		color = "#6366f1"
	}

	var existing Category
	if db.Where("user_id = ? AND name = ?", userID, name).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, errorResponse("Category with this name already exists", "DUPLICATE"))
		return
	}

	category := Category{
		UserID: userID,
		Name:   name,
		Color:  color,
	}
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

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	// Whitelist allowed fields to prevent mass-assignment
	allowed := map[string]bool{"name": true, "color": true}
	updates := make(map[string]interface{})
	for k, v := range input {
		if allowed[k] {
			updates[k] = v
		}
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

	// Wrap unlink + delete in a transaction for atomicity
	if err := db.Transaction(func(tx *gorm.DB) error {
		// Unlink todos from this category
		if err := tx.Model(&Todo{}).Where("category_id = ? AND user_id = ?", id, userID).Update("category_id", nil).Error; err != nil {
			return err
		}
		result := tx.Where("id = ? AND user_id = ?", id, userID).Delete(&Category{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return fmt.Errorf("not found")
		}
		return nil
	}); err != nil {
		if err.Error() == "not found" {
			c.JSON(http.StatusNotFound, errorResponse("Category not found", "NOT_FOUND"))
		} else {
			c.JSON(http.StatusInternalServerError, errorResponse("Failed to delete category", "INTERNAL_ERROR"))
		}
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
	db.Where("user_id = ?", userID).Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Order("created_at DESC").Find(&tickets)
	c.JSON(http.StatusOK, successResponse(tickets))
}

func getTicket(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var ticket Ticket
	if err := db.Where("id = ? AND user_id = ?", id, userID).Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	// Auto-mark reply as read when user views the ticket
	if len(ticket.Replies) > 0 && ticket.ReplyReadAt == nil {
		now := time.Now()
		db.Model(&ticket).Update("reply_read_at", now)
		ticket.ReplyReadAt = &now
	}

	c.JSON(http.StatusOK, successResponse(ticket))
}

func markTicketRead(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var ticket Ticket
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	if ticket.ReplyReadAt == nil {
		now := time.Now()
		db.Model(&ticket).Update("reply_read_at", now)
		ticket.ReplyReadAt = &now
	}

	c.JSON(http.StatusOK, successResponse(ticket))
}

func getTicketUnreadCount(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var count int64
	db.Model(&Ticket{}).
		Where("user_id = ? AND reply_read_at IS NULL AND id IN (SELECT DISTINCT ticket_id FROM ticket_replies)", userID).
		Count(&count)

	c.JSON(http.StatusOK, successResponse(map[string]int64{"count": count}))
}

func closeTicket(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var ticket Ticket
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	if ticket.Status == "closed" {
		c.JSON(http.StatusBadRequest, errorResponse("Ticket is already closed", "VALIDATION_ERROR"))
		return
	}

	db.Model(&ticket).Update("status", "closed")
	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Ticket closed"}))
}

func addUserTicketReply(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var ticket Ticket
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	if ticket.Status == "closed" {
		c.JSON(http.StatusBadRequest, errorResponse("Cannot reply to a closed ticket", "VALIDATION_ERROR"))
		return
	}

	var input struct {
		Content string `json:"content" binding:"required,max=2000"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Content is required (max 2000 chars)", "VALIDATION_ERROR"))
		return
	}

	reply := TicketReply{
		TicketID: ticket.ID,
		Content:  sanitizeString(input.Content),
		IsAdmin:  false,
	}
	if err := db.Create(&reply).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to save reply", "INTERNAL_ERROR"))
		return
	}

	// If ticket was resolved, reopen to in_progress
	if ticket.Status == "resolved" {
		db.Model(&ticket).Updates(map[string]interface{}{"status": "in_progress", "resolved_at": nil})
	}

	c.JSON(http.StatusCreated, successResponse(reply))
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

	// Aggregate all todo stats in a single query (replaces 6 separate COUNTs)
	var todoAgg struct {
		Total    int64
		DoneCount int64
		PinnedCount int64
		HighCount   int64
		MediumCount int64
		LowCount    int64
	}
	db.Raw(`
		SELECT
			COUNT(*) AS total,
			SUM(CASE WHEN done=1 THEN 1 ELSE 0 END) AS done_count,
			SUM(CASE WHEN pinned=1 THEN 1 ELSE 0 END) AS pinned_count,
			SUM(CASE WHEN priority='high'   AND done=0 THEN 1 ELSE 0 END) AS high_count,
			SUM(CASE WHEN priority='medium' AND done=0 THEN 1 ELSE 0 END) AS medium_count,
			SUM(CASE WHEN priority='low'    AND done=0 THEN 1 ELSE 0 END) AS low_count
		FROM todos WHERE user_id = ?
	`, userID).Scan(&todoAgg)

	// Aggregate all countdown stats in a single query (replaces 4 separate COUNTs)
	now := time.Now()
	sevenDaysLater := now.AddDate(0, 0, 7)
	var cdAgg struct {
		Total       int64
		PinnedCount int64
		DueSoon     int64
		Overdue     int64
	}
	db.Raw(`
		SELECT
			COUNT(*) AS total,
			SUM(CASE WHEN pinned=1 THEN 1 ELSE 0 END) AS pinned_count,
			SUM(CASE WHEN target_date >= ? AND target_date <= ? THEN 1 ELSE 0 END) AS due_soon,
			SUM(CASE WHEN target_date < ? THEN 1 ELSE 0 END) AS overdue
		FROM countdowns WHERE user_id = ?
	`, now, sevenDaysLater, now, userID).Scan(&cdAgg)

	completionRate := 0.0
	if todoAgg.Total > 0 {
		completionRate = float64(todoAgg.DoneCount) / float64(todoAgg.Total) * 100
	}

	stats := Stats{
		Todos: TodoStats{
			Total:          int(todoAgg.Total),
			Done:           int(todoAgg.DoneCount),
			Pending:        int(todoAgg.Total - todoAgg.DoneCount),
			CompletionRate: completionRate,
			ByPriority: map[string]int{
				"high":   int(todoAgg.HighCount),
				"medium": int(todoAgg.MediumCount),
				"low":    int(todoAgg.LowCount),
			},
			Pinned: int(todoAgg.PinnedCount),
		},
		Countdowns: CountdownStats{
			Total:   int(cdAgg.Total),
			DueSoon: int(cdAgg.DueSoon),
			Overdue: int(cdAgg.Overdue),
			Pinned:  int(cdAgg.PinnedCount),
		},
	}

	c.JSON(http.StatusOK, successResponse(stats))
}

// Admin ticket handlers
func adminGetTickets(c *gin.Context) {
	status := c.Query("status")

	var tickets []Ticket
	query := db.Preload("User").Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Find(&tickets)

	// Return user info without sensitive data
	type TicketWithUser struct {
		ID          uint          `json:"id"`
		UserID      uint          `json:"user_id"`
		Username    string        `json:"username"`
		Title       string        `json:"title"`
		Description string        `json:"description"`
		Priority    string        `json:"priority"`
		Status      string        `json:"status"`
		ReplyReadAt *time.Time    `json:"reply_read_at"`
		ResolvedAt  *time.Time    `json:"resolved_at"`
		Replies     []TicketReply `json:"replies"`
		CreatedAt   time.Time     `json:"created_at"`
		UpdatedAt   time.Time     `json:"updated_at"`
	}

	var result []TicketWithUser
	for _, t := range tickets {
		username := ""
		if t.User != nil {
			username = t.User.Username
		}
		replies := t.Replies
		if replies == nil {
			replies = []TicketReply{}
		}
		result = append(result, TicketWithUser{
			ID:          t.ID,
			UserID:      t.UserID,
			Username:    username,
			Title:       t.Title,
			Description: t.Description,
			Priority:    t.Priority,
			Status:      t.Status,
			ReplyReadAt: t.ReplyReadAt,
			ResolvedAt:  t.ResolvedAt,
			Replies:     replies,
			CreatedAt:   t.CreatedAt,
			UpdatedAt:   t.UpdatedAt,
		})
	}

	if result == nil {
		result = []TicketWithUser{}
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

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body", "VALIDATION_ERROR"))
		return
	}

	// Whitelist allowed fields to prevent mass-assignment (reply removed — use /replies endpoint)
	allowed := map[string]bool{"status": true, "priority": true}
	updates := make(map[string]interface{})
	for k, v := range input {
		if allowed[k] {
			updates[k] = v
		}
	}

	// Validate status
	if status, ok := updates["status"].(string); ok {
		validStatuses := map[string]bool{"open": true, "in_progress": true, "resolved": true, "closed": true}
		if !validStatuses[status] {
			c.JSON(http.StatusBadRequest, errorResponse("Invalid status", "VALIDATION_ERROR"))
			return
		}
		// Track when ticket is resolved (for auto-close after 3 days)
		if status == "resolved" && ticket.Status != "resolved" {
			now := time.Now()
			updates["resolved_at"] = now
		} else if status != "resolved" {
			updates["resolved_at"] = nil
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
	// Handle resolved_at nil explicitly (GORM skips nil in map Updates)
	if _, hasStatus := updates["status"]; hasStatus {
		if updates["resolved_at"] == nil {
			db.Model(&ticket).Update("resolved_at", nil)
		}
	}
	db.First(&ticket, id)
	c.JSON(http.StatusOK, successResponse(ticket))
}

func adminAddTicketReply(c *gin.Context) {
	id := c.Param("id")

	var ticket Ticket
	if err := db.First(&ticket, id).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Ticket not found", "NOT_FOUND"))
		return
	}

	var input struct {
		Content string `json:"content" binding:"required,max=2000"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Content is required (max 2000 chars)", "VALIDATION_ERROR"))
		return
	}

	reply := TicketReply{
		TicketID: ticket.ID,
		Content:  sanitizeString(input.Content),
		IsAdmin:  true,
	}
	if err := db.Create(&reply).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to save reply", "INTERNAL_ERROR"))
		return
	}

	// Reset reply_read_at so user sees the new reply notification
	db.Model(&ticket).Update("reply_read_at", nil)

	// If ticket was closed, reopen to in_progress
	if ticket.Status == "closed" {
		db.Model(&ticket).Updates(map[string]interface{}{"status": "in_progress", "resolved_at": nil})
	}

	// Push real-time notification to the user
	wsManager.BroadcastToUser(ticket.UserID, "ticket_reply", map[string]interface{}{
		"ticket_id": ticket.ID,
		"reply":     reply,
	})

	c.JSON(http.StatusCreated, successResponse(reply))
}

func adminDeleteTicketReply(c *gin.Context) {
	id := c.Param("id")
	replyId := c.Param("replyId")

	// Verify the reply belongs to this ticket
	var reply TicketReply
	if err := db.Where("id = ? AND ticket_id = ?", replyId, id).First(&reply).Error; err != nil {
		c.JSON(http.StatusNotFound, errorResponse("Reply not found", "NOT_FOUND"))
		return
	}

	db.Delete(&reply)
	c.JSON(http.StatusOK, successResponse(map[string]string{"message": "Reply deleted"}))
}

func adminDeleteTicket(c *gin.Context) {
	id := c.Param("id")

	// Also delete associated replies
	db.Where("ticket_id = ?", id).Delete(&TicketReply{})
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
	if err := db.Raw(`
		SELECT
			u.id, u.username, u.email, u.role, u.disabled,
			u.created_at, u.updated_at,
			COUNT(DISTINCT t.id)  AS todo_count,
			COUNT(DISTINCT cd.id) AS countdown_count
		FROM users u
		LEFT JOIN todos      t  ON t.user_id  = u.id
		LEFT JOIN countdowns cd ON cd.user_id = u.id
		GROUP BY u.id
		ORDER BY u.created_at DESC
	`).Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to fetch users", "INTERNAL_ERROR"))
		return
	}

	// Ensure JSON encodes as [] rather than null when no users exist
	if result == nil {
		result = []UserWithStats{}
	}

	c.JSON(http.StatusOK, successResponse(result))
}

func adminDisableUser(c *gin.Context) {
	id := c.Param("id")
	currentUser := c.MustGet("user").(User)

	// Prevent disabling self
	parsedID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid user ID", "VALIDATION_ERROR"))
		return
	}
	if uint(parsedID) == currentUser.ID {
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
	parsedID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid user ID", "VALIDATION_ERROR"))
		return
	}
	if uint(parsedID) == currentUser.ID {
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

	// Delete user's data and account in a single transaction
	if err := db.Transaction(func(tx *gorm.DB) error {
		// Delete ticket replies before tickets (no user_id on replies)
		tx.Where("ticket_id IN (SELECT id FROM tickets WHERE user_id = ?)", id).Delete(&TicketReply{})
		for _, model := range []interface{}{&Todo{}, &Countdown{}, &Category{}, &Ticket{}} {
			if err := tx.Where("user_id = ?", id).Delete(model).Error; err != nil {
				return err
			}
		}
		result := tx.Delete(&User{}, id)
		if result.RowsAffected == 0 {
			return fmt.Errorf("user not found")
		}
		return result.Error
	}); err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, errorResponse("User not found", "NOT_FOUND"))
		} else {
			c.JSON(http.StatusInternalServerError, errorResponse("Failed to delete user", "INTERNAL_ERROR"))
		}
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
	// Aggregate all user stats in a single query (replaces 4 separate COUNTs)
	var userAgg struct {
		Total    int64
		Active   int64
		Disabled int64
		Recent   int64
	}
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	db.Raw(`
		SELECT
			COUNT(*) AS total,
			SUM(CASE WHEN disabled=0 THEN 1 ELSE 0 END) AS active,
			SUM(CASE WHEN disabled=1 THEN 1 ELSE 0 END) AS disabled,
			SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS recent
		FROM users
	`, sevenDaysAgo).Scan(&userAgg)

	// Aggregate all data stats in a single query (replaces 3 separate COUNTs)
	var dataAgg struct {
		Todos      int64
		Countdowns int64
		Categories int64
	}
	db.Raw(`
		SELECT
			(SELECT COUNT(*) FROM todos)      AS todos,
			(SELECT COUNT(*) FROM countdowns) AS countdowns,
			(SELECT COUNT(*) FROM categories) AS categories
	`).Scan(&dataAgg)

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{
		"users": map[string]int64{
			"total":    userAgg.Total,
			"active":   userAgg.Active,
			"disabled": userAgg.Disabled,
			"recent":   userAgg.Recent,
		},
		"data": map[string]int64{
			"todos":      dataAgg.Todos,
			"countdowns": dataAgg.Countdowns,
			"categories": dataAgg.Categories,
		},
	}))
}

// ==================== Batch Operations ====================

// batchDeleteTodos deletes multiple todos in a single transaction
func batchDeleteTodos(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input BatchIDsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: ids array required (max 100)", "VALIDATION_ERROR"))
		return
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		return tx.Where("id IN ? AND user_id = ?", input.IDs, userID).Delete(&Todo{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to delete todos", "INTERNAL_ERROR"))
		return
	}

	// Send a single WebSocket notification for all deleted IDs
	wsManager.BroadcastToUser(userID, "todos_batch_deleted", map[string]interface{}{"ids": input.IDs})

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{"message": "Todos deleted", "count": len(input.IDs)}))
}

// batchToggleTodos toggles the done state of multiple todos
func batchToggleTodos(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input BatchIDsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: ids array required (max 100)", "VALIDATION_ERROR"))
		return
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		// Use SQL NOT operator to atomically toggle done without a read-modify-write round-trip
		return tx.Model(&Todo{}).
			Where("id IN ? AND user_id = ?", input.IDs, userID).
			Update("done", gorm.Expr("NOT done")).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to toggle todos", "INTERNAL_ERROR"))
		return
	}

	// Send a single WebSocket notification
	wsManager.BroadcastToUser(userID, "todos_batch_updated", map[string]interface{}{"ids": input.IDs})

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{"message": "Todos toggled", "count": len(input.IDs)}))
}

// batchMarkDoneTodos marks multiple todos as done (used by clearCompleted flow)
func batchMarkDoneTodos(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input BatchIDsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: ids array required (max 100)", "VALIDATION_ERROR"))
		return
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&Todo{}).
			Where("id IN ? AND user_id = ?", input.IDs, userID).
			Update("done", true).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to mark todos as done", "INTERNAL_ERROR"))
		return
	}

	// Send a single WebSocket notification
	wsManager.BroadcastToUser(userID, "todos_batch_updated", map[string]interface{}{"ids": input.IDs})

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{"message": "Todos marked as done", "count": len(input.IDs)}))
}

// batchDeleteCountdowns deletes multiple countdowns in a single transaction
func batchDeleteCountdowns(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input BatchIDsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("Invalid request body: ids array required (max 100)", "VALIDATION_ERROR"))
		return
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		return tx.Where("id IN ? AND user_id = ?", input.IDs, userID).Delete(&Countdown{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, errorResponse("Failed to delete countdowns", "INTERNAL_ERROR"))
		return
	}

	// Send a single WebSocket notification for all deleted IDs
	wsManager.BroadcastToUser(userID, "countdowns_batch_deleted", map[string]interface{}{"ids": input.IDs})

	c.JSON(http.StatusOK, successResponse(map[string]interface{}{"message": "Countdowns deleted", "count": len(input.IDs)}))
}
