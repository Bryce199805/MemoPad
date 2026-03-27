<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{{ $t('countdown.title') }}</h1>
      <button @click="showAddModal = true" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto">
        + {{ $t('countdown.add') }}
      </button>
    </div>

    <!-- Countdown Grid - Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="cd in countdowns" :key="cd.id" class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div class="flex justify-between items-start mb-3">
          <h3 class="font-semibold text-gray-900 dark:text-white pr-2">{{ cd.title }}</h3>
          <span :class="priorityClass(cd.priority)" class="text-xs px-2 py-0.5 rounded whitespace-nowrap">{{ $t(`todo.${cd.priority}`) }}</span>
        </div>
        <div class="text-3xl md:text-4xl font-bold mb-2" :class="getDaysLeft(cd.target_date) < 0 ? 'text-red-500' : 'text-blue-500'">
          {{ getDaysLeftText(cd.target_date) }}
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(cd.target_date) }}</p>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="editCountdown(cd)" class="p-2 text-lg">✏️</button>
          <button @click="deleteCountdown(cd.id)" class="p-2 text-lg">🗑️</button>
        </div>
      </div>
      <p v-if="countdowns.length === 0" class="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">{{ $t('countdown.noCountdowns') }}</p>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">{{ editingCountdown ? $t('countdown.edit') : $t('countdown.add') }}</h2>
        <form @submit.prevent="saveCountdown">
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300">{{ $t('countdown.name') }}</label>
              <input v-model="form.title" required class="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300">{{ $t('countdown.targetDate') }}</label>
              <input v-model="form.target_date" type="datetime-local" required class="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 dark:text-gray-300">{{ $t('todo.priority') }}</label>
              <select v-model="form.priority" class="w-full mt-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="high">{{ $t('todo.high') }}</option>
                <option value="medium">{{ $t('todo.medium') }}</option>
                <option value="low">{{ $t('todo.low') }}</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row justify-end gap-2 mt-6">
            <button type="button" @click="closeModal" class="px-4 py-2 border rounded-lg dark:border-gray-600 dark:text-white">{{ $t('common.cancel') }}</button>
            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded-lg">{{ $t('common.save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCountdownStore } from '../stores/countdown'
import { storeToRefs } from 'pinia'

const store = useCountdownStore()
const { countdowns } = storeToRefs(store)

const showAddModal = ref(false)
const editingCountdown = ref(null)
const form = ref({ title: '', target_date: '', priority: 'medium' })

const priorityClass = (priority) => ({
  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': priority === 'high',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': priority === 'medium',
  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': priority === 'low'
})

const getDaysLeft = (targetDate) => {
  const target = new Date(targetDate)
  const now = new Date()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

const getDaysLeftText = (targetDate) => {
  const diff = getDaysLeft(targetDate)
  if (diff < 0) return Math.abs(diff) + 'd'
  if (diff === 0) return '0'
  return diff + 'd'
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const editCountdown = (cd) => {
  editingCountdown.value = cd
  form.value = { title: cd.title, target_date: cd.target_date.slice(0, 16), priority: cd.priority }
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingCountdown.value = null
  form.value = { title: '', target_date: '', priority: 'medium' }
}

const saveCountdown = async () => {
  if (editingCountdown.value) {
    await store.updateCountdown(editingCountdown.value.id, form.value)
  } else {
    await store.createCountdown(form.value)
  }
  closeModal()
}

const deleteCountdown = async (id) => { await store.deleteCountdown(id) }

onMounted(() => { store.fetchCountdowns() })
</script>
