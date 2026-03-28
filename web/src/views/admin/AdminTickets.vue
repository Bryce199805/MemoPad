<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>Ticket Management</h1>
      <p class="subtitle">Handle user feedback and issues</p>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <select v-model="ticketFilter" @change="fetchTickets" class="filter-select">
        <option value="">All Tickets</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <span class="ticket-count">{{ filteredTickets.length }} tickets</span>
    </div>

    <!-- Tickets List -->
    <div class="tickets-container">
      <Card v-for="ticket in filteredTickets" :key="ticket.id" class="ticket-card">
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
      </Card>

      <div v-if="filteredTickets.length === 0 && !loading" class="empty-state">
        <p>No tickets found</p>
      </div>
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
import { ref, onMounted } from 'vue'
import Card from '../../components/ui/Card.vue'
import Button from '../../components/ui/Button.vue'
import api from '../../api/client'

const tickets = ref([])
const filteredTickets = ref([])
const loading = ref(false)
const ticketFilter = ref('')
const showReplyModal = ref(false)
const replyTicket = ref(null)
const replyText = ref('')

async function fetchTickets() {
  loading.value = true
  try {
    const params = ticketFilter.value ? { status: ticketFilter.value } : {}
    const res = await api.get('/api/admin/tickets', { params })
    tickets.value = res.data.data || []
    filteredTickets.value = tickets.value
  } catch (e) {
    console.error('Failed to fetch tickets:', e)
  } finally {
    loading.value = false
  }
}

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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchTickets()
})
</script>

<style scoped>
/* Admin Theme */
.admin-theme {
  --admin-primary: #14b8a6;
}

.admin-page {
  max-width: 1000px;
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

/* Filters */
.filters-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.filter-select {
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  min-width: 150px;
}

.ticket-count {
  color: var(--text-muted);
  font-size: 14px;
}

/* Tickets */
.tickets-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ticket-card {
  margin-bottom: 0;
}

.ticket-header {
  margin-bottom: 12px;
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
  font-size: 16px;
  color: var(--text-primary);
}

.ticket-status {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.ticket-status.open { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.ticket-status.in_progress { background: rgba(234, 179, 8, 0.2); color: #eab308; }
.ticket-status.resolved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.ticket-status.closed { background: rgba(107, 114, 128, 0.2); color: #6b7280; }

.ticket-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.ticket-priority {
  text-transform: capitalize;
  font-weight: 500;
}

.ticket-priority.high { color: #ef4444; }
.ticket-priority.medium { color: #eab308; }
.ticket-priority.low { color: #6b7280; }

.ticket-description {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.ticket-reply {
  padding: 12px;
  background: rgba(20, 184, 166, 0.1);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.ticket-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.ticket-actions .delete-btn {
  margin-left: auto;
}

.status-select {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-muted);
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

.form-group textarea {
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
