<template>
  <div 
    class="todo-item glass-card" 
    :class="{ pinned: todo.pinned, done: todo.done, selected: selected, selectable: selectable }"
    @click="handleClick"
  >
    <!-- Select Checkbox -->
    <button 
      v-if="selectable"
      class="select-checkbox"
      :class="{ checked: selected }"
      @click.stop="$emit('select')"
    >
      <svg v-if="selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20,6 9,17 4,12" />
      </svg>
    </button>

    <div class="todo-content">
      <button 
        v-if="!selectable"
        class="checkbox"
        :class="{ checked: todo.done }"
        @click.stop="$emit('toggle', todo.id)"
      >
        <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </button>

      <div class="todo-info">
        <p class="todo-text" :class="{ done: todo.done }">{{ todo.content }}</p>
        <div class="todo-meta">
          <Badge :variant="priorityVariant">{{ priorityLabel }}</Badge>
          
          <Badge v-if="todo.category" variant="custom" :style="{ backgroundColor: todo.category.color + '20', color: todo.category.color }">
            {{ todo.category.name }}
          </Badge>
        </div>
      </div>
    </div>

    <div v-if="!selectable" class="todo-actions">
      <button
        class="action-btn"
        :class="{ active: todo.pinned }"
        @click.stop="$emit('pin', todo.id)"
        :title="$t('todo.pin')"
      >
        📌
      </button>
      <button class="action-btn" @click.stop="$emit('edit', todo)" :title="$t('common.edit')">
        ✏️
      </button>
      <button class="action-btn danger" @click.stop="$emit('delete', todo.id)" :title="$t('common.delete')">
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from './ui/Badge.vue'

const { t } = useI18n()

const props = defineProps({
  todo: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  selectable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle', 'pin', 'edit', 'delete', 'select'])

function handleClick() {
  if (props.selectable) {
    emit('select')
  }
}

const priorityVariant = computed(() => {
  const map = { high: 'danger', medium: 'warning', low: 'success' }
  return map[props.todo.priority] || 'default'
})

const priorityLabel = computed(() => {
  const map = { high: t('todo.high'), medium: t('todo.medium'), low: t('todo.low') }
  return map[props.todo.priority] || t('todo.medium')
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

.todo-item.selectable {
  cursor: pointer;
}

.todo-item.selected {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.05);
}

.todo-item.selectable:hover {
  background: var(--bg-hover);
}

.todo-content {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

/* Select Checkbox */
.select-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  margin-top: 2px;
}

.select-checkbox:hover {
  border-color: var(--accent-primary);
}

.select-checkbox.checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.select-checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
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
