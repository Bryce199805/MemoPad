const api = require('./api')

function login(username, password) {
  return api.post('/api/auth/login', { username, password }).then(res => {
    if (res.success) {
      wx.setStorageSync('memo_api_key', res.data.api_key)
      if (res.data.user) {
        wx.setStorageSync('memo_user', JSON.stringify(res.data.user))
      }
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
      if (res.data.user) {
        wx.setStorageSync('memo_user', JSON.stringify(res.data.user))
      }
    }
    return res
  })
}

function verify() {
  return api.get('/api/auth/verify').then(res => {
    if (res.success) {
      wx.setStorageSync('memo_user', JSON.stringify(res.data.user))
    }
    return res
  })
}

function logout() {
  wx.removeStorageSync('memo_api_key')
  wx.removeStorageSync('memo_user')
  wx.redirectTo({ url: '/pages/login/login' })
}

function isLoggedIn() {
  return !!wx.getStorageSync('memo_api_key')
}

function getUser() {
  try {
    const str = wx.getStorageSync('memo_user')
    if (!str) return null
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

module.exports = { login, register, verify, logout, isLoggedIn, getUser }
