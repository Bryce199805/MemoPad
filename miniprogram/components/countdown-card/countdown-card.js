const i18nBehavior = require('../../utils/i18n-behavior')

Component({
  behaviors: [i18nBehavior],

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
