Component({
  properties: {
    todo: {
      type: Object,
      value: {}
    },
    categories: {
      type: Array,
      value: []
    }
  },

  data: {
    showActions: false
  },

  methods: {
    onToggle() {
      this.triggerEvent('toggle', { id: this.data.todo.id });
    },

    onPin() {
      this.triggerEvent('pin', { id: this.data.todo.id });
    },

    onEdit() {
      this.setData({ showActions: false });
      this.triggerEvent('edit', { id: this.data.todo.id });
    },

    onDelete() {
      this.setData({ showActions: false });
      this.triggerEvent('delete', { id: this.data.todo.id });
    },

    onToggleActions() {
      this.setData({ showActions: !this.data.showActions });
    },

    getCategoryName(categoryId) {
      const cat = this.data.categories.find(c => c.id === categoryId);
      return cat ? cat.name : '';
    },

    getCategoryColor(categoryId) {
      const cat = this.data.categories.find(c => c.id === categoryId);
      return cat ? cat.color : '';
    },

    getPriorityVariant(priority) {
      const map = { high: 'danger', medium: 'warning', low: 'success' };
      return map[priority] || 'info';
    },

    formatDueDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return month + '月' + day + '日';
    }
  }
});
