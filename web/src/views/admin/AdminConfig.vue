<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>System Configuration</h1>
      <p class="subtitle">Manage system settings</p>
    </div>

    <Card class="config-card">
      <template #header>General Settings</template>
      <div class="config-list">
        <div class="config-item">
          <div class="config-info">
            <span class="config-label">User Registration</span>
            <span class="config-desc">Allow new users to register accounts on the platform</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="config.registration_enabled" @change="updateConfig" />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </Card>

    <Card class="config-card">
      <template #header>System Info</template>
      <div class="info-list">
        <div class="info-item">
          <span class="info-label">Platform Version</span>
          <span class="info-value">2.1.0</span>
        </div>
        <div class="info-item">
          <span class="info-label">Environment</span>
          <span class="info-value">{{ envMode }}</span>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Card from '../../components/ui/Card.vue'
import api from '../../api/client'

const config = ref({
  registration_enabled: true
})

const envMode = computed(() => {
  return import.meta.env.PROD ? 'Production' : 'Development'
})

async function fetchConfig() {
  try {
    const res = await api.get('/api/admin/config')
    config.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to fetch config:', e)
  }
}

async function updateConfig() {
  try {
    await api.put('/api/admin/config', config.value)
  } catch (e) {
    console.error('Failed to update config:', e)
  }
}

onMounted(() => {
  fetchConfig()
})
</script>

<style scoped>
/* Admin Theme */
.admin-theme {
  --admin-primary: #14b8a6;
}

.admin-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin-top: 4px;
}

.config-card {
  margin-bottom: 20px;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-label {
  font-weight: 600;
  color: var(--text-primary);
}

.config-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 28px;
  transition: all var(--transition-fast);
}

.slider::before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-secondary);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle input:checked + .slider {
  background-color: #14b8a6;
  border-color: #14b8a6;
}

.toggle input:checked + .slider::before {
  transform: translateX(24px);
  background-color: white;
}

/* Info List */
.info-list {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
  font-weight: 500;
}
</style>
