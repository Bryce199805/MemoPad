<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {{ authStore.user?.username }}</p>
    </div>

    <!-- Tab Selector -->
    <div class="tab-selector">
      <button 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <div class="tab-icon" :style="{ background: tab.color }">
          <component :is="tab.icon" />
        </div>
        <div class="tab-info">
          <span class="tab-label">{{ tab.label }}</span>
          <span class="tab-value">{{ tab.value }}</span>
        </div>
      </button>
    </div>

    <!-- Active Tab Content -->
    <div class="tab-content glass-card">
      <!-- Total Tasks -->
      <div v-if="activeTab === 'total'" class="content-section">
        <div class="section-header">
          <h3>All Tasks</h3>
          <span class="task-count">{{ todos.length }} total</span>
        </div>
        <div class="task-list">
          <div v-for="todo in allTasks.slice(0, 10)" :key="todo.id" class="task-item">
            <button class="task-checkbox" :class="{ checked: todo.done }" @click="toggleTodo(todo.id)">
              <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </button>
            <span class="task-text" :class="{ done: todo.done }">{{ todo.content }}</span>
            <span class="task-priority" :class="todo.priority">{{ todo.priority }}</span>
          </div>
          <p v-if="todos.length === 0" class="empty-text">No tasks yet</p>
        </div>
      </div>

      <!-- Completed -->
      <div v-if="activeTab === 'done'" class="content-section">
        <div class="section-header">
          <h3>Completed Tasks</h3>
          <span class="task-count">{{ completedTasks.length }} done</span>
        </div>
        <div class="task-list">
          <div v-for="todo in completedTasks.slice(0, 10)" :key="todo.id" class="task-item">
            <button class="task-checkbox checked" @click="toggleTodo(todo.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </button>
            <span class="task-text done">{{ todo.content }}</span>
            <span class="task-priority" :class="todo.priority">{{ todo.priority }}</span>
          </div>
          <p v-if="completedTasks.length === 0" class="empty-text">No completed tasks</p>
        </div>
      </div>

      <!-- Pending -->
      <div v-if="activeTab === 'pending'" class="content-section">
        <div class="section-header">
          <h3>Pending Tasks</h3>
          <span class="task-count">{{ pendingTasks.length }} pending</span>
        </div>
        <div class="task-list">
          <div v-for="todo in pendingTasks.slice(0, 10)" :key="todo.id" class="task-item">
            <button class="task-checkbox" @click="toggleTodo(todo.id)"></button>
            <span class="task-text">{{ todo.content }}</span>
            <span class="task-priority" :class="todo.priority">{{ todo.priority }}</span>
          </div>
          <p v-if="pendingTasks.length === 0" class="empty-text">All tasks completed!</p>
        </div>
      </div>

      <!-- Due Soon -->
      <div v-if="activeTab === 'due'" class="content-section">
        <div class="section-header">
          <h3>Upcoming Deadlines</h3>
          <span class="task-count">{{ dueSoonCountdowns.length }} upcoming</span>
        </div>
        <div class="countdown-list">
          <div v-for="cd in dueSoonCountdowns" :key="cd.id" class="countdown-item">
            <div class="countdown-info">
              <span class="countdown-title">{{ cd.title }}</span>
              <span class="countdown-date">{{ formatDate(cd.target_date) }}</span>
            </div>
            <div class="countdown-days" :class="getDaysClass(cd.target_date)">
              <span class="days-num">{{ daysLeft(cd.target_date) }}</span>
              <span class="days-label">days</span>
            </div>
          </div>
          <p v-if="dueSoonCountdowns.length === 0" class="empty-text">No upcoming deadlines</p>
        </div>
      </div>
    </div>

    <!-- Progress Section -->
    <div class="progress-section">
      <Card class="progress-card">
        <template #header>Task Progress</template>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${Math.min(stats.todos?.completion_rate || 0, 100)}%` }"></div>
        </div>
        <div class="progress-info">
          <span>{{ stats.todos?.done || 0 }} of {{ stats.todos?.total || 0 }} completed</span>
          <span class="progress-percent">{{ (stats.todos?.completion_rate || 0).toFixed(1) }}%</span>
        </div>
      </Card>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTodoStore } from '../stores/todo'
import { useCountdownStore } from '../stores/countdown'
import { storeToRefs } from 'pinia'
import api from '../api/client'
import Card from '../components/ui/Card.vue'

const authStore = useAuthStore()
const todoStore = useTodoStore()
const countdownStore = useCountdownStore()
const { todos } = storeToRefs(todoStore)
const { countdowns } = storeToRefs(countdownStore)

