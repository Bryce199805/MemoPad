<template>
  <div class="countdowns-page">
    <div class="page-header">
      <div class="header-content">
        <h1>Countdowns</h1>
        <p class="subtitle">Track your important dates</p>
      </div>
      <div class="header-actions">
        <Button v-if="selectedIds.size > 0" variant="danger" @click="batchDelete">
          Delete ({{ selectedIds.size }})
        </Button>
        <Button v-if="selectedIds.size > 0" variant="secondary" @click="clearSelection">
          Cancel
        </Button>
        <Button @click="openModal()" variant="primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Countdown
        </Button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item glass-card">
        <span class="stat-value">{{ upcomingCount }}</span>
        <span class="stat-label">Upcoming</span>
      </div>
      <div class="stat-item glass-card">
        <span class="stat-value warning">{{ dueSoonCount }}</span>
        <span class="stat-label">Due Soon</span>
      </div>
      <div class="stat-item glass-card">
        <span class="stat-value danger">{{ overdueCount }}</span>
        <span class="stat-label">Overdue</span>
      </div>
    </div>

    <!-- Select Mode Toggle -->
    <div class="toolbar glass-card">
      <div class="search-input">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="search" type="text" placeholder="Search countdowns..." />
      </div>
      <Button 
        :variant="selectMode ? 'primary' : 'secondary'" 
        size="sm" 
        @click="toggleSelectMode"
      >
        {{ selectMode ? 'Done' : 'Select' }}
      </Button>
    </div>

    <!-- Countdowns Grid -->
    <div class="countdowns-grid">
      <div 
        v-for="cd in filteredCountdowns" 
        :key="cd.id"
        class="countdown-card glass-card"
        :class="{ pinned: cd.pinned, selected: selectedIds.has(cd.id), selectable: selectMode }"
        @click="handleCardClick(cd.id)"
      >
        <div class="countdown-progress" :style="{ background: progressColor(cd.target_date) }"></div>
        
        <div class="countdown-content">
          <!-- Select Checkbox -->
          <div class="card-header">
            <button 
              v-if="selectMode"
              class="select-checkbox"
              :class="{ checked: selectedIds.has(cd.id) }"
              @click.stop="toggleSelect(cd.id)"
            >
              <svg v-if="selectedIds.has(cd.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </button>
            <div class="countdown-header">
              <h3>{{ cd.title }}</h3>
              <Badge :variant="priorityVariant(cd.priority)">{{ priorityText(cd.priority) }}</Badge>
            </div>
          </div>
          
          <div class="countdown-time">
            <span class="days" :class="daysClass(cd.target_date)">
              {{ Math.abs(daysLeft(cd.target_date)) }}
            </span>
            <span class="days-label">{{ daysLeft(cd.target_date) >= 0 ? 'days left' : 'days ago' }}</span>
          </div>
          
          <p class="countdown-date">{{ formatDate(cd.target_date) }}</p>
        </div>
        
        <div v-if="!selectMode" class="countdown-footer">
          <button 
            class="action-btn"
            :class="{ active: cd.pinned }"
            @click.stop="pinCountdown(cd)"
          >
            📌 {{ cd.pinned ? 'Pinned' : 'Pin' }}
          </button>
          <div class="action-group">
            <button class="action-btn" @click.stop="openModal(cd)">✏️</button>
            <button class="action-btn danger" @click.stop="deleteCountdown(cd.id)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredCountdowns.length === 0 && !countdownStore.loading" class="empty-state">
      <div class="empty-icon">⏰</div>
      <h3>{{ search ? 'No matching countdowns' : 'No countdowns yet' }}</h3>
      <p>{{ search ? 'Try a different search term' : 'Add a countdown to track important dates' }}</p>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal glass-card">
          <div class="modal-header">
            <h2>{{ editingCountdown ? 'Edit Countdown' : 'New Countdown' }}</h2>
          </div>
          <form @submit.prevent="saveCountdown" class="modal-body">
            <div class="form-group">
              <label>Title</label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="What are you counting down to?"
              />
            </div>

            <div class="form-group">
              <label>Target Date</label>
              <input
                v-model="form.target_date"
                type="datetime-local"
                :min="minDateTime"
                required
              />
            </div>

            <div class="form-group">
              <label>Priority</label>
              <select v-model="form.priority">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </form>
          <div class="modal-footer">
            <Button variant="secondary" @click="closeModal">Cancel</Button>
            <Button variant="primary" @click="saveCountdown">Save</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCountdownStore } from '../stores/countdown'
import { storeToRefs } from 'pinia'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'

const countdownStore = useCountdownStore()
const { countdowns } = storeToRefs(countdownStore)

