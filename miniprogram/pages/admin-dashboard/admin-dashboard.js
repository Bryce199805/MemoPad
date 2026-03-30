const api = require('../../utils/api')
const auth = require('../../utils/auth')
const { t } = require('../../utils/i18n')

Page({
  data: {
    loading: true,
    user: null,
    activeTab: 'dashboard',
    expandedCard: '',
    users: [],
    tickets: [],
    ticketFilter: 0,
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
    replyText: '',
    ticketFilterLabels: [],
    i: {}
  },

  // Index 0 = "All" (no filter), rest map to ticket status values
  ticketStatusOptions: ['', 'open', 'in_progress', 'resolved', 'closed'],

  applyI18n() {
    const ticketFilterLabels = [
      t('admin.filterAll'),
      t('admin.filterOpen'),
      t('admin.filterInProgress'),
      t('admin.filterResolved'),
      t('admin.filterClosed')
    ]
    this.setData({
      ticketFilterLabels,
      i: {
        title: t('admin.title'),
        logout: t('settings.logout'),
        totalUsers: t('admin.totalUsers'),
        activeUsers: t('admin.activeUsers'),
        openTickets: t('admin.openTickets'),
        totalTickets: t('admin.totalTickets'),
        users: t('admin.userManagement'),
        activeUsersLabel: t('admin.activeUsers'),
        openTicketsLabel: t('admin.openTickets'),
        allTickets: t('admin.totalTickets'),
        collapse: t('common.close'),
        noEmail: t('settings.noEmail'),
        recentTickets: t('admin.recentTickets'),
        // User tab
        tasks: t('nav.tasks'),
        countdowns: t('nav.countdowns'),
        enable: t('admin.enable'),
        disable: t('admin.disable'),
        delete: t('common.delete'),
        you: '(You)',
        // Tickets tab
        noTickets: t('admin.noTickets'),
        noDescription: t('feedback.noDescription'),
        // Config tab
        userRegistration: t('admin.userRegistration'),
        userRegistrationDesc: t('admin.userRegistrationDesc'),
        // Bottom tabs
        tabDashboard: t('nav.dashboard'),
        tabUsers: t('admin.userManagement'),
        tabTickets: t('admin.ticketManagement'),
        tabConfig: t('settings.title'),
        // Ticket detail modal
        ticketDetails: t('feedback.ticketDetails'),
        detailTitle: t('feedback.titleField'),
        detailFrom: t('admin.by'),
        detailStatus: t('common.status'),
        detailDescription: t('feedback.description'),
        reply: t('admin.yourReply'),
        replyPlaceholder: t('admin.replyPlaceholder'),
        inProgress: t('feedback.statusInProgress'),
        resolve: t('feedback.statusResolved'),
        close: t('common.close'),
        // Status labels for WXS
        statusOpen: t('feedback.statusOpen'),
        statusInProgress: t('feedback.statusInProgress'),
        statusResolved: t('feedback.statusResolved'),
        statusClosed: t('feedback.statusClosed')
      }
    })
  },

  onShow() {
    const user = auth.getUser()
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (!user || user.role !== 'admin') {
      wx.showToast({ title: t('common.error'), icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1000)
      return
    }
    this.setData({ user })
    this.applyI18n()
    if (!this._loaded) {
      this.fetchAll()
    } else {
      this.fetchAll(true)
    }
  },

  onPullDownRefresh() {
    this.fetchAll().then(() => wx.stopPullDownRefresh())
  },

  async fetchAll(silent) {
    if (!silent) this.setData({ loading: true })
    try {
      const [usersRes, ticketsRes, configRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/tickets'),
        api.get('/api/admin/config')
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
        openTickets: tickets.filter(tk => tk.status === 'open' || tk.status === 'in_progress').length,
        totalTickets: tickets.length
      }

      // Parse config from server
      let config = { registration_enabled: true }
      if (configRes && typeof configRes === 'object') {
        const raw = (configRes.data !== undefined) ? configRes.data : configRes
        if (raw && typeof raw === 'object') config = raw
      }

      this.setData({ users, tickets, filteredTickets: tickets, stats, config })
      this._loaded = true
    } catch (err) {
      console.error('Fetch admin data error:', err)
    } finally {
      if (!silent) this.setData({ loading: false })
    }
  },

  // Tab switching
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, expandedCard: '' })
  },

  // Stat card tap - show preview
  onStatTap(e) {
    const card = e.currentTarget.dataset.card
    if (this.data.expandedCard === card) {
      this.setData({ expandedCard: '' })
    } else {
      this.setData({ expandedCard: card })
    }
  },

  onCollapsePreview() {
    this.setData({ expandedCard: '' })
  },

  // Ticket filter
  onTicketFilterChange(e) {
    // e.detail.value is the picker index (number), not the status string
    const idx = Number(e.detail.value)
    const filter = this.ticketStatusOptions[idx] || ''
    const { tickets } = this.data
    const filteredTickets = filter
      ? tickets.filter(tk => tk.status === filter)
      : tickets
    this.setData({ ticketFilter: idx, filteredTickets })
  },

  // Users
  onDisableUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u.id === id)
    if (!user) return

    wx.showModal({
      title: t('admin.disable'),
      content: t('admin.confirmDisable'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.patch('/api/admin/users/' + id + '/disable')
          this.fetchAll()
          wx.showToast({ title: t('admin.disabled'), icon: 'success' })
        } catch (err) {
          wx.showToast({ title: t('admin.failedDisable'), icon: 'none' })
        }
      }
    })
  },

  onEnableUser(e) {
    const id = e.currentTarget.dataset.id
    api.patch('/api/admin/users/' + id + '/enable').then(() => {
      this.fetchAll()
      wx.showToast({ title: t('admin.active'), icon: 'success' })
    }).catch(() => wx.showToast({ title: t('admin.failedEnable'), icon: 'none' }))
  },

  onDeleteUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u.id === id)
    if (!user) return

    if (user.id === this.data.user.id) {
      wx.showToast({ title: t('common.error'), icon: 'none' })
      return
    }

    wx.showModal({
      title: t('common.delete'),
      content: t('admin.confirmDeleteUser', { username: user.username }),
      confirmColor: '#ef4444',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/admin/users/' + id)
          this.fetchAll()
          wx.showToast({ title: t('common.deleted'), icon: 'success' })
        } catch (err) {
          wx.showToast({ title: t('admin.failedDeleteUser'), icon: 'none' })
        }
      }
    })
  },

  // Tickets
  onViewTicket(e) {
    const id = e.currentTarget.dataset.id
    const ticket = this.data.tickets.find(tk => tk.id === id)
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

    wx.showLoading({ title: t('common.loading') })
    api.put('/api/admin/tickets/' + ticket.id, { status, reply: this.data.replyText }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: t('common.updated'), icon: 'success' })
      this.onCloseTicketDetail()
      this.fetchAll()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: t('admin.failedUpdateStatus'), icon: 'none' })
    })
  },

  onDeleteTicket() {
    const ticket = this.data.currentTicket
    if (!ticket) return

    wx.showModal({
      title: t('common.delete'),
      content: t('admin.confirmDeleteTicket', { title: ticket.title }),
      confirmColor: '#ef4444',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: t('common.loading') })
        try {
          await api.del('/api/admin/tickets/' + ticket.id)
          wx.hideLoading()
          wx.showToast({ title: t('common.deleted'), icon: 'success' })
          this.onCloseTicketDetail()
          this.fetchAll()
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: t('admin.failedDeleteTicket'), icon: 'none' })
        }
      }
    })
  },

  // Config
  onToggleRegistration(e) {
    const enabled = e.detail.value
    this.setData({ 'config.registration_enabled': enabled })
    api.put('/api/admin/config', { registration_enabled: enabled }).catch(() => {
      wx.showToast({ title: t('common.error'), icon: 'none' })
      this.setData({ 'config.registration_enabled': !enabled })
    })
  },

  // Logout
  onLogout() {
    wx.showModal({
      title: t('settings.logout'),
      content: t('settings.logoutConfirm'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: (res) => {
        if (res.confirm) auth.logout()
      }
    })
  }
})
