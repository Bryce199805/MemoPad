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
    }
  }
});