const showModal = ref(false)
const editingCountdown = ref(null)
const form = ref({ title: '', target_date: '', priority: 'medium' })
const search = ref('')
const selectMode = ref(false)
const selectedIds = ref(new Set())

// Minimum datetime for picker (now)
const minDateTime = computed(() => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
})

function formatDateTimeLocal(dateStr) {
  const date = new Date(dateStr)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const filteredCountdowns = computed(() => {
  if (!search.value) {
    return [...countdowns.value].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
      return new Date(a.target_date) - new Date(b.target_date)
    })
  }
  return countdowns.value
    .filter(c => c.title.toLowerCase().includes(search.value.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
      return new Date(a.target_date) - new Date(b.target_date)
    })
})

const upcomingCount = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) > 7).length)
const dueSoonCount = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) >= 0 && daysLeft(c.target_date) <= 7).length)
const overdueCount = computed(() => countdowns.value.filter(c => daysLeft(c.target_date) < 0).length)

function daysLeft(date) {
  const target = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

function progressColor(date) {
  const days = daysLeft(date)
  if (days < 0) return 'var(--danger)'
  if (days <= 3) return 'var(--warning)'
  if (days <= 7) return 'var(--warning)'
  return 'var(--accent-primary)'
}

function daysClass(date) {
  const days = daysLeft(date)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  if (days <= 7) return 'warning'
  return 'normal'
}

function priorityVariant(p) {
  const map = { high: 'danger', medium: 'warning', low: 'success' }
  return map[p] || 'default'
}

function priorityText(p) {
  return { high: 'High', medium: 'Medium', low: 'Low' }[p] || 'Medium'
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    selectedIds.value.clear()
  }
}

function toggleSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function handleCardClick(id) {
  if (selectMode.value) {
    toggleSelect(id)
  }
}

function clearSelection() {
  selectedIds.value.clear()
  selectMode.value = false
}

async function batchDelete() {
  if (!confirm(`Delete ${selectedIds.value.size} countdowns?`)) return
  await countdownStore.batchDeleteCountdowns([...selectedIds.value])
  clearSelection()
}

function openModal(cd = null) {
  editingCountdown.value = cd
  if (cd) {
    form.value = {
      title: cd.title,
      target_date: formatDateTimeLocal(cd.target_date),
      priority: cd.priority
    }
  } else {
    form.value = { title: '', target_date: '', priority: 'medium' }
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCountdown.value = null
}

async function saveCountdown() {
  if (!form.value.title.trim() || !form.value.target_date) {
    return
  }
  
  const data = {
    title: form.value.title.trim(),
    target_date: new Date(form.value.target_date).toISOString(),
    priority: form.value.priority
  }
  
  if (editingCountdown.value) {
    await countdownStore.updateCountdown(editingCountdown.value.id, data)
  } else {
    await countdownStore.createCountdown(data)
  }
  closeModal()
}

async function pinCountdown(cd) {
  await countdownStore.updateCountdown(cd.id, { pinned: !cd.pinned })
}

async function deleteCountdown(id) {
  if (confirm('Delete this countdown?')) {
    await countdownStore.deleteCountdown(id)
  }
}

onMounted(() => countdownStore.fetchCountdowns())
</script>

<style scoped>
.countdowns-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Stats */
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.warning {
  color: var(--warning);
}

.stat-value.danger {
  color: var(--danger);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-input svg {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.search-input input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

/* Grid */
.countdowns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.countdown-card {
  overflow: hidden;
  transition: all var(--transition-fast);
}

.countdown-card.pinned {
  border-color: rgba(251, 146, 60, 0.3);
}

.countdown-card.selectable {
  cursor: pointer;
}

.countdown-card.selected {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.05);
}

.countdown-card.selectable:hover {
  background: var(--bg-hover);
}

.countdown-progress {
  height: 3px;
}

.countdown-content {
  padding: 20px;
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.select-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.select-checkbox:hover {
  border-color: var(--accent-primary);
}

.select-checkbox.checked {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.select-checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
}

.countdown-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex: 1;
}

.countdown-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.countdown-time {
  text-align: center;
  margin-bottom: 8px;
}

.days {
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
}

.days.normal {
  color: var(--accent-primary);
}

.days.warning {
  color: var(--warning);
}

.days.soon, .days.overdue {
  color: var(--danger);
}

.days-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.countdown-date {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.countdown-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-btn {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action-btn.active {
  color: var(--warning);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.action-group {
  display: flex;
  gap: 4px;
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 64px 32px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 14px;
}

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
  max-width: 420px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select {
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  color-scheme: dark;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--accent-primary);
  outline: none;
}

/* Responsive */
@media (max-width: 640px) {
  .stats-row {
    flex-direction: column;
  }
  
  .stat-item {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
