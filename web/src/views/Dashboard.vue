<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {{ authStore.user?.username }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <StatCard 
        label="Total Tasks" 
        :value="stats.todos?.total || 0" 
        :icon-bg="iconColors.blue"
        class="clickable"
        @click="showTasks('all')"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </template>
      </StatCard>

      <StatCard 
        label="Completed" 
        :value="stats.todos?.done || 0" 
        :icon-bg="iconColors.green"
        class="clickable"
        @click="showTasks('done')"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        </template>
      </StatCard>

      <StatCard 
        label="Pending" 
        :value="stats.todos?.pending || 0" 
        :icon-bg="iconColors.yellow"
        class="clickable"
        @click="showTasks('pending')"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </template>
      </StatCard>

      <StatCard 
        label="Due Soon" 
        :value="stats.countdowns?.due_soon || 0" 
        :icon-bg="iconColors.purple"
        class="clickable"
        @click="showTasks('due')"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
          </svg>
        </template>
      </StatCard>
    </div>

    <!-- Progress & Recent Tasks -->
    <div class="content-grid">
      <!-- Progress Card -->
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
        
        <!-- Recent Pending Tasks -->
        <div class="recent-tasks">
          <h4>Recent Pending Tasks</h4>
          <div v-if="pendingTasks.length === 0" class="empty-tasks">
            <p>No pending tasks</p>
          </div>
          <div v-else class="task-list">
            <div 
              v-for="todo in pendingTasks.slice(0, 5)" 
              :key="todo.id" 
              class="task-item"
              @click="goToTodos(todo.id)"
            >
              <button 
                class="mini-checkbox"
                :class="{ checked: todo.done }"
                @click.stop="toggleTodo(todo.id)"
              >
                <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </button>
              <span class="task-text" :class="{ done: todo.done }">{{ todo.content }}</span>
              <Badge :variant="getPriorityVariant(todo.priority)" size="sm">{{ getPriorityLabel(todo.priority) }}</Badge>
            </div>
          </div>
          <router-link to="/todos" class="view-all">View all tasks →</router-link>
        </div>
      </Card>

      <!-- Upcoming Countdowns -->
      <Card class="countdowns-card">
        <template #header>Upcoming Countdowns</template>
        <div class="countdown-list">
          <div v-if="upcomingCountdowns.length === 0" class="empty-countdowns">
            <p>No upcoming countdowns</p>
          </div>
          <div 
            v-for="cd in upcomingCountdowns.slice(0, 5)" 
            :key="cd.id" 
            class="countdown-item"
            @click="goToCountdowns(cd.id)"
          >
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
        <router-link to="/countdowns" class="view-all">View all countdowns →</router-link>
      </Card>
    </div>

    <!-- Task Preview Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal glass-card">
          <div class="modal-header">
            <h2>{{ modalTitle }}</h2>
            <button class="close-btn" @click="closeModal">×</button>
          </div>
          <div class="modal-body">
            <div v-if="modalTasks.length === 0" class="empty-state">
              <p>No tasks in this category</p>
            </div>
            <div v-else class="task-list">
              <div 
                v-for="todo in modalTasks" 
                :key="todo.id" 
                class="task-item"
                @click="goToTodos(todo.id)"
              >
                <button 
                  class="mini-checkbox"
                  :class="{ checked: todo.done }"
                  @click.stop="toggleTodo(todo.id)"
                >
                  <svg v-if="todo.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </button>
                <span class="task-text" :class="{ done: todo.done }">{{ todo.content }}</span>
                <Badge :variant="getPriorityVariant(todo.priority)" size="sm">{{ getPriorityLabel(todo.priority) }}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTodoStore } from '../stores/todo'
import { useCountdownStore } from '../stores/countdown'
import { storeToRefs } from 'pinia'
import api from '../api/client'
import StatCard from '../components/ui/StatCard.vue'
import Card from '../components/ui/Card.vue'
import Badge from '../components/ui/Badge.vue'

const router = useRouter()
const authStore = useAuthStore()
const todoStore = useTodoStore()
const countdownStore = useCountdownStore()
const { todos } = storeToRefs(todoStore)
const { countdowns } = storeToRefs(countdownStore)

const stats = ref({ todos: {}, countdowns: {} })
const loading = ref(true)
const showModal = ref(false)
const modalType = ref('all')

const iconColors = {
  blue: 'rgba(99, 102, 241, 0.15)',
  green: 'rgba(34, 197, 94, 0.15)',
  yellow: 'rgba(245, 158, 11, 0.15)',
  purple: 'rgba(139, 92, 246, 0.15)'
}

const pendingTasks = computed(() => todos.value.filter(t => !t.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
const upcomingCountdowns = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0).sort((a, b) => new Date(a.target_date) - new Date(b.target_date)))

const modalTitle = computed(() => {
  const titles = {
    all: 'All Tasks',
    done: 'Completed Tasks',
    pending: 'Pending Tasks',
    due: 'Due Soon'
  }
  return titles[modalType.value] || 'Tasks'
})

const modalTasks = computed(() => {
  switch (modalType.value) {
    case 'done': return todos.value.filter(t => t.done)
    case 'pending': return pendingTasks.value
    case 'due': return todos.value.filter(t => !t.done && t.due_date && daysLeft(t.due_date) <= 7 && daysLeft(t.due_date) >= 0)
    default: return todos.value
  }
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

function getPriorityVariant(p) {
  return { high: 'danger', medium: 'warning', low: 'success' }[p] || 'default'
}

function getPriorityLabel(p) {
  return { high: 'H', medium: 'M', low: 'L' }[p] || 'M'
}

function getDaysClass(date) {
  const days = daysLeft(date)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'normal'
}

function showTasks(type) {
  modalType.value = type
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function goToTodos(id) {
  closeModal()
  router.push('/todos')
}

function goToCountdowns(id) {
  router.push('/countdowns')
}

async function toggleTodo(id) {
  await todoStore.toggleTodo(id)
}

async function fetchAll() {
  loading.value = true
  try {
    const [statsRes] = await Promise.all([
      api.get('/api/stats'),
      todoStore.fetchTodos(),
      countdownStore.fetchCountdowns()
    ])
    stats.value = statsRes.data.data || statsRes.data
  } catch (e) {
    console.error('Failed to fetch data:', e)
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

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
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
  height: 12px;
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

/* Recent Tasks */
.recent-tasks h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.task-item:hover {
  background: var(--bg-hover);
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

.empty-tasks, .empty-countdowns {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.view-all {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  color: var(--accent-primary);
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

/* Countdowns */
.countdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  margin-bottom: 8px;
}

.countdown-item:hover {
  background: var(--bg-hover);
}

.countdown-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.countdown-title {
  font-size: 14px;
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

.days-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.days-label {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
}

.countdown-days.normal .days-num { color: var(--accent-primary); }
.countdown-days.soon .days-num { color: var(--warning); }
.countdown-days.overdue .days-num { color: var(--danger); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 500px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  font-size: 24px;
  color: var(--text-muted);
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 16px 24px 24px;
  overflow-y: auto;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
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
}
</style>
