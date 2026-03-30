<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1>{{ $t('dashboard.title') }}</h1>
        <p class="subtitle">{{ $t('dashboard.welcomeBack', { username: authStore.user?.username }) }} &middot; {{ todayDate }}</p>
      </div>
    </div>

    <!-- Stat Cards Row - compact, click to expand -->
    <div class="stats-row">
      <div
        v-for="stat in statCards"
        :key="stat.key"
        class="stat-card glass-card"
        :class="{ active: expanded === stat.key }"
        @click="expanded = expanded === stat.key ? null : stat.key"
      >
        <div class="stat-icon" :style="{ background: stat.color }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="stat.key === 'total'" d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            <path v-else-if="stat.key === 'done'" d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>
            <template v-else-if="stat.key === 'pending'"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></template>
            <polygon v-if="stat.key === 'due'" points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value">{{ stat.value }}</span>
        </div>
      </div>
    </div>

    <!-- Expandable Preview -->
    <Transition name="slide">
      <div v-if="expanded" class="preview-panel glass-card">
        <div class="preview-header">
          <h3>{{ expandedLabel }}</h3>
          <router-link :to="expandedLink" class="view-all">{{ $t('dashboard.viewAll') }}</router-link>
        </div>
        <div class="preview-list">
          <template v-if="expanded === 'due'">
            <div v-for="cd in upcomingCountdowns" :key="cd.id" class="preview-item">
              <span class="preview-text">{{ cd.title }}</span>
              <span class="preview-days" :class="daysClass(cd.target_date)">{{ daysLeft(cd.target_date) }}d</span>
            </div>
          </template>
          <template v-else>
            <div v-for="todo in expandedList" :key="todo.id" class="preview-item">
              <button class="mini-check" :class="{ checked: todo.done }" @click.stop="toggleTodo(todo.id)">
                <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>
              </button>
              <span class="preview-text" :class="{ done: todo.done }">{{ todo.content }}</span>
              <span class="preview-priority" :class="todo.priority">{{ priorityLabel(todo.priority) }}</span>
            </div>
          </template>
          <p v-if="expandedList.length === 0" class="empty-hint">{{ expandedEmptyText }}</p>
        </div>
      </div>
    </Transition>

    <!-- Main Content Grid -->
    <div class="main-grid">
      <!-- Left Column -->
      <div class="left-col">
        <!-- Task Progress -->
        <Card class="progress-card">
          <template #header>
            <div class="card-title-row">
              <span>{{ $t('dashboard.taskProgress') }}</span>
              <span class="progress-pct">{{ completionRate }}%</span>
            </div>
          </template>
          <div class="progress-bar-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: completionRate + '%' }"></div>
            </div>
            <div class="progress-meta">
              <span>{{ $t('dashboard.progressText', { done: stats.todos?.done || 0, total: stats.todos?.total || 0 }) }}</span>
            </div>
          </div>
          <div class="priority-section">
            <h4>{{ $t('dashboard.byPriority') }}</h4>
            <div class="bar-row" v-for="p in priorityBars" :key="p.key">
              <span class="bar-label">{{ p.label }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: p.pct + '%', background: p.color }"></div></div>
              <span class="bar-count">{{ p.count }}</span>
            </div>
          </div>
        </Card>

        <!-- Pinned Tasks -->
        <Card v-if="pinnedTodos.length > 0" class="pinned-card">
          <template #header>
            <div class="card-title-row">
              <span>{{ $t('dashboard.pinned') }}</span>
              <router-link to="/todos" class="view-all">{{ $t('dashboard.viewAll') }}</router-link>
            </div>
          </template>
          <div class="pinned-list">
            <div v-for="todo in pinnedTodos" :key="todo.id" class="pinned-item">
              <button class="mini-check" :class="{ checked: todo.done }" @click="toggleTodo(todo.id)">
                <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>
              </button>
              <span class="pinned-text" :class="{ done: todo.done }">{{ todo.content }}</span>
            </div>
          </div>
        </Card>
      </div>

      <!-- Right Column -->
      <div class="right-col">
        <!-- Upcoming Countdowns -->
        <Card class="countdown-card">
          <template #header>
            <div class="card-title-row">
              <span>{{ $t('dashboard.upcomingCountdowns') }}</span>
              <router-link to="/countdowns" class="view-all">{{ $t('dashboard.viewAll') }}</router-link>
            </div>
          </template>
          <div v-if="upcomingCountdowns.length === 0" class="empty-hint">{{ $t('dashboard.noDeadlines') }}</div>
          <div v-else class="cd-list">
            <div v-for="cd in upcomingCountdowns.slice(0, 5)" :key="cd.id" class="cd-row">
              <div class="cd-info">
                <span class="cd-title">{{ cd.title }}</span>
                <span class="cd-date">{{ formatDate(cd.target_date) }}</span>
              </div>
              <div class="cd-days" :class="daysClass(cd.target_date)">
                <span class="cd-num">{{ Math.abs(daysLeft(cd.target_date)) }}</span>
                <span class="cd-unit">{{ daysLeft(cd.target_date) >= 0 ? $t('dashboard.days') : $t('dashboard.ago') }}</span>
              </div>
            </div>
          </div>
        </Card>

        <!-- Overdue / Due Soon Alerts -->
        <Card v-if="overdueTodos.length > 0" class="alert-card">
          <template #header>
            <div class="card-title-row">
              <span>{{ $t('dashboard.overdueTasks') }}</span>
              <span class="alert-badge">{{ overdueTodos.length }}</span>
            </div>
          </template>
          <div class="overdue-list">
            <div v-for="todo in overdueTodos" :key="todo.id" class="overdue-item">
              <span class="overdue-text">{{ todo.content }}</span>
              <span class="overdue-date">{{ formatDate(todo.due_date) }}</span>
            </div>
          </div>
        </Card>

        <!-- Recent Completed -->
        <Card v-if="completedTasks.length > 0" class="recent-card">
          <template #header>
            <div class="card-title-row">
              <span>{{ $t('dashboard.recentlyCompleted') }}</span>
            </div>
          </template>
          <div class="completed-list">
            <div v-for="todo in completedTasks.slice(0, 5)" :key="todo.id" class="completed-item">
              <button class="mini-check checked" @click="toggleTodo(todo.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>
              </button>
              <span class="completed-text">{{ todo.content }}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>{{ $t('dashboard.loading') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useTodoStore } from '../stores/todo'
import { useCountdownStore } from '../stores/countdown'
import { storeToRefs } from 'pinia'
import api from '../api/client'
import Card from '../components/ui/Card.vue'

const { t, locale } = useI18n()
const authStore = useAuthStore()
const todoStore = useTodoStore()
const countdownStore = useCountdownStore()
const { todos } = storeToRefs(todoStore)
const { countdowns } = storeToRefs(countdownStore)

const stats = ref({ todos: {}, countdowns: {} })
const loading = ref(true)
const expanded = ref(null)

const todayDate = computed(() =>
  new Date().toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })
)

