const api = require('../../utils/api')
const auth = require('../../utils/auth')

Page({
  data: {
    loading: true,
    users: [],
    currentUser: null,
    isAdmin: false
  },

  onShow() {
    const user = auth.getUser()
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (!user || user.role !== 'admin') {
      wx.showToast({ title: 'Admin only', icon: 'none' })
      setTimeout(() => wx.switchTab({ url: '/pages/dashboard/dashboard' }), 1000)
      return
    }
    this.setData({ currentUser: user, isAdmin: true })
    this.fetchUsers()
  },

  onPullDownRefresh() {
    this.fetchUsers().then(() => wx.stopPullDownRefresh())
  },

  async fetchUsers() {
    this.setData({ loading: true })
    try {
      const res = await api.get('/api/admin/users')
      const users = (res.data || res) || []
      this.setData({ users })
    } catch (err) {
      console.error('Fetch users error:', err)
      if (err && err.message && err.message.indexOf('401') !== -1) {
        wx.showToast({ title: 'Unauthorized', icon: 'none' })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  onDisableUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u.id === id)
    if (!user) return

    wx.showModal({
      title: 'Disable User',
      content: 'Disable "' + user.username + '"?',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.patch('/api/admin/users/' + id + '/disable')
          this.fetchUsers(true)
          wx.showToast({ title: 'Disabled', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  onEnableUser(e) {
    const id = e.currentTarget.dataset.id
    try {
      api.patch('/api/admin/users/' + id + '/enable').then(() => {
        this.fetchUsers(true)
        wx.showToast({ title: 'Enabled', icon: 'success' })
      }).catch(() => wx.showToast({ title: 'Failed', icon: 'none' }))
    } catch (err) {}
  },

  onDeleteUser(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u.id === id)
    if (!user) return

    if (user.id === this.data.currentUser.id) {
      wx.showToast({ title: 'Cannot delete yourself', icon: 'none' })
      return
    }

    wx.showModal({
      title: 'Delete User',
      content: 'Delete "' + user.username + '" and all their data? This cannot be undone.',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/admin/users/' + id)
          this.fetchUsers(true)
          wx.showToast({ title: 'Deleted', icon: 'success' })
        } catch (err) {
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
  }
})
