App({
  globalData: {
    baseUrl: ''  // 服务器地址
  },

  onLaunch() {
    // Sync baseUrl to storage for api.js to use
    let url = this.globalData.baseUrl
    if (url && url.endsWith('/')) {
      url = url.slice(0, -1)
    }
    if (url) {
      wx.setStorageSync('memo_base_url', url)
    }

    // Auto verify if already logged in
    if (wx.getStorageSync('memo_api_key')) {
      const api = require('./utils/api')
      api.get('/api/auth/verify').then(res => {
        if (res.success && res.data && res.data.user) {
          wx.setStorageSync('memo_user', JSON.stringify(res.data.user))
        }
      }).catch(() => {})
    }
  },

})