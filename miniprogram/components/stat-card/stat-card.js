Component({
  properties: {
    label: {
      type: String,
      value: ''
    },
    value: {
      type: null,
      value: 0
    },
    active: {
      type: Boolean,
      value: false
    },
    icon: {
      type: String,
      value: '📋'
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('stattap', { label: this.data.label });
    }
  }
});
