Component({
  properties: {
    countdown: {
      type: Object,
      value: {}
    }
  },

  data: {
    daysLeft: 0
  },

  methods: {
    onPin() {
      this.triggerEvent('pin', { id: this.data.countdown.id });
    },

    onEdit() {
      this.triggerEvent('edit', { id: this.data.countdown.id });
    },

    onDelete() {
      this.triggerEvent('delete', { id: this.data.countdown.id });
    },

  }
});
