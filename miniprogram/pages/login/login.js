const auth = require('../../utils/auth')
const ws = require('../../utils/websocket')
const { t, getLang } = require('../../utils/i18n')

Page({
  data: {
    mode: 'login',
    username: '',
    password: '',
    email: '',
    loading: false,
    error: '',
    i: {}
  },

  onLoad() {
    this.applyI18n()
    this.checkAndRedirect()
  },

  onShow() {
    this.applyI18n()
    this.checkAndRedirect()
  },

  applyI18n() {
    this.setData({
      i: {
        tagline: t('login.tagline'),
        signIn: t('login.signIn'),
        signUp: t('login.signUp'),
        username: t('login.username'),
        email: t('login.email') + ' ' + t('login.optional'),
        password: t('login.password'),
        usernamePlaceholder: t('login.usernamePlaceholder'),
        passwordPlaceholder: t('login.passwordPlaceholder'),
        newPasswordPlaceholder: t('login.newPasswordPlaceholder'),
        createAccount: t('login.createAccount')
      }
    })
  },

  checkAndRedirect() {
    if (auth.isLoggedIn()) {
      // Connect WebSocket
      ws.connect()
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
      this.setData({ error: t('login.usernamePlaceholder') })
      return
    }
    if (!password) {
      this.setData({ error: t('login.passwordPlaceholder') })
      return
    }
    if (mode === 'register' && password.length < 6) {
      this.setData({ error: t('login.newPasswordPlaceholder') })
      return
    }
    if (mode === 'register' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ error: t('login.emailInvalid') })
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
        // Connect WebSocket after successful login
        ws.connect()
        const user = res.data && res.data.user
        if (user && user.role === 'admin') {
          wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' })
        } else {
          wx.switchTab({ url: '/pages/dashboard/dashboard' })
        }
      } else {
        this.setData({ error: res.message || (mode === 'login' ? t('login.loginFailed') : t('login.registerFailed')) })
      }
    } catch (err) {
      this.setData({ error: err.message || t('common.error') })
    } finally {
      this.setData({ loading: false })
    }
  }
})
