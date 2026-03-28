<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">Welcome back, {{ authStore.user?.username }} &middot; {{ todayDate }}</p>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stats-grid">
      <div
        v-for="stat in statCards"
        :key="stat.key"
        class="stat-card glass-card"
        :class="{ active: expanded === stat.key }"
        @click="expanded = expanded === stat.key ? null : stat.key"
      >
        <div class="stat-card-inner">
          <div class="stat-icon" :style="{ background: stat.color }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path v-if="stat.key === 'total'" d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              <path v-else-if="stat.key === 'done'" d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
              <circle v-else-if="stat.key === 'pending'" cx="12" cy="12" r="10" />
              <polyline v-if="stat.key === 'pending'" points="12,6 12,12 16,14" />
              <polygon v-if="stat.key === 'due'" points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
            </svg>
          </div>
          <div class="stat-text">
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ stat.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Expandable Preview Panel -->
    <Transition name="expand">
      <div v-if="expanded" class="preview-panel glass-card">
        <!-- Total Tasks -->
        <template v-if="expanded === 'total'">
          <div class="preview-header">
            <h3>All Tasks</h3>
            <router-link to="/todos" class="view-all">View all &rarr;</router-link>
          </div>
          <div class="preview-list">
            <div v-for="todo in recentTasks" :key="todo.id" class="preview-item">
              <button class="mini-check" :class="{ checked: todo.done }" @click.stop="toggleTodo(todo.id)">
                <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>
              </button>
              <span class="preview-text" :class="{ done: todo.done }">{{ todo.content }}</span>
              <span class="preview-priority" :class="todo.priority">{{ {high:'H',medium:'M',low:'L'}[todo.priority] }}</span>
            </div>
            <p v-if="todos.length === 0" class="empty-hint">No tasks yet</p>
          </div>
        </template>

        <!-- Completed -->
        <template v-if="expanded === 'done'">
          <div class="preview-header">
            <h3>Completed Tasks</h3>
            <router-link to="/todos" class="view-all">View all &rarr;</router-link>
          </div>
          <div class="preview-list">
            <div v-for="todo in completedTasks.slice(0, 8)" :key="todo.id" class="preview-item">
              <button class="mini-check checked" @click.stop="toggleTodo(todo.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>
              </button>
              <span class="preview-text done">{{ todo.content }}</span>
            </div>
            <p v-if="completedTasks.length === 0" class="empty-hint">No completed tasks</p>
          </div>
        </template>

        <!-- Pending -->
        <template v-if="expanded === 'pending'">
          <div class="preview-header">
            <h3>Pending Tasks</h3>
            <router-link to="/todos" class="view-all">View all &rarr;</router-link>
          </div>
          <div class="preview-list">
            <div v-for="todo in pendingTasks.slice(0, 8)" :key="todo.id" class="preview-item">
              <button class="mini-check" @click.stop="toggleTodo(todo.id)"></button>
              <span class="preview-text">{{ todo.content }}</span>
              <span class="preview-priority" :class="todo.priority">{{ {high:'H',medium:'M',low:'L'}[todo.priority] }}</span>
            </div>
            <p v-if="pendingTasks.length === 0" class="empty-hint">All tasks completed!</p>
          </div>
        </template>

        <!-- Due Soon -->
        <template v-if="expanded === 'due'">
          <div class="preview-header">
            <h3>Upcoming Deadlines</h3>
            <router-link to="/countdowns" class="view-all">View all &rarr;</router-link>
          </div>
          <div class="preview-list">
            <div v-for="cd in upcomingCountdowns" :key="cd.id" class="preview-item">
              <span class="preview-text">{{ cd.title }}</span>
              <span class="preview-days" :class="daysClass(cd.target_date)">
                {{ daysLeft(cd.target_date) }}d
              </span>
            </div>
            <p v-if="upcomingCountdowns.length === 0" class="empty-hint">No upcoming deadlines</p>
          </div>
        </template>
      </div>
    </Transition>

    <!-- Content Grid: Progress + Countdowns -->
    <div class="content-grid">
      <!-- Task Progress -->
      <Card>
        <template #header>Task Progress</template>
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: completionRate + '%' }"></div>
          </div>
          <div class="progress-meta">
            <span>{{ stats.todos?.done || 0 }} of {{ stats.todos?.total || 0 }} completed</span>
            <span class="progress-pct">{{ completionRate }}%</span>
          </div>
        </div>
        <div class="priority-bars">
          <h4>By Priority</h4>
          <div class="bar-row" v-for="p in priorityBars" :key="p.key">
            <span class="bar-label">{{ p.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: p.pct + '%', background: p.color }"></div>
            </div>
            <span class="bar-count">{{ p.count }}</span>
          </div>
        </div>
      </Card>

      <!-- Upcoming Countdowns -->
      <Card>
        <template #header>Upcoming Countdowns</template>
        <div v-if="upcomingCountdowns.length === 0" class="empty-hint">No upcoming deadlines</div>
        <div v-else class="countdown-list">
          <div v-for="cd in upcomingCountdowns.slice(0, 5)" :key="cd.id" class="countdown-row">
            <div class="cd-info">
              <span class="cd-title">{{ cd.title }}</span>
              <span class="cd-date">{{ formatDate(cd.target_date) }}</span>
            </div>
            <div class="cd-days" :class="daysClass(cd.target_date)">
              <span class="cd-num">{{ Math.abs(daysLeft(cd.target_date)) }}</span>
              <span class="cd-unit">{{ daysLeft(cd.target_date) >= 0 ? 'days' : 'ago' }}</span>
            </div>
          </div>
        </div>
        <template #footer>
          <router-link to="/countdowns" class="view-all">View all &rarr;</router-link>
        </template>
      </Card>
    </div>

    <!-- Pinned Tasks -->
    <div v-if="pinnedTodos.length > 0" class="pinned-section">
      <h3 class="section-title">Pinned</h3>
      <div class="pinned-list">
        <div v-for="todo in pinnedTodos" :key="todo.id" class="pinned-item glass-card" @click="$router.push('/todos')">
          <span class="pin-icon">📌</span>
          <span class="pinned-text">{{ todo.content }}</span>
          <span class="preview-priority" :class="todo.priority">{{ {high:'H',medium:'M',low:'L'}[todo.priority] }}</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
const expanded = ref(null)

const todayDate = computed(() => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
})

