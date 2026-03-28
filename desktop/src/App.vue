<template>
  <div
    class="app-window"
    :class="['theme-' + store.theme]"
    :style="appStyle"
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
            <label>Theme</label>
            <select class="theme-select" :value="store.theme" @change="store.setTheme($event.target.value)">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="transparent">Glass</option>
            </select>
          </div>
          <button class="logout-btn" @click="handleLogout">Logout</button>
        </div>
      </Transition>

      <!-- Quick Add -->
      <div class="quick-add-wrapper">
        <button v-if="!showAddMenu" class="quick-add-toggle" @click="showAddMenu = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <div v-else class="quick-add-expanded">
          <div class="add-type-tabs">
            <button :class="{ active: addType === 'task' }" @click="addType = 'task'">Task</button>
            <button :class="{ active: addType === 'countdown' }" @click="addType = 'countdown'">Countdown</button>
            <button class="close-add" @click="showAddMenu = false">×</button>
          </div>
          <div v-if="addType === 'task'" class="add-form">
            <input v-model="newTodo" @keyup.enter="addTodo" placeholder="Add a task..." />
            <select v-model="newPriority">
              <option value="high">H</option>
              <option value="medium">M</option>
              <option value="low">L</option>
            </select>
            <button class="add-btn" @click="addTodo">+</button>
          </div>
          <div v-else class="add-form countdown-form">
            <input v-model="newCountdownTitle" placeholder="Countdown title..." class="cd-title-input" />
            <input v-model="newCountdownDate" type="date" class="cd-date-input" />
            <button class="add-btn" @click="addCountdown">+</button>
          </div>
        </div>
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

        <!-- Done -->
        <div v-if="store.doneTodos.length > 0" class="section">
          <div class="section-title done-title" @click="showDone = !showDone">
            <span>{{ showDone ? '▼' : '▶' }}</span>
            <span>Done ({{ store.doneCount }})</span>
          </div>
          <div v-if="showDone">
            <TodoCard
              v-for="todo in store.doneTodos"
              :key="todo.id"
              :todo="todo"
              @toggle="store.toggleTodo"
              @pin="store.pinTodo"
            />
          </div>
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
import { ref, onMounted, computed } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useAppStore } from './stores/app'
import TodoCard from './components/TodoCard.vue'

const store = useAppStore()
const showSettings = ref(false)
const newTodo = ref('')
const newPriority = ref('medium')
const showAddMenu = ref(false)
const addType = ref('task')
const newCountdownTitle = ref('')
const newCountdownDate = ref('')
const showDone = ref(false)
const loginUsername = ref('')
const loginPassword = ref('')
const showPassword = ref(false)
const showAdvanced = ref(!store.serverUrl || !store.apiKey)
const testing = ref(false)
const testResult = ref(null)

const appStyle = computed(() => {
  if (store.theme === 'transparent' || store.transparentBackground) {
    return {
      background: `rgba(10, 10, 10, ${store.opacity / 100})`,
      backdropFilter: 'blur(20px)'
    }
  }
  return {}
})

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

async function addCountdown() {
  if (!newCountdownTitle.value.trim() || !newCountdownDate.value) return
  const ok = await store.addCountdown(
    newCountdownTitle.value.trim(),
    newCountdownDate.value
  )
  if (ok) {
    newCountdownTitle.value = ''
    newCountdownDate.value = ''
    showAddMenu.value = false
  }
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
  try {
    await getCurrentWindow().setAlwaysOnTop(newVal)
  } catch (e) {
    console.warn('Failed to set always on top:', e)
  }
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
    try {
      await getCurrentWindow().setAlwaysOnTop(true)
    } catch (e) {
      console.warn('Failed to set always on top:', e)
    }
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
}

