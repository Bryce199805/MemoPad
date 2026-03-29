<template>
  <div class="app">
    <!-- Loading Screen -->
    <div v-if="!authStore.initialized" class="loading-screen">
      <div class="logo-loader">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p>Loading...</p>
    </div>

    <!-- Main Content -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useTodoStore } from './stores/todo'
import { useCountdownStore } from './stores/countdown'
import { useCategoryStore } from './stores/category'
import wsService from './api/websocket'

const router = useRouter()
const authStore = useAuthStore()
const todoStore = useTodoStore()
const countdownStore = useCountdownStore()
const categoryStore = useCategoryStore()

// Handle auth invalidation from API interceptor
const handleAuthInvalid = () => {
  authStore.logout()
  router.push('/login')
}

// Initialize WebSocket connection when authenticated
const initWebSocket = () => {
  const apiKey = localStorage.getItem('memo_api_key')
  if (apiKey && authStore.isAuthenticated) {
    wsService.connect(apiKey)
    todoStore.subscribeToUpdates()
    countdownStore.subscribeToUpdates()
    categoryStore.subscribeToUpdates()
  }
}

// Watch for authentication changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    initWebSocket()
  } else {
    // Clean up all WS subscriptions before disconnecting
    todoStore.unsubscribeFromUpdates()
    countdownStore.unsubscribeFromUpdates()
    categoryStore.unsubscribeFromUpdates()
    wsService.disconnect()
  }
})

onMounted(() => {
  window.addEventListener('auth:invalid', handleAuthInvalid)
  
  // Initialize WebSocket if already authenticated
  if (authStore.isAuthenticated) {
    initWebSocket()
  }
})

onUnmounted(() => {
  window.removeEventListener('auth:invalid', handleAuthInvalid)
  wsService.disconnect()
})
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--bg-primary);
}

.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.logo-loader {
  width: 48px;
  height: 48px;
  padding: 12px;
  background: var(--accent-gradient);
  border-radius: var(--radius-lg);
  animation: pulse 1.5s infinite;
}

.logo-loader svg {
  width: 100%;
  height: 100%;
  color: white;
}

.loading-screen p {
  color: var(--text-secondary);
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
}
</style>
