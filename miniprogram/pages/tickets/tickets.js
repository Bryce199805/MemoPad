const api = require('../../utils/api')
const auth = require('../../utils/auth')

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
    priorityIdx: 1
  },

  onShow() {
    if (!auth.isLoggedIn()) {
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
      wx.showToast({ title: 'Please enter title', icon: 'none' })
      return
    }

    wx.showLoading({ title: 'Submitting...' })
    try {
      await api.post('/api/tickets', {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority
      })
      wx.hideLoading()
      wx.showToast({ title: 'Submitted', icon: 'success' })
      this.setData({ showModal: false })
      this.fetchTickets()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  }
})
