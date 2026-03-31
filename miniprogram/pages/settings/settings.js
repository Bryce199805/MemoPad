const api = require('../../utils/api')
const auth = require('../../utils/auth')
const { t, getLang, setLang } = require('../../utils/i18n')

const APP_VERSION = 'v0.7'
const GITHUB_URL = 'https://github.com/Bryce199805/MemoPad'

Page({
  data: {
    loading: true,
    user: null,
    categories: [],
    todos: [],
    catUsageCounts: {},
    newCatName: '',
    colorOptions: ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#6b7280'],
    newCatColorIdx: 0,
    newCatColor: '#6366f1',
    colorLabels: ['Indigo', 'Purple', 'Pink', 'Red', 'Amber', 'Green', 'Cyan', 'Blue', 'Gray'],
    editingCatId: null,
    editingCatName: '',
    editingCatColorIdx: 0,
    editingCatColor: '#6366f1',
    currentLang: 'en',
    appVersion: APP_VERSION,
    unreadCount: 0,
    i: {}
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ user: auth.getUser(), currentLang: getLang() })
    this.applyI18n()
    if (!this._loaded) {
      this.fetchData()
    } else {
      this.fetchData(true)
    }
    this.fetchUnreadCount()
  },

  applyI18n() {
    this.setData({
      i: {
        title: t('settings.title'),
        profile: t('settings.profile'),
        noEmail: t('settings.noEmail'),
        language: t('settings.language'),
        languageDesc: t('settings.languageDesc'),
        categories: t('settings.categories'),
        newCategoryPlaceholder: t('settings.newCategoryPlaceholder'),
        add: t('settings.add'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        noCategories: t('settings.noCategories'),
        support: t('feedback.title'),
        feedbackIssues: t('feedback.subtitle'),
        admin: t('nav.admin'),
        adminPanel: t('admin.title'),
        logout: t('settings.logout'),
        deleteAccount: t('settings.deleteAccount'),
        deleteAccountDesc: t('settings.deleteAccountDesc'),
        about: t('settings.about'),
        version: t('settings.version'),
        sourceCode: t('settings.sourceCode')
      }
    })
  },

  setLang(e) {
    const lang = e.currentTarget.dataset.lang
    setLang(lang)
    this.setData({ currentLang: lang })
    this.applyI18n()
  },

  onCopyGithub() {
    wx.setClipboardData({
      data: GITHUB_URL,
      success: () => {
        wx.showToast({ title: t('settings.linkCopied'), icon: 'success' })
      }
    })
  },

  async fetchUnreadCount() {
    const user = auth.getUser()
    if (user && user.role === 'admin') return
    try {
      const res = await api.get('/api/tickets/unread-count')
      const data = res.data || res
      this.setData({ unreadCount: data.count || 0 })
    } catch (e) {
      // silently ignore
    }
  },

  async fetchData(silent) {
    try {
      const [catsRes, todosRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/todos')
      ])
      const categories = (catsRes.data || catsRes) || []
      const todos = (todosRes.data || todosRes) || []

      // Count category usage
      const catUsageCounts = {}
      todos.forEach(todo => {
        const catId = todo.category_id || (todo.category && todo.category.id)
        if (catId) {
          catUsageCounts[catId] = (catUsageCounts[catId] || 0) + 1
        }
      })

      this.setData({ categories, todos, catUsageCounts })
      // Set default color to one not already used
      const usedColors = categories.map(c => c.color)
      const nextColorIdx = this.data.colorOptions.findIndex(c => usedColors.indexOf(c) === -1)
      if (nextColorIdx !== -1) {
        this.setData({ newCatColorIdx: nextColorIdx, newCatColor: this.data.colorOptions[nextColorIdx] })
      }
      this._loaded = true
    } catch (err) {
      console.error('Fetch settings error:', err)
    } finally {
      if (!silent) this.setData({ loading: false })
    }
  },

  // ---- Category CRUD ----

  onCatNameInput(e) {
    this.setData({ newCatName: e.detail.value })
  },

  onCatColorChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      newCatColorIdx: idx,
      newCatColor: this.data.colorOptions[idx]
    })
  },

  async onAddCategory() {
    const { newCatName, newCatColor, categories } = this.data
    const name = newCatName.trim()
    if (!name) {
      wx.showToast({ title: t('settings.newCategoryPlaceholder'), icon: 'none' })
      return
    }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      wx.showToast({ title: t('settings.duplicateCategory'), icon: 'none' })
      return
    }
    wx.showLoading({ title: t('common.loading') })
    try {
      await api.post('/api/categories', { name: newCatName.trim(), color: newCatColor })
      this.setData({ newCatName: '' })
      this.fetchData()
      wx.hideLoading()
      wx.showToast({ title: t('common.success'), icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    const usageCount = this.data.catUsageCounts[id] || 0

    if (usageCount > 0) {
      wx.showToast({ title: t('settings.cannotDeleteCategory', { name, count: usageCount }), icon: 'none', duration: 2500 })
      return
    }

    wx.showModal({
      title: t('common.delete'),
      content: t('settings.confirmDeleteCategory', { name }),
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: t('common.loading') })
        try {
          await api.del('/api/categories/' + id)
          this.fetchData()
          wx.hideLoading()
          wx.showToast({ title: t('common.success'), icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: t('common.error'), icon: 'none' })
        }
      }
    })
  },

  // ---- Category Edit ----

  onEditCategory(e) {
    const id = e.currentTarget.dataset.id
    const cat = this.data.categories.find(c => c.id === id)
    if (!cat) return
    const colorIdx = this.data.colorOptions.indexOf(cat.color)
    this.setData({
      editingCatId: id,
      editingCatName: cat.name,
      editingCatColorIdx: colorIdx !== -1 ? colorIdx : 0,
      editingCatColor: cat.color
    })
  },

  onEditingCatNameInput(e) {
    this.setData({ editingCatName: e.detail.value })
  },

  onEditingCatColorChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      editingCatColorIdx: idx,
      editingCatColor: this.data.colorOptions[idx]
    })
  },

  async onSaveEditCategory() {
    const { editingCatId, editingCatName, editingCatColor, categories } = this.data
    const name = editingCatName.trim()
    if (!name) {
      wx.showToast({ title: t('settings.newCategoryPlaceholder'), icon: 'none' })
      return
    }
    // Check for duplicate name (excluding current category)
    if (categories.some(c => c.id !== editingCatId && c.name.toLowerCase() === name.toLowerCase())) {
      wx.showToast({ title: t('settings.duplicateCategory'), icon: 'none' })
      return
    }
    wx.showLoading({ title: t('common.loading') })
    try {
      await api.put('/api/categories/' + editingCatId, { name, color: editingCatColor })
      this.setData({ editingCatId: null, editingCatName: '' })
      this.fetchData()
      wx.hideLoading()
      wx.showToast({ title: t('common.success'), icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  onCancelEditCategory() {
    this.setData({ editingCatId: null, editingCatName: '' })
  },

  // ---- Logout ----

  onLogout() {
    wx.showModal({
      title: t('settings.logout'),
      content: t('settings.logoutConfirm'),
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
        }
      }
    })
  },

  onGoAdmin() {
    wx.navigateTo({ url: '/pages/admin-dashboard/admin-dashboard' })
  },

  onGoTickets() {
    wx.navigateTo({ url: '/pages/tickets/tickets' })
  },

  // ---- Delete Account ----

  onDeleteAccount() {
    const { user } = this.data
    if (user.role === 'admin') {
      wx.showToast({ title: t('common.error'), icon: 'none' })
      return
    }
    wx.showModal({
      title: t('settings.deleteAccount'),
      content: t('settings.confirmDeleteAccount'),
      confirmColor: '#ef4444',
      confirmText: t('common.confirm'),
      success: (res) => {
        if (!res.confirm) return
        wx.showModal({
          title: t('settings.deleteAccount'),
          content: t('settings.confirmDeleteAccount2'),
          confirmColor: '#ef4444',
          confirmText: t('common.confirm'),
          success: async (res2) => {
            if (!res2.confirm) return
            wx.showLoading({ title: t('common.loading') })
            try {
              await api.del('/api/auth/account')
              wx.hideLoading()
              auth.logout()
            } catch (err) {
              wx.hideLoading()
              wx.showToast({ title: err.error || t('settings.failedDelete'), icon: 'none' })
            }
          }
        })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: 'MemoPad',
      path: '/pages/dashboard/dashboard'
    }
  }
})
