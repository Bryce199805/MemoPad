import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const apiKey = ref(localStorage.getItem('memo_api_key') || '')
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref(null)
  const initialized = ref(false)

  // Computed
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Actions
  async function login(username, password) {
    loading.value = true
    error.value = null
    
    try {
      const res = await api.post('/api/auth/login', { username, password })
      const data = res.data.data
      
      apiKey.value = data.api_key
      user.value = data.user
      isAuthenticated.value = true
      initialized.value = true

      localStorage.setItem('memo_api_key', data.api_key)

      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(username, password, email = '') {
    loading.value = true
    error.value = null

    try {
      const res = await api.post('/api/auth/register', {
        username,
        password,
        email: email || undefined
      })
      const data = res.data.data

      apiKey.value = data.api_key
      user.value = data.user
      isAuthenticated.value = true
      initialized.value = true

      localStorage.setItem('memo_api_key', data.api_key)
      
      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Registration failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function verifyAuth() {
    if (!apiKey.value) {
      initialized.value = true
      return false
    }

    loading.value = true
    
    try {
      const res = await api.get('/api/auth/verify')
      if (res.data.success && res.data.data?.valid) {
        user.value = res.data.data.user
        isAuthenticated.value = true
        initialized.value = true
        return true
      }
    } catch (e) {
      // Token invalid
      logout()
    } finally {
      loading.value = false
      initialized.value = true
    }
    
    return false
  }

  function logout() {
    user.value = null
    apiKey.value = ''
    isAuthenticated.value = false
    localStorage.removeItem('memo_api_key')
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    user,
    apiKey,
    isAuthenticated,
    loading,
    error,
    initialized,
    isAdmin,
    // Actions
    login,
    register,
    verifyAuth,
    logout,
    clearError
  }
})
