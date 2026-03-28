<template>
  <div 
    class="h-screen flex flex-col transition-all duration-300"
    :style="{ 
      background: `linear-gradient(135deg, rgba(30, 41, 59, ${opacity/100}) 0%, rgba(51, 65, 85, ${opacity/100}) 50%, rgba(30, 41, 59, ${opacity/100}) 100%)`,
    }"
  >
    <!-- Login Screen -->
    <div v-if="!isConnected" class="flex-1 flex flex-col items-center justify-center p-6">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
        <span class="text-3xl text-white">✓</span>
      </div>
      <h1 class="text-xl font-bold text-white mb-2">MemoDesk</h1>
      <p class="text-white/50 text-sm mb-8">Connect to your server</p>
      
      <div class="w-full max-w-xs space-y-4">
        <div>
          <label class="text-xs text-white/60 uppercase tracking-wider block mb-2">Server URL</label>
          <input 
            v-model="serverUrl" 
            type="text" 
            placeholder="http://localhost:3000"
            class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors text-sm"
          />
        </div>
        <div>
          <label class="text-xs text-white/60 uppercase tracking-wider block mb-2">API Key</label>
          <input 
            v-model="apiKey" 
            type="password" 
            placeholder="sk-memo-..."
            class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors text-sm"
          />
        </div>
        <button 
          @click="connect" 
          :disabled="isConnecting || !serverUrl.trim() || !apiKey.trim()"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <span v-if="isConnecting" class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Connecting...
          </span>
          <span v-else>Connect</span>
        </button>
        <p v-if="error" class="text-red-400 text-xs text-center">{{ error }}</p>
      </div>
    </div>

    <!-- Main App -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/10" data-tauri-drag-region>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span class="text-sm text-white">✓</span>
          </div>
          <span class="text-sm font-semibold text-white/90">MemoDesk</span>
        </div>
        <div class="flex items-center gap-1" data-tauri-drag-region>
          <!-- Minimize Button -->
          <button 
            @click="minimizeWindow"
            class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors flex items-center justify-center text-xs"
            title="Minimize to tray"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <!-- Settings Button -->
          <button 
            @click="showSettings = !showSettings" 
            class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors flex items-center justify-center text-sm"
            :class="{ 'bg-white/15 text-white': showSettings }"
          >
            ⚙
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <!-- Settings Panel -->
        <Transition name="slide">
          <div v-if="showSettings" class="p-4 border-b border-white/10 space-y-4">
            <div>
              <label class="text-xs text-white/50 uppercase tracking-wider block mb-2">Opacity</label>
              <input 
                v-model.number="opacity" 
                type="range" 
                min="60" 
                max="100" 
                class="w-full accent-blue-500"
              />
              <div class="flex justify-between text-xs text-white/30 mt-1">
                <span>60%</span>
                <span>{{ opacity }}%</span>
                <span>100%</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <label class="text-xs text-white/50 uppercase tracking-wider">Always on Top</label>
              <button 
                @click="toggleAlwaysOnTop"
                class="w-10 h-5 rounded-full transition-colors relative"
                :class="alwaysOnTop ? 'bg-blue-500' : 'bg-white/20'"
              >
                <div class="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" :class="alwaysOnTop ? 'translate-x-5' : 'translate-x-0.5'"></div>
              </button>
            </div>
            <button 
              @click="disconnect" 
              class="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors"
            >
              Disconnect
            </button>
          </div>
        </Transition>

        <!-- Quick Add -->
        <div class="p-4 border-b border-white/5">
          <div class="flex gap-2">
            <input 
              v-model="newTodoContent" 
              @keyup.enter="addTodo" 
              placeholder="Add a task..." 
              class="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
            />
            <select 
              v-model="newTodoPriority" 
              class="px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
            >
              <option value="high" class="bg-slate-800">H</option>
              <option value="medium" class="bg-slate-800">M</option>
              <option value="low" class="bg-slate-800">L</option>
            </select>
            <button 
              @click="addTodo" 
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              +
            </button>
          </div>
        </div>

        <!-- Pinned Items -->
        <div v-if="pinnedItems.length > 0" class="p-4 pb-2">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xs text-orange-400 font-medium">📌 Pinned</span>
          </div>
          <div class="space-y-2">
            <TodoCard 
              v-for="item in pinnedItems" 
              :key="'pinned-' + item.id" 
              :item="item" 
              @toggle="toggleTodo"
              @pin="pinTodo"
            />
          </div>
        </div>

        <!-- Regular Items -->
        <div class="p-4 pt-2 space-y-2">
          <div v-if="pinnedItems.length > 0" class="text-xs text-white/40 mb-2">Tasks</div>
          <TodoCard 
            v-for="item in regularItems" 
            :key="item.id" 
            :item="item" 
            @toggle="toggleTodo"
            @pin="pinTodo"
          />
        </div>

        <!-- Empty State -->
        <div v-if="todos.length === 0 && !loading" class="p-8 text-center">
          <div class="text-4xl mb-3 opacity-20">📝</div>
          <p class="text-white/40 text-sm">No tasks yet</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
        </div>

        <!-- Error State -->
        <div v-if="error && isConnected" class="p-4">
          <div class="bg-red-500/20 rounded-xl p-3 text-red-400 text-xs text-center">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Footer Stats -->
      <div class="px-4 py-2 border-t border-white/10 flex justify-between items-center text-xs text-white/40">
        <span>{{ pendingCount }} pending</span>
        <span>{{ doneCount }} done</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import TodoCard from './components/TodoCard.vue'

