<template>
  <div 
    class="group rounded-xl p-3 border transition-all duration-200"
    :class="item.pinned 
      ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/20 hover:border-orange-500/30' 
      : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'"
  >
    <div class="flex items-center gap-3">
      <!-- Checkbox -->
      <button 
        @click="$emit('toggle', item.id)" 
        class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0"
        :class="item.done 
          ? 'bg-green-500 border-green-500' 
          : 'border-white/30 hover:border-white/50'"
      >
        <svg v-if="item.done" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p 
          class="text-sm truncate"
          :class="item.done ? 'text-white/40 line-through' : 'text-white/90'"
        >
          {{ item.content }}
        </p>
      </div>
      
      <!-- Priority Badge -->
      <span 
        class="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        :class="priorityClass"
      >
        {{ priorityLabel }}
      </span>
      
      <!-- Pin Button -->
      <button 
        @click="$emit('pin', item.id)" 
        class="opacity-0 group-hover:opacity-100 transition-opacity text-xs p-1"
        :class="item.pinned ? 'text-orange-400' : 'text-white/40 hover:text-white/60'"
      >
        📌
      </button>
    </div>
    
    <!-- Due Date -->
    <div v-if="item.due_date && !item.done" class="flex items-center gap-2 mt-2 ml-8">
      <span class="text-xs" :class="dueDateClass">{{ formatDueDate(item.due_date) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: Object
})

defineEmits(['toggle', 'pin'])

const priorityClass = computed(() => {
  const p = props.item.priority
  return {
    'bg-red-500/30 text-red-300': p === 'high',
    'bg-yellow-500/30 text-yellow-300': p === 'medium',
    'bg-green-500/30 text-green-300': p === 'low'
  }
})

const priorityLabel = computed(() => {
  return props.item.priority === 'high' ? 'H' : props.item.priority === 'medium' ? 'M' : 'L'
})

const dueDateClass = computed(() => {
  if (!props.item.due_date || props.item.done) return 'text-white/40'
  
  const now = new Date()
  const due = new Date(props.item.due_date)
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return 'text-red-400'
  if (diff === 0) return 'text-orange-400'
  if (diff <= 3) return 'text-yellow-400'
  return 'text-blue-400'
})

const formatDueDate = (dateStr) => {
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return `${diff} days`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>
