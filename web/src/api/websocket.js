// WebSocket service for real-time updates

class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.listeners = new Map()
    this.isConnected = false
  }

  connect(apiKey) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.PROD ? window.location.host : (import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:3000')
    const wsUrl = `${protocol}//${host}/ws?api_key=${encodeURIComponent(apiKey)}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.emit('connected', { connected: true })
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.emit(message.type, message.data)
        } catch (err) {
          console.error('WebSocket message parse error:', err)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnected = false
        this.emit('disconnected', { connected: false })
        this.scheduleReconnect(apiKey)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (err) {
      console.error('WebSocket connection error:', err)
      this.scheduleReconnect(apiKey)
    }
  }

  scheduleReconnect(apiKey) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`WebSocket reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`)
      this.reconnectTimer = setTimeout(() => {
        this.connect(apiKey)
      }, this.reconnectDelay)
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.reconnectAttempts = 0
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (err) {
          console.error(`WebSocket listener error for ${event}:`, err)
        }
      })
    }
  }

  getConnectionStatus() {
    return this.isConnected
  }
}

// Export singleton
export const wsService = new WebSocketService()
export default wsService
