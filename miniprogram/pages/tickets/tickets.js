const api = require('../../utils/api')
const auth = require('../../utils/auth')
const { t, getLang } = require('../../utils/i18n')

Page({
  data: {
    loading: true,
    tickets: [],
    showModal: false,
    form: {
      title: '',
      description: '',
      priority: 'medium'
    },
    priorityIdx: 1,
    i: {}
  },

  applyI18n() {
    this.setData({
      i: {
        title: t('feedback.title'),
        new: t('feedback.submitTicket'),
        titleField: t('feedback.titleField'),
        titlePlaceholder: t('feedback.titlePlaceholder'),
        priority: t('feedback.priority'),
        priorityHigh: t('feedback.priorityHigh'),
        priorityMedium: t('feedback.priorityMedium'),
        priorityLow: t('feedback.priorityLow'),
        description: t('feedback.description'),
        descPlaceholder: t('feedback.descPlaceholder'),
        submit: t('feedback.submit'),
        submitting: t('feedback.submitting'),
        myTickets: t('feedback.myTickets'),
        noTickets: t('feedback.noTickets'),
        noTicketsDesc: t('feedback.submitTicket'),
        adminReply: t('feedback.adminReply'),
        statusOpen: t('feedback.statusOpen'),
        statusInProgress: t('feedback.statusInProgress'),
        statusResolved: t('feedback.statusResolved'),
        statusClosed: t('feedback.statusClosed'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        error: t('common.error'),
        failedToSubmit: t('feedback.failedToSubmit')
      }
    })
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.applyI18n()
    this.fetchTickets()
  },

  onPullDownRefresh() {
    this.fetchTickets().then(() => wx.stopPullDownRefresh())
  },

  async fetchTickets() {
    this.setData({ loading: true })
    try {
      const res = await api.get('/api/tickets')
      const tickets = (res.data || res) || []
      this.setData({ tickets })
    } catch (err) {
      console.error('Fetch tickets error:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onOpenModal() {
    this.setData({
      showModal: true,
      form: { title: '', description: '', priority: 'medium' },
      priorityIdx: 1
    })
  },

  onCloseModal() {
    this.setData({ showModal: false })
  },

  onTitleInput(e) {
    this.setData({ 'form.title': e.detail.value })
  },

  onDescInput(e) {
    this.setData({ 'form.description': e.detail.value })
  },

  onPriorityChange(e) {
    const idx = Number(e.detail.value)
    const priorities = ['high', 'medium', 'low']
    this.setData({ priorityIdx: idx, 'form.priority': priorities[idx] })
  },

  async onSubmit() {
    const { form } = this.data
    if (!form.title.trim()) {
      wx.showToast({ title: t('feedback.titlePlaceholder'), icon: 'none' })
      return
    }

    wx.showLoading({ title: t('feedback.submitting') })
    try {
      await api.post('/api/tickets', {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority
      })
      wx.hideLoading()
      wx.showToast({ title: t('feedback.submit'), icon: 'success' })
      this.setData({ showModal: false })
      this.fetchTickets()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: t('feedback.failedToSubmit'), icon: 'none' })
    }
  }
})
