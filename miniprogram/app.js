App({
  globalData: {
    baseUrl: ''  // 从 config.js 读取
  },

  onLaunch() {
    // Load config
    try {
      const config = require('./config.js')
      this.globalData.baseUrl = config.baseUrl || ''
    } catch (e) {
      console.warn('config.js not found, using empty baseUrl')
    }

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