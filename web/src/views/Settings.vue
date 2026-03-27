<template>
  <div class="space-y-4">
    <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('settings.title') }}</h1>

    <!-- Language -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('settings.language') }}</h2>
      <select v-model="locale" @change="changeLocale" class="w-full sm:w-auto px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
    </div>

    <!-- Categories -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('category.title') }}</h2>
      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input v-model="newCategory.name" type="text" :placeholder="$t('category.name')" class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        <input v-model="newCategory.color" type="color" class="w-12 h-10 border rounded cursor-pointer" />
        <button @click="addCategory" class="bg-blue-500 text-white px-4 py-2 rounded-lg">{{ $t('category.add') }}</button>
      </div>
      <div class="space-y-2">
        <div v-for="cat in categories" :key="cat.id" class="flex items-center gap-3 p-3 border rounded-lg dark:border-gray-600">
          <span class="w-8 h-8 rounded" :style="{ backgroundColor: cat.color }"></span>
          <span class="flex-1 text-gray-900 dark:text-white">{{ cat.name }}</span>
          <button @click="deleteCategory(cat.id)" class="p-2 text-red-500">🗑️</button>
        </div>
        <p v-if="categories.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-4">{{ $t('category.noCategory') }}</p>
      </div>
    </div>

    <!-- API Key -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Key</h2>
      <div class="flex flex-col sm:flex-row gap-2">
        <input v-model="newAPIKey" type="password" placeholder="Enter new API Key" class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        <button @click="updateAPIKey" class="bg-green-500 text-white px-4 py-2 rounded-lg">Update</button>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Current key: {{ currentKey ? currentKey.slice(0, 20) + '...' : 'Not set' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCategoryStore } from '../stores/category'
import { storeToRefs } from 'pinia'
import { setAPIKey, getAPIKeyFromStorage } from '../api/client'

const { locale } = useI18n()
const store = useCategoryStore()
const { categories } = storeToRefs(store)
const newCategory = ref({ name: '', color: '#3B82F6' })
const newAPIKey = ref('')
const currentKey = ref('')

const changeLocale = () => { localStorage.setItem('locale', locale.value) }

const addCategory = async () => {
  if (newCategory.value.name) {
    await store.createCategory(newCategory.value)
    newCategory.value = { name: '', color: '#3B82F6' }
  }
}

const deleteCategory = async (id) => { await store.deleteCategory(id) }

const updateAPIKey = () => {
  if (newAPIKey.value) {
    setAPIKey(newAPIKey.value)
    newAPIKey.value = ''
    currentKey.value = getAPIKeyFromStorage()
  }
}

onMounted(() => {
  store.fetchCategories()
  currentKey.value = getAPIKeyFromStorage()
})
</script>
