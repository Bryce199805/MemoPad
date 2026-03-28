const api = require('../../utils/api')
const auth = require('../../utils/auth')
const app = getApp()

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
    baseUrl: ''
  },

  onShow() {
    if (!app.loginRequired()) return
    this.setData({
      user: app.globalData.user,
      baseUrl: app.globalData.baseUrl
    })
    this.fetchData()
  },

  async fetchData() {
    this.setData({ loading: true })
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
        if (t.category) {
          catUsageCounts[t.category] = (catUsageCounts[t.category] || 0) + 1
        }
      })

      this.setData({ categories, todos, catUsageCounts })
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
    const { newCatName, newCatColor } = this.data
    if (!newCatName.trim()) {
      wx.showToast({ title: 'Please enter a name', icon: 'none' })
      return
    }
    wx.showLoading({ title: 'Adding...' })
    try {
      await api.post('/api/categories', { name: newCatName.trim(), color: newCatColor })
      this.setData({ newCatName: '' })
      this.fetchData()
      wx.showToast({ title: 'Added', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: 'Failed', icon: 'none' })
    } finally {
      wx.hideLoading()
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
          wx.showToast({ title: 'Deleted', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: 'Failed', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      }
    })
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

  onShareAppMessage() {
    return {
      title: 'MemoPad',
      path: '/pages/dashboard/dashboard'
    }
  }
})