const statCards = computed(() => [
  { key: 'total', label: t('dashboard.totalTodos'), value: stats.value.todos?.total || 0, color: 'rgba(99, 102, 241, 0.15)' },
  { key: 'done', label: t('dashboard.completed'), value: stats.value.todos?.done || 0, color: 'rgba(34, 197, 94, 0.15)' },
  { key: 'pending', label: t('dashboard.pending'), value: stats.value.todos?.pending || 0, color: 'rgba(245, 158, 11, 0.15)' },
  { key: 'due', label: t('dashboard.dueSoon'), value: stats.value.countdowns?.due_soon || 0, color: 'rgba(139, 92, 246, 0.15)' }
])

const expandedLabel = computed(() => ({
  total: t('dashboard.allTasks'),
  done: t('dashboard.completedTasks'),
  pending: t('dashboard.pendingTasks'),
  due: t('dashboard.upcomingDeadlines')
}[expanded.value] || ''))
const expandedLink = computed(() => expanded.value === 'due' ? '/countdowns' : '/todos')
const expandedEmptyText = computed(() => expanded.value === 'due' ? t('dashboard.noDeadlines') : expanded.value === 'done' ? t('dashboard.noCompletedTasks') : t('dashboard.noTasks'))

const expandedList = computed(() => {
  if (expanded.value === 'total') return [...todos.value].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  if (expanded.value === 'done') return todos.value.filter(t => t.done).sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
  if (expanded.value === 'pending') return todos.value.filter(t => !t.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return []
})

const recentTasks = computed(() => [...todos.value].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const completedTasks = computed(() => todos.value.filter(t => t.done).sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)))
const pendingTasks = computed(() => todos.value.filter(t => !t.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const pinnedTodos = computed(() => todos.value.filter(t => t.pinned && !t.done))
const upcomingCountdowns = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0).sort((a, b) => new Date(a.target_date) - new Date(b.target_date)))
const completionRate = computed(() => Math.round(stats.value.todos?.completion_rate || 0))

