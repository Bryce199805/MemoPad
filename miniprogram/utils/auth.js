const api = require('./api')
const app = getApp()

function login(username, password) {
  return api.post('/api/auth/login', { username, password }).then(res => {
    if (res.success) {
      wx.setStorageSync('memo_api_key', res.data.api_key)
      app.globalData.apiKey = res.data.api_key
      app.globalData.user = res.data.user
      app.globalData.isAuthenticated = true
    }
    return res
  })
}

function register(username, password, email) {
  const data = { username, password }
  if (email) data.email = email
  return api.post('/api/auth/register', data).then(res => {
    if (res.success) {
      wx.setStorageSync('memo_api_key', res.data.api_key)
      app.globalData.apiKey = res.data.api_key
      app.globalData.user = res.data.user
      app.globalData.isAuthenticated = true
    }
    return res
  })
}

function verify() {
  return api.get('/api/auth/verify').then(res => {
    if (res.success) {
      app.globalData.user = res.data.user
      app.globalData.isAuthenticated = true
    }
    return res
  })
}

function logout() {
  wx.removeStorageSync('memo_api_key')
  app.globalData.apiKey = ''
  app.globalData.user = null
  app.globalData.isAuthenticated = false
  wx.redirectTo({ url: '/pages/login/login' })
}

function isLoggedIn() {
  return !!wx.getStorageSync('memo_api_key')
}

function getApiKey() {
  return wx.getStorageSync('memo_api_key') || ''
}

module.exports = { login, register, verify, logout, isLoggedIn, getApiKey }
