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

  switchMode(e) {
    // target mode is passed via data-mode attribute, or fallback to toggle
    const target = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode
    const newMode = target || (this.data.mode === 'login' ? 'register' : 'login')
    if (newMode === this.data.mode) return
    this.setData({
      mode: newMode,
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
    if (mode === 'register') {
      const uname = username.trim()
      if (uname.length < 3) {
        this.setData({ error: t('login.usernameTooShort') })
        return
      }
      if (uname.length > 50) {
        this.setData({ error: t('login.usernameTooLong') })
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(uname)) {
        this.setData({ error: t('login.invalidUsername') })
        return
      }
    }
    if (!password) {
      this.setData({ error: t('login.passwordPlaceholder') })
      return
    }
    if (mode === 'register' && password.length < 6) {
      this.setData({ error: t('login.passwordTooShort') })
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

      // Connect WebSocket after successful login
      ws.connect()
      const user = res.data && res.data.user
      if (user && user.role === 'admin') {
        wx.redirectTo({ url: '/pages/admin-dashboard/admin-dashboard' })
      } else {
        wx.switchTab({ url: '/pages/dashboard/dashboard' })
      }
    } catch (err) {
      const code = err.errorCode
      let msg
      if (code === 'ACCOUNT_DISABLED') {
        msg = t('login.accountDisabled')
      } else if (code === 'RATE_LIMITED') {
        msg = t('login.rateLimited')
      } else if (code === 'REGISTRATION_DISABLED') {
        msg = t('login.registrationDisabled')
      } else if (code === 'SERVER_NOT_CONFIGURED') {
        msg = t('login.serverNotConfigured')
      } else if (code === 'NETWORK_ERROR') {
        msg = t('login.networkError')
      } else if (code === 'INVALID_CREDENTIALS') {
        msg = t('login.' + (mode === 'login' ? 'loginFailed' : 'registerFailed'))
      } else if (code === 'USERNAME_EXISTS') {
        msg = t('login.usernameExists')
      } else if (code === 'INVALID_USERNAME') {
        msg = t('login.invalidUsername')
      } else {
        msg = mode === 'login' ? t('login.loginFailed') : t('login.registerFailed')
      }
      this.setData({ error: msg })
    } finally {
      this.setData({ loading: false })
    }
  }
})
