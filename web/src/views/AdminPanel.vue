<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>Admin Panel</h1>
      <p class="subtitle">User management and system configuration</p>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.total || 0 }}</span>
          <span class="stat-label">Total Users</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.active || 0 }}</span>
          <span class="stat-label">Active Users</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon data"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.data?.todos || 0 }}</span>
          <span class="stat-label">Total Todos</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon recent"></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.users?.recent || 0 }}</span>
          <span class="stat-label">New This Week</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'users' }]" @click="activeTab = 'users'">
        Users
      </button>
      <button :class="['tab', { active: activeTab === 'tickets' }]" @click="activeTab = 'tickets'">
        Tickets
        <span v-if="openTicketCount > 0" class="badge">{{ openTicketCount }}</span>
      </button>
      <button :class="['tab', { active: activeTab === 'config' }]" @click="activeTab = 'config'">
        System Config
      </button>
    </div>

    <!-- Users Tab -->
    <div v-if="activeTab === 'users'" class="tab-content">
      <Card>
        <template #header>User Management</template>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Todos</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td class="username">{{ user.username }}</td>
                <td>{{ user.email || '-' }}</td>
                <td>
                  <Badge :variant="user.role === 'admin' ? 'primary' : 'default'">
                    {{ user.role }}
                  </Badge>
                </td>
                <td>{{ user.todo_count }} / {{ user.countdown_count }}</td>
                <td>
                  <Badge :variant="user.disabled ? 'danger' : 'success'">
                    {{ user.disabled ? 'Disabled' : 'Active' }}
                  </Badge>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td class="actions">
                  <Button
                    v-if="!user.disabled"
                    variant="ghost"
                    size="sm"
                    @click="disableUser(user.id)"
                    :disabled="user.role === 'admin'"
                  >
                    Disable
                  </Button>
                  <Button
                    v-else
                    variant="secondary"
                    size="sm"
                    @click="enableUser(user.id)"
                  >
                    Enable
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    @click="deleteUser(user)"
                    :disabled="user.role === 'admin'"
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Tickets Tab -->
    <div v-if="activeTab === 'tickets'" class="tab-content">
      <Card>
        <template #header>Tickets</template>
        <div class="ticket-filters">
          <select v-model="ticketFilter" @change="fetchTickets">
            <option value="">All Tickets</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div class="tickets-container">
          <div v-for="ticket in tickets" :key="ticket.id" class="ticket-item">
            <div class="ticket-header">
              <div class="ticket-title-row">
                <span class="ticket-title">{{ ticket.title }}</span>
                <span :class="['ticket-status', ticket.status]">{{ formatStatus(ticket.status) }}</span>
              </div>
              <div class="ticket-meta">
                <span class="ticket-user">by {{ ticket.username }}</span>
                <span class="ticket-priority" :class="ticket.priority">{{ ticket.priority }}</span>
                <span class="ticket-date">{{ formatDate(ticket.created_at) }}</span>
              </div>
            </div>
            <div v-if="ticket.description" class="ticket-description">
              {{ ticket.description }}
            </div>
            <div v-if="ticket.reply" class="ticket-reply">
              <strong>Reply:</strong> {{ ticket.reply }}
            </div>
            <div class="ticket-actions">
              <select v-model="ticket.status" @change="updateTicketStatus(ticket)" class="status-select">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
              <Button
                v-if="ticket.status !== 'resolved'"
                variant="success"
                size="sm"
                @click="resolveTicket(ticket)"
              >
                Resolve
              </Button>
              <Button variant="secondary" size="sm" @click="openReplyModal(ticket)">
                Reply
              </Button>
              <Button variant="danger" size="sm" @click="deleteTicket(ticket)" class="delete-btn">
                Delete
              </Button>
            </div>
          </div>
          <div v-if="tickets.length === 0 && !ticketsLoading" class="empty-text">
            No tickets found
          </div>
          <div v-if="ticketsLoading" class="loading-text">Loading...</div>
        </div>
      </Card>
    </div>

    <!-- Config Tab -->
    <div v-if="activeTab === 'config'" class="tab-content">
      <Card>
        <template #header>System Configuration</template>
        <div class="config-list">
          <div class="config-item">
            <div class="config-info">
              <span class="config-label">User Registration</span>
              <span class="config-desc">Allow new users to register accounts</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="config.registration_enabled" @change="updateConfig" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </Card>
    </div>

    <!-- Reply Modal -->
    <Teleport to="body">
      <div v-if="showReplyModal" class="modal-overlay" @click.self="showReplyModal = false">
        <div class="modal glass-card">
          <div class="modal-header">
            <h2>Reply to Ticket</h2>
            <button class="close-btn" @click="showReplyModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Your Reply</label>
              <textarea v-model="replyText" rows="5" placeholder="Enter your reply..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <Button variant="secondary" @click="showReplyModal = false">Cancel</Button>
            <Button variant="primary" @click="submitReply">Submit Reply</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import api from '../api/client'

