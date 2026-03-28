<template>
  <div class="todo-item glass-card" :class="{ pinned: todo.pinned, done: todo.done }">
    <div class="todo-content">
      <button 
        class="checkbox"
        :class="{ checked: todo.done }"
        @click="$emit('toggle', todo.id)"
      >
        <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </button>

      <div class="todo-info">
        <p class="todo-text" :class="{ done: todo.done }">{{ todo.content }}</p>
        <div class="todo-meta">
          <Badge :variant="priorityVariant">{{ priorityLabel }}</Badge>
          
          <Badge v-if="todo.category" variant="info">
            {{ todo.category.name }}
          </Badge>

          <Badge v-if="todo.due_date" :variant="dueDateVariant">
            {{ dueDateText }}
          </Badge>
        </div>
      </div>
    </div>

    <div class="todo-actions">
      <button 
        class="action-btn"
        :class="{ active: todo.pinned }"
        @click="$emit('pin', todo.id)"
        title="Pin"
      >
        📌
      </button>
      <button class="action-btn" @click="$emit('edit', todo)" title="Edit">
        ✏️
      </button>
      <button class="action-btn danger" @click="$emit('delete', todo.id)" title="Delete">
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Badge from './ui/Badge.vue'

const props = defineProps({
  todo: { type: Object, required: true },
  categories: { type: Array, default: () => [] }
})

defineEmits(['toggle', 'pin', 'edit', 'delete'])

const priorityVariant = computed(() => {
  const map = { high: 'danger', medium: 'warning', low: 'success' }
  return map[props.todo.priority] || 'default'
})

const priorityLabel = computed(() => {
  const map = { high: 'High', medium: 'Medium', low: 'Low' }
  return map[props.todo.priority] || 'Medium'
})

const dueDateVariant = computed(() => {
  if (!props.todo.due_date || props.todo.done) return 'default'
  
  const now = new Date()
  const due = new Date(props.todo.due_date)
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return 'danger'
  if (diff === 0) return 'warning'
  if (diff <= 3) return 'warning'
  return 'info'
})

const dueDateText = computed(() => {
  if (!props.todo.due_date) return ''
  
  const now = new Date()
  const due = new Date(props.todo.due_date)
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return `${diff} days`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  transition: all var(--transition-fast);
}

.todo-item.pinned {
  border-color: rgba(251, 146, 60, 0.3);
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.05) 0%, transparent 100%);
}

.todo-item.done {
  opacity: 0.6;
}

.todo-content {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

/* Checkbox */
.checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  margin-top: 2px;
}

.checkbox:hover {
  border-color: var(--accent-primary);
}

.checkbox.checked {
  background: var(--success);
  border-color: var(--success);
}

.checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
}

/* Info */
.todo-info {
  flex: 1;
  min-width: 0;
}

.todo-text {
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 8px;
  word-break: break-word;
}

.todo-text.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Actions */
.todo-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.todo-item:hover .todo-actions {
  opacity: 1;
}

.action-btn {
  padding: 8px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-tertiary);
}

.action-btn.active {
  opacity: 1;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Responsive */
@media (max-width: 640px) {
  .todo-actions {
    opacity: 1;
  }
}
</style>
