const api = require('../../utils/api')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: true,
    user: null,
    users: [],
    tickets: [],
    ticketFilter: 'all',
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      openTickets: 0,
      totalTickets: 0
    }
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
      const users = (usersRes.data || usersRes) || []
      const tickets = (ticketsRes.data || ticketsRes) || []
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.disabled).length,
        openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        totalTickets: tickets.length
      }
      
      this.setData({ users, tickets, stats })
    } catch (err) {
      console.error('Fetch admin data error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onFilterTickets(e) {
    this.setData({ ticketFilter: e.currentTarget.dataset.filter })
  },

  getFilteredTickets() {
    const { tickets, ticketFilter } = this.data
    if (ticketFilter === 'all') return tickets
    return tickets.filter(t => t.status === ticketFilter)
  },

  onGoUsers() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  onGoTickets() {
    wx.navigateTo({ url: '/pages/admin-tickets/admin-tickets' })
  },

  onViewTicket(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/admin-tickets/admin-tickets?id=' + id })
  },

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
