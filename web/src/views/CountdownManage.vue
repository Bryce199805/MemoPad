<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ $t('countdown.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track your important dates
        </p>
      </div>
      <button 
        @click="showAddModal = true" 
        class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200 flex items-center gap-2"
      >
        <span class="text-lg">+</span>
        <span>{{ $t('countdown.add') }}</span>
      </button>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
        <p class="text-xs uppercase tracking-wider opacity-80">Upcoming</p>
        <p class="text-2xl font-bold mt-1">{{ upcomingCount }}</p>
      </div>
      <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
        <p class="text-xs uppercase tracking-wider opacity-80">Due Soon</p>
        <p class="text-2xl font-bold mt-1">{{ dueSoonCount }}</p>
      </div>
      <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
        <p class="text-xs uppercase tracking-wider opacity-80">Overdue</p>
        <p class="text-2xl font-bold mt-1">{{ overdueCount }}</p>
      </div>
    </div>

    <!-- Countdown Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="cd in sortedCountdowns" 
        :key="cd.id" 
        class="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-200"
        :class="{ 'ring-2 ring-orange-200 dark:ring-orange-800': cd.pinned }"
      >
        <!-- Progress Bar -->
        <div class="h-1.5 bg-gray-100 dark:bg-gray-700">
          <div 
            class="h-full transition-all duration-500"
            :class="progressColor(cd.target_date)"
            :style="{ width: progressWidth(cd.target_date) + '%' }"
          ></div>
        </div>

        <div class="p-5">
          <div class="flex justify-between items-start mb-4">
            <h3 class="font-semibold text-gray-900 dark:text-white line-clamp-2 pr-2">{{ cd.title }}</h3>
            <span 
              class="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
              :class="priorityClass(cd.priority)"
            >
              {{ priorityLabel(cd.priority) }}
            </span>
          </div>

          <!-- Countdown Display -->
          <div class="text-center py-4">
            <div class="flex items-baseline justify-center gap-1">
              <span 
                class="text-4xl font-bold"
                :class="countdownColor(cd.target_date)"
              >
                {{ Math.abs(getDaysLeft(cd.target_date)) }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ getDaysLeft(cd.target_date) >= 0 ? 'days left' : 'days ago' }}
              </span>
            </div>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {{ formatDate(cd.target_date) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
            <button 
              @click="togglePin(cd)"
              class="text-sm px-3 py-1.5 rounded-lg transition-colors"
              :class="cd.pinned 
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'"
            >
              📌 {{ cd.pinned ? 'Pinned' : 'Pin' }}
            </button>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                @click="editCountdown(cd)" 
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
              >
                ✏️
              </button>
              <button 
                @click="deleteCountdown(cd.id)" 
                class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="countdowns.length === 0" class="col-span-full text-center py-16">
        <div class="text-6xl mb-4 opacity-30">⏰</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ $t('countdown.noCountdowns') }}</h3>
        <p class="text-gray-500 dark:text-gray-400 mt-2">Add a countdown to track important dates</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Transition name="modal">
      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="closeModal">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
          <h2 class="text-xl font-bold mb-6 text-gray-900 dark:text-white">
            {{ editingCountdown ? $t('countdown.edit') : 'New Countdown' }}
          </h2>
          <form @submit.prevent="saveCountdown">
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('countdown.name') }}</label>
                <input 
                  v-model="form.title" 
                  required 
                  class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What are you counting down to?"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('countdown.targetDate') }}</label>
                <input 
                  v-model="form.target_date" 
                  type="datetime-local" 
                  required 
                  class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('todo.priority') }}</label>
                <select 
                  v-model="form.priority" 
                  class="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="high">{{ $t('todo.high') }}</option>
                  <option value="medium">{{ $t('todo.medium') }}</option>
                  <option value="low">{{ $t('todo.low') }}</option>
                </select>
              </div>
            </div>
            <div class="flex gap-3 mt-8">
              <button 
                type="button" 
                @click="closeModal" 
                class="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {{ $t('common.cancel') }}
              </button>
              <button 
                type="submit" 
                class="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25"
              >
                {{ $t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCountdownStore } from '../stores/countdown'
import { storeToRefs } from 'pinia'

const store = useCountdownStore()
const { countdowns } = storeToRefs(store)

const showAddModal = ref(false)
const editingCountdown = ref(null)
const form = ref({ title: '', target_date: '', priority: 'medium' })

// Computed
const sortedCountdowns = computed(() => {
  return [...countdowns.value].sort((a, b) => {
    // Pinned first, then by target date
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
    return new Date(a.target_date) - new Date(b.target_date)
  })
})

const upcomingCount = computed(() => countdowns.value.filter(c => getDaysLeft(c.target_date) > 7).length)
const dueSoonCount = computed(() => countdowns.value.filter(c => getDaysLeft(c.target_date) >= 0 && getDaysLeft(c.target_date) <= 7).length)
const overdueCount = computed(() => countdowns.value.filter(c => getDaysLeft(c.target_date) < 0).length)

// Methods
const priorityClass = (priority) => ({
  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': priority === 'high',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': priority === 'medium',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': priority === 'low'
})

const priorityLabel = (p) => ({ high: 'High', medium: 'Medium', low: 'Low' }[p] || 'Medium')

const getDaysLeft = (targetDate) => {
  const target = new Date(targetDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

const countdownColor = (targetDate) => {
  const days = getDaysLeft(targetDate)
  if (days < 0) return 'text-red-500'
  if (days <= 3) return 'text-orange-500'
  if (days <= 7) return 'text-yellow-500'
  return 'text-blue-500'
}

const progressColor = (targetDate) => {
  const days = getDaysLeft(targetDate)
  if (days < 0) return 'bg-red-500'
  if (days <= 3) return 'bg-orange-500'
  if (days <= 7) return 'bg-yellow-500'
  return 'bg-blue-500'
}

const progressWidth = (targetDate) => {
  const days = getDaysLeft(targetDate)
  const total = 30
  if (days < 0) return 100
  return Math.max(5, Math.min(100, ((total - days) / total) * 100))
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString(undefined, { 
    weekday: 'short',
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const togglePin = async (cd) => {
  await store.updateCountdown(cd.id, { pinned: !cd.pinned })
}

const editCountdown = (cd) => {
  editingCountdown.value = cd
  form.value = { 
    title: cd.title, 
    target_date: cd.target_date.slice(0, 16), 
    priority: cd.priority,
    pinned: cd.pinned
  }
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

const deleteCountdown = async (id) => { 
  if (confirm('Delete this countdown?')) {
    await store.deleteCountdown(id) 
  }
}

onMounted(() => { store.fetchCountdowns() })
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
