const api = require('../../utils/api')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: true,
    tickets: [],
    filter: 'all',
    showDetail: false,
    currentTicket: null,
    replyText: ''
  },

  onShow() {
    const user = auth.getUser()
    if (!user || user.role !== 'admin') {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.fetchTickets()
  },

  onPullDownRefresh() {
    this.fetchTickets().then(() => wx.stopPullDownRefresh())
  },

  async fetchTickets() {
    this.setData({ loading: true })
    try {
      const res = await api.get('/api/admin/tickets')
      const tickets = (res.data || res) || []
      this.setData({ tickets })
    } catch (err) {
      console.error('Fetch tickets error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onFilterChange(e) {
    this.setData({ filter: e.currentTarget.dataset.filter })
  },

  getFilteredTickets() {
    const { tickets, filter } = this.data
    if (filter === 'all') return tickets
    return tickets.filter(t => t.status === filter)
  },

  onViewTicket(e) {
    const id = e.currentTarget.dataset.id
    const ticket = this.data.tickets.find(t => t.id === id)
    if (ticket) {
      this.setData({ 
        showDetail: true, 
        currentTicket: ticket,
        replyText: ticket.reply || ''
      })
    }
  },

  onCloseDetail() {
    this.setData({ showDetail: false, currentTicket: null, replyText: '' })
  },

  onReplyInput(e) {
    this.setData({ replyText: e.detail.value })
  },

  async onUpdateStatus(e) {
    const status = e.currentTarget.dataset.status
    const ticket = this.data.currentTicket
    if (!ticket) return

    wx.showLoading({ title: 'Updating...' })
    try {
      await api.put('/api/admin/tickets/' + ticket.id, { status, reply: this.data.replyText })
      wx.hideLoading()
      wx.showToast({ title: 'Updated', icon: 'success' })
      this.onCloseDetail()
      this.fetchTickets()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  async onDeleteTicket() {
    const ticket = this.data.currentTicket
    if (!ticket) return

    wx.showModal({
      title: 'Delete Ticket',
      content: 'Delete this ticket?',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: 'Deleting...' })
        try {
          await api.del('/api/admin/tickets/' + ticket.id)
          wx.hideLoading()
          wx.showToast({ title: 'Deleted', icon: 'success' })
          this.onCloseDetail()
          this.fetchTickets()
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
  },

  statusLabel(status) {
    const map = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }
    return map[status] || status
  }
})
