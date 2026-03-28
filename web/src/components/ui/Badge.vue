<template>
  <span :class="['badge', `badge-${variant}`]">
    <slot />
  </span>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: v => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(v)
  }
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}

.badge-default {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge-primary {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

.badge-success {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success);
}

.badge-warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.badge-info {
  background: rgba(59, 130, 246, 0.15);
  color: var(--info);
}
</style>
