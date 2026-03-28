<template>
  <div class="todo-card" :class="{ pinned: todo.pinned, done: todo.done }">
    <button class="checkbox" :class="{ checked: todo.done }" @click="$emit('toggle', todo.id)">
      <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20,6 9,17 4,12" />
      </svg>
    </button>
    
    <div class="todo-content">
      <span class="todo-text" :class="{ done: todo.done }">{{ todo.content }}</span>
    </div>
    
    <span class="priority-badge" :class="todo.priority">{{ priorityLabel }}</span>
    
    <button class="pin-btn" :class="{ active: todo.pinned }" @click="$emit('pin', todo.id)">
      📌
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  todo: { type: Object, required: true }
})

defineEmits(['toggle', 'pin'])

const priorityLabel = computed(() => {
  return { high: 'H', medium: 'M', low: 'L' }[props.todo.priority] || 'M'
})
</script>

<style scoped>
.todo-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  margin-bottom: 6px;
  transition: all 0.15s;
}

.todo-card:hover {
  border-color: rgba(255,255,255,0.1);
}

.todo-card.pinned {
  border-color: rgba(251, 146, 60, 0.3);
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, transparent 100%);
}

.todo-card.done {
  opacity: 0.5;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox.checked {
  background: #22c55e;
  border-color: #22c55e;
}

.checkbox svg {
  width: 12px;
  height: 12px;
  color: white;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-text {
  font-size: 13px;
  color: rgba(255,255,255,0.9);
}

.todo-text.done {
  text-decoration: line-through;
  color: rgba(255,255,255,0.4);
}

.priority-badge {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.priority-badge.high {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.priority-badge.medium {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.priority-badge.low {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.pin-btn {
  padding: 4px;
  font-size: 12px;
  opacity: 0;
  transition: all 0.15s;
}

.todo-card:hover .pin-btn {
  opacity: 0.5;
}

.pin-btn:hover, .pin-btn.active {
  opacity: 1;
}

.pin-btn.active {
  opacity: 1;
}
</style>