const overdueTodos = computed(() =>
  todos.value.filter(t => !t.done && t.due_date && daysLeft(t.due_date) < 0)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
)

const priorityBars = computed(() => {
  const bp = stats.value.todos?.by_priority || {}
  const pending = stats.value.todos?.pending || 1
  return [
    { key: 'high', label: t('common.high'), count: bp.high || 0, pct: Math.round(((bp.high || 0) / pending) * 100), color: 'var(--danger)' },
    { key: 'medium', label: t('common.medium'), count: bp.medium || 0, pct: Math.round(((bp.medium || 0) / pending) * 100), color: 'var(--warning)' },
    { key: 'low', label: t('common.low'), count: bp.low || 0, pct: Math.round(((bp.low || 0) / pending) * 100), color: 'var(--success)' }
  ]
})

function priorityLabel(p) { return { high: 'H', medium: 'M', low: 'L' }[p] || 'M' }
function daysLeft(date) {
  const t2 = new Date(date), n = new Date()
  n.setHours(0,0,0,0); t2.setHours(0,0,0,0)
  return Math.ceil((t2 - n) / 864e5)
}
function formatDate(date) { return new Date(date).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }) }
function daysClass(date) { const d = daysLeft(date); return d < 0 ? 'overdue' : d <= 3 ? 'soon' : 'normal' }

async function toggleTodo(id) { await todoStore.toggleTodo(id); await fetchStats() }

async function fetchStats() {
  try { const r = await api.get('/api/stats'); stats.value = r.data.data || r.data } catch(e) { console.error(e) }
}

async function fetchAll() {
  loading.value = true
  try { await Promise.all([fetchStats(), todoStore.fetchTodos(), countdownStore.fetchCountdowns()]) } finally { loading.value = false }
}

onMounted(fetchAll)
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; }

/* Header */
.dashboard-header { margin-bottom: 24px; }
.dashboard-header h1 { font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.subtitle { color: var(--text-secondary); font-size: 15px; }

/* Stat Cards - horizontal row */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.stat-card:hover { transform: translateY(-2px); }
.stat-card.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 1px var(--accent-primary), 0 4px 16px rgba(99, 102, 241, 0.15);
}

.stat-card .stat-icon {
  width: 42px; height: 42px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.stat-card .stat-icon svg { width: 20px; height: 20px; color: var(--text-primary); }

.stat-card .stat-info { display: flex; flex-direction: column; gap: 1px; }
.stat-card .stat-label { font-size: 12px; color: var(--text-muted); }
.stat-card .stat-value { font-size: 26px; font-weight: 700; color: var(--text-primary); line-height: 1; }

/* Inner layout of stat card */
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}

/* Preview Panel */
.preview-panel { padding: 20px; margin-top: 12px; margin-bottom: 24px; }

.preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.preview-header h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); }

.view-all { font-size: 13px; color: var(--accent-primary); text-decoration: none; }
.view-all:hover { text-decoration: underline; }

.preview-list { display: flex; flex-direction: column; gap: 6px; }

