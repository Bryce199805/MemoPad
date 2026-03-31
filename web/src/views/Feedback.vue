<template>
  <div class="feedback-page">
    <div class="page-header">
      <h1>{{ $t('feedback.title') }}</h1>
      <p class="subtitle">{{ $t('feedback.subtitle') }}</p>
    </div>

    <div class="feedback-grid">
      <!-- Left column: Submit Form -->
      <div class="feedback-col">
        <Card class="section-card">
          <template #header>{{ $t('feedback.submitTicket') }}</template>
          <form @submit.prevent="submitTicket" class="ticket-form">
            <div class="form-group">
              <label>{{ $t('feedback.titleField') }}</label>
              <input
                v-model="form.title"
                type="text"
                :placeholder="$t('feedback.titlePlaceholder')"
                required
                maxlength="200"
              />
            </div>

            <div class="form-group">
              <label>{{ $t('feedback.priority') }}</label>
              <select v-model="form.priority">
                <option value="low">{{ $t('feedback.priorityLow') }}</option>
                <option value="medium">{{ $t('feedback.priorityMedium') }}</option>
                <option value="high">{{ $t('feedback.priorityHigh') }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>{{ $t('feedback.description') }}</label>
              <textarea
                v-model="form.description"
                :placeholder="$t('feedback.descPlaceholder')"
                rows="6"
                maxlength="2000"
              ></textarea>
            </div>

            <div class="form-actions">
              <Button type="submit" variant="primary" :disabled="!form.title.trim() || submitting">
                {{ submitting ? $t('feedback.submitting') : $t('feedback.submit') }}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <!-- Right column: My Tickets -->
      <div class="feedback-col">
        <Card class="section-card">
          <template #header>{{ $t('feedback.myTickets') }}</template>
          <div class="tickets-list">
            <div v-for="ticket in tickets" :key="ticket.id" class="ticket-item" @click="showTicketDetail(ticket)">
              <div class="ticket-header">
                <div class="ticket-title-row">
                  <span class="ticket-title">{{ ticket.title }}</span>
                  <span v-if="hasUnreadReplies(ticket)" class="unread-dot" :title="$t('feedback.newReply')"></span>
                </div>
                <span :class="['ticket-status', ticket.status]">{{ formatStatus(ticket.status) }}</span>
              </div>
              <div class="ticket-meta">
                <span class="ticket-priority" :class="ticket.priority">{{ ticket.priority }}</span>
                <span class="ticket-date">{{ formatDate(ticket.created_at) }}</span>
                <span v-if="hasUnreadReplies(ticket)" class="new-reply-badge">{{ $t('feedback.newReply') }}</span>
              </div>
            </div>
            <div v-if="tickets.length === 0 && !loading" class="empty-text">
              {{ $t('feedback.noTickets') }}
            </div>
            <div v-if="loading" class="loading-text">{{ $t('common.loading') }}</div>
          </div>
        </Card>
      </div>
    </div>

    <!-- Ticket Detail Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal glass-card">
          <div class="modal-header">
            <h2>{{ $t('feedback.ticketDetails') }}</h2>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          <div class="modal-body" v-if="selectedTicket">
            <div class="detail-row">
              <label>{{ $t('feedback.titleField') }}</label>
              <p>{{ selectedTicket.title }}</p>
            </div>
            <div class="detail-row">
              <label>{{ $t('common.status') }}</label>
              <span :class="['ticket-status', selectedTicket.status]">{{ formatStatus(selectedTicket.status) }}</span>
            </div>
            <div class="detail-row">
              <label>{{ $t('feedback.priority') }}</label>
              <span class="ticket-priority" :class="selectedTicket.priority">{{ selectedTicket.priority }}</span>
            </div>
            <div class="detail-row">
              <label>{{ $t('feedback.description') }}</label>
              <p class="description-text">{{ selectedTicket.description || $t('feedback.noDescription') }}</p>
            </div>
            <div class="detail-row">
              <label>{{ $t('feedback.submitted') }}</label>
              <p>{{ formatDate(selectedTicket.created_at) }}</p>
            </div>
            <!-- Reply thread -->
            <div class="detail-row reply-row">
              <label>{{ $t('feedback.replies') }}</label>
              <div v-if="!selectedTicket.replies || selectedTicket.replies.length === 0" class="no-replies-text">
                {{ $t('feedback.noReplies') }}
              </div>
              <div v-for="reply in selectedTicket.replies" :key="reply.id" class="reply-item">
                <div class="reply-item-header">
                  <span class="reply-admin-label">{{ $t('feedback.adminReplyLabel') }}</span>
                  <span class="reply-time">{{ formatDate(reply.created_at) }}</span>
                </div>
                <p class="reply-content">{{ reply.content }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <Button
              v-if="selectedTicket && canCloseTicket(selectedTicket)"
              variant="danger"
              @click="closeTicket"
            >{{ $t('feedback.closeTicket') }}</Button>
            <Button variant="secondary" @click="closeModal">{{ $t('common.close') }}</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import api from '../api/client'

const { t } = useI18n()
const refreshUnreadCount = inject('refreshUnreadCount', null)

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
    alert(err.response?.data?.error || t('feedback.failedToSubmit'))
  } finally {
    submitting.value = false
  }
}

