<template>
  <div class="space-y-4 md:space-y-6">
    <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('dashboard.title') }}</h1>

    <!-- Stats Grid - Mobile: 2 cols, Desktop: 4 cols -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.totalTodos') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{{ stats.todos?.total || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.completed') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-green-500">{{ stats.todos?.done || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.pending') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-yellow-500">{{ stats.todos?.pending || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 col-span-2 md:col-span-1">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.completionRate') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-blue-500">{{ stats.todos?.completion_rate || 0 }}%</p>
      </div>
    </div>

    <!-- Countdown Stats - Mobile: 2 cols, Desktop: 3 cols -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.dueSoon') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-purple-500">{{ stats.countdowns?.due_soon || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.overdue') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-red-500">{{ stats.countdowns?.overdue || 0 }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 col-span-2 md:col-span-1">
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">{{ $t('dashboard.pinned') }}</p>
        <p class="text-2xl md:text-3xl font-bold text-orange-500">{{ (stats.todos?.pinned || 0) + (stats.countdowns?.pinned || 0) }}</p>
      </div>
    </div>

    <!-- Loading/Error State -->
    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-gray-400">{{ $t('common.loading') }}</p>
    </div>
    <div v-if="error" class="text-center py-8">
      <p class="text-red-500">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/client'

const stats = ref({})
const loading = ref(true)
const error = ref(null)

const fetchStats = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await api.stats.get('/api/stats')
    stats.value = res.data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>
