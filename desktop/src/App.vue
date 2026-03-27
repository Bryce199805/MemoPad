<template>
  <div class="h-screen flex flex-col bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 drag-region">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <span class="text-xs">✓</span>
        </div>
        <span class="text-sm font-semibold text-white/90 tracking-wide">MemoDesk</span>
      </div>
      <div class="flex gap-1.5">
        <button 
          @click="showAddTodo = !showAddTodo" 
          class="text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/90 transition-all duration-200 no-drag backdrop-blur-sm border border-white/10"
        >
          + Todo
        </button>
        <button 
          @click="showSettings = !showSettings" 
          class="text-xs w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white/90 transition-all duration-200 no-drag backdrop-blur-sm border border-white/10"
        >
          ⚙
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
      <!-- Quick Add Todo -->
      <Transition name="slide">
        <div v-if="showAddTodo" class="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
          <div class="flex gap-2">
            <input 
              v-model="newTodoContent" 
              @keyup.enter="addTodo" 
              placeholder="What needs to be done?" 
              class="flex-1 text-sm px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
            />
          </div>
          <div class="flex gap-2 mt-2">
            <select 
              v-model="newTodoPriority" 
              class="text-xs px-2 py-1.5 rounded-lg bg-white/10 text-white border border-white/10 focus:outline-none"
            >
              <option value="high" class="bg-slate-800">High</option>
              <option value="medium" class="bg-slate-800">Medium</option>
              <option value="low" class="bg-slate-800">Low</option>
            </select>
            <button 
              @click="addTodo" 
              class="text-xs px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Add
            </button>
          </div>
        </div>
      </Transition>

      <!-- Settings Panel -->
      <Transition name="slide">
        <div v-if="showSettings" class="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm space-y-3">
          <div>
            <label class="text-xs text-white/60 uppercase tracking-wider">API Key</label>
            <div class="flex gap-2 mt-1">
              <input 
                v-model="apiKeyInput" 
                type="password" 
                placeholder="sk-memo-..." 
                class="flex-1 text-xs px-3 py-2 rounded-lg bg-white/10 text-white border border-white/10 focus:border-white/30 focus:outline-none"
              />
              <button 
                @click="saveApiKey" 
                class="text-xs px-3 py-2 rounded-lg bg-green-500/80 hover:bg-green-500 text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs text-white/60 uppercase tracking-wider">Position</label>
            <select 
              v-model="positionMode" 
              @change="updatePosition"
              class="w-full mt-1 text-xs px-3 py-2 rounded-lg bg-white/10 text-white border border-white/10 focus:outline-none"
            >
              <option value="free" class="bg-slate-800">Free</option>
              <option value="top-right" class="bg-slate-800">Top Right</option>
              <option value="top-left" class="bg-slate-800">Top Left</option>
              <option value="bottom-right" class="bg-slate-800">Bottom Right</option>
              <option value="bottom-left" class="bg-slate-800">Bottom Left</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-white/60 uppercase tracking-wider">Opacity</label>
            <input 
              v-model.number="opacity" 
              type="range" 
              min="50" 
              max="100" 
              @input="updateOpacity"
              class="w-full mt-1 accent-purple-500"
            />
          </div>
        </div>
      </Transition>

      <!-- Pinned Section -->
      <div v-if="pinnedTodos.length > 0 || pinnedCountdowns.length > 0" class="space-y-2">
        <div class="flex items-center gap-2 px-1">
          <span class="text-xs text-orange-400 font-medium">📌 Pinned</span>
        </div>
        
        <!-- Pinned Todos -->
        <div 
          v-for="todo in pinnedTodos" 
          :key="'pinned-' + todo.id" 
          class="group relative bg-gradient-to-r from-orange-500/10 to-transparent rounded-xl p-3 border border-orange-500/20 hover:border-orange-500/30 transition-all duration-200"
        >
          <div class="flex items-center gap-3">
            <button 
              @click="toggleTodo(todo.id)" 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
              :class="todo.done ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white/50'"
            >
              <span v-if="todo.done" class="text-xs text-white">✓</span>
            </button>
            <span 
              :class="{ 'line-through text-white/40': todo.done }" 
              class="flex-1 text-sm text-white/90"
            >
              {{ todo.content }}
            </span>
            <span 
              :class="priorityClass(todo.priority)" 
              class="text-xs font-bold px-2 py-0.5 rounded-full"
            >
              {{ priorityLabel(todo.priority) }}
            </span>
          </div>
        </div>

        <!-- Pinned Countdowns -->
        <div 
          v-for="cd in pinnedCountdowns" 
          :key="'pinned-cd-' + cd.id" 
          class="bg-gradient-to-r from-orange-500/10 to-transparent rounded-xl p-3 border border-orange-500/20"
        >
          <div class="flex justify-between items-center">
            <span class="text-sm text-white/90 truncate">{{ cd.title }}</span>
          </div>
          <div class="flex items-end justify-between mt-2">
            <span class="text-2xl font-bold" :class="getCountdownColor(cd.target_date)">
              {{ getDaysLeft(cd.target_date) }}d
            </span>
            <span class="text-xs text-white/40">{{ formatDate(cd.target_date) }}</span>
          </div>
        </div>
      </div>

      <!-- Todos Section -->
      <div v-if="regularTodos.length > 0" class="space-y-2">
        <div v-if="pinnedTodos.length > 0 || pinnedCountdowns.length > 0" class="flex items-center gap-2 px-1 mt-4">
          <span class="text-xs text-white/50 font-medium">Tasks</span>
        </div>
        
        <div 
          v-for="todo in regularTodos" 
          :key="todo.id" 
          class="group relative bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-200"
        >
          <div class="flex items-center gap-3">
            <button 
              @click="toggleTodo(todo.id)" 
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
              :class="todo.done ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white/50'"
            >
              <span v-if="todo.done" class="text-xs text-white">✓</span>
            </button>
            <span 
              :class="{ 'line-through text-white/40': todo.done }" 
              class="flex-1 text-sm text-white/90"
            >
              {{ todo.content }}
            </span>
            <span 
              :class="priorityClass(todo.priority)" 
              class="text-xs font-bold px-2 py-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
            >
              {{ priorityLabel(todo.priority) }}
            </span>
            <button 
              @click="pinTodo(todo.id)" 
              class="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1"
              :class="todo.pinned ? 'text-orange-400' : 'text-white/40 hover:text-white/60'"
            >
              📌
            </button>
          </div>
        </div>
      </div>

      <!-- Countdowns Section -->
      <div v-if="regularCountdowns.length > 0" class="space-y-2">
        <div class="flex items-center gap-2 px-1 mt-4">
          <span class="text-xs text-white/50 font-medium">Countdowns</span>
        </div>
        
        <div 
          v-for="cd in regularCountdowns" 
          :key="cd.id" 
          class="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all duration-200"
        >
          <div class="flex justify-between items-center">
            <span class="text-sm text-white/90 truncate">{{ cd.title }}</span>
            <span 
              :class="priorityClass(cd.priority)" 
              class="text-xs font-bold px-2 py-0.5 rounded-full opacity-70"
            >
              {{ priorityLabel(cd.priority) }}
            </span>
          </div>
          <div class="flex items-end justify-between mt-2">
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-bold" :class="getCountdownColor(cd.target_date)">
                {{ Math.abs(getDaysLeft(cd.target_date)) }}
              </span>
              <span class="text-xs text-white/50">
                {{ getDaysLeft(cd.target_date) >= 0 ? 'days left' : 'days ago' }}
              </span>
            </div>
            <span class="text-xs text-white/40">{{ formatDate(cd.target_date) }}</span>
          </div>
          <!-- Progress bar -->
          <div class="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              class="h-full rounded-full transition-all duration-300"
              :class="getCountdownProgressColor(cd.target_date)"
              :style="{ width: getCountdownProgress(cd.target_date) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="todos.length === 0 && countdowns.length === 0 && !loading" class="text-center py-12">
        <div class="text-4xl mb-3 opacity-30">📝</div>
        <p class="text-white/40 text-sm">No tasks yet</p>
        <p class="text-white/30 text-xs mt-1">Click "+ Todo" to add one</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="bg-red-500/20 rounded-xl p-3 border border-red-500/30">
        <p class="text-red-300 text-xs text-center">{{ error }}</p>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="px-4 py-2 border-t border-white/10 flex justify-between items-center text-xs text-white/40">
      <span>{{ todos.filter(t => !t.done).length }} pending</span>
      <span>{{ todos.filter(t => t.done).length }} done</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { setAPIKey, hasAPIKey } from './api/client'

