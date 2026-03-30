<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>{{ $t('admin.dashboard') }}</h1>
      <p class="subtitle">{{ $t('admin.systemOverview') }}</p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <router-link to="/admin/users" class="stat-card">
        <div class="stat-icon users">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.total || 0 }}</span>
          <span class="stat-label">{{ $t('admin.totalUsers') }}</span>
        </div>
      </router-link>
      <router-link to="/admin/users" class="stat-card">
        <div class="stat-icon active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.active || 0 }}</span>
          <span class="stat-label">{{ $t('admin.activeUsers') }}</span>
        </div>
      </router-link>
      <router-link to="/admin/tickets" class="stat-card">
        <div class="stat-icon tickets">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ openTicketCount }}</span>
          <span class="stat-label">{{ $t('admin.openTickets') }}</span>
        </div>
      </router-link>
      <div class="stat-card">
        <div class="stat-icon recent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.recent || 0 }}</span>
          <span class="stat-label">{{ $t('admin.newThisWeek') }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <Card>
        <template #header>{{ $t('admin.dataOverview') }}</template>
        <div class="data-stats">
          <div class="data-stat">
            <span class="data-label">{{ $t('admin.totalTodos') }}</span>
            <span class="data-value">{{ stats.data?.todos || 0 }}</span>
          </div>
          <div class="data-stat">
            <span class="data-label">{{ $t('admin.totalCountdowns') }}</span>
            <span class="data-value">{{ stats.data?.countdowns || 0 }}</span>
          </div>
          <div class="data-stat">
            <span class="data-label">{{ $t('admin.totalCategories') }}</span>
            <span class="data-value">{{ stats.data?.categories || 0 }}</span>
          </div>
          <div class="data-stat">
            <span class="data-label">{{ $t('admin.totalTickets') }}</span>
            <span class="data-value">{{ totalTicketCount }}</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Recent Activity -->
    <div class="recent-section" v-if="recentTickets.length > 0">
      <Card>
        <template #header>{{ $t('admin.recentTickets') }}</template>
        <div class="recent-tickets">
          <div v-for="ticket in recentTickets" :key="ticket.id" class="recent-ticket">
            <div class="ticket-info">
              <span class="ticket-title">{{ ticket.title }}</span>
              <span class="ticket-user">{{ $t('admin.by') }} {{ ticket.username }}</span>
            </div>
            <span :class="['ticket-status', ticket.status]">{{ formatStatus(ticket.status) }}</span>
          </div>
        </div>
        <router-link to="/admin/tickets" class="view-all-link">{{ $t('admin.viewAllTickets') }}</router-link>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../../components/ui/Card.vue'
import api from '../../api/client'

const { t } = useI18n()

const stats = ref({})
const tickets = ref([])

const openTicketCount = computed(() => {
  return tickets.value.filter(t => t.status === 'open' || t.status === 'in_progress').length
})

const totalTicketCount = computed(() => tickets.value.length)

const recentTickets = computed(() => tickets.value.slice(0, 5))

async function fetchStats() {
  try {
    const res = await api.get('/api/admin/stats')
    stats.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  }
}

async function fetchTickets() {
  try {
    const res = await api.get('/api/admin/tickets')
    tickets.value = res.data.data || []
  } catch (e) {
    console.error('Failed to fetch tickets:', e)
  }
}

function formatStatus(status) {
  const map = {
    'open': t('feedback.statusOpen'),
    'in_progress': t('feedback.statusInProgress'),
    'resolved': t('feedback.statusResolved'),
    'closed': t('feedback.statusClosed')
  }
  return map[status] || status
}

onMounted(() => {
  fetchStats()
  fetchTickets()
})
</script>

<style scoped>
/* Admin Theme - Teal/Cyan colors */
.admin-theme {
  --admin-primary: #14b8a6;
  --admin-secondary: #06b6d4;
  --admin-gradient: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
}

.admin-page {
  max-width: 1200px;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.stat-card:hover {
  border-color: #14b8a6;
  box-shadow: 0 0 20px rgba(20, 184, 166, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  color: var(--text-primary);
}

.stat-icon.users { background: rgba(20, 184, 166, 0.2); }
.stat-icon.active { background: rgba(34, 197, 94, 0.2); }
.stat-icon.tickets { background: rgba(245, 158, 11, 0.2); }
.stat-icon.recent { background: rgba(6, 182, 212, 0.2); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Quick Stats */
.quick-stats {
  margin-bottom: 24px;
}

.data-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.data-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.data-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.data-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 4px;
}

/* Recent Tickets */
.recent-section {
  margin-bottom: 24px;
}

.recent-tickets {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.recent-ticket {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.ticket-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ticket-title {
  font-weight: 500;
  color: var(--text-primary);
}

.ticket-user {
  font-size: 12px;
  color: var(--text-muted);
}

.ticket-status {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
}

.ticket-status.open { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.ticket-status.in_progress { background: rgba(234, 179, 8, 0.2); color: #eab308; }
.ticket-status.resolved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.ticket-status.closed { background: rgba(107, 114, 128, 0.2); color: #6b7280; }

.view-all-link {
  display: inline-block;
  color: #14b8a6;
  font-weight: 500;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
