<template>
  <div
    class="app-window"
    :class="['font-' + store.fontColor]"
    :style="{
      background: store.transparentBackground
        ? `rgba(10, 10, 10, ${opacity/100})`
        : `linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.95) 50%, rgba(10, 10, 10, 0.95) 100%)`,
      backdropFilter: store.transparentBackground ? 'blur(20px)' : 'none'
    }"
  >
    <!-- Login Screen -->
    <div v-if="!store.isConnected" class="login-screen" data-tauri-drag-region>
      <div class="login-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1>MemoDesk</h1>
      <p class="login-subtitle">Sign in to your account</p>

      <form @submit.prevent="handleLogin" class="login-form" @mousedown.stop @click.stop>
        <input v-model="loginUsername" type="text" placeholder="Username" autocomplete="username" />
        <div class="password-field">
          <input v-model="loginPassword" :type="showPassword ? 'text' : 'password'" placeholder="Password" autocomplete="current-password" />
          <button type="button" class="eye-btn" @click="showPassword = !showPassword">
            {{ showPassword ? '🙈' : '👁' }}
          </button>
        </div>
        <p v-if="store.error" class="error-msg">{{ store.error }}</p>
        <button type="submit" :disabled="store.loading" class="connect-btn">
          <span v-if="store.loading" class="spinner"></span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <!-- Advanced Settings -->
      <div class="advanced-toggle" @mousedown.stop @click="showAdvanced = !showAdvanced">
        <span>Advanced Settings</span>
        <span class="toggle-arrow" :class="{ expanded: showAdvanced }">›</span>
      </div>
      <div v-if="showAdvanced" class="advanced-section" @mousedown.stop>
        <div class="login-form">
          <input v-model="store.serverUrl" type="text" placeholder="Server URL (e.g., https://your-domain.com)" />
          <input v-model="store.apiKey" type="password" placeholder="API Key" />
          <button type="button" class="test-btn" :disabled="testing" @click="testConnection">
            <span v-if="testing" class="spinner"></span>
            <span v-else>Test Connection</span>
          </button>
          <p v-if="testResult" class="test-result" :class="testResult.type">{{ testResult.msg }}</p>
        </div>
      </div>
    </div>

    <!-- Main App -->
    <template v-else>
      <!-- Header -->
      <header class="app-header" data-tauri-drag-region>
        <div class="header-left" data-tauri-drag-region>
          <div class="app-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span class="app-title">MemoDesk</span>
        </div>

        <div class="header-actions">
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
            <label>Transparent BG</label>
            <button
              class="toggle-btn"
              :class="{ active: store.transparentBackground }"
              @click="store.setTransparentBackground(!store.transparentBackground)"
            >{{ store.transparentBackground ? 'ON' : 'OFF' }}</button>
          </div>
          <div class="setting-row">
            <label>Always on Top</label>
            <button
              class="toggle-btn"
              :class="{ active: store.alwaysOnTop }"
              @click="toggleAlwaysOnTop"
            >{{ store.alwaysOnTop ? 'ON' : 'OFF' }}</button>
          </div>
          <div class="setting-row">
            <label>Text Color</label>
            <select class="color-select" :value="store.fontColor" @change="store.setFontColor($event.target.value)">
              <option value="white">White</option>
              <option value="light">Light Gray</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <button class="logout-btn" @click="handleLogout">Logout</button>
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

        <!-- Countdowns -->
        <div v-if="store.countdowns.length > 0" class="section">
          <div class="section-title">⏳ Countdowns</div>
          <div v-for="cd in store.countdowns" :key="cd.id" class="countdown-card">
            <div class="countdown-info">
              <span class="countdown-title">{{ cd.title }}</span>
              <span class="countdown-days" :class="daysClass(cd.target_date)">{{ daysLeft(cd.target_date) }}</span>
            </div>
          </div>
        </div>

        <!-- Tasks -->
        <div class="section">
          <div v-if="store.pinnedTodos.length > 0 || store.countdowns.length > 0" class="section-title">Tasks</div>
          <TodoCard
            v-for="todo in store.regularTodos"
            :key="todo.id"
            :todo="todo"
            @toggle="store.toggleTodo"
            @pin="store.pinTodo"
          />
        </div>

        <!-- Empty -->
        <div v-if="store.todos.length === 0 && store.countdowns.length === 0 && !store.loading" class="empty-state">
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
const loginUsername = ref('')
const loginPassword = ref('')
const showPassword = ref(false)
const showAdvanced = ref(!store.serverUrl || !store.apiKey)
const testing = ref(false)
const testResult = ref(null)

