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
      this.setData({ showActions: false });
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
      const willShow = !this.data.showActions;
      this.setData({ showActions: willShow });
      // Notify parent to close other open menus
      if (willShow) {
        this.triggerEvent('menuopen', { id: this.data.todo.id });
      }
    },

    // Called by parent page to close this menu externally
    closeMenu() {
      this.setData({ showActions: false });
    }
  }
});
