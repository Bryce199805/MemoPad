const api = require('../../utils/api')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: true,
    user: null,
    activeTab: 'dashboard',
    users: [],
    tickets: [],
    ticketFilter: '',
    filteredTickets: [],
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      openTickets: 0,
      totalTickets: 0
    },
    config: {
      registration_enabled: true
    },
    // Detail modal
    showTicketDetail: false,
    currentTicket: null,
    replyText: ''
  },

  onShow() {
    const user = auth.getUser()
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (!user || user.role !== 'admin') {
      wx.showToast({ title: 'Admin only', icon: 'none' })
      setTimeout(() => wx.switchTab({ url: '/pages/dashboard/dashboard' }), 1000)
      return
    }
    this.setData({ user })
    this.fetchAll()
  },

  onPullDownRefresh() {
    this.fetchAll().then(() => wx.stopPullDownRefresh())
  },

  async fetchAll() {
    this.setData({ loading: true })
    try {
      const [usersRes, ticketsRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/tickets')
      ])
      
      // Safely extract arrays
      let users = usersRes
      if (usersRes && usersRes.data) users = usersRes.data
      if (!Array.isArray(users)) users = []
      
      let tickets = ticketsRes
      if (ticketsRes && ticketsRes.data) tickets = ticketsRes.data
      if (!Array.isArray(tickets)) tickets = []
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.disabled).length,
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        totalTickets: tickets.length
      }
      
      this.setData({ users, tickets, filteredTickets: tickets, stats })
    } catch (err) {
      console.error('Fetch admin data error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  // Tab switching
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // Ticket filter
  onTicketFilterChange(e) {
    const filter = e.detail.value
    const { tickets } = this.data
    let filteredTickets = tickets
    if (filter) {
      filteredTickets = tickets.filter(t => t.status === filter)
    }
    this.setData({ ticketFilter: filter, filteredTickets })
  },

  // Users
  onDisableUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u.id === id)
    if (!user) return

    wx.showModal({
      title: 'Disable User',
      content: 'Disable "' + user.username + '"?',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.patch('/api/admin/users/' + id + '/disable')
          this.fetchAll()
          wx.showToast({ title: 'Disabled', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  onEnableUser(e) {
    const id = e.currentTarget.dataset.id
    api.patch('/api/admin/users/' + id + '/enable').then(() => {
      this.fetchAll()
      wx.showToast({ title: 'Enabled', icon: 'success' })
    }).catch(() => wx.showToast({ title: 'Failed', icon: 'none' }))
  },

  onDeleteUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u.id === id)
    if (!user) return

    if (user.id === this.data.user.id) {
      wx.showToast({ title: 'Cannot delete yourself', icon: 'none' })
      return
    }

    wx.showModal({
      title: 'Delete User',
      content: 'Delete "' + user.username + '"? This cannot be undone.',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/admin/users/' + id)
          this.fetchAll()
          wx.showToast({ title: 'Deleted', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  // Tickets
  onViewTicket(e) {
    const id = e.currentTarget.dataset.id
    const ticket = this.data.tickets.find(t => t.id === id)
    if (ticket) {
      this.setData({ 
        showTicketDetail: true, 
        currentTicket: ticket,
        replyText: ticket.reply || ''
      })
    }
  },

  onCloseTicketDetail() {
    this.setData({ showTicketDetail: false, currentTicket: null, replyText: '' })
  },

  onReplyInput(e) {
    this.setData({ replyText: e.detail.value })
  },

  onUpdateStatus(e) {
    const status = e.currentTarget.dataset.status
    const ticket = this.data.currentTicket
    if (!ticket) return

    wx.showLoading({ title: 'Updating...' })
    api.put('/api/admin/tickets/' + ticket.id, { status, reply: this.data.replyText }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: 'Updated', icon: 'success' })
      this.onCloseTicketDetail()
      this.fetchAll()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    })
  },

  onDeleteTicket() {
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
          this.onCloseTicketDetail()
          this.fetchAll()
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  // Config
  onToggleRegistration(e) {
    const enabled = e.detail.value
    this.setData({ 'config.registration_enabled': enabled })
    api.put('/api/admin/config', { registration_enabled: enabled }).catch(() => {
      wx.showToast({ title: 'Failed to update', icon: 'none' })
      this.setData({ 'config.registration_enabled': !enabled })
    })
  },

  // Logout
  onLogout() {
    wx.showModal({
      title: 'Logout',
      content: 'Are you sure?',
      success: (res) => {
        if (res.confirm) auth.logout()
      }
    })
  }
})
