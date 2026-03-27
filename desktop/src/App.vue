<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-white/10 drag-region">
      <span class="text-sm font-semibold text-white/80">MemoDesk</span>
      <div class="flex gap-2">
        <button @click="showAddTodo = !showAddTodo" class="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white no-drag">+ Todo</button>
        <button @click="showSettings = !showSettings" class="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white no-drag">⚙</button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-2 space-y-2">
      <!-- Quick Add Todo -->
      <div v-if="showAddTodo" class="flex gap-1">
        <input v-model="newTodoContent" @keyup.enter="addTodo" placeholder="New todo..." class="flex-1 text-sm px-2 py-1 rounded bg-white/10 text-white placeholder-white/50 border-none outline-none" />
        <select v-model="newTodoPriority" class="text-xs px-1 py-1 rounded bg-white/10 text-white">
          <option value="high">H</option>
          <option value="medium">M</option>
          <option value="low">L</option>
        </select>
        <button @click="addTodo" class="text-xs px-2 py-1 rounded bg-blue-500 text-white">Add</button>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="p-2 bg-white/10 rounded text-sm space-y-2">
        <div>
          <label class="text-white/60">API Key:</label>
          <input v-model="apiKeyInput" type="password" placeholder="sk-memo-..." class="w-full mt-1 text-xs px-2 py-1 rounded bg-white/10 text-white border border-white/20" />
          <button @click="saveApiKey" class="mt-1 text-xs px-2 py-1 rounded bg-green-500 text-white">Save</button>
        </div>
        <div>
          <label class="text-white/60">Position:</label>
          <select v-model="positionMode" class="w-full mt-1 text-xs px-2 py-1 rounded bg-white/10 text-white border border-white/20">
            <option value="free">Free</option>
            <option value="left">Left Edge</option>
            <option value="right">Right Edge</option>
            <option value="top">Top Edge</option>
            <option value="bottom">Bottom Edge</option>
          </select>
        </div>
      </div>

      <!-- Todo List -->
      <div v-for="todo in todos" :key="todo.id" class="flex items-center gap-2 p-2 bg-white/5 rounded group">
        <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" class="w-4 h-4 rounded" />
        <span :class="{ 'line-through text-white/40': todo.done }" class="flex-1 text-sm truncate">{{ todo.content }}</span>
        <span :class="priorityClass(todo.priority)" class="text-xs font-bold">{{ todo.priority[0].toUpperCase() }}</span>
        <button @click="pinTodo(todo.id)" class="text-xs opacity-0 group-hover:opacity-100" :class="todo.pinned ? 'text-orange-400' : 'text-white/40'">📌</button>
      </div>

      <!-- Countdown List -->
      <div v-for="cd in countdowns" :key="cd.id" class="p-2 bg-white/5 rounded">
        <div class="flex justify-between items-center">
          <span class="text-sm truncate">{{ cd.title }}</span>
          <span :class="priorityClass(cd.priority)" class="text-xs font-bold">{{ cd.priority[0].toUpperCase() }}</span>
        </div>
        <div class="text-2xl font-bold mt-1" :class="getDaysLeft(cd.target_date) < 0 ? 'text-red-400' : 'text-blue-400'">
          {{ getDaysLeft(cd.target_date) }}d
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api, { setAPIKey, hasAPIKey } from './api/client'

const todos = ref([])
const countdowns = ref([])
const showAddTodo = ref(false)
const showSettings = ref(false)
const newTodoContent = ref('')
const newTodoPriority = ref('medium')
const apiKeyInput = ref('')
const positionMode = ref('free')

const priorityClass = (p) => ({
  'text-red-400': p === 'high',
  'text-yellow-400': p === 'medium',
  'text-green-400': p === 'low'
})

const getDaysLeft = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

const fetchData = async () => {
  if (!hasAPIKey()) return
  try {
    const [todosRes, cdsRes] = await Promise.all([
      api.get('/api/todos'),
      api.get('/api/countdowns')
    ])
    todos.value = todosRes.data
    countdowns.value = cdsRes.data
  } catch (e) { console.error(e) }
}

const addTodo = async () => {
  if (!newTodoContent.value) return
  await api.post('/api/todos', { content: newTodoContent.value, priority: newTodoPriority.value })
  newTodoContent.value = ''
  showAddTodo.value = false
  fetchData()
}

const toggleTodo = async (id) => {
  await api.patch(`/api/todos/${id}/toggle`)
  fetchData()
}

const pinTodo = async (id) => {
  await api.patch(`/api/todos/${id}/pin`)
  fetchData()
}

const saveApiKey = () => {
  setAPIKey(apiKeyInput.value)
  apiKeyInput.value = ''
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.drag-region { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }
</style>