const activeTab = ref('users')
const users = ref([])
const stats = ref({})
const config = ref({
  registration_enabled: true
})
const tickets = ref([])
const ticketsLoading = ref(false)
const ticketFilter = ref('')
const showReplyModal = ref(false)
const replyTicket = ref(null)
const replyText = ref('')

async function fetchUsers() {
  try {
    const res = await api.get('/api/admin/users')
    users.value = res.data.data || []
  } catch (e) {
    console.error('Failed to fetch users:', e)
  }
}

async function fetchStats() {
  try {
    const res = await api.get('/api/admin/stats')
    stats.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  }
}

async function fetchConfig() {
  try {
    const res = await api.get('/api/admin/config')
    config.value = res.data.data || {}
  } catch (e) {
    console.error('Failed to fetch config:', e)
  }
}

async function fetchTickets() {
  ticketsLoading.value = true
  try {
    const params = ticketFilter.value ? { status: ticketFilter.value } : {}
    const res = await api.get('/api/admin/tickets', { params })
    tickets.value = res.data.data || []
  } catch (e) {
    console.error('Failed to fetch tickets:', e)
  } finally {
    ticketsLoading.value = false
  }
}

const openTicketCount = computed(() => {
  return tickets.value.filter(t => t.status === 'open' || t.status === 'in_progress').length
})

async function updateTicketStatus(ticket) {
  try {
    await api.put(`/api/admin/tickets/${ticket.id}`, { status: ticket.status })
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to update ticket')
    fetchTickets()
  }
}

async function resolveTicket(ticket) {
  try {
    await api.put(`/api/admin/tickets/${ticket.id}`, { status: 'resolved' })
    ticket.status = 'resolved'
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to resolve ticket')
  }
}

function openReplyModal(ticket) {
  replyTicket.value = ticket
  replyText.value = ticket.reply || ''
  showReplyModal.value = true
}

async function submitReply() {
  if (!replyTicket.value) return
  try {
    await api.put(`/api/admin/tickets/${replyTicket.value.id}`, { reply: replyText.value })
    showReplyModal.value = false
    fetchTickets()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to submit reply')
  }
}

async function deleteTicket(ticket) {
  if (!confirm(`Delete ticket "${ticket.title}"?`)) return
  try {
    await api.delete(`/api/admin/tickets/${ticket.id}`)
    fetchTickets()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to delete ticket')
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

async function updateConfig() {
  try {
    await api.put('/api/admin/config', config.value)
  } catch (e) {
    console.error('Failed to update config:', e)
  }
}

async function disableUser(id) {
  if (!confirm('Disable this user?')) return
  try {
    await api.patch(`/api/admin/users/${id}/disable`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to disable user')
  }
}

async function enableUser(id) {
  try {
    await api.patch(`/api/admin/users/${id}/enable`)
    fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to enable user')
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user "${user.username}" and all their data? This cannot be undone.`)) return
  try {
    await api.delete(`/api/admin/users/${user.id}`)
    fetchUsers()
    fetchStats()
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to delete user')
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchUsers()
  fetchStats()
  fetchConfig()
  fetchTickets()
})
</script>

<style scoped>
/* Admin Theme - Teal/Cyan colors instead of purple */
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
.stat-icon.data { background: rgba(6, 182, 212, 0.2); }
.stat-icon.recent { background: rgba(245, 158, 11, 0.2); }

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

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0;
}

.tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: #14b8a6;
  border-bottom-color: #14b8a6;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}

.data-table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table td {
  font-size: 14px;
  color: var(--text-primary);
}

.data-table tr:hover td {
  background: var(--bg-tertiary);
}

.username {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

/* Config */
.config-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
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

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(4),
  .data-table td:nth-child(4) {
    display: none;
  }
}

/* Tickets */
.ticket-filters {
  margin-bottom: 16px;
}

.ticket-filters select {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.tickets-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-item {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.ticket-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.ticket-title {
  font-weight: 600;
  color: var(--text-primary);
}

.ticket-status {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.ticket-status.open {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.ticket-status.in_progress {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.ticket-status.resolved {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.ticket-status.closed {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.ticket-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.ticket-priority {
  text-transform: capitalize;
  font-weight: 500;
}

.ticket-priority.high {
  color: #ef4444;
}

.ticket-priority.medium {
  color: #eab308;
}

.ticket-priority.low {
  color: #6b7280;
}

.ticket-description {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  font-size: 14px;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.ticket-reply {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
}

.ticket-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 8px;
  align-items: center;
}

.ticket-actions .delete-btn {
  margin-left: auto;
}

.status-select {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
}

.empty-text, .loading-text {
  text-align: center;
  color: var(--text-muted);
  padding: 32px;
}

/* Badge */
.badge {
  margin-left: 6px;
  padding: 2px 8px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
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
  max-width: 500px;
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
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  color: var(--text-muted);
  font-size: 20px;
  padding: 4px;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.modal-body .form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-body .form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.modal-body textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  resize: vertical;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