const todos = ref([])
const countdowns = ref([])
const showAddTodo = ref(false)
const showSettings = ref(false)
const newTodoContent = ref('')
const newTodoPriority = ref('medium')
const apiKeyInput = ref('')
const positionMode = ref('free')
const opacity = ref(95)
const loading = ref(false)
const error = ref(null)

// Computed
const pinnedTodos = computed(() => todos.value.filter(t => t.pinned && !t.done))
const regularTodos = computed(() => todos.value.filter(t => !t.pinned || t.done))
const pinnedCountdowns = computed(() => countdowns.value.filter(c => c.pinned))
const regularCountdowns = computed(() => countdowns.value.filter(c => !c.pinned))

// Methods
const priorityClass = (p) => ({
  'bg-red-500/30 text-red-300': p === 'high',
  'bg-yellow-500/30 text-yellow-300': p === 'medium',
  'bg-green-500/30 text-green-300': p === 'low'
})

const priorityLabel = (p) => p === 'high' ? 'H' : p === 'medium' ? 'M' : 'L'

const getDaysLeft = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

const formatDate = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getCountdownColor = (date) => {
  const days = getDaysLeft(date)
  if (days < 0) return 'text-red-400'
  if (days <= 3) return 'text-orange-400'
  if (days <= 7) return 'text-yellow-400'
  return 'text-blue-400'
}

