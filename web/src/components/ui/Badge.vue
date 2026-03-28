<template>
  <span :class="['badge', `badge-${variant}`, sizeClass]" :style="customStyle">
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default'
  },
  size: {
    type: String,
    default: 'md',
    validator: v => ['sm', 'md', 'lg'].includes(v)
  }
})

const sizeClass = computed(() => `badge-${props.size}`)

const customStyle = computed(() => {
  // For custom variant, we don't add any class styles
  if (props.variant === 'custom') {
    return {}
  }
  return {}
})
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-weight: 600;
  border-radius: 999px;
}

.badge-sm {
  padding: 2px 6px;
  font-size: 11px;
}

.badge-md {
  padding: 4px 10px;
  font-size: 12px;
}

.badge-lg {
  padding: 6px 14px;
  font-size: 13px;
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

.badge-custom {
  /* Custom styles applied via style prop */
}
</style>
