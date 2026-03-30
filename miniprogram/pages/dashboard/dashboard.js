const api = require('../../utils/api')
const auth = require('../../utils/auth')
const util = require('../../utils/util')
const ws = require('../../utils/websocket')
const { t, getLang } = require('../../utils/i18n')

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
    expandedCard: '',
    i: {}
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
    this.applyI18n()
    this.setData({
      todayStr: util.formatDateFull(new Date().toISOString())
    })
    this.fetchAll()
  },

  applyI18n() {
    this.setData({
      i: {
        title: t('dashboard.title'),
        total: t('dashboard.totalTodos'),
        completed: t('dashboard.completed'),
        pending: t('dashboard.pending'),
        dueSoon: t('dashboard.dueSoon'),
        collapse: t('common.close'),
        viewAll: t('dashboard.viewAll'),
        noItems: t('dashboard.noCompletedTasks'),
        noCountdowns: t('dashboard.noDeadlines'),
        taskProgress: t('dashboard.taskProgress'),
        completedLabel: t('dashboard.completed'),
        doneLabel: t('dashboard.completed'),
        pendingLabel: t('dashboard.pending'),
        byPriority: t('dashboard.byPriority'),
        viewAllTasks: t('dashboard.viewAll') + ' ' + t('nav.tasks'),
        viewAllCountdowns: t('dashboard.viewAll') + ' ' + t('nav.countdowns'),
        upcoming: t('dashboard.upcomingCountdowns'),
        pinnedTasks: t('dashboard.pinned'),
        overdueTasks: t('dashboard.overdueTasks'),
        overdueAlert: '',
        welcomeTitle: 'Welcome to MemoPad',
        welcomeDesc: t('todo.noTasksHint')
      }
    })
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
        wx.showModal({ title: t('common.error'), content: 'Server URL not configured.', showCancel: false })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  processData(stats, todos, countdowns) {
    const lang = getLang()
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

    const daysLabel = t('dashboard.days')
    const overdueLabel = lang === 'zh' ? '天前' : 'd overdue'
    const todayLabel = lang === 'zh' ? '今天' : 'Today'
    const tomorrowLabel = lang === 'zh' ? '明天' : 'Tomorrow'

    const upcomingCountdowns = countdowns
      .map(c => {
        const days = util.daysLeft(c.target_date)
        let daysText = ''
        let daysClass = ''
        if (days < 0) { daysText = Math.abs(days) + overdueLabel; daysClass = 'text-danger' }
        else if (days === 0) { daysText = todayLabel; daysClass = 'text-warning' }
        else if (days === 1) { daysText = tomorrowLabel; daysClass = 'text-warning' }
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

    // Update overdue alert text
    const overdueCount = overdueTodos.length
    const alertText = lang === 'zh'
      ? '你有 ' + overdueCount + ' 个过期任务'
      : 'You have ' + overdueCount + ' overdue task' + (overdueCount > 1 ? 's' : '')

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
      completionRate,
      'i.overdueAlert': alertText
    })
  },

  onStatTap(e) {
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
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  onTodoEdit(e) {
    const id = e.detail.id
    wx.navigateTo({ url: '/pages/todos/todos?id=' + id })
  },

  onTodoDelete(e) {
    const id = e.detail.id
    wx.showModal({
      title: t('common.delete'),
      content: t('todo.confirmDelete'),
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.del('/api/todos/' + id)
            this.fetchAll()
          } catch (err) {
            wx.showToast({ title: t('common.error'), icon: 'none' })
          }
        }
      }
    })
  },

  onTodoPin(e) {
    const id = e.detail.id
    api.patch('/api/todos/' + id + '/pin')
      .then(() => this.fetchAll())
      .catch(() => wx.showToast({ title: t('common.error'), icon: 'none' }))
  },

  onViewAllTodos() {
    wx.switchTab({ url: '/pages/todos/todos' })
  },

  onViewAllCountdowns() {
    wx.switchTab({ url: '/pages/countdowns/countdowns' })
  },

  getExpandedList() {
    const { expandedCard, allTasks, completedTasks, i } = this.data
    if (expandedCard === i.total) return allTasks
    if (expandedCard === i.completed) return completedTasks
    if (expandedCard === i.pending) return this.data.pendingTasks
    if (expandedCard === i.dueSoon) return this.data.upcomingCountdowns
    return []
  }
})
