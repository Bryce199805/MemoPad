const i18nBehavior = require('../../utils/i18n-behavior')

Component({
  behaviors: [i18nBehavior],

  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    hideFooter: {
      type: Boolean,
      value: false
    },
    cancelText: {
      type: String,
      value: ''
    },
    confirmText: {
      type: String,
      value: ''
    }
  },

  methods: {
    preventTouchMove() {
      return false
    },

    stopPropagation() {
      return false
    },

    onClose() {
      this.triggerEvent('close')
    },

    onConfirm() {
      this.triggerEvent('confirm')
    },

    onMaskClick() {
      this.triggerEvent('close')
    }
  }
})
