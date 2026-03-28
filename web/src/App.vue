<template>
  <div class="app" style="background: yellow; min-height: 100vh;">
    <h1 style="color: black; font-size: 30px; padding: 20px;">APP TEST - If you see this, Vue works!</h1>
    <p style="color: black; padding: 20px;">initialized: {{ authStore.initialized }}</p>
    <p style="color: black; padding: 20px;">isAuthenticated: {{ authStore.isAuthenticated }}</p>
    <p style="color: black; padding: 20px;">isAdmin: {{ authStore.isAdmin }}</p>
    
    <div v-if="!authStore.initialized" style="background: orange; padding: 20px;">
      Loading...
    </div>
    
    <div v-else style="background: green; padding: 20px;">
      <p style="color: white;">Auth initialized, showing router-view:</p>
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

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
}
</style>
