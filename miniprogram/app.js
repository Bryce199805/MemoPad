const api = require('./utils/api')

App({
  globalData: {
    baseUrl: 'https://your-server.com',  // User needs to change this
    apiKey: '',
    user: null,
    isAuthenticated: false
  },

  onLaunch() {
    const apiKey = wx.getStorageSync('memo_api_key')
    if (apiKey) {
      this.globalData.apiKey = apiKey
      this.verifyAuth()
    }
  },

  async verifyAuth() {
    try {
      const res = await api.get('/api/auth/verify')
      if (res.success) {
        this.globalData.user = res.data.user
        this.globalData.isAuthenticated = true
      } else {
        this.globalData.isAuthenticated = false
        wx.removeStorageSync('memo_api_key')
      }
    } catch (e) {
      this.globalData.isAuthenticated = false
    }
  },

  loginRequired() {
    if (!this.globalData.isAuthenticated) {
      wx.redirectTo({ url: '/pages/login/login' })
      return false
    }
    return true
  }
})
