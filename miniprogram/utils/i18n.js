/**
 * Lightweight i18n utility for WeChat Mini Program
 * Usage:
 *   const { t, setLang, getLang } = require('./i18n')
 *   t('todo.title')              // => 'Tasks' or '待办事项'
 *   t('todo.summary', { pending: 3, done: 2 })
 */

const en = require('../locales/en')
const zh = require('../locales/zh')

const STORAGE_KEY = 'memo-lang'

const messages = { en, zh }

/**
 * Get current language code ('en' | 'zh')
 */
function getLang() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || 'en'
  } catch (e) {
    return 'en'
  }
}

/**
 * Persist language preference
 */
function setLang(lang) {
  try {
    wx.setStorageSync(STORAGE_KEY, lang)
  } catch (e) {
    console.error('i18n: failed to save language', e)
  }
}

/**
 * Translate a dot-separated key with optional named params.
 * Falls back to English if key not found in current locale.
 * @param {string} key  e.g. 'todo.title' or 'admin.confirmDeleteUser'
 * @param {object} params  e.g. { username: 'Alice', n: 3 }
 * @returns {string}
 */
function t(key, params) {
  const lang = getLang()
  const dict = messages[lang] || messages['en']
  const fallback = messages['en']

  // Dot-path lookup
  const parts = key.split('.')
  let value = dict
  for (const part of parts) {
    value = value && value[part]
    if (value === undefined) break
  }

  // Fallback to English
  if (value === undefined || typeof value !== 'string') {
    value = fallback
    for (const part of parts) {
      value = value && value[part]
      if (value === undefined) break
    }
  }

  if (typeof value !== 'string') {
    console.warn('i18n: missing key:', key)
    return key
  }

  // Interpolate {param} placeholders
  if (params) {
    value = value.replace(/\{(\w+)\}/g, (_, k) => {
      return params[k] !== undefined ? params[k] : `{${k}}`
    })
  }

  return value
}

module.exports = { t, getLang, setLang }
