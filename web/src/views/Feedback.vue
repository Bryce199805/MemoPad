<template>
  <div class="feedback-page">
    <div class="page-header">
      <h1>Feedback</h1>
      <p class="subtitle">Submit bug reports or feature requests</p>
    </div>

    <!-- Submit Form -->
    <Card class="section-card">
      <template #header>Submit a Ticket</template>
      <form @submit.prevent="submitTicket" class="ticket-form">
        <div class="form-group">
          <label>Title</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Brief description of the issue"
            required
            maxlength="200"
          />
        </div>

        <div class="form-group">
          <label>Priority</label>
          <select v-model="form.priority">
            <option value="low">Low - Minor issue or suggestion</option>
            <option value="medium">Medium - Normal bug or feature request</option>
            <option value="high">High - Critical issue affecting usage</option>
          </select>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            v-model="form.description"
            placeholder="Please describe the issue in detail, including steps to reproduce if applicable..."
            rows="5"
            maxlength="2000"
          ></textarea>
        </div>

        <div class="form-actions">
          <Button type="submit" variant="primary" :disabled="!form.title.trim() || submitting">
            {{ submitting ? 'Submitting...' : 'Submit Ticket' }}
          </Button>
        </div>
      </form>
    </Card>

    <!-- My Tickets -->
    <Card class="section-card">
      <template #header>My Tickets</template>
      <div class="tickets-list">
        <div v-for="ticket in tickets" :key="ticket.id" class="ticket-item" @click="showTicketDetail(ticket)">
          <div class="ticket-header">
            <span class="ticket-title">{{ ticket.title }}</span>
            <span :class="['ticket-status', ticket.status]">{{ formatStatus(ticket.status) }}</span>
          </div>
          <div class="ticket-meta">
            <span class="ticket-priority" :class="ticket.priority">{{ ticket.priority }}</span>
            <span class="ticket-date">{{ formatDate(ticket.created_at) }}</span>
          </div>
          <div v-if="ticket.reply" class="ticket-reply-preview">
            <strong>Admin Reply:</strong> {{ ticket.reply.substring(0, 100) }}{{ ticket.reply.length > 100 ? '...' : '' }}
          </div>
        </div>
        <div v-if="tickets.length === 0 && !loading" class="empty-text">
          No tickets submitted yet
        </div>
        <div v-if="loading" class="loading-text">Loading...</div>
      </div>
    </Card>

    <!-- Ticket Detail Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal glass-card">
          <div class="modal-header">
            <h2>Ticket Details</h2>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <div class="modal-body" v-if="selectedTicket">
            <div class="detail-row">
              <label>Title</label>
              <p>{{ selectedTicket.title }}</p>
            </div>
            <div class="detail-row">
              <label>Status</label>
              <span :class="['ticket-status', selectedTicket.status]">{{ formatStatus(selectedTicket.status) }}</span>
            </div>
            <div class="detail-row">
              <label>Priority</label>
              <span class="ticket-priority" :class="selectedTicket.priority">{{ selectedTicket.priority }}</span>
            </div>
            <div class="detail-row">
              <label>Description</label>
              <p class="description-text">{{ selectedTicket.description || 'No description provided' }}</p>
            </div>
            <div class="detail-row">
              <label>Submitted</label>
              <p>{{ formatDate(selectedTicket.created_at) }}</p>
            </div>
            <div v-if="selectedTicket.reply" class="detail-row reply-row">
              <label>Admin Reply</label>
              <div class="reply-box">
                {{ selectedTicket.reply }}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <Button variant="secondary" @click="closeModal">Close</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import api from '../api/client'

const form = ref({
  title: '',
  description: '',
  priority: 'medium'
})

const tickets = ref([])
const loading = ref(false)
const submitting = ref(false)
const showModal = ref(false)
const selectedTicket = ref(null)

async function fetchTickets() {
  loading.value = true
  try {
    const res = await api.get('/api/tickets')
    tickets.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch tickets:', err)
  } finally {
    loading.value = false
  }
}

async function submitTicket() {
  if (!form.value.title.trim()) return
  
  submitting.value = true
  try {
    await api.post('/api/tickets', form.value)
    form.value = { title: '', description: '', priority: 'medium' }
    await fetchTickets()
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to submit ticket')
  } finally {
    submitting.value = false
  }
}

function showTicketDetail(ticket) {
  selectedTicket.value = ticket
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedTicket.value = null
}

function formatStatus(status) {
  const statusMap = {
    'open': 'Open',
    'in_progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed'
  }
  return statusMap[status] || status
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  fetchTickets()
})
</script>

<style scoped>
.feedback-page {
  max-width: 700px;
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
  font-size: 14px;
  margin-top: 4px;
}

.section-card {
  margin-bottom: 20px;
}

/* Form */
.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.form-group select,
.form-group textarea {
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

/* Tickets List */
.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-item {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ticket-item:hover {
  background: var(--bg-hover);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.ticket-title {
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.ticket-status {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
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
}

.ticket-priority {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  text-transform: capitalize;
}

.ticket-priority.high {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.ticket-priority.medium {
  background: rgba(234, 179, 8, 0.2);
  color: #eab308;
}

.ticket-priority.low {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.ticket-date {
  color: var(--text-muted);
}

.ticket-reply-preview {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-text, .loading-text {
  text-align: center;
  color: var(--text-muted);
  padding: 32px;
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
  max-height: 90vh;
  overflow: auto;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
}

.detail-row p {
  color: var(--text-primary);
  margin: 0;
}

.description-text {
  white-space: pre-wrap;
  line-height: 1.6;
}

.reply-row {
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.reply-box {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  white-space: pre-wrap;
  line-height: 1.6;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
}
</style>
