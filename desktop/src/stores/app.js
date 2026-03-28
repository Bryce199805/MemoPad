import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // Connection state
  const serverUrl = ref(localStorage.getItem('memo_server_url') || 'http://localhost:3000')
  const apiKey = ref(localStorage.getItem('memo_api_key') || '')
  const isConnected = ref(false)
  const user = ref(null)

  // Settings
  const opacity = ref(Number(localStorage.getItem('memo_opacity')) || 95)
  const alwaysOnTop = ref(localStorage.getItem('memo_always_on_top') === 'true')
  const transparentBackground = ref(localStorage.getItem('memo_transparent_bg') !== 'false') // Default true

  // Data
  const todos = ref([])
  const countdowns = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const pinnedTodos = computed(() => todos.value.filter(t => t.pinned && !t.done))
  const regularTodos = computed(() => todos.value.filter(t => !t.pinned || t.done))
  const pendingCount = computed(() => todos.value.filter(t => !t.done).length)
  const doneCount = computed(() => todos.value.filter(t => t.done).length)

  // Headers helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-API-Key': apiKey.value
  })

  // Connection
  async function connect() {
    if (!serverUrl.value.trim() || !apiKey.value.trim()) {
      error.value = 'Server URL and API key are required'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const res = await fetch(`${serverUrl.value}/api/auth/verify`, {
        headers: getHeaders()
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.valid) {
          localStorage.setItem('memo_server_url', serverUrl.value)
          localStorage.setItem('memo_api_key', apiKey.value)
          user.value = data.data.user
          isConnected.value = true
          fetchData()
          return true
        }
      }

      error.value = 'Invalid credentials'
      return false
    } catch (e) {
      error.value = 'Cannot connect to server'
      return false
    } finally {
      loading.value = false
    }
  }

  function disconnect() {
    localStorage.removeItem('memo_api_key')
    apiKey.value = ''
    user.value = null
    isConnected.value = false
    todos.value = []
    countdowns.value = []
  }

  // Data fetching
  async function fetchData() {
    if (!isConnected.value) return

    loading.value = true
    error.value = null

    try {
      const [todosRes, cdsRes] = await Promise.all([
        fetch(`${serverUrl.value}/api/todos`, { headers: getHeaders() }),
        fetch(`${serverUrl.value}/api/countdowns`, { headers: getHeaders() })
      ])

      if (todosRes.ok && cdsRes.ok) {
        const todosData = await todosRes.json()
        const cdsData = await cdsRes.json()
        todos.value = todosData.data || todosData
        countdowns.value = cdsData.data || cdsData
      }
    } catch (e) {
      error.value = 'Failed to fetch data'
    } finally {
      loading.value = false
    }
  }

  // Todo actions
  async function addTodo(content, priority = 'medium') {
    try {
      const res = await fetch(`${serverUrl.value}/api/todos`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content, priority })
      })

      if (res.ok) {
        const data = await res.json()
        todos.value.unshift(data.data || data)
        return true
      }
      return false
    } catch (e) {
      error.value = 'Failed to add task'
      return false
    }
  }

  async function toggleTodo(id) {
    try {
      const res = await fetch(`${serverUrl.value}/api/todos/${id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders()
      })

      if (res.ok) {
        const data = await res.json()
        const idx = todos.value.findIndex(t => t.id === id)
        if (idx !== -1) todos.value[idx] = data.data || data
      }
    } catch (e) {
      error.value = 'Failed to update task'
    }
  }

  async function pinTodo(id) {
    try {
      const res = await fetch(`${serverUrl.value}/api/todos/${id}/pin`, {
        method: 'PATCH',
        headers: getHeaders()
      })

      if (res.ok) {
        const data = await res.json()
        const idx = todos.value.findIndex(t => t.id === id)
        if (idx !== -1) todos.value[idx] = data.data || data
      }
    } catch (e) {
      error.value = 'Failed to pin task'
    }
  }

  // Settings
  function setOpacity(val) {
    opacity.value = val
    localStorage.setItem('memo_opacity', val)
  }

  async function setAlwaysOnTop(val) {
    alwaysOnTop.value = val
    localStorage.setItem('memo_always_on_top', val)
  }

  function setTransparentBackground(val) {
    transparentBackground.value = val
    localStorage.setItem('memo_transparent_bg', val)
  }

  return {
    // State
    serverUrl, apiKey, isConnected, user,
    opacity, alwaysOnTop, transparentBackground,
    todos, countdowns, loading, error,
    // Computed
    pinnedTodos, regularTodos, pendingCount, doneCount,
    // Actions
    connect, disconnect, fetchData,
    addTodo, toggleTodo, pinTodo,
    setOpacity, setAlwaysOnTop, setTransparentBackground
  }
})
