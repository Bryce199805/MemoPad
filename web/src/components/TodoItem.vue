<template>
  <div 
    class="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md"
    :class="[
      todo.pinned 
        ? 'border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/10' 
        : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
    ]"
  >
    <div class="p-4">
      <div class="flex items-start gap-4">
        <!-- Checkbox -->
        <button 
          @click="$emit('toggle', todo.id)"
          class="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0"
          :class="todo.done 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'"
        >
          <svg v-if="todo.done" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p 
            class="text-gray-900 dark:text-white transition-all duration-200"
            :class="{ 'line-through text-gray-400 dark:text-gray-500': todo.done }"
          >
            {{ todo.content }}
          </p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <!-- Priority Badge -->
            <span 
              class="text-xs font-medium px-2.5 py-1 rounded-full"
              :class="priorityClasses"
            >
              {{ priorityLabel }}
            </span>
            
            <!-- Category Badge -->
            <span 
              v-if="todo.category" 
              class="text-xs font-medium px-2.5 py-1 rounded-full"
              :style="{ backgroundColor: todo.category.color + '20', color: todo.category.color }"
            >
              {{ todo.category.name }}
            </span>

            <!-- Date -->
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {{ formatDate(todo.created_at) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            @click="$emit('pin', todo.id)"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :class="todo.pinned ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'"
            :title="todo.pinned ? 'Unpin' : 'Pin'"
          >
            📌
          </button>
          <button 
            @click="$emit('edit', todo)"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
            title="Edit"
          >
            ✏️
          </button>
          <button 
            @click="$emit('delete', todo.id)"
            class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  todo: Object,
  categories: Array
})

defineEmits(['toggle', 'pin', 'edit', 'delete'])

const priorityClasses = computed(() => {
  const p = props.todo.priority
  return {
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': p === 'high',
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': p === 'medium',
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': p === 'low'
  }
})

const priorityLabel = computed(() => {
  const labels = { high: 'High', medium: 'Medium', low: 'Low' }
  return labels[props.todo.priority] || 'Medium'
})

const formatDate = (date) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>
