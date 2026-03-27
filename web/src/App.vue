<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- API Key Modal -->
    <div v-if="!hasAPIKey" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to MemoDesk</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-6">Enter your API Key to continue</p>
        <input
          v-model="inputAPIKey"
          type="password"
          placeholder="sk-memo-..."
          class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-lg"
          @keyup.enter="saveAPIKey"
        />
        <p v-if="error" class="text-red-500 text-sm mt-2">{{ error }}</p>
        <button
          @click="saveAPIKey"
          class="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
        >
          Connect
        </button>
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
            <button @click="showMobileMenu = !showMobileMenu" class="p-2 text-gray-500 dark:text-gray-400">
              {{ showMobileMenu ? '✕' : '☰' }}
            </button>
          </div>
        </div>
        <!-- Mobile Nav -->
        <nav v-if="showMobileMenu" class="border-t dark:border-gray-700">
          <router-link to="/" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            {{ $t('app.dashboard') }}
          </router-link>
          <router-link to="/todos" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            {{ $t('app.todos') }}
          </router-link>
          <router-link to="/countdowns" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            {{ $t('app.countdowns') }}
          </router-link>
          <router-link to="/settings" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
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
import { hasAPIKey, setAPIKey, verifyAPIKey, getAPIKeyFromStorage } from './api/client'

const { locale } = useI18n()
const inputAPIKey = ref('')
const error = ref('')
const showMobileMenu = ref(false)

const saveAPIKey = async () => {
  if (!inputAPIKey.value) {
    error.value = 'Please enter API Key'
    return
  }
  const valid = await verifyAPIKey(inputAPIKey.value)
  if (valid) {
    setAPIKey(inputAPIKey.value)
    error.value = ''
  } else {
    error.value = 'Invalid API Key'
  }
}

const changeLocale = () => {
  localStorage.setItem('locale', locale.value)
}
</script>
