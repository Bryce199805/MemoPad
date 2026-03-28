Component({
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