const stats = ref({ todos: {}, countdowns: {} })
const loading = ref(true)
const activeTab = ref('total')

// Icon components
const TotalIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M9 11l3 3L22 4' }),
  h('path', { d: 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' })
])

const DoneIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M22 11.08V12a10 10 0 11-5.93-9.14' }),
  h('polyline', { points: '22,4 12,14.01 9,11.01' })
])

const PendingIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: '12', cy: '12', r: '10' }),
  h('polyline', { points: '12,6 12,12 16,14' })
])

const DueIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('polygon', { points: '13,2 3,14 12,14 11,22 21,10 12,10 13,2' })
])

const tabs = computed(() => [
  { key: 'total', label: 'Total Tasks', value: stats.value.todos?.total || 0, color: 'rgba(99, 102, 241, 0.2)', icon: TotalIcon },
  { key: 'done', label: 'Completed', value: stats.value.todos?.done || 0, color: 'rgba(34, 197, 94, 0.2)', icon: DoneIcon },
  { key: 'pending', label: 'Pending', value: stats.value.todos?.pending || 0, color: 'rgba(245, 158, 11, 0.2)', icon: PendingIcon },
  { key: 'due', label: 'Due Soon', value: stats.value.countdowns?.due_soon || 0, color: 'rgba(139, 92, 246, 0.2)', icon: DueIcon }
])

// Computed
const allTasks = computed(() => [...todos.value].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const completedTasks = computed(() => todos.value.filter(t => t.done))
const pendingTasks = computed(() => todos.value.filter(t => !t.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const dueSoonCountdowns = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0).sort((a, b) => new Date(a.target_date) - new Date(b.target_date)))

// Methods
function daysLeft(date) {
  const target = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDaysClass(date) {
  const days = daysLeft(date)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'normal'
}

async function toggleTodo(id) {
  await todoStore.toggleTodo(id)
  await fetchStats()
}

async function fetchStats() {
  try {
    const res = await api.get('/api/stats')
    stats.value = res.data.data || res.data
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  }
}

async function fetchAll() {
  loading.value = true
  try {
    await Promise.all([
      fetchStats(),
      todoStore.fetchTodos(),
      countdownStore.fetchCountdowns()
    ])
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.dashboard-header p {
  color: var(--text-secondary);
  font-size: 15px;
}

/* Tab Selector - 4 Equal Cards */
.tab-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.tab-btn:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.tab-btn.active {
  background: var(--bg-tertiary);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--accent-primary);
}

.tab-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tab-icon svg {
  width: 20px;
  height: 20px;
  color: var(--text-primary);
}

.tab-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tab-label {
  font-size: 12px;
  color: var(--text-muted);
}

.tab-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

/* Tab Content */
.tab-content {
  padding: 20px;
  margin-bottom: 20px;
}

.content-section {
  min-height: 200px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.task-count {
  font-size: 13px;
  color: var(--text-muted);
}

/* Task List */
.task-list, .countdown-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  transition: background 0.15s;
}

.task-item:hover {
  background: var(--bg-hover);
}

.task-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s;
}

.task-checkbox:hover {
  border-color: var(--accent-primary);
}

.task-checkbox.checked {
  background: var(--success);
  border-color: var(--success);
}

.task-checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
}

.task-text {
  flex: 1;
  font-size: 15px;
  color: var(--text-primary);
}

.task-text.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.task-priority {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: capitalize;
}

.task-priority.high { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
.task-priority.medium { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
.task-priority.low { background: rgba(34, 197, 94, 0.15); color: var(--success); }

.empty-text {
  text-align: center;
  color: var(--text-muted);
  padding: 32px;
  font-size: 14px;
}

/* Countdown List */
.countdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border-radius: 10px;
}

.countdown-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.countdown-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.countdown-date {
  font-size: 12px;
  color: var(--text-muted);
}

.countdown-days {
  text-align: center;
}

.countdown-days .days-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  display: block;
}

.countdown-days .days-label {
  font-size: 11px;
  color: var(--text-muted);
}

.countdown-days.normal .days-num { color: var(--accent-primary); }
.countdown-days.soon .days-num { color: var(--warning); }
.countdown-days.overdue .days-num { color: var(--danger); }

/* Progress Section */
.progress-section {
  margin-top: 20px;
}

.progress-card {
  max-width: 400px;
}

.progress-bar {
  height: 10px;
  background: var(--bg-tertiary);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 8px;
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

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .tab-selector {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .tab-selector {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .tab-btn {
    padding: 12px;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .tab-icon {
    width: 36px;
    height: 36px;
  }

  .tab-value {
    font-size: 20px;
  }
}
</style>
