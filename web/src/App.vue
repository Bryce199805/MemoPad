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

    <!-- Main Layout -->
    <template v-else-if="authStore.isAuthenticated">
      <DefaultLayout>
        <router-view />
      </DefaultLayout>
    </template>

    <!-- Login View -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import DefaultLayout from './layouts/DefaultLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

// Handle auth invalidation from API interceptor
const handleAuthInvalid = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  window.addEventListener('auth:invalid', handleAuthInvalid)
})

onUnmounted(() => {
  window.removeEventListener('auth:invalid', handleAuthInvalid)
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
