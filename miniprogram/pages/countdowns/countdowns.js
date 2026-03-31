const api = require('../../utils/api')
const auth = require('../../utils/auth')
const util = require('../../utils/util')
const ws = require('../../utils/websocket')
const { t } = require('../../utils/i18n')

Page({
  data: {
    loading: true,
    countdowns: [],
    pinned: [],
    unpinned: [],
    searchText: '',
    priorityFilter: '',
    upcomingCount: 0,
    dueSoonCount: 0,
    overdueCount: 0,
    dueTodayCount: 0,
    dueIn3DaysCount: 0,
    selectMode: false,
    selectedIds: [],
    showFormModal: false,
    formTitle: '',
    editingId: null,
    formPriorityIdx: 1,
    formPriorityLabel: '',
    form: {
      title: '',
      targetDate: '',
      targetTime: '00:00',
      priority: 'medium'
    },
    i: {}
  },

  priorityOptions: ['high', 'medium', 'low'],

  onLoad() {
    // Store bound references so ws.off() can find the exact same function
    this._onCountdownCreated = this.handleCountdownCreated.bind(this)
    this._onCountdownUpdated = this.handleCountdownUpdated.bind(this)
    this._onCountdownDeleted = this.handleCountdownDeleted.bind(this)
    ws.on('countdown_created', this._onCountdownCreated)
    ws.on('countdown_updated', this._onCountdownUpdated)
    ws.on('countdown_deleted', this._onCountdownDeleted)
  },

  onUnload() {
    ws.off('countdown_created', this._onCountdownCreated)
    ws.off('countdown_updated', this._onCountdownUpdated)
    ws.off('countdown_deleted', this._onCountdownDeleted)
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.applyI18n()
    if (!this._loaded) {
      this.fetchData()
    } else {
      this.fetchData(true)
    }
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh())
  },

  applyI18n() {
    const priorityLabels = [t('countdown.high'), t('countdown.medium'), t('countdown.low')]
    this.setData({
      i: {
        title: t('countdown.title'),
        subtitle: t('countdown.subtitle'),
        add: t('countdown.add'),
        searchPlaceholder: t('countdown.searchPlaceholder'),
        upcoming: t('countdown.upcoming'),
        dueSoon: t('countdown.dueSoon'),
        overdue: t('countdown.overdue'),
        daysLeft: t('countdown.daysLeft'),
        daysAgo: t('countdown.daysAgo'),
        pinned: t('countdown.pinned'),
        newCountdown: t('countdown.new'),
        editCountdown: t('countdown.edit'),
        name: t('countdown.name'),
        targetDate: t('countdown.targetDate'),
        priority: t('countdown.priority'),
        high: t('countdown.high'),
        medium: t('countdown.medium'),
        low: t('countdown.low'),
        noCountdowns: t('countdown.noCountdowns'),
        noCountdownsHint: t('countdown.noCountdownsHint'),
        select: t('countdown.select'),
        doneSelect: t('countdown.doneSelect'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        all: t('countdown.all'),
        none: t('countdown.none'),
        delete: t('common.delete'),
        selected: t('countdown.selected'),
        noMatches: t('countdown.noMatches'),
        noMatchesHint: t('countdown.noMatchesHint'),
        selectDate: t('countdown.selectDate'),
        selectTime: t('countdown.selectTime'),
        countdownName: t('countdown.countdownName'),
        countdowns: t('countdown.title'),
        reminderTodayBanner: t('countdown.reminderTodayBanner'),
        reminderSoonBanner: t('countdown.reminderSoonBanner'),
        priorityLabels: priorityLabels
      },
      formPriorityLabel: t('countdown.medium')
    })
  },

  // WebSocket event handlers
  handleCountdownCreated(countdown) {
    const exists = this.data.countdowns.find(c => c.id === countdown.id)
    if (!exists) {
      const countdowns = [...this.data.countdowns, countdown]  // new array
      this.setData({ countdowns })
      this.computeStats()
      this.applyFilter()
    }
  },

  handleCountdownUpdated(countdown) {
    const idx = this.data.countdowns.findIndex(c => c.id === countdown.id)
    if (idx !== -1) {
      const countdowns = [...this.data.countdowns]  // shallow copy
      countdowns[idx] = countdown
      this.setData({ countdowns })
      this.computeStats()
      this.applyFilter()
    }
  },

  handleCountdownDeleted(data) {
    const countdowns = this.data.countdowns.filter(c => c.id !== data.id && c.id !== Number(data.id))
    this.setData({ countdowns })
    this.computeStats()
    this.applyFilter()
  },

  async fetchData(silent) {
    if (!silent) this.setData({ loading: true })
    try {
      const res = await api.get('/api/countdowns')
      const countdowns = (res.data || res) || []
      this.setData({ countdowns })
      this.computeStats()
      this.applyFilter()
      this._loaded = true
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
    let dueTodayCount = 0
    let dueIn3DaysCount = 0

    countdowns.forEach(c => {
      const days = util.daysLeft(c.target_date)
      if (days < 0) overdueCount++
      else if (days <= 7) dueSoonCount++
      else upcomingCount++

      if (days === 0) dueTodayCount++
      else if (days >= 1 && days <= 3) dueIn3DaysCount++
    })

    const reminderTodayBanner = t('countdown.reminderTodayBanner', { n: dueTodayCount })
    const reminderSoonBanner = t('countdown.reminderSoonBanner', { n: dueIn3DaysCount })

    this.setData({
      upcomingCount,
      dueSoonCount,
      overdueCount,
      dueTodayCount,
      dueIn3DaysCount,
      'i.reminderTodayBanner': reminderTodayBanner,
      'i.reminderSoonBanner': reminderSoonBanner
    })
  },

  applyFilter() {
    const { countdowns, searchText, priorityFilter } = this.data
    let filtered = countdowns
    if (searchText) {
      filtered = filtered.filter(c => c.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1)
    }
    if (priorityFilter) {
      filtered = filtered.filter(c => c.priority === priorityFilter)
    }
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

  onPriorityFilter(e) {
    const priority = e.currentTarget.dataset.priority
    this.setData({ priorityFilter: priority })
    this.applyFilter()
  },

  // ---- Select Mode ----

  onToggleSelectMode() {
    this.setData({
      selectMode: !this.data.selectMode,
      selectedIds: []
    })
  },

  onToggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const { selectedIds } = this.data
    const idx = selectedIds.indexOf(id)
    if (idx === -1) {
      this.setData({ selectedIds: [...selectedIds, id] })
    } else {
      this.setData({ selectedIds: selectedIds.filter((_, i) => i !== idx) })
    }
  },

  onSelectAll() {
    const { countdowns } = this.data
    const allIds = countdowns.map(c => c.id)
    this.setData({ selectedIds: allIds })
  },

  onDeselectAll() {
    this.setData({ selectedIds: [] })
  },

  async onBatchDelete() {
    const { selectedIds } = this.data
    if (selectedIds.length === 0) return
    wx.showModal({
      title: t('countdown.confirmBatchDelete', { n: selectedIds.length }),
      content: t('countdown.batchDeleteHint'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: t('common.loading') })
        try {
          await Promise.all(selectedIds.map(id => api.del('/api/countdowns/' + id)))
          this.setData({ selectMode: false, selectedIds: [] })
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: t('common.deleted'), icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: t('common.error'), icon: 'none' })
        }
      }
    })
  },

  // ---- CRUD ----

  onAddCountdown() {
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    this.setData({
      showFormModal: true,
      formTitle: t('countdown.new'),
      editingId: null,
      formPriorityIdx: 1,
      formPriorityLabel: t('countdown.medium'),
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
    const priorityLabels = [t('countdown.high'), t('countdown.medium'), t('countdown.low')]
    const priorityLabel = priorityLabels[priorityIdx]
    const dateParts = c.target_date ? c.target_date.split('T') : []
    const dateVal = dateParts[0] || ''
    const timeVal = (dateParts[1] || '00:00').substring(0, 5)
    this.setData({
      showFormModal: true,
      formTitle: t('countdown.edit'),
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
      title: t('countdown.confirmDelete'),
      content: t('countdown.confirmDelete'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/countdowns/' + id)
          this.fetchData(true)
        } catch (err) {
          wx.showToast({ title: t('common.error'), icon: 'none' })
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
      wx.showToast({ title: t('common.error'), icon: 'none' })
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
    const priorityLabels = [t('countdown.high'), t('countdown.medium'), t('countdown.low')]
    const label = priorityLabels[idx]
    this.setData({ 'form.priority': val, formPriorityIdx: idx, formPriorityLabel: label })
  },

  async onFormSave() {
    const { form, editingId } = this.data
    if (!form.title.trim()) {
      wx.showToast({ title: t('countdown.enterTitle'), icon: 'none' })
      return
    }
    if (!form.targetDate) {
      wx.showToast({ title: t('countdown.selectDate'), icon: 'none' })
      return
    }

    const tz = new Date().getTimezoneOffset()
    const tzStr = tz <= 0 ? '+' + String(Math.floor(-tz/60)).padStart(2,'0') + ':' + String((-tz)%60).padStart(2,'0') : '-' + String(Math.floor(tz/60)).padStart(2,'0') + ':' + String(tz%60).padStart(2,'0')
    const data = {
      title: form.title.trim(),
      target_date: form.targetDate + 'T' + form.targetTime + ':00' + tzStr,
      priority: form.priority
    }

    wx.showLoading({ title: t('common.loading') })
    try {
      if (editingId) {
        await api.put('/api/countdowns/' + editingId, data)
      } else {
        await api.post('/api/countdowns', data)
      }
      this.setData({ showFormModal: false })
      this.fetchData(true)
      wx.hideLoading()
      wx.showToast({ title: editingId ? t('common.updated') : t('common.added'), icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: t('countdown.title') + ' - MemoPad',
      path: '/pages/countdowns/countdowns'
    }
  }
})