function hasUnreadReplies(ticket) {
  return ticket.replies && ticket.replies.length > 0 && !ticket.reply_read_at
}

function canCloseTicket(ticket) {
  return ['open', 'in_progress', 'resolved'].includes(ticket.status)
}

function showTicketDetail(ticket) {
  selectedTicket.value = ticket
  showModal.value = true
  // Mark replies as read if there are unread ones
  if (hasUnreadReplies(ticket)) {
    api.put(`/api/tickets/${ticket.id}/read`).then(res => {
      if (res.data?.success) {
        const now = new Date().toISOString()
        const idx = tickets.value.findIndex(tk => tk.id === ticket.id)
        if (idx !== -1) tickets.value[idx].reply_read_at = now
        selectedTicket.value = { ...ticket, reply_read_at: now }
        if (refreshUnreadCount) refreshUnreadCount()
      }
    }).catch(() => {})
  }
}

function closeModal() {
  showModal.value = false
  selectedTicket.value = null
}

async function closeTicket() {
  if (!selectedTicket.value) return
  if (!confirm(t('feedback.closeTicketConfirm'))) return
  try {
    await api.put(`/api/tickets/${selectedTicket.value.id}/close`)
    const idx = tickets.value.findIndex(tk => tk.id === selectedTicket.value.id)
    if (idx !== -1) tickets.value[idx].status = 'closed'
    selectedTicket.value = { ...selectedTicket.value, status: 'closed' }
    alert(t('feedback.ticketClosed'))
  } catch (err) {
    alert(err.response?.data?.error || t('common.error'))
  }
}

function formatStatus(status) {
  const statusMap = {
    'open': t('feedback.statusOpen'),
    'in_progress': t('feedback.statusInProgress'),
    'resolved': t('feedback.statusResolved'),
    'closed': t('feedback.statusClosed')
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
  max-width: 1100px;
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

/* Two-column grid layout */
.feedback-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.feedback-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  margin-bottom: 0;
}

/* Form */
.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  min-height: 120px;
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

.ticket-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
}

.new-reply-badge {
  display: inline-block;
  font-size: 10px;
  color: #fff;
  background: #ef4444;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  vertical-align: middle;
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
  max-width: 600px;
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

.no-replies-text {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0;
}

.reply-item {
  background: rgba(20, 184, 166, 0.06);
  border-left: 2px solid rgba(20, 184, 166, 0.4);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 10px 12px;
  margin-top: 8px;
}

.reply-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.reply-admin-label {
  font-size: 11px;
  font-weight: 600;
  color: #14b8a6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex: 1;
}

.reply-time {
  font-size: 11px;
  color: var(--text-muted);
}

.reply-content {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.5;
  margin: 0;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Responsive: collapse to single column on smaller screens */
@media (max-width: 768px) {
  .feedback-grid {
    grid-template-columns: 1fr;
  }
}
</style>
