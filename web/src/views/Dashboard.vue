<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {{ authStore.user?.username }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <StatCard label="Total Tasks" :value="stats.todos?.total || 0" :icon-bg="iconColors.blue">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </template>
      </StatCard>

      <StatCard label="Completed" :value="stats.todos?.done || 0" :icon-bg="iconColors.green">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        </template>
      </StatCard>

      <StatCard label="Pending" :value="stats.todos?.pending || 0" :icon-bg="iconColors.yellow">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </template>
      </StatCard>

      <StatCard label="Due Soon" :value="stats.countdowns?.due_soon || 0" :icon-bg="iconColors.purple">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
          </svg>
        </template>
      </StatCard>
    </div>

    <!-- Progress -->
    <Card class="progress-card">
      <template #header>Task Progress</template>
      <div class="progress-content">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: `${Math.min(stats.todos?.completion_rate || 0, 100)}%` }"
          ></div>
        </div>
        <div class="progress-info">
          <span>{{ stats.todos?.done || 0 }} of {{ stats.todos?.total || 0 }} completed</span>
          <span class="progress-percent">{{ (stats.todos?.completion_rate || 0).toFixed(1) }}%</span>
        </div>
      </div>
    </Card>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <router-link to="/todos" class="action-card glass-card">
        <div class="action-icon" :style="{ background: iconColors.blue }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span>Add Task</span>
      </router-link>

      <router-link to="/countdowns" class="action-card glass-card">
        <div class="action-icon" :style="{ background: iconColors.purple }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <span>Add Countdown</span>
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../api/client'
import StatCard from '../components/ui/StatCard.vue'
import Card from '../components/ui/Card.vue'

const authStore = useAuthStore()
const stats = ref({ todos: {}, countdowns: {} })
const loading = ref(true)
const error = ref(null)

const iconColors = {
  blue: 'rgba(99, 102, 241, 0.15)',
  green: 'rgba(34, 197, 94, 0.15)',
  yellow: 'rgba(245, 158, 11, 0.15)',
  purple: 'rgba(139, 92, 246, 0.15)'
}

async function fetchStats() {
  loading.value = true
  error.value = null
  
  try {
    const res = await api.get('/api/stats')
    stats.value = res.data.data || res.data
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to load stats'
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.dashboard-header p {
  color: var(--text-secondary);
  font-size: 15px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

/* Progress Card */
.progress-card {
  margin-bottom: 24px;
}

.progress-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-bar {
  height: 12px;
  background: var(--bg-tertiary);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 999px;
  transition: width 0.5s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--text-secondary);
}

.progress-percent {
  font-weight: 600;
  color: var(--accent-primary);
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 15px;
  transition: all var(--transition-fast);
}

.action-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.action-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

.action-icon svg {
  width: 22px;
  height: 22px;
  color: var(--accent-primary);
}

/* Loading & Error */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--danger);
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>
