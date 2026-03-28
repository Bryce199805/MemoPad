Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    }
  },

  methods: {
    preventTouchMove() {},

    onClose() {
      this.setData({ show: false });
      this.triggerEvent('close');
    },

    onConfirm() {
      this.triggerEvent('confirm');
    },

    onMaskClick() {
      this.onClose();
    }
  }
});
