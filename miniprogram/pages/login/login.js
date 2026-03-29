const auth = require('../../utils/auth')

Page({
  data: {
    mode: 'login',
    username: '',
    password: '',
    email: '',
    loading: false,
    error: ''
  },

  onLoad() {
    this.checkAndRedirect()
  },

  onShow() {
    this.checkAndRedirect()
  },

  checkAndRedirect() {
    if (auth.isLoggedIn()) {
      const user = auth.getUser()
      if (user && user.role === 'admin') {
        wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' })
      } else {
        wx.switchTab({ url: '/pages/dashboard/dashboard' })
      }
    }
  },

  switchMode() {
    this.setData({
      mode: this.data.mode === 'login' ? 'register' : 'login',
      error: '',
      username: '',
      password: '',
      email: ''
    })
  },

  clearError() {
    this.setData({ error: '' })
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value, error: '' })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, error: '' })
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value, error: '' })
  },

  async submit() {
    const { mode, username, password, email } = this.data

    if (!username.trim()) {
      this.setData({ error: 'Please enter your username' })
      return
    }
    if (!password) {
      this.setData({ error: 'Please enter your password' })
      return
    }
    if (mode === 'register' && password.length < 6) {
      this.setData({ error: 'Password must be at least 6 characters' })
      return
    }
    if (mode === 'register' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ error: 'Please enter a valid email address' })
      return
    }

    this.setData({ loading: true, error: '' })

    try {
      let res
      if (mode === 'login') {
        res = await auth.login(username.trim(), password)
      } else {
        res = await auth.register(username.trim(), password, email.trim())
      }

      if (res.success) {
        const user = res.data && res.data.user
        if (user && user.role === 'admin') {
          wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' })
        } else {
          wx.switchTab({ url: '/pages/dashboard/dashboard' })
        }
      } else {
        this.setData({ error: res.message || (mode === 'login' ? 'Login failed' : 'Registration failed') })
      }
    } catch (err) {
      this.setData({ error: err.message || 'Network error, please try again' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
