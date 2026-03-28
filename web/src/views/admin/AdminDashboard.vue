<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>Dashboard</h1>
      <p class="subtitle">System overview</p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <router-link to="/admin/users" class="stat-card">
        <div class="stat-icon users"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.total || 0 }}</span>
          <span class="stat-label">Total Users</span>
        </div>
      </router-link>
      <router-link to="/admin/users" class="stat-card">
        <div class="stat-icon active"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.active || 0 }}</span>
          <span class="stat-label">Active Users</span>
        </div>
      </router-link>
      <router-link to="/admin/tickets" class="stat-card">
        <div class="stat-icon tickets"></div>
        <div class="stat-info">
          <span class="stat-value">{{ openTicketCount }}</span>
          <span class="stat-label">Open Tickets</span>
        </div>
      </router-link>
      <div class="stat-card">
        <div class="stat-icon recent"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.recent || 0 }}</span>
          <span class="stat-label">New This Week</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <Card>
        <template #header>Data Overview</template>
        <div class="data-stats">
          <div class="data-stat">
            <span class="data-label">Total Todos</span>
            <span class="data-value">{{ stats.data?.todos || 0 }}</span>
          </div>
          <div class="data-stat">
            <span class="data-label">Total Countdowns</span>
            <span class="data-value">{{ stats.data?.countdowns || 0 }}</span>
          </div>
          <div class="data-stat">
            <span class="data-label">Total Categories</span>
            <span class="data-value">{{ stats.data?.categories || 0 }}</span>
          </div>
          <div class="data-stat">
            <span class="data-label">Total Tickets</span>
            <span class="data-value">{{ totalTicketCount }}</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Recent Activity -->
    <div class="recent-section" v-if="recentTickets.length > 0">
      <Card>
        <template #header>Recent Tickets</template>
        <div class="recent-tickets">
          <div v-for="ticket in recentTickets" :key="ticket.id" class="recent-ticket">
            <div class="ticket-info">
              <span class="ticket-title">{{ ticket.title }}</span>
              <span class="ticket-user">by {{ ticket.username }}</span>
            </div>
            <span :class="['ticket-status', ticket.status]">{{ formatStatus(ticket.status) }}</span>
          </div>
        </div>
        <router-link to="/admin/tickets" class="view-all-link">View all tickets →</router-link>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Card from '../../components/ui/Card.vue'
import api from '../../api/client'

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
    'open': 'Open',
    'in_progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed'
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
