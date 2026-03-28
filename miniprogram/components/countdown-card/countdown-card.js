Component({
  properties: {
    countdown: {
      type: Object,
      value: {}
    }
  },

  data: {
    daysLeft: 0,
    priorityColor: ''
  },

  observers: {
    'countdown': function(countdown) {
      if (countdown && countdown.target_date) {
        const target = new Date(countdown.target_date).getTime();
        const now = Date.now();
        const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        this.setData({ daysLeft: diff >= 0 ? diff : 0 });

        const colorMap = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
        this.setData({ priorityColor: colorMap[countdown.priority] || '#6366f1' });
      }
    }
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

    formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
    }
  }
});
