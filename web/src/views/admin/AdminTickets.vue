<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>Ticket Management</h1>
      <p class="subtitle">Handle user feedback and issues</p>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['filter-tab', { active: ticketFilter === tab.value }]"
          @click="setFilter(tab.value)"
        >
          {{ tab.label }}
          <span class="tab-count">{{ tabCount(tab.value) }}</span>
        </button>
      </div>
    </div>

    <!-- Tickets List -->
    <div class="tickets-container">
      <div v-for="ticket in filteredTickets" :key="ticket.id" class="ticket-card glass-card">
        <!-- Card top: title + status badge + icon actions -->
        <div class="ticket-top">
          <div class="ticket-left">
            <div class="ticket-title-row">
              <span class="ticket-title">{{ ticket.title }}</span>
              <!-- Clickable status badge cycles through statuses -->
              <button
                :class="['status-badge', ticket.status]"
                @click="cycleStatus(ticket)"
                :title="`Click to change: ${nextStatus(ticket.status).label}`"
              >
                {{ formatStatus(ticket.status) }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <div class="ticket-meta">
              <span class="meta-user">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ ticket.username }}
              </span>
              <span :class="['meta-priority', ticket.priority]">{{ ticket.priority }}</span>
              <span class="meta-date">{{ formatDate(ticket.created_at) }}</span>
            </div>
          </div>
          <!-- Icon action buttons -->
          <div class="ticket-actions">
            <button class="action-btn reply-btn" @click="openReplyModal(ticket)" title="Reply">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span v-if="ticket.reply" class="reply-dot"></span>
            </button>
            <button class="action-btn delete-btn" @click="deleteTicket(ticket)" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Description -->
        <div v-if="ticket.description" class="ticket-description">
          {{ ticket.description }}
        </div>

        <!-- Existing reply -->
        <div v-if="ticket.reply" class="ticket-reply">
          <div class="reply-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Admin Reply
          </div>
          <p class="reply-text">{{ ticket.reply }}</p>
        </div>
      </div>

      <div v-if="filteredTickets.length === 0 && !loading" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <p>No {{ ticketFilter || '' }} tickets</p>
      </div>
    </div>

    <!-- Reply Modal -->
    <Teleport to="body">
      <div v-if="showReplyModal" class="modal-overlay" @click.self="showReplyModal = false">
        <div class="modal glass-card">
          <div class="modal-header">
            <div>
              <h2>Reply to Ticket</h2>
              <p class="modal-subtitle">{{ replyTicket?.title }}</p>
            </div>
            <button class="close-btn" @click="showReplyModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label">Your Reply</label>
            <textarea v-model="replyText" rows="5" placeholder="Enter your reply..."></textarea>
          </div>
          <div class="modal-footer">
            <Button variant="secondary" @click="showReplyModal = false">Cancel</Button>
            <Button variant="primary" @click="submitReply">Send Reply</Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from '../../components/ui/Button.vue'
import api from '../../api/client'

const tickets = ref([])
const loading = ref(false)
const ticketFilter = ref('')
const showReplyModal = ref(false)
const replyTicket = ref(null)
const replyText = ref('')

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

// Status cycle order: clicking the badge advances to next status
const statusCycle = ['open', 'in_progress', 'resolved', 'closed']

function nextStatus(current) {
  const idx = statusCycle.indexOf(current)
  const next = statusCycle[(idx + 1) % statusCycle.length]
  return { value: next, label: formatStatus(next) }
}

async function cycleStatus(ticket) {
  const next = nextStatus(ticket.status)
  const prev = ticket.status
  ticket.status = next.value // Optimistic update
  try {
    await api.put(`/api/admin/tickets/${ticket.id}`, { status: next.value })
  } catch (e) {
    ticket.status = prev // Roll back on error
    alert(e.response?.data?.error || 'Failed to update status')
  }
}

const filteredTickets = computed(() => {
  if (!ticketFilter.value) return tickets.value
  return tickets.value.filter(t => t.status === ticketFilter.value)
})

function tabCount(status) {
  if (!status) return tickets.value.length
  return tickets.value.filter(t => t.status === status).length
}

function setFilter(val) {
  ticketFilter.value = val
}

async function fetchTickets() {
  loading.value = true
  try {
    const res = await api.get('/api/admin/tickets')
    tickets.value = res.data.data || []
  } catch (e) {
    console.error('Failed to fetch tickets:', e)
  } finally {
    loading.value = false
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
    replyTicket.value.reply = replyText.value
    showReplyModal.value = false
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to submit reply')
  }
}

async function deleteTicket(ticket) {
  if (!confirm(`Delete ticket "${ticket.title}"?`)) return
  try {
    await api.delete(`/api/admin/tickets/${ticket.id}`)
    tickets.value = tickets.value.filter(t => t.id !== ticket.id)
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to delete ticket')
  }
}

function formatStatus(status) {
  const map = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }
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

/* Filter tabs — replaces the dropdown */
.filters-bar {
  margin-bottom: 20px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: var(--radius-md);
  width: fit-content;
  border: 1px solid var(--border-subtle);
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: calc(var(--radius-md) - 2px);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.filter-tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.filter-tab.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

.tab-count {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  background: var(--bg-tertiary);
  border-radius: 999px;
  color: var(--text-muted);
  min-width: 20px;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

/* Ticket cards */
.tickets-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-card {
  padding: 18px 20px;
}

.ticket-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.ticket-left {
  flex: 1;
  min-width: 0;
}

.ticket-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.ticket-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
}

/* Clickable status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  user-select: none;
}

.status-badge:hover {
  filter: brightness(1.2);
  transform: translateY(-1px);
}

.status-badge.open         { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-badge.in_progress  { background: rgba(234, 179, 8, 0.15);  color: #eab308; }
.status-badge.resolved     { background: rgba(34, 197, 94, 0.15);  color: #22c55e; }
.status-badge.closed       { background: rgba(107, 114, 128, 0.15); color: #6b7280; }

/* Meta row */
.ticket-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.meta-user {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-priority {
  font-weight: 600;
  text-transform: capitalize;
}

.meta-priority.high   { color: #ef4444; }
.meta-priority.medium { color: #eab308; }
.meta-priority.low    { color: #6b7280; }

/* Icon action buttons */
.ticket-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.reply-btn:hover { color: var(--accent-primary); }
.delete-btn:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

/* Red dot on reply button if reply exists */
.reply-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: 1.5px solid var(--bg-secondary);
}

/* Description & reply body */
.ticket-description {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  margin-bottom: 10px;
}

.ticket-reply {
  padding: 10px 14px;
  background: rgba(20, 184, 166, 0.08);
  border-left: 2px solid rgba(20, 184, 166, 0.5);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 14px;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #14b8a6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.reply-text {
  color: var(--text-secondary);
  white-space: pre-wrap;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px;
  color: var(--text-muted);
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
  max-width: 520px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.modal-header h2 {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.modal-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
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
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
