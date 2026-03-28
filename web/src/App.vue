<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="isInitializing" class="fixed inset-0 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 dark:text-gray-400 mt-3">Connecting...</p>
      </div>
    </div>

    <!-- Login Screen -->
    <div v-else-if="!isAuthenticated" class="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span class="text-2xl text-white">✓</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">MemoDesk</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-2">Enter your API Key to continue</p>
        </div>

        <form @submit.prevent="handleLogin">
          <input
            v-model="inputAPIKey"
            type="password"
            placeholder="sk-memo-..."
            class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            :disabled="isLoggingIn"
          />
          <p v-if="error" class="text-red-500 text-sm mt-3 text-center">{{ error }}</p>
          <button
            type="submit"
            :disabled="isLoggingIn || !inputAPIKey.trim()"
            class="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoggingIn" class="flex items-center justify-center gap-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </span>
            <span v-else>Connect</span>
          </button>
        </form>

        <p class="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
          Get your API Key from the server console or settings
        </p>
      </div>
    </div>

    <!-- Main App -->
    <template v-else>
      <!-- Mobile Header -->
      <header class="md:hidden bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div class="flex items-center justify-between px-4 py-3">
          <span class="text-xl font-bold text-gray-900 dark:text-white">MemoDesk</span>
          <div class="flex items-center gap-2">
            <select v-model="locale" @change="changeLocale" class="text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600">
              <option value="en">EN</option>
              <option value="zh">中文</option>
            </select>
            <button @click="handleLogout" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Logout">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button @click="showMobileMenu = !showMobileMenu" class="p-2 text-gray-500 dark:text-gray-400">
              {{ showMobileMenu ? '✕' : '☰' }}
            </button>
          </div>
        </div>
        <!-- Mobile Nav -->
        <nav v-if="showMobileMenu" class="border-t dark:border-gray-700">
          <router-link to="/" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" @click="showMobileMenu = false">
            {{ $t('app.dashboard') }}
          </router-link>
          <router-link to="/todos" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" @click="showMobileMenu = false">
            {{ $t('app.todos') }}
          </router-link>
          <router-link to="/countdowns" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" @click="showMobileMenu = false">
            {{ $t('app.countdowns') }}
          </router-link>
          <router-link to="/settings" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" @click="showMobileMenu = false">
            {{ $t('app.settings') }}
          </router-link>
        </nav>
      </header>

      <!-- Desktop Nav -->
      <nav class="hidden md:block bg-white dark:bg-gray-800 shadow">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex justify-between h-16">
            <div class="flex space-x-8">
              <router-link to="/" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-blue-500">
                {{ $t('app.dashboard') }}
              </router-link>
              <router-link to="/todos" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent">
                {{ $t('app.todos') }}
              </router-link>
              <router-link to="/countdowns" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent">
                {{ $t('app.countdowns') }}
              </router-link>
              <router-link to="/settings" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent">
                {{ $t('app.settings') }}
              </router-link>
            </div>
            <div class="flex items-center space-x-4">
              <select v-model="locale" @change="changeLocale" class="text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                <option value="en">EN</option>
                <option value="zh">中文</option>
              </select>
              <button @click="handleLogout" class="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <main class="max-w-7xl mx-auto py-4 md:py-6 px-4">
        <router-view />
      </main>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { setAPIKey, verifyAPIKey, getAPIKeyFromStorage, clearAPIKey } from './api/client'

const { locale } = useI18n()

// Auth state
const isInitializing = ref(true)
const isAuthenticated = ref(false)
const isLoggingIn = ref(false)
const inputAPIKey = ref('')
const error = ref('')
const showMobileMenu = ref(false)

// Initialize auth state on mount
onMounted(async () => {
  const savedKey = getAPIKeyFromStorage()
  if (savedKey) {
    // Verify saved key is still valid
    const valid = await verifyAPIKey(savedKey)
    if (valid) {
      setAPIKey(savedKey)
      isAuthenticated.value = true
    } else {
      // Clear invalid key
      clearAPIKey()
    }
  }
  isInitializing.value = false
})

const handleLogin = async () => {
  if (!inputAPIKey.value.trim()) {
    error.value = 'Please enter your API Key'
    return
  }

  isLoggingIn.value = true
  error.value = ''

  try {
    const valid = await verifyAPIKey(inputAPIKey.value.trim())
    if (valid) {
      setAPIKey(inputAPIKey.value.trim())
      isAuthenticated.value = true
      inputAPIKey.value = ''
    } else {
      error.value = 'Invalid API Key. Please check and try again.'
    }
  } catch (e) {
    error.value = 'Connection failed. Please check if the server is running.'
  } finally {
    isLoggingIn.value = false
  }
}

const handleLogout = () => {
  clearAPIKey()
  isAuthenticated.value = false
  showMobileMenu.value = false
}

const changeLocale = () => {
  localStorage.setItem('locale', locale.value)
}
</script>