async function handleLogin() {
  await store.loginWithPassword(loginUsername.value, loginPassword.value)
}

function handleLogout() {
  store.disconnect()
  showSettings.value = false
  loginUsername.value = ''
  loginPassword.value = ''
}

async function addTodo() {
  if (!newTodo.value.trim()) return
  const ok = await store.addTodo(newTodo.value.trim(), newPriority.value)
  if (ok) newTodo.value = ''
}

async function testConnection() {
  if (!store.serverUrl.trim()) {
    testResult.value = { type: 'error', msg: 'Server URL is required' }
    return
  }
  testing.value = true
  testResult.value = null
  try {
    const url = store.serverUrl.replace(/\/+$/, '')
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      testResult.value = { type: 'success', msg: 'Connected!' }
    } else {
      testResult.value = { type: 'error', msg: `Server responded with ${res.status}` }
    }
  } catch (e) {
    testResult.value = { type: 'error', msg: 'Cannot connect to server' }
  } finally {
    testing.value = false
  }
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

function daysLeft(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d left`
}

function daysClass(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'soon'
  return ''
}

onMounted(async () => {
  if (store.alwaysOnTop) {
    const window = getCurrentWindow()
    await window.setAlwaysOnTop(true)
  }

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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: transparent;
  user-select: none;
}

/* Font colors */
.font-white { color: white; }
.font-light { color: rgba(255,255,255,0.8); }
.font-dark { color: rgba(255,255,255,0.9); }

/* Login */
.login-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #0f0f0f;
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
  color: white;
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
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: white;
  font-size: 14px;
}

.login-form input::placeholder {
  color: rgba(255,255,255,0.3);
}

.password-field {
  position: relative;
}

.password-field input {
  width: 100%;
  padding-right: 44px;
}

.eye-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  font-size: 16px;
  padding: 4px;
  line-height: 1;
}

.error-msg {
  color: #f87171;
  font-size: 13px;
  text-align: center;
}

.test-result.success {
  color: #4ade80;
  font-size: 12px;
  text-align: center;
}

.test-result.error {
  color: #f87171;
  font-size: 12px;
  text-align: center;
}

.connect-btn, .test-btn {
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

.test-btn {
  background: rgba(255,255,255,0.08);
  padding: 10px;
  font-size: 13px;
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

/* Advanced */
.advanced-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 280px;
  margin-top: 16px;
  padding: 10px 0;
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
}

.toggle-arrow {
  transition: transform 0.2s;
  font-size: 16px;
}

.toggle-arrow.expanded {
  transform: rotate(90deg);
}

.advanced-section {
  width: 100%;
  max-width: 280px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
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
  border-bottom: 1px solid rgba(255,255,255,0.06);
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
  color: rgba(255,255,255,0.6);
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

.color-select {
  padding: 4px 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  color: white;
  font-size: 12px;
}

.logout-btn {
  padding: 10px;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 8px;
  color: #f87171;
  font-size: 13px;
  font-weight: 500;
  margin-top: 4px;
}

/* Quick Add */
.quick-add {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.quick-add input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255,255,255,0.06);
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
  background: rgba(255,255,255,0.06);
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
  flex-shrink: 0;
}

/* Countdown Card */
.countdown-card {
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  margin-bottom: 6px;
}

.countdown-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.countdown-title {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
}

.countdown-days {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
}

.countdown-days.overdue {
  color: #f87171;
}

.countdown-days.soon {
  color: #fbbf24;
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
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}

/* Scrollbar */
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
  transition: all 0.15s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
