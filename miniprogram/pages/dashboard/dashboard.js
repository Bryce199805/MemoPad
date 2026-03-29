const api = require('../../utils/api')
const auth = require('../../utils/auth')
const util = require('../../utils/util')
const ws = require('../../utils/websocket')

Page({
  data: {
    loading: true,
    todayStr: '',
    stats: null,
    todos: [],
    countdowns: [],
    categories: [],
    allTasks: [],
    completedTasks: [],
    pendingTasks: [],
    pinnedTodos: [],
    overdueTodos: [],
    upcomingCountdowns: [],
    priorityBars: [],
    completionRate: 0,
    expandedCard: ''
  },

  onLoad() {
    // Subscribe to WS events so dashboard updates in real time
    this._onChange = () => this.fetchAll()
    const events = [
      'todo_created', 'todo_updated', 'todo_deleted',
      'countdown_created', 'countdown_updated', 'countdown_deleted'
    ]
    events.forEach(e => ws.on(e, this._onChange))
  },

  onUnload() {
    const events = [
      'todo_created', 'todo_updated', 'todo_deleted',
      'countdown_created', 'countdown_updated', 'countdown_deleted'
    ]
    events.forEach(e => ws.off(e, this._onChange))
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({
      todayStr: util.formatDateFull(new Date().toISOString())
    })
    this.fetchAll()
  },

  onPullDownRefresh() {
    this.fetchAll().then(() => wx.stopPullDownRefresh())
  },

  async fetchAll() {
    this.setData({ loading: true })
    try {
      const [statsRes, todosRes, countdownsRes] = await Promise.all([
        api.get('/api/stats'),
        api.get('/api/todos'),
        api.get('/api/countdowns')
      ])
      const stats = (statsRes.data || statsRes) || {}
      const todos = (todosRes.data || todosRes) || []
      const countdowns = (countdownsRes.data || countdownsRes) || []
      this.processData(stats, todos, countdowns)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      const msg = err && err.message
      if (msg && msg.indexOf('Server URL') !== -1) {
        wx.showModal({ title: 'Error', content: 'Server URL not configured. Please go to Settings to set it.', showCancel: false })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  processData(stats, todos, countdowns) {
    const allTasks = todos
    const completedTasks = allTasks.filter(t => t.done)
    const pendingTasks = allTasks.filter(t => !t.done)
    const pinnedTodos = pendingTasks.filter(t => t.pinned)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueTodos = pendingTasks.filter(t => {
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      due.setHours(0, 0, 0, 0)
      return due < today
    })
    const upcomingCountdowns = countdowns
      .map(c => {
        const days = util.daysLeft(c.target_date)
        let daysText = ''
        let daysClass = ''
        if (days < 0) { daysText = Math.abs(days) + 'd overdue'; daysClass = 'text-danger' }
        else if (days === 0) { daysText = 'Today'; daysClass = 'text-warning' }
        else if (days === 1) { daysText = 'Tomorrow'; daysClass = 'text-warning' }
        else if (days <= 3) { daysText = days + 'd'; daysClass = 'text-warning' }
        else { daysText = days + 'd'; daysClass = 'text-accent' }
        return { ...c, daysText, daysClass }
      })
      .filter(c => new Date(c.target_date) >= today)
      .sort((a, b) => new Date(a.target_date) - new Date(b.target_date))
      .slice(0, 5)

    const total = allTasks.length || 1
    const completionRate = Math.round((completedTasks.length / total) * 100)

    const priorityBars = (stats && stats.todos && stats.todos.by_priority) || []
    const categories = (stats && stats.categories && stats.categories.list) || []

    this.setData({
      stats,
      todos,
      countdowns,
      categories,
      allTasks,
      completedTasks,
      pendingTasks,
      pinnedTodos,
      overdueTodos,
      upcomingCountdowns,
      priorityBars,
      completionRate
    })
  },

  onStatTap(e) {
    // Support both: stat-card component event (e.detail.label)
    // and direct bind:tap on element (e.currentTarget.dataset.label)
    const label = (e.detail && e.detail.label) ||
                  (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.label) || ''
    if (this.data.expandedCard === label) {
      this.setData({ expandedCard: '' })
    } else {
      this.setData({ expandedCard: label })
    }
  },

  async onToggleTodo(e) {
    const id = e.detail.id
    try {
      await api.patch('/api/todos/' + id + '/toggle')
      const todosRes = await api.get('/api/todos')
      const todos = (todosRes.data || todosRes) || []
      const statsRes = await api.get('/api/stats')
      const stats = statsRes.data || statsRes
      this.processData(stats, todos, this.data.countdowns)
    } catch (err) {
      console.error('Toggle todo error:', err)
      wx.showToast({ title: 'Failed to update', icon: 'none' })
    }
  },

  onTodoEdit(e) {
    const id = e.detail.id
    wx.navigateTo({ url: '/pages/todos/todos?id=' + id })
  },

  onTodoDelete(e) {
    const id = e.detail.id
    wx.showModal({
      title: 'Delete Task',
      content: 'Are you sure?',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.del('/api/todos/' + id)
            this.fetchAll()
          } catch (err) {
            wx.showToast({ title: 'Failed to delete', icon: 'none' })
          }
        }
      }
    })
  },

  onTodoPin(e) {
    const id = e.detail.id
    api.patch('/api/todos/' + id + '/pin')
      .then(() => this.fetchAll())
      .catch(() => wx.showToast({ title: 'Failed', icon: 'none' }))
  },

  onViewAllTodos() {
    wx.switchTab({ url: '/pages/todos/todos' })
  },

  onViewAllCountdowns() {
    wx.switchTab({ url: '/pages/countdowns/countdowns' })
  },

  getExpandedList() {
    const { expandedCard, allTasks, completedTasks } = this.data
    switch (expandedCard) {
      case 'Total': return allTasks
      case 'Completed': return completedTasks
      case 'Pending': return this.data.pendingTasks
      case 'Due Soon': return this.data.upcomingCountdowns
      default: return []
    }
  }
})