.preview-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 8px; transition: background 0.15s; }
.preview-item:hover { background: var(--bg-hover); }

.mini-check { width: 18px; height: 18px; border: 2px solid var(--border-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
.mini-check:hover { border-color: var(--accent-primary); }
.mini-check.checked { background: var(--success); border-color: var(--success); }
.mini-check svg { width: 12px; height: 12px; color: white; }

.preview-text { flex: 1; font-size: 14px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.preview-text.done { text-decoration: line-through; color: var(--text-muted); }

.preview-priority { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
.preview-priority.high { background: rgba(239,68,68,0.15); color: var(--danger); }
.preview-priority.medium { background: rgba(245,158,11,0.15); color: var(--warning); }
.preview-priority.low { background: rgba(34,197,94,0.15); color: var(--success); }

.preview-days { font-size: 14px; font-weight: 600; flex-shrink: 0; }
.preview-days.normal { color: var(--accent-primary); }
.preview-days.soon { color: var(--warning); }
.preview-days.overdue { color: var(--danger); }

.empty-hint { text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; }

/* Slide Animation */
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; max-height: 500px; overflow: hidden; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; margin-top: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }

/* Main Grid: 2 columns */
.main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.left-col, .right-col { display: flex; flex-direction: column; gap: 20px; }

.card-title-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.progress-pct { font-size: 16px; font-weight: 700; color: var(--accent-primary); }
.alert-badge { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: rgba(239,68,68,0.15); color: var(--danger); }

/* Progress */
.progress-bar-wrap { margin-bottom: 20px; }
.progress-bar { height: 10px; background: var(--bg-tertiary); border-radius: 999px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: var(--accent-gradient); border-radius: 999px; transition: width 0.5s ease; }
.progress-meta { font-size: 13px; color: var(--text-secondary); }

.priority-section h4 { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.bar-label { font-size: 13px; color: var(--text-secondary); width: 52px; flex-shrink: 0; }
.bar-track { flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.bar-count { font-size: 13px; font-weight: 600; color: var(--text-secondary); width: 20px; text-align: right; flex-shrink: 0; }

/* Pinned */
.pinned-list { display: flex; flex-direction: column; gap: 6px; }
.pinned-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 8px; }
.pinned-text { flex: 1; font-size: 14px; color: var(--text-primary); }
.pinned-text.done { text-decoration: line-through; color: var(--text-muted); }

/* Countdowns */
.cd-list { display: flex; flex-direction: column; gap: 8px; }
.cd-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 8px; }
.cd-info { display: flex; flex-direction: column; gap: 2px; }
.cd-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.cd-date { font-size: 12px; color: var(--text-muted); }
.cd-days { text-align: center; }
.cd-num { font-size: 22px; font-weight: 700; line-height: 1; display: block; }
.cd-unit { font-size: 11px; color: var(--text-muted); }
.cd-days.normal .cd-num { color: var(--accent-primary); }
.cd-days.soon .cd-num { color: var(--warning); }
.cd-days.overdue .cd-num { color: var(--danger); }

/* Overdue */
.alert-card { border-color: rgba(239,68,68,0.2); }
.overdue-list { display: flex; flex-direction: column; gap: 6px; }
.overdue-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(239,68,68,0.05); border-radius: 8px; }
.overdue-text { flex: 1; font-size: 14px; color: var(--danger); }
.overdue-date { font-size: 12px; color: var(--text-muted); }

/* Recently Completed */
.completed-list { display: flex; flex-direction: column; gap: 6px; }
.completed-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: 8px; }
.completed-text { flex: 1; font-size: 14px; color: var(--text-muted); text-decoration: line-through; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; padding: 48px; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--border-color); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 1024px) { .main-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .stats-row { flex-wrap: wrap; } .stat-card { min-width: calc(50% - 6px); } }
@media (max-width: 640px) { .stat-card { min-width: calc(50% - 6px); } .stat-card .stat-icon { width: 36px; height: 36px; } .stat-card .stat-icon svg { width: 18px; height: 18px; } .stat-card .stat-value { font-size: 20px; } }
</style>