const statCards = computed(() => [
  { key: 'total', label: 'Total Tasks', value: stats.value.todos?.total || 0, color: 'rgba(99, 102, 241, 0.15)' },
  { key: 'done', label: 'Completed', value: stats.value.todos?.done || 0, color: 'rgba(34, 197, 94, 0.15)' },
  { key: 'pending', label: 'Pending', value: stats.value.todos?.pending || 0, color: 'rgba(245, 158, 11, 0.15)' },
  { key: 'due', label: 'Due Soon', value: stats.value.countdowns?.due_soon || 0, color: 'rgba(139, 92, 246, 0.15)' }
])

const recentTasks = computed(() => [...todos.value].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const completedTasks = computed(() => todos.value.filter(t => t.done))
const pendingTasks = computed(() => todos.value.filter(t => !t.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const pinnedTodos = computed(() => todos.value.filter(t => t.pinned && !t.done))
const upcomingCountdowns = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0).sort((a, b) => new Date(a.target_date) - new Date(b.target_date)))
const completionRate = computed(() => Math.round(stats.value.todos?.completion_rate || 0))

const priorityBars = computed(() => {
  const bp = stats.value.todos?.by_priority || {}
  const pending = stats.value.todos?.pending || 1
  return [
    { key: 'high', label: 'High', count: bp.high || 0, pct: Math.round(((bp.high || 0) / pending) * 100), color: 'var(--danger)' },
    { key: 'medium', label: 'Medium', count: bp.medium || 0, pct: Math.round(((bp.medium || 0) / pending) * 100), color: 'var(--warning)' },
    { key: 'low', label: 'Low', count: bp.low || 0, pct: Math.round(((bp.low || 0) / pending) * 100), color: 'var(--success)' }
  ]
})

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

function daysClass(date) {
  const d = daysLeft(date)
  if (d < 0) return 'overdue'
  if (d <= 3) return 'soon'
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
    await Promise.all([fetchStats(), todoStore.fetchTodos(), countdownStore.fetchCountdowns()])
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

/* Header */
.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 15px;
}

/* Stat Cards Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 4px;
}

.stat-card {
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--accent-primary), 0 4px 16px rgba(99, 102, 241, 0.15);
}

.stat-card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
  color: var(--text-primary);
}

.stat-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

/* Expandable Preview Panel */
.preview-panel {
  padding: 20px;
  margin-bottom: 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.preview-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.view-all {
  font-size: 13px;
  color: var(--accent-primary);
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  transition: background 0.15s;
}

.preview-item:hover {
  background: var(--bg-hover);
}

.mini-check {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.mini-check:hover {
  border-color: var(--accent-primary);
}

.mini-check.checked {
  background: var(--success);
  border-color: var(--success);
}

.mini-check svg {
  width: 12px;
  height: 12px;
  color: white;
}

.preview-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-text.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.preview-priority {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.preview-priority.high { background: rgba(239,68,68,0.15); color: var(--danger); }
.preview-priority.medium { background: rgba(245,158,11,0.15); color: var(--warning); }
.preview-priority.low { background: rgba(34,197,94,0.15); color: var(--success); }

.preview-days {
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.preview-days.normal { color: var(--accent-primary); }
.preview-days.soon { color: var(--warning); }
.preview-days.overdue { color: var(--danger); }

.empty-hint {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
  font-size: 13px;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

/* Progress */
.progress-section {
  margin-bottom: 20px;
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

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-pct {
  font-weight: 700;
  color: var(--accent-primary);
}

/* Priority Bars */
.priority-bars h4 {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.bar-label {
  font-size: 13px;
  color: var(--text-secondary);
  width: 52px;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.bar-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  width: 20px;
  text-align: right;
  flex-shrink: 0;
}

/* Countdowns */
.countdown-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}

.countdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.cd-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cd-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.cd-date {
  font-size: 12px;
  color: var(--text-muted);
}

.cd-days {
  text-align: center;
}

.cd-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  display: block;
}

.cd-unit {
  font-size: 11px;
  color: var(--text-muted);
}

.cd-days.normal .cd-num { color: var(--accent-primary); }
.cd-days.soon .cd-num { color: var(--warning); }
.cd-days.overdue .cd-num { color: var(--danger); }

/* Pinned Section */
.pinned-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.pinned-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pinned-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.15s;
}

.pinned-item:hover {
  border-color: rgba(251, 146, 60, 0.3);
}

.pin-icon {
  font-size: 14px;
}

.pinned-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
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
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .stat-card-inner {
    padding: 14px 16px;
    gap: 10px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
  }

  .stat-icon svg {
    width: 18px;
    height: 18px;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>