// State
const isConnected = ref(false)
const isConnecting = ref(false)
const loading = ref(false)
const error = ref('')
const todos = ref([])
const countdowns = ref([])
const showSettings = ref(false)
const newTodoContent = ref('')
const newTodoPriority = ref('medium')
const opacity = ref(95)
const alwaysOnTop = ref(false)

// Connection settings
const serverUrl = ref(localStorage.getItem('memo_server_url') || 'http://localhost:3000')
const apiKey = ref(localStorage.getItem('memo_api_key') || '')

// Computed
const pinnedItems = computed(() => todos.value.filter(t => t.pinned && !t.done))
const regularItems = computed(() => todos.value.filter(t => !t.pinned || t.done))
const pendingCount = computed(() => todos.value.filter(t => !t.done).length)
const doneCount = computed(() => todos.value.filter(t => t.done).length)

// Methods
const getApiHeaders = () => ({
  'Content-Type': 'application/json',
  'X-API-Key': apiKey.value
})

const fetchData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const [todosRes, cdsRes] = await Promise.all([
      fetch(`${serverUrl.value}/api/todos`, { headers: getApiHeaders() }),
      fetch(`${serverUrl.value}/api/countdowns`, { headers: getApiHeaders() })
    ])
    
    if (!todosRes.ok || !cdsRes.ok) {
      throw new Error('Failed to fetch data')
    }
    
    const todosData = await todosRes.json()
    const cdsData = await cdsRes.json()
    
    todos.value = todosData.data || todosData
    countdowns.value = cdsData.data || cdsData
  } catch (e) {
    error.value = 'Failed to fetch data'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const connect = async () => {
  if (!serverUrl.value.trim() || !apiKey.value.trim()) {
    error.value = 'Please enter server URL and API key'
    return
  }

  isConnecting.value = true
  error.value = ''

  try {
    const res = await fetch(`${serverUrl.value}/api/verify`, {
      headers: getApiHeaders()
    })
    
    if (res.ok) {
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('memo_server_url', serverUrl.value)
        localStorage.setItem('memo_api_key', apiKey.value)
        isConnected.value = true
        fetchData()
      } else {
        error.value = 'Invalid API key'
      }
    } else {
      error.value = 'Connection failed. Check server URL.'
    }
  } catch (e) {
    error.value = 'Cannot connect to server'
  } finally {
    isConnecting.value = false
  }
}

const disconnect = () => {
  localStorage.removeItem('memo_api_key')
  apiKey.value = ''
  isConnected.value = false
  todos.value = []
  countdowns.value = []
  showSettings.value = false
}

const addTodo = async () => {
  if (!newTodoContent.value.trim()) return
  
  try {
    const res = await fetch(`${serverUrl.value}/api/todos`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        content: newTodoContent.value.trim(),
        priority: newTodoPriority.value
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      todos.value.unshift(data.data || data)
      newTodoContent.value = ''
    }
  } catch (e) {
    error.value = 'Failed to add task'
  }
}

const toggleTodo = async (id) => {
  try {
    const res = await fetch(`${serverUrl.value}/api/todos/${id}/toggle`, {
      method: 'PATCH',
      headers: getApiHeaders()
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

const pinTodo = async (id) => {
  try {
    const res = await fetch(`${serverUrl.value}/api/todos/${id}/pin`, {
      method: 'PATCH',
      headers: getApiHeaders()
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

const minimizeWindow = async () => {
  const window = getCurrentWindow()
  await window.hide()
}

const toggleAlwaysOnTop = async () => {
  alwaysOnTop.value = !alwaysOnTop.value
  const window = getCurrentWindow()
  await window.setAlwaysOnTop(alwaysOnTop.value)
  localStorage.setItem('memo_always_on_top', alwaysOnTop.value)
}

// Watch opacity changes
watch(opacity, (val) => {
  localStorage.setItem('memo_opacity', val)
})

// Initialize
onMounted(async () => {
  // Load saved settings
  opacity.value = parseInt(localStorage.getItem('memo_opacity')) || 95
  alwaysOnTop.value = localStorage.getItem('memo_always_on_top') === 'true'
  
  // Apply always on top setting
  if (alwaysOnTop.value) {
    const window = getCurrentWindow()
    await window.setAlwaysOnTop(true)
  }
  
  // Auto-connect if credentials exist
  if (apiKey.value) {
    connect()
  }
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
