<template>
  <div 
    class="app-window"
    :style="{
      background: `linear-gradient(135deg, rgba(10, 10, 10, ${opacity/100}) 0%, rgba(20, 20, 20, ${opacity/100}) 50%, rgba(10, 10, 10, ${opacity/100}) 100%)`
    }"
  >
    <!-- Login Screen -->
    <div v-if="!store.isConnected" class="login-screen">
      <div class="login-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1>MemoDesk</h1>
      <p class="login-subtitle">Connect to your server</p>

      <form @submit.prevent="handleConnect" class="login-form">
        <input
          v-model="store.serverUrl"
          type="text"
          placeholder="Server URL (e.g., http://localhost:3000)"
        />
        <input
          v-model="store.apiKey"
          type="password"
          placeholder="API Key"
        />
        
        <p v-if="store.error" class="error-msg">{{ store.error }}</p>
        
        <button type="submit" :disabled="store.loading" class="connect-btn">
          <span v-if="store.loading" class="spinner"></span>
          <span v-else>Connect</span>
        </button>
      </form>
    </div>

    <!-- Main App -->
    <template v-else>
      <!-- Header -->
      <header class="app-header" data-tauri-drag-region>
        <div class="header-left">
          <div class="app-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span class="app-title">MemoDesk</span>
        </div>
        
        <div class="header-actions" data-tauri-drag-region>
          <button class="header-btn" @click="showSettings = !showSettings" title="Settings">
            ⚙️
          </button>
          <button class="header-btn minimize" @click="minimizeWindow" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Settings Panel -->
      <Transition name="slide">
        <div v-if="showSettings" class="settings-panel">
          <div class="setting-row">
            <label>Opacity</label>
            <input type="range" min="60" max="100" :value="store.opacity" @input="store.setOpacity($event.target.value)">
          </div>
          <div class="setting-row">
            <label>Always on Top</label>
            <button 
              class="toggle-btn"
              :class="{ active: store.alwaysOnTop }"
              @click="toggleAlwaysOnTop"
            >{{ store.alwaysOnTop ? 'ON' : 'OFF' }}</button>
          </div>
          <button class="disconnect-btn" @click="handleDisconnect">Disconnect</button>
        </div>
      </Transition>

      <!-- Quick Add -->
      <div class="quick-add">
        <input
          v-model="newTodo"
          @keyup.enter="addTodo"
          placeholder="Add a task..."
        />
        <select v-model="newPriority">
          <option value="high">H</option>
          <option value="medium">M</option>
          <option value="low">L</option>
        </select>
        <button class="add-btn" @click="addTodo">+</button>
      </div>

      <!-- Content -->
      <div class="app-content custom-scrollbar">
        <!-- Pinned -->
        <div v-if="store.pinnedTodos.length > 0" class="section">
          <div class="section-title">📌 Pinned</div>
          <TodoCard
            v-for="todo in store.pinnedTodos"
            :key="todo.id"
            :todo="todo"
            @toggle="store.toggleTodo"
            @pin="store.pinTodo"
          />
        </div>

        <!-- Tasks -->
        <div class="section">
          <div v-if="store.pinnedTodos.length > 0" class="section-title">Tasks</div>
          <TodoCard
            v-for="todo in store.regularTodos"
            :key="todo.id"
            :todo="todo"
            @toggle="store.toggleTodo"
            @pin="store.pinTodo"
          />
        </div>

        <!-- Empty -->
        <div v-if="store.todos.length === 0 && !store.loading" class="empty-state">
          <div class="empty-icon">📝</div>
          <p>No tasks yet</p>
        </div>

        <!-- Loading -->
        <div v-if="store.loading" class="loading-state">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="app-footer">
        <span>{{ store.pendingCount }} pending</span>
        <span>{{ store.doneCount }} done</span>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useAppStore } from './stores/app'
import TodoCard from './components/TodoCard.vue'

const store = useAppStore()
const showSettings = ref(false)
const newTodo = ref('')
const newPriority = ref('medium')

async function handleConnect() {
  await store.connect()
}

function handleDisconnect() {
  store.disconnect()
  showSettings.value = false
}

async function addTodo() {
  if (!newTodo.value.trim()) return
  await store.addTodo(newTodo.value.trim(), newPriority.value)
  newTodo.value = ''
}

async function minimizeWindow() {
  const window = getCurrentWindow()
  await window.hide()
}

async function toggleAlwaysOnTop() {
  const newVal = !store.alwaysOnTop
  store.setAlwaysOnTop(newVal)
  const window = getCurrentWindow()
  await window.setAlwaysOnTop(newVal)
}

onMounted(async () => {
  // Apply saved settings
  if (store.alwaysOnTop) {
    const window = getCurrentWindow()
    await window.setAlwaysOnTop(true)
  }
  
  // Auto-connect if API key exists
  if (store.apiKey) {
    await store.connect()
  }
})
</script>

<style scoped>
.app-window {
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Login */
.login-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.login-logo {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.login-logo svg {
  width: 32px;
  height: 32px;
  color: white;
}

.login-screen h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.login-subtitle {
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  margin-bottom: 32px;
}

.login-form {
  width: 100%;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form input {
  padding: 14px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: white;
  font-size: 14px;
}

.login-form input::placeholder {
  color: rgba(255,255,255,0.3);
}

.error-msg {
  color: #f87171;
  font-size: 13px;
  text-align: center;
}

.connect-btn {
  padding: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-logo {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-logo svg {
  width: 16px;
  height: 16px;
  color: white;
}

.app-title {
  font-weight: 600;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  transition: all 0.15s;
}

.header-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.header-btn svg {
  width: 14px;
  height: 14px;
}

/* Settings */
.settings-panel {
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-row label {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
}

.setting-row input[type="range"] {
  width: 100px;
  accent-color: #6366f1;
}

.toggle-btn {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
}

.toggle-btn.active {
  background: #6366f1;
  color: white;
}

.disconnect-btn {
  padding: 10px;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #f87171;
  font-size: 13px;
  font-weight: 500;
}

/* Quick Add */
.quick-add {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.quick-add input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: white;
  font-size: 13px;
}

.quick-add input::placeholder {
  color: rgba(255,255,255,0.3);
}

.quick-add select {
  width: 40px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: white;
  font-size: 12px;
  text-align: center;
}

.add-btn {
  width: 40px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
  color: white;
  font-size: 18px;
  font-weight: 600;
}

/* Content */
.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

/* Empty & Loading */
.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
  opacity: 0.3;
  margin-bottom: 8px;
}

.empty-state p {
  color: rgba(255,255,255,0.4);
  font-size: 14px;
}

/* Footer */
.app-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}

/* Transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
