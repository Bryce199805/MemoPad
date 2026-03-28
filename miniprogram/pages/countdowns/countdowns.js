const api = require('../../utils/api')
const auth = require('../../utils/auth')
const util = require('../../utils/util')

Page({
  data: {
    loading: true,
    countdowns: [],
    pinned: [],
    unpinned: [],
    searchText: '',
    upcomingCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    showFormModal: false,
    formTitle: 'Add Countdown',
    editingId: null,
    formPriorityIdx: 1,
    formPriorityLabel: 'Medium',
    form: {
      title: '',
      targetDate: '',
      targetTime: '00:00',
      priority: 'medium'
    }
  },

  priorityOptions: ['high', 'medium', 'low'],

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.fetchData()
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh())
  },

  async fetchData(silent) {
    if (!silent) this.setData({ loading: true })
    try {
      const res = await api.get('/api/countdowns')
      const countdowns = (res.data || res) || []
      this.setData({ countdowns })
      this.computeStats()
      this.applyFilter()
    } catch (err) {
      console.error('Fetch countdowns error:', err)
    } finally {
      if (!silent) this.setData({ loading: false })
    }
  },

  computeStats() {
    const { countdowns } = this.data
    let upcomingCount = 0
    let dueSoonCount = 0
    let overdueCount = 0
    countdowns.forEach(c => {
      const days = util.daysLeft(c.target_date)
      if (days < 0) overdueCount++
      else if (days <= 7) dueSoonCount++
      else upcomingCount++
    })
    this.setData({ upcomingCount, dueSoonCount, overdueCount })
  },

  applyFilter() {
    const { countdowns, searchText } = this.data
    const filtered = searchText
      ? countdowns.filter(c => c.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1)
      : countdowns
    const pinned = filtered.filter(c => c.pinned)
    const unpinned = filtered.filter(c => !c.pinned)
    this.setData({ pinned, unpinned })
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
    this.applyFilter()
  },

  onSearchClear() {
    this.setData({ searchText: '' })
    this.applyFilter()
  },

  // ---- CRUD ----

  onAddCountdown() {
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    this.setData({
      showFormModal: true,
      formTitle: 'Add Countdown',
      editingId: null,
      formPriorityIdx: 1,
      formPriorityLabel: 'Medium',
      form: {
        title: '',
        targetDate: dateStr,
        targetTime: '00:00',
        priority: 'medium'
      }
    })
  },

  onCountdownEdit(e) {
    const id = e.detail.id
    const c = this.data.countdowns.find(item => item.id === id)
    if (!c) return
    const priorityIdx = this.priorityOptions.indexOf(c.priority || 'medium')
    const priorityLabel = ['High', 'Medium', 'Low'][priorityIdx]
    const dateParts = c.target_date ? c.target_date.split('T') : []
    const dateVal = dateParts[0] || ''
    const timeVal = (dateParts[1] || '00:00').substring(0, 5)
    this.setData({
      showFormModal: true,
      formTitle: 'Edit Countdown',
      editingId: id,
      formPriorityIdx: priorityIdx,
      formPriorityLabel: priorityLabel,
      form: {
        title: c.title || '',
        targetDate: dateVal,
        targetTime: timeVal,
        priority: c.priority || 'medium'
      }
    })
  },

  onCountdownDelete(e) {
    const id = e.detail.id
    wx.showModal({
      title: 'Delete Countdown',
      content: 'Are you sure?',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/countdowns/' + id)
          this.fetchData(true)
        } catch (err) {
          wx.showToast({ title: 'Failed to delete', icon: 'none' })
        }
      }
    })
  },

  async onCountdownPin(e) {
    const id = e.detail.id
    const c = this.data.countdowns.find(item => item.id === id)
    if (!c) return
    try {
      await api.put('/api/countdowns/' + id, { pinned: !c.pinned })
      this.fetchData(true)
    } catch (err) {
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  // ---- Form Modal ----

  onCloseModal() {
    this.setData({ showFormModal: false })
  },

  onFormTitleInput(e) {
    this.setData({ 'form.title': e.detail.value })
  },

  onFormDateChange(e) {
    this.setData({ 'form.targetDate': e.detail.value })
  },

  onFormTimeChange(e) {
    this.setData({ 'form.targetTime': e.detail.value })
  },

  onFormPriorityChange(e) {
    const idx = Number(e.detail.value)
    const val = this.priorityOptions[idx]
    const label = ['High', 'Medium', 'Low'][idx]
    this.setData({ 'form.priority': val, formPriorityIdx: idx, formPriorityLabel: label })
  },

  async onFormSave() {
    const { form, editingId } = this.data
    if (!form.title.trim()) {
      wx.showToast({ title: 'Please enter a title', icon: 'none' })
      return
    }

    const tz = new Date().getTimezoneOffset()
    const tzStr = tz <= 0 ? '+' + String(Math.floor(-tz/60)).padStart(2,'0') + ':' + String((-tz)%60).padStart(2,'0') : '-' + String(Math.floor(tz/60)).padStart(2,'0') + ':' + String(tz%60).padStart(2,'0')
    const data = {
      title: form.title.trim(),
      target_date: form.targetDate + 'T' + form.targetTime + ':00' + tzStr,
      priority: form.priority
    }

    wx.showLoading({ title: editingId ? 'Updating...' : 'Adding...' })
    try {
      if (editingId) {
        await api.put('/api/countdowns/' + editingId, data)
      } else {
        await api.post('/api/countdowns', data)
      }
      this.setData({ showFormModal: false })
      this.fetchData(true)
      wx.hideLoading()
      wx.showToast({ title: editingId ? 'Updated' : 'Added', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: 'My Countdowns - MemoPad',
      path: '/pages/countdowns/countdowns'
    }
  }
})
