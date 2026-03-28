<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {{ authStore.user?.username }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div 
        class="stat-card glass-card" 
        :class="{ expanded: expandedSection === 'total' }"
        @click="toggleSection('total')"
      >
        <div class="stat-main">
          <div class="stat-icon" :style="{ background: iconColors.blue }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Total Tasks</p>
            <p class="stat-value">{{ stats.todos?.total || 0 }}</p>
          </div>
          <span class="expand-icon">{{ expandedSection === 'total' ? '▲' : '▼' }}</span>
        </div>
        <Transition name="expand">
          <div v-if="expandedSection === 'total'" class="stat-preview" @click.stop>
            <div class="preview-tasks">
              <div v-for="todo in allTasks.slice(0, 5)" :key="todo.id" class="preview-task">
                <button class="mini-checkbox" :class="{ checked: todo.done }" @click.stop="toggleTodo(todo.id)">
                  <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </button>
                <span class="task-text" :class="{ done: todo.done }">{{ todo.content }}</span>
              </div>
              <p v-if="todos.length === 0" class="no-tasks">No tasks yet</p>
            </div>
          </div>
        </Transition>
      </div>

      <div 
        class="stat-card glass-card"
        :class="{ expanded: expandedSection === 'done' }"
        @click="toggleSection('done')"
      >
        <div class="stat-main">
          <div class="stat-icon" :style="{ background: iconColors.green }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Completed</p>
            <p class="stat-value">{{ stats.todos?.done || 0 }}</p>
          </div>
          <span class="expand-icon">{{ expandedSection === 'done' ? '▲' : '▼' }}</span>
        </div>
        <Transition name="expand">
          <div v-if="expandedSection === 'done'" class="stat-preview" @click.stop>
            <div class="preview-tasks">
              <div v-for="todo in completedTasks.slice(0, 5)" :key="todo.id" class="preview-task">
                <button class="mini-checkbox checked" @click.stop="toggleTodo(todo.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </button>
                <span class="task-text done">{{ todo.content }}</span>
              </div>
              <p v-if="completedTasks.length === 0" class="no-tasks">No completed tasks</p>
            </div>
          </div>
        </Transition>
      </div>

      <div 
        class="stat-card glass-card"
        :class="{ expanded: expandedSection === 'pending' }"
        @click="toggleSection('pending')"
      >
        <div class="stat-main">
          <div class="stat-icon" :style="{ background: iconColors.yellow }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Pending</p>
            <p class="stat-value">{{ stats.todos?.pending || 0 }}</p>
          </div>
          <span class="expand-icon">{{ expandedSection === 'pending' ? '▲' : '▼' }}</span>
        </div>
        <Transition name="expand">
          <div v-if="expandedSection === 'pending'" class="stat-preview" @click.stop>
            <div class="preview-tasks">
              <div v-for="todo in pendingTasks.slice(0, 5)" :key="todo.id" class="preview-task">
                <button class="mini-checkbox" @click.stop="toggleTodo(todo.id)"></button>
                <span class="task-text">{{ todo.content }}</span>
              </div>
              <p v-if="pendingTasks.length === 0" class="no-tasks">No pending tasks</p>
            </div>
          </div>
        </Transition>
      </div>

      <div 
        class="stat-card glass-card"
        :class="{ expanded: expandedSection === 'due' }"
        @click="toggleSection('due')"
      >
        <div class="stat-main">
          <div class="stat-icon" :style="{ background: iconColors.purple }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Due Soon</p>
            <p class="stat-value">{{ stats.countdowns?.due_soon || 0 }}</p>
          </div>
          <span class="expand-icon">{{ expandedSection === 'due' ? '▲' : '▼' }}</span>
        </div>
        <Transition name="expand">
          <div v-if="expandedSection === 'due'" class="stat-preview" @click.stop>
            <div class="preview-countdowns">
              <div v-for="cd in dueSoonCountdowns" :key="cd.id" class="preview-countdown">
                <span class="countdown-title">{{ cd.title }}</span>
                <span class="countdown-days" :class="getDaysClass(cd.target_date)">{{ daysLeft(cd.target_date) }}d</span>
              </div>
              <p v-if="dueSoonCountdowns.length === 0" class="no-tasks">No upcoming countdowns</p>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Progress Section -->
    <div class="content-grid">
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
        
        <!-- Recent Tasks -->
        <div class="recent-section">
          <div class="recent-header">
            <h4>Recent Pending Tasks</h4>
            <router-link to="/todos" class="view-all">View all →</router-link>
          </div>
          <div v-if="pendingTasks.length === 0" class="empty-state">
            <p>No pending tasks</p>
          </div>
          <div v-else class="recent-tasks">
            <div 
              v-for="todo in pendingTasks.slice(0, 5)" 
              :key="todo.id" 
              class="task-item"
            >
              <button 
                class="task-checkbox"
                :class="{ checked: todo.done }"
                @click="toggleTodo(todo.id)"
              >
                <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </button>
              <span class="task-content" :class="{ done: todo.done }">{{ todo.content }}</span>
              <span class="task-priority" :class="todo.priority">{{ todo.priority }}</span>
            </div>
          </div>
        </div>
      </Card>

      <!-- Upcoming Countdowns -->
      <Card class="countdowns-card">
        <template #header>Upcoming Countdowns</template>
        <div v-if="upcomingCountdowns.length === 0" class="empty-state">
          <p>No upcoming countdowns</p>
        </div>
        <div v-else class="upcoming-countdowns">
          <div v-for="cd in upcomingCountdowns.slice(0, 5)" :key="cd.id" class="countdown-item">
            <div class="countdown-info">
              <span class="countdown-title">{{ cd.title }}</span>
              <span class="countdown-date">{{ formatDate(cd.target_date) }}</span>
            </div>
            <div class="countdown-days" :class="getDaysClass(cd.target_date)">
              <span class="days-num">{{ Math.abs(daysLeft(cd.target_date)) }}</span>
              <span class="days-label">{{ daysLeft(cd.target_date) >= 0 ? 'days' : 'ago' }}</span>
            </div>
          </div>
        </div>
        <router-link to="/countdowns" class="view-all">View all →</router-link>
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
const expandedSection = ref(null)

const iconColors = {
  blue: 'rgba(99, 102, 241, 0.2)',
  green: 'rgba(34, 197, 94, 0.2)',
  yellow: 'rgba(245, 158, 11, 0.2)',
  purple: 'rgba(139, 92, 246, 0.2)'
}

// Computed
const allTasks = computed(() => [...todos.value].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const completedTasks = computed(() => todos.value.filter(t => t.done))
const pendingTasks = computed(() => todos.value.filter(t => !t.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const upcomingCountdowns = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0).sort((a, b) => new Date(a.target_date) - new Date(b.target_date)))
const dueSoonCountdowns = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0 && daysLeft(c.target_date) <= 7))

