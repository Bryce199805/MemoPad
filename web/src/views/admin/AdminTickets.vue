<template>
  <div class="admin-page admin-theme">
    <div class="page-header">
      <h1>{{ $t('admin.ticketManagement') }}</h1>
      <p class="subtitle">{{ $t('admin.handleTickets') }}</p>
    </div>

    <!-- Toolbar: filter tabs + search -->
    <div class="toolbar glass-card">
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
      <div class="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('admin.searchTickets')"
          class="search-input"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap glass-card">
      <div v-if="loading" class="table-loading">{{ $t('common.loading') }}</div>
      <template v-else>
        <table class="ticket-table" v-if="pagedTickets.length > 0">
          <thead>
            <tr>
              <th class="col-id">#</th>
              <th class="col-title">{{ $t('feedback.titleField') }}</th>
              <th class="col-user">{{ $t('admin.username') }}</th>
              <th class="col-priority">{{ $t('todo.priority') }}</th>
              <th class="col-status">{{ $t('common.status') }}</th>
              <th class="col-date">{{ $t('admin.created') }}</th>
              <th class="col-actions">{{ $t('admin.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in pagedTickets"
              :key="ticket.id"
              :class="{ 'row-highlight': ticket.id === highlightId }"
            >
              <td class="col-id text-muted">{{ ticket.id }}</td>
              <td class="col-title">
                <div class="title-cell">
                  <span
                    v-if="hasUnreadReplies(ticket)"
                    class="unread-dot"
                    :title="$t('admin.adminReply')"
                  ></span>
                  <span class="title-text">{{ ticket.title }}</span>
                </div>
              </td>
              <td class="col-user text-muted">{{ ticket.username }}</td>
              <td class="col-priority">
                <span :class="['priority-badge', ticket.priority]">{{ formatPriority(ticket.priority) }}</span>
              </td>
              <td class="col-status">
                <select
                  :value="ticket.status"
                  :class="['status-select', ticket.status]"
                  @change="updateStatus(ticket, $event.target.value)"
                >
                  <option value="open">{{ $t('feedback.statusOpen') }}</option>
                  <option value="in_progress">{{ $t('feedback.statusInProgress') }}</option>
                  <option value="resolved">{{ $t('feedback.statusResolved') }}</option>
                  <option value="closed">{{ $t('feedback.statusClosed') }}</option>
                </select>
              </td>
              <td class="col-date text-muted">{{ formatDate(ticket.created_at) }}</td>
              <td class="col-actions">
                <div class="row-actions">
                  <button
                    class="action-btn reply-btn"
                    @click="openDetail(ticket)"
                    :title="$t('admin.reply')"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <span v-if="ticket.replies && ticket.replies.length > 0" class="reply-count">{{ ticket.replies.length }}</span>
                  </button>
                  <button
                    class="action-btn delete-btn"
                    @click="deleteTicket(ticket)"
                    :title="$t('common.delete')"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <p>{{ ticketFilter ? $t('admin.noFilteredTickets', { filter: ticketFilter }) : $t('admin.noTickets') }}</p>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
        </div>
      </template>
    </div>

    <!-- Ticket Detail Modal -->
    <Teleport to="body">
      <div v-if="detailTicket" class="modal-overlay" @click.self="detailTicket = null">
        <div class="modal glass-card">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <h2>{{ $t('admin.ticketDetail') }}</h2>
              <p class="modal-subtitle">{{ detailTicket.title }}</p>
            </div>
            <button class="close-btn" @click="detailTicket = null">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Info row -->
            <div class="detail-meta">
              <span class="text-muted">{{ detailTicket.username }}</span>
              <span :class="['priority-badge', detailTicket.priority]">{{ formatPriority(detailTicket.priority) }}</span>
              <span :class="['status-chip', detailTicket.status]">{{ formatStatus(detailTicket.status) }}</span>
              <span class="text-muted">{{ formatDate(detailTicket.created_at) }}</span>
            </div>

            <!-- Description -->
            <div v-if="detailTicket.description" class="detail-desc">
              <div class="section-label">{{ $t('feedback.description') }}</div>
              <p class="desc-text">{{ detailTicket.description }}</p>
            </div>

            <!-- Reply thread -->
            <div class="reply-section">
              <div class="section-label">{{ $t('admin.noReplies') && $t('feedback.replies') }}</div>
              <div class="reply-thread">
                <div v-if="!detailTicket.replies || detailTicket.replies.length === 0" class="no-replies">
                  {{ $t('admin.noReplies') }}
                </div>
                <div
                  v-for="reply in detailTicket.replies"
                  :key="reply.id"
                  class="reply-item"
                >
                  <div class="reply-item-header">
                    <span class="reply-admin-label">{{ $t('admin.adminReply') }}</span>
                    <span class="reply-time">{{ formatDateTime(reply.created_at) }}</span>
                    <button
                      class="reply-delete-btn"
                      @click="deleteReply(detailTicket, reply)"
                      :title="$t('admin.deleteReply')"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                  <p class="reply-content">{{ reply.content }}</p>
                </div>
              </div>
            </div>

            <!-- Add reply -->
            <div class="add-reply-section">
              <div class="section-label">{{ $t('admin.addReply') }}</div>
              <textarea
                v-model="newReplyText"
                rows="3"
                :placeholder="$t('admin.replyPlaceholder')"
                class="reply-textarea"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="detailTicket = null">{{ $t('common.cancel') }}</button>
            <button class="btn-primary" @click="sendReply" :disabled="!newReplyText.trim()">{{ $t('admin.sendReply') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import api from '../../api/client'

const { t } = useI18n()
const route = useRoute()
const refreshTicketCount = inject('refreshTicketCount', null)

const tickets = ref([])
const loading = ref(false)
const ticketFilter = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 10
const detailTicket = ref(null)
const newReplyText = ref('')
const highlightId = ref(null)

const statusTabs = computed(() => [
  { value: '', label: t('admin.all') },
  { value: 'open', label: t('feedback.statusOpen') },
  { value: 'in_progress', label: t('feedback.statusInProgress') },
  { value: 'resolved', label: t('feedback.statusResolved') },
  { value: 'closed', label: t('feedback.statusClosed') },
])

function tabCount(status) {
  if (!status) return tickets.value.length
  return tickets.value.filter(tk => tk.status === status).length
}

function setFilter(val) {
  ticketFilter.value = val
  currentPage.value = 1
}

watch(searchQuery, () => { currentPage.value = 1 })

const filteredTickets = computed(() => {
  let list = tickets.value
  if (ticketFilter.value) list = list.filter(tk => tk.status === ticketFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(tk =>
      tk.title.toLowerCase().includes(q) ||
      (tk.username || '').toLowerCase().includes(q)
    )
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTickets.value.length / pageSize)))

const pagedTickets = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredTickets.value.slice(start, start + pageSize)
})

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

function openDetail(ticket) {
  detailTicket.value = ticket
  newReplyText.value = ''
}

async function updateStatus(ticket, newStatus) {
  const prev = ticket.status
  ticket.status = newStatus // optimistic
  try {
    await api.put(`/api/admin/tickets/${ticket.id}`, { status: newStatus })
    if (refreshTicketCount) refreshTicketCount()
  } catch (e) {
    ticket.status = prev
    alert(e.response?.data?.error || t('admin.failedUpdateStatus'))
  }
}

async function sendReply() {
  if (!detailTicket.value || !newReplyText.value.trim()) return
  try {
    const res = await api.post(`/api/admin/tickets/${detailTicket.value.id}/replies`, {
      content: newReplyText.value.trim()
    })
    const reply = res.data.data || res.data
    if (!detailTicket.value.replies) detailTicket.value.replies = []
    detailTicket.value.replies.push(reply)
    newReplyText.value = ''
    if (refreshTicketCount) refreshTicketCount()
  } catch (e) {
    alert(e.response?.data?.error || t('admin.failedSubmitReply'))
  }
}

async function deleteReply(ticket, reply) {
  if (!confirm(t('admin.deleteReplyConfirm'))) return
  try {
    await api.delete(`/api/admin/tickets/${ticket.id}/replies/${reply.id}`)
    ticket.replies = ticket.replies.filter(r => r.id !== reply.id)
  } catch (e) {
    alert(e.response?.data?.error || t('admin.failedDeleteReply'))
  }
}

async function deleteTicket(ticket) {
  if (!confirm(t('admin.confirmDeleteTicket', { title: ticket.title }))) return
  try {
    await api.delete(`/api/admin/tickets/${ticket.id}`)
    tickets.value = tickets.value.filter(tk => tk.id !== ticket.id)
    if (detailTicket.value?.id === ticket.id) detailTicket.value = null
    if (refreshTicketCount) refreshTicketCount()
  } catch (e) {
    alert(e.response?.data?.error || t('admin.failedDeleteTicket'))
  }
}

function hasUnreadReplies(ticket) {
  return ticket.replies && ticket.replies.length > 0 && !ticket.reply_read_at
}

function formatPriority(p) {
  const map = { high: t('common.high'), medium: t('common.medium'), low: t('common.low') }
  return map[p] || p
}

function formatStatus(status) {
  const map = {
    open: t('feedback.statusOpen'),
    in_progress: t('feedback.statusInProgress'),
    resolved: t('feedback.statusResolved'),
    closed: t('feedback.statusClosed')
  }
  return map[status] || status
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString()
}

onMounted(async () => {
  await fetchTickets()
  // Auto-open ticket from route query (e.g. from AdminDashboard click)
  const hid = route.query.highlight
  if (hid) {
    highlightId.value = Number(hid)
    const target = tickets.value.find(tk => tk.id === Number(hid))
    if (target) {
      openDetail(target)
      // Scroll highlight into view after render
      setTimeout(() => {
        const el = document.querySelector('.row-highlight')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }
})
</script>

<style scoped>
.admin-page {
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
  margin-top: 4px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
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
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

.tab-count {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  background: var(--bg-tertiary);
  border-radius: 999px;
  color: var(--text-muted);
  min-width: 18px;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: rgba(99, 102, 241, 0.2);
  color: var(--accent-primary);
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  min-width: 220px;
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  width: 100%;
}

.search-input::placeholder {
  color: var(--text-muted);
}

/* Table */
.table-wrap {
  overflow-x: auto;
}

.table-loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.ticket-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ticket-table thead tr {
  border-bottom: 1px solid var(--border-subtle);
}

.ticket-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.ticket-table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.ticket-table tbody tr:last-child td {
  border-bottom: none;
}

.ticket-table tbody tr:hover {
  background: var(--bg-hover);
}

.row-highlight {
  background: rgba(99, 102, 241, 0.08) !important;
}

.col-id      { width: 48px; }
.col-title   { min-width: 200px; }
.col-user    { width: 130px; }
.col-priority{ width: 90px; }
.col-status  { width: 140px; }
.col-date    { width: 110px; white-space: nowrap; }
.col-actions { width: 90px; }

.text-muted { color: var(--text-muted); }

.title-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.unread-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-primary);
}

.title-text {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

/* Priority badge */
.priority-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}
.priority-badge.high   { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
.priority-badge.medium { background: rgba(234, 179, 8, 0.12);  color: #d97706; }
.priority-badge.low    { background: rgba(107, 114, 128, 0.12); color: #6b7280; }

/* Status select */
.status-select {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  border: none;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
}

.status-select.open        { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.status-select.in_progress { background: rgba(234, 179, 8, 0.15);  color: #d97706; }
.status-select.resolved    { background: rgba(34, 197, 94, 0.15);  color: #22c55e; }
.status-select.closed      { background: rgba(107, 114, 128, 0.15); color: #6b7280; }

/* Row action buttons */
.row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.reply-btn:hover  { color: var(--accent-primary); }
.delete-btn:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

.reply-count {
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: 9px;
  font-weight: 700;
  background: var(--accent-primary);
  color: #fff;
  border-radius: 999px;
  min-width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  padding: 0 2px;
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

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid var(--border-subtle);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  color: var(--text-primary);
  font-size: 16px;
  transition: all var(--transition-fast);
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

.page-info {
  font-size: 13px;
  color: var(--text-muted);
  min-width: 60px;
  text-align: center;
}

/* ===== Modal ===== */
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
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
}

.modal-title-wrap h2 {
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
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
}

.status-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
}

.status-chip.open        { background: rgba(59, 130, 246, 0.15);  color: #3b82f6; }
.status-chip.in_progress { background: rgba(234, 179, 8, 0.15);   color: #d97706; }
.status-chip.resolved    { background: rgba(34, 197, 94, 0.15);   color: #22c55e; }
.status-chip.closed      { background: rgba(107, 114, 128, 0.15); color: #6b7280; }

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.detail-desc {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
}

.desc-text {
  font-size: 14px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.6;
}

/* Reply thread */
.reply-thread {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
}

.no-replies {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0;
}

.reply-item {
  background: rgba(20, 184, 166, 0.06);
  border-left: 2px solid rgba(20, 184, 166, 0.4);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 10px 12px;
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

.reply-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.reply-delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.reply-content {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.5;
}

/* Add reply */
.reply-textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  resize: vertical;
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
}

.reply-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

/* Modal footer */
.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.btn-secondary {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  background: var(--bg-hover);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-primary {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  background: var(--accent-primary);
  color: #fff;
  transition: all var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
