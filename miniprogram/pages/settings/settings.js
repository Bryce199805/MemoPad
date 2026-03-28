const api = require('../../utils/api')
const auth = require('../../utils/auth')

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
    editingCatColor: '#6366f1'
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ user: auth.getUser() })
    this.fetchData()
  },

  async fetchData() {
    try {
      const [catsRes, todosRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/todos')
      ])
      const categories = (catsRes.data || catsRes) || []
      const todos = (todosRes.data || todosRes) || []

      // Count category usage
      const catUsageCounts = {}
      todos.forEach(t => {
        const catId = t.category_id || (t.category && t.category.id)
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
    } catch (err) {
      console.error('Fetch settings error:', err)
    } finally {
      this.setData({ loading: false })
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
      wx.showToast({ title: 'Please enter a name', icon: 'none' })
      return
    }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      wx.showToast({ title: 'Category already exists', icon: 'none' })
      return
    }
    wx.showLoading({ title: 'Adding...' })
    try {
      await api.post('/api/categories', { name: newCatName.trim(), color: newCatColor })
      this.setData({ newCatName: '' })
      this.fetchData()
      wx.hideLoading()
      wx.showToast({ title: 'Added', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    const usageCount = this.data.catUsageCounts[id] || 0

    if (usageCount > 0) {
      wx.showToast({ title: 'Cannot delete: ' + usageCount + ' task(s) use "' + name + '"', icon: 'none', duration: 2500 })
      return
    }

    wx.showModal({
      title: 'Delete Category',
      content: 'Delete "' + name + '"?',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: 'Deleting...' })
        try {
          await api.del('/api/categories/' + id)
          this.fetchData()
          wx.hideLoading()
          wx.showToast({ title: 'Deleted', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: 'Failed', icon: 'none' })
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
      wx.showToast({ title: 'Please enter a name', icon: 'none' })
      return
    }
    // Check for duplicate name (excluding current category)
    if (categories.some(c => c.id !== editingCatId && c.name.toLowerCase() === name.toLowerCase())) {
      wx.showToast({ title: 'Category already exists', icon: 'none' })
      return
    }
    wx.showLoading({ title: 'Saving...' })
    try {
      await api.put('/api/categories/' + editingCatId, { name, color: editingCatColor })
      this.setData({ editingCatId: null, editingCatName: '' })
      this.fetchData()
      wx.hideLoading()
      wx.showToast({ title: 'Saved', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  onCancelEditCategory() {
    this.setData({ editingCatId: null, editingCatName: '' })
  },

  // ---- Logout ----

  onLogout() {
    wx.showModal({
      title: 'Logout',
      content: 'Are you sure you want to logout?',
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
      wx.showToast({ title: 'Admin cannot delete account', icon: 'none' })
      return
    }
    wx.showModal({
      title: 'Delete Account',
      content: 'This action cannot be undone. All your data will be permanently deleted.',
      confirmColor: '#ef4444',
      confirmText: 'Delete',
      success: (res) => {
        if (!res.confirm) return
        wx.showModal({
          title: 'Confirm Delete',
          content: 'Are you absolutely sure? Type "DELETE" to confirm.',
          confirmColor: '#ef4444',
          confirmText: 'DELETE',
          success: async (res2) => {
            if (!res2.confirm) return
            wx.showLoading({ title: 'Deleting...' })
            try {
              await api.del('/api/auth/account')
              wx.hideLoading()
              auth.logout()
            } catch (err) {
              wx.hideLoading()
              wx.showToast({ title: err.error || 'Failed', icon: 'none' })
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
