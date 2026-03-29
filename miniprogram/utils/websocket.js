// WebSocket service for miniprogram

const api = require('./api')

let socketTask = null
let reconnectTimer = null
let reconnectAttempts = 0
const maxReconnectAttempts = 5
const listeners = new Map()
let isConnected = false
let intentionalDisconnect = false

function getWsUrl() {
  const baseUrl = api.getBaseUrl()
  if (!baseUrl) return ''

  // Convert http/https to ws/wss
  const wsUrl = baseUrl.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://')
  const apiKey = api.getApiKey()
  return `${wsUrl}/ws?api_key=${encodeURIComponent(apiKey)}`
}

function connect() {
  intentionalDisconnect = false

  if (socketTask && isConnected) {
    return
  }

  const wsUrl = getWsUrl()
  if (!wsUrl) {
    console.log('WebSocket: No URL configured')
    return
  }

  try {
    socketTask = wx.connectSocket({
      url: wsUrl,
      success: () => {
        console.log('WebSocket: Connecting...')
      },
      fail: (err) => {
        console.error('WebSocket: Connection failed', err)
        scheduleReconnect()
      }
    })

    socketTask.onOpen(() => {
      console.log('WebSocket: Connected')
      isConnected = true
      reconnectAttempts = 0
      emit('connected', { connected: true })
    })

    socketTask.onMessage((res) => {
      try {
        const message = JSON.parse(res.data)
        emit(message.type, message.data)
      } catch (err) {
        console.error('WebSocket: Message parse error', err)
      }
    })

    socketTask.onClose(() => {
      console.log('WebSocket: Disconnected')
      isConnected = false
      emit('disconnected', { connected: false })
      // Only attempt reconnect if the disconnect was not intentional (e.g. logout)
      if (!intentionalDisconnect) {
        scheduleReconnect()
      }
      intentionalDisconnect = false
    })

    socketTask.onError((err) => {
      console.error('WebSocket: Error', err)
    })
  } catch (err) {
    console.error('WebSocket: Connection error', err)
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  if (reconnectAttempts >= maxReconnectAttempts) return

  reconnectAttempts++
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s) + up to 1s jitter
  const base = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000)
  const delay = base + Math.random() * 1000
  console.log(`WebSocket: Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
  reconnectTimer = setTimeout(() => {
    connect()
  }, delay)
}

function disconnect() {
  intentionalDisconnect = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socketTask) {
    socketTask.close()  // use SocketTask.close() instead of deprecated wx.closeSocket()
    socketTask = null
  }
  isConnected = false
  reconnectAttempts = 0
}

function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }
  listeners.get(event).add(callback)
}

function off(event, callback) {
  if (listeners.has(event)) {
    listeners.get(event).delete(callback)
  }
}

function emit(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(callback => {
      try {
        callback(data)
      } catch (err) {
        console.error(`WebSocket: Listener error for ${event}`, err)
      }
    })
  }
}

function getConnectionStatus() {
  return isConnected
}

module.exports = {
  connect,
  disconnect,
  on,
  off,
  getConnectionStatus
}