// Methods
function toggleSection(section) {
  expandedSection.value = expandedSection.value === section ? null : section
}

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
  // Refresh stats after toggle
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
  margin-bottom: 28px;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.expanded {
  grid-column: span 1;
}

.stat-main {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  color: var(--text-primary);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.expand-icon {
  font-size: 12px;
  color: var(--text-muted);
}

/* Preview Section */
.stat-preview {
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-subtle);
  margin-top: 0;
}

.preview-tasks, .preview-countdowns {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.preview-task, .preview-countdown {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.mini-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-checkbox.checked {
  background: var(--success);
  border-color: var(--success);
}

.mini-checkbox svg {
  width: 12px;
  height: 12px;
  color: white;
}

.task-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-text.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.no-tasks {
  text-align: center;
  color: var(--text-muted);
  padding: 16px;
  font-size: 13px;
}

.countdown-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.countdown-days {
  text-align: center;
}

.countdown-days.normal { color: var(--accent-primary); }
.countdown-days.soon { color: var(--warning); }
.countdown-days.overdue { color: var(--danger); }

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  max-height: 300px;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Progress */
.progress-content {
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

/* Recent Section */
.recent-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.recent-header h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.view-all {
  font-size: 13px;
  color: var(--accent-primary);
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.recent-tasks {
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

.task-content {
  flex: 1;
  font-size: 15px;
  color: var(--text-primary);
}

.task-content.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.task-priority {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.task-priority.high { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
.task-priority.medium { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
.task-priority.low { background: rgba(34, 197, 94, 0.15); color: var(--success); }

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 14px;
}

/* Countdowns */
.upcoming-countdowns {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

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

.countdown-info .countdown-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.countdown-date {
  font-size: 12px;
  color: var(--text-muted);
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
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card.expanded {
    grid-column: span 1;
  }
}
</style>