const getCountdownProgressColor = (date) => {
  const days = getDaysLeft(date)
  if (days < 0) return 'bg-red-500'
  if (days <= 3) return 'bg-orange-500'
  if (days <= 7) return 'bg-yellow-500'
  return 'bg-blue-500'
}

const getCountdownProgress = (date) => {
  const days = getDaysLeft(date)
  const total = 30 // Show progress for 30 days
  if (days < 0) return 100
  return Math.max(0, Math.min(100, ((total - days) / total) * 100))
}

const fetchData = async () => {
  if (!hasAPIKey()) {
    error.value = 'Please set your API key in settings'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const [todosRes, cdsRes] = await Promise.all([
      api.get('/api/todos'),
      api.get('/api/countdowns')
    ])
    todos.value = todosRes.data.data || todosRes.data
    countdowns.value = cdsRes.data.data || cdsRes.data
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to fetch data'
    console.error(e)
  } finally {
    loading.value = false
  }
}

const addTodo = async () => {
  if (!newTodoContent.value.trim()) return
  
  try {
    const res = await api.post('/api/todos', { 
      content: newTodoContent.value.trim(), 
      priority: newTodoPriority.value 
    })
    const newTodo = res.data.data || res.data
    todos.value.unshift(newTodo)
    newTodoContent.value = ''
    showAddTodo.value = false
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to add todo'
  }
}

const toggleTodo = async (id) => {
  try {
    const res = await api.patch(`/api/todos/${id}/toggle`)
    const updated = res.data.data || res.data
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) todos.value[idx] = updated
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to toggle'
  }
}

const pinTodo = async (id) => {
  try {
    const res = await api.patch(`/api/todos/${id}/pin`)
    const updated = res.data.data || res.data
    const idx = todos.value.findIndex(t => t.id === id)
    if (idx !== -1) todos.value[idx] = updated
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to pin'
  }
}

const saveApiKey = () => {
  if (apiKeyInput.value.trim()) {
    setAPIKey(apiKeyInput.value.trim())
    apiKeyInput.value = ''
    showSettings.value = false
    fetchData()
  }
}

const updatePosition = () => {
  // Position mode is handled by Tauri window API
  // This would require Tauri invoke calls
  localStorage.setItem('memo_position', positionMode.value)
}

const updateOpacity = () => {
  // Opacity would be handled by Tauri
  localStorage.setItem('memo_opacity', opacity.value)
}

onMounted(() => {
  positionMode.value = localStorage.getItem('memo_position') || 'free'
  opacity.value = parseInt(localStorage.getItem('memo_opacity')) || 95
  fetchData()
})
</script>

<style scoped>
.drag-region { 
  -webkit-app-region: drag; 
}
.no-drag { 
  -webkit-app-region: no-drag; 
}

/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Transitions */
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
