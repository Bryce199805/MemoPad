/**
 * i18n Behavior for WeChat Mini Program Components.
 * Attaches a `_lang` data property that updates when the language changes.
 *
 * Usage in a Component:
 *   const i18nBehavior = require('../../utils/i18n-behavior')
 *   Component({
 *     behaviors: [i18nBehavior],
 *     ...
 *   })
 *
 * In WXML you can use {{_lang}} to conditionally display text,
 * or pass it to WXS helpers.
 */

const { getLang } = require('./i18n')

module.exports = Behavior({
  data: {
    _lang: 'en'
  },
  lifetimes: {
    attached() {
      this.setData({ _lang: getLang() })
    }
  },
  pageLifetimes: {
    show() {
      const lang = getLang()
      if (this.data._lang !== lang) {
        this.setData({ _lang: lang })
      }
    }
  }
})