/* Theme: Dark */
.theme-dark {
  background: #111111;
  color: white;
}
.theme-dark .login-screen { background: #0f0f0f; }
.theme-dark .login-screen h1 { color: white; }
.theme-dark .login-subtitle { color: rgba(255,255,255,0.5); }
.theme-dark .login-form input { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: white; }
.theme-dark .login-form input::placeholder { color: rgba(255,255,255,0.3); }
.theme-dark .advanced-toggle { color: rgba(255,255,255,0.4); }
.theme-dark .advanced-section { border-color: rgba(255,255,255,0.08); }
.theme-dark .eye-btn { color: rgba(255,255,255,0.6); }
.theme-dark .error-msg { color: #f87171; }
.theme-dark .test-result.success { color: #4ade80; }
.theme-dark .test-result.error { color: #f87171; }
.theme-dark .connect-btn, .theme-dark .test-btn { color: white; }
.theme-dark .test-btn { background: rgba(255,255,255,0.08); }
.theme-dark .spinner { border-color: rgba(255,255,255,0.3); border-top-color: white; }
.theme-dark .app-header { border-color: rgba(255,255,255,0.06); }
.theme-dark .app-title { color: white; }
.theme-dark .header-btn { color: rgba(255,255,255,0.5); }
.theme-dark .header-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.theme-dark .settings-panel { border-color: rgba(255,255,255,0.06); }
.theme-dark .setting-row label { color: rgba(255,255,255,0.6); }
.theme-dark .toggle-btn { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
.theme-dark .theme-select { background: rgba(255,255,255,0.1); color: white; }
.theme-dark .logout-btn { background: rgba(239, 68, 68, 0.15); }
.theme-dark .quick-add-wrapper { border-color: rgba(255,255,255,0.06); }
.theme-dark .quick-add-toggle { color: rgba(255,255,255,0.3); }
.theme-dark .quick-add-toggle:hover { color: rgba(255,255,255,0.6); }
.theme-dark .add-type-tabs button { color: rgba(255,255,255,0.4); }
.theme-dark .add-type-tabs button.active { color: white; background: rgba(255,255,255,0.1); }
.theme-dark .add-type-tabs .close-add { color: rgba(255,255,255,0.3); }
.theme-dark .add-form input, .theme-dark .add-form select { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: white; }
.theme-dark .add-form input::placeholder { color: rgba(255,255,255,0.3); }
.theme-dark :deep(.todo-card) { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); }
.theme-dark :deep(.todo-card:hover) { border-color: rgba(255,255,255,0.1); }
.theme-dark :deep(.todo-card.pinned) { border-color: rgba(251, 146, 60, 0.3); background: linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, transparent 100%); }
.theme-dark :deep(.todo-text) { color: rgba(255,255,255,0.9); }
.theme-dark :deep(.todo-text.done) { color: rgba(255,255,255,0.4); }
.theme-dark :deep(.checkbox) { border-color: rgba(255,255,255,0.3); }
.theme-dark :deep(.pin-btn) { color: rgba(255,255,255,0.5); }
.theme-dark .countdown-card { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.06); }
.theme-dark .countdown-title { color: rgba(255,255,255,0.9); }
.theme-dark .countdown-days { color: rgba(255,255,255,0.6); }
.theme-dark .section-title { color: rgba(255,255,255,0.4); }
.theme-dark .empty-state p { color: rgba(255,255,255,0.4); }
.theme-dark .app-footer { border-color: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4); }
.theme-dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

/* Theme: Light */
.theme-light {
  background: #f5f5f5;
  color: #333;
}
.theme-light .login-screen { background: #ffffff; }
.theme-light .login-screen h1 { color: #111; }
.theme-light .login-subtitle { color: #999; }
.theme-light .login-form input { background: #f0f0f0; border-color: #e0e0e0; color: #333; }
.theme-light .login-form input::placeholder { color: #aaa; }
.theme-light .advanced-toggle { color: #999; }
.theme-light .advanced-section { border-color: #e0e0e0; }
.theme-light .eye-btn { color: #999; }
.theme-light .error-msg { color: #dc2626; }
.theme-light .test-result.success { color: #16a34a; }
.theme-light .test-result.error { color: #dc2626; }
.theme-light .connect-btn, .theme-light .test-btn { color: white; }
.theme-light .test-btn { background: rgba(0,0,0,0.06); }
.theme-light .spinner { border-color: rgba(0,0,0,0.15); border-top-color: white; }
.theme-light .app-header { border-color: #e0e0e0; }
.theme-light .app-title { color: #333; }
.theme-light .header-btn { color: #999; }
.theme-light .header-btn:hover { background: #e8e8e8; color: #333; }
.theme-light .settings-panel { border-color: #e0e0e0; }
.theme-light .setting-row label { color: #666; }
.theme-light .toggle-btn { background: #e0e0e0; color: #888; }
.theme-light .toggle-btn.active { background: #6366f1; color: white; }
.theme-light .theme-select { background: #e0e0e0; color: #333; }
.theme-light .logout-btn { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.theme-light .quick-add-wrapper { border-color: #e0e0e0; }
.theme-light .quick-add-toggle { color: #999; }
.theme-light .quick-add-toggle:hover { color: #666; }
.theme-light .add-type-tabs button { color: #999; }
.theme-light .add-type-tabs button.active { color: #333; background: #e0e0e0; }
.theme-light .add-type-tabs .close-add { color: #999; }
.theme-light .add-form input, .theme-light .add-form select { background: #f0f0f0; border-color: #e0e0e0; color: #333; }
.theme-light .add-form input::placeholder { color: #aaa; }
.theme-light :deep(.todo-card) { background: rgba(0,0,0,0.03); border-color: #e0e0e0; }
.theme-light :deep(.todo-card:hover) { border-color: #ccc; }
.theme-light :deep(.todo-card.pinned) { border-color: rgba(251, 146, 60, 0.4); background: linear-gradient(135deg, rgba(251, 146, 60, 0.06) 0%, transparent 100%); }
.theme-light :deep(.todo-text) { color: #333; }
.theme-light :deep(.todo-text.done) { color: #999; }
.theme-light :deep(.checkbox) { border-color: #ccc; }
.theme-light :deep(.pin-btn) { color: #999; }
.theme-light .countdown-card { background: rgba(0,0,0,0.03); border-color: #e0e0e0; }
.theme-light .countdown-title { color: #333; }
.theme-light .countdown-days { color: #999; }
.theme-light .section-title { color: #999; }
.theme-light .empty-state p { color: #999; }
.theme-light .app-footer { border-color: #e0e0e0; color: #999; }
.theme-light .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); }

/* Theme: Glass (transparent) */
.theme-transparent {
  background: rgba(10, 10, 10, 0.75);
  color: white;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.theme-transparent .login-screen { background: transparent; }
.theme-transparent .login-screen h1 { color: white; }
.theme-transparent .login-subtitle { color: rgba(255,255,255,0.5); }
.theme-transparent .login-form input { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); color: white; }
.theme-transparent .login-form input::placeholder { color: rgba(255,255,255,0.3); }
.theme-transparent .advanced-toggle { color: rgba(255,255,255,0.4); }
.theme-transparent .advanced-section { border-color: rgba(255,255,255,0.08); }
.theme-transparent .eye-btn { color: rgba(255,255,255,0.6); }
.theme-transparent .error-msg { color: #f87171; }
.theme-transparent .test-result.success { color: #4ade80; }
.theme-transparent .test-result.error { color: #f87171; }
.theme-transparent .connect-btn, .theme-transparent .test-btn { color: white; }
.theme-transparent .test-btn { background: rgba(255,255,255,0.08); }
.theme-transparent .spinner { border-color: rgba(255,255,255,0.3); border-top-color: white; }
.theme-transparent .app-header { border-color: rgba(255,255,255,0.08); }
.theme-transparent .app-title { color: white; }
.theme-transparent .header-btn { color: rgba(255,255,255,0.5); }
.theme-transparent .header-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.theme-transparent .settings-panel { border-color: rgba(255,255,255,0.08); }
.theme-transparent .setting-row label { color: rgba(255,255,255,0.6); }
.theme-transparent .toggle-btn { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
.theme-transparent .theme-select { background: rgba(255,255,255,0.1); color: white; }
.theme-transparent .logout-btn { background: rgba(239, 68, 68, 0.15); }
.theme-transparent .quick-add-wrapper { border-color: rgba(255,255,255,0.08); }
.theme-transparent .quick-add-toggle { color: rgba(255,255,255,0.3); }
.theme-transparent .quick-add-toggle:hover { color: rgba(255,255,255,0.6); }
.theme-transparent .add-type-tabs button { color: rgba(255,255,255,0.4); }
.theme-transparent .add-type-tabs button.active { color: white; background: rgba(255,255,255,0.1); }
.theme-transparent .add-type-tabs .close-add { color: rgba(255,255,255,0.3); }
.theme-transparent .add-form input, .theme-transparent .add-form select { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); color: white; }
.theme-transparent .add-form input::placeholder { color: rgba(255,255,255,0.3); }
.theme-transparent :deep(.todo-card) { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
.theme-transparent :deep(.todo-card:hover) { border-color: rgba(255,255,255,0.15); }
.theme-transparent :deep(.todo-card.pinned) { border-color: rgba(251, 146, 60, 0.3); background: linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, transparent 100%); }
.theme-transparent :deep(.todo-text) { color: rgba(255,255,255,0.9); }
.theme-transparent :deep(.todo-text.done) { color: rgba(255,255,255,0.4); }
.theme-transparent :deep(.checkbox) { border-color: rgba(255,255,255,0.3); }
.theme-transparent :deep(.pin-btn) { color: rgba(255,255,255,0.5); }
.theme-transparent .countdown-card { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
.theme-transparent .countdown-title { color: rgba(255,255,255,0.9); }
.theme-transparent .countdown-days { color: rgba(255,255,255,0.6); }
.theme-transparent .section-title { color: rgba(255,255,255,0.4); }
.theme-transparent .empty-state p { color: rgba(255,255,255,0.4); }
.theme-transparent .app-footer { border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
.theme-transparent .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }

/* Login */
.login-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 32px;
  overflow-y: auto;
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
  border-radius: 12px;
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
  font-size: 13px;
  text-align: center;
}

.test-result.success {
  font-size: 12px;
  text-align: center;
}

.test-result.error {
  font-size: 12px;
  text-align: center;
}

.connect-btn, .test-btn {
  padding: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.test-btn {
  padding: 10px;
  font-size: 13px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
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
}

.header-btn svg {
  width: 14px;
  height: 14px;
}

/* Settings */
.settings-panel {
  padding: 16px;
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
}

.setting-row input[type="range"] {
  width: 100px;
  accent-color: #6366f1;
}

.toggle-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.toggle-btn.active {
  background: #6366f1;
  color: white;
}

.theme-select {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.logout-btn {
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-top: 4px;
}

/* Quick Add */
.quick-add-wrapper {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.quick-add-toggle {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
}

.quick-add-toggle svg {
  width: 18px;
  height: 18px;
}

.quick-add-expanded {
  padding: 8px 16px 12px;
}

.add-type-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.add-type-tabs button {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  background: none;
}

.add-type-tabs .close-add {
  margin-left: auto;
  font-size: 16px;
  padding: 4px 8px;
}

.add-form {
  display: flex;
  gap: 8px;
}

.add-form input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.add-form input::placeholder {
  color: rgba(255,255,255,0.3);
}

.add-form select {
  width: 40px;
  border-radius: 10px;
  font-size: 12px;
  text-align: center;
}

.countdown-form .cd-date-input {
  flex: 0 0 120px;
}
.countdown-form .cd-title-input {
  flex: 1;
}

.add-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
  cursor: pointer;
}

.add-btn:active {
  opacity: 0.8;
}

/* Countdown Card */
.countdown-card {
  padding: 10px 14px;
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
}

.countdown-days {
  font-size: 12px;
  font-weight: 600;
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
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.done-title {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.done-title:hover {
  opacity: 0.8;
}

.done-title span:first-child {
  font-size: 8px;
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
  font-size: 14px;
}

/* Footer */
.app-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  font-size: 12px;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
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
