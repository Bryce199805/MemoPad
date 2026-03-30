const api = require('../../utils/api')
const auth = require('../../utils/auth')
const ws = require('../../utils/websocket')
const { t, getLang } = require('../../utils/i18n')

Page({
  data: {
    loading: true,
    todos: [],
    categories: [],
    categoryNames: [],
    searchText: '',
    filterPriority: 0,
    filterStatus: 0,
    filterCategory: 0,
    selectMode: false,
    selectedIds: [],
    completedExpanded: false,
    showFormModal: false,
    formTitle: '',
    editingId: null,
    pinned: [],
    regular: [],
    completed: [],
    pendingCount: 0,
    completedCount: 0,
    priorityLabels: [],
    statusLabels: [],
    formPriorityIdx: 1,
    formCategoryIdx: 0,
    formPriorityLabel: '',
    formCategoryOptions: [],
    form: {
      content: '',
      priority: 'medium',
      category: ''
    },
    i: {}
  },

  priorityOptions: ['high', 'medium', 'low'],

  applyI18n() {
    const priorityLabels = [t('todo.allPriority'), t('todo.high'), t('todo.medium'), t('todo.low')]
    const statusLabels = [t('todo.allStatuses'), t('todo.pending'), t('todo.completed')]
    const formCategoryOptions = [t('todo.noCategory'), ...this.data.categories.map(c => c.name)]
    const formPriorityLabel = [t('todo.high'), t('todo.medium'), t('todo.low')][this.data.formPriorityIdx]
    this.setData({
      priorityLabels,
      statusLabels,
      formCategoryOptions,
      formPriorityLabel,
      i: {
        title: t('todo.title'),
        add: t('todo.add'),
        search: t('todo.search'),
        allPriority: t('todo.allPriority'),
        allStatuses: t('todo.allStatuses'),
        allCategories: t('todo.allCategories'),
        pending: t('todo.pending'),
        completed: t('todo.completed'),
        high: t('todo.high'),
        medium: t('todo.medium'),
        low: t('todo.low'),
        pinned: t('todo.pinned'),
        allTasks: t('todo.allTasks'),
        clearCompleted: t('todo.clearCompleted'),
        newTask: t('todo.new'),
        editTask: t('todo.edit'),
        content: t('todo.content'),
        contentPlaceholder: t('todo.contentPlaceholder'),
        priority: t('todo.priority'),
        categoryOptional: t('todo.categoryOptional'),
        noCategory: t('todo.noCategory'),
        noTodos: t('todo.noTodos'),
        noCompleted: t('todo.noCompleted'),
        select: t('todo.select'),
        doneSelect: t('todo.doneSelect'),
        save: t('common.save'),
        cancel: t('common.cancel'),
        category: t('todo.allCategories'),
        noTasks: t('todo.noTodos'),
        noMatches: t('todo.noMatches'),
        tapToAdd: t('todo.tapToAdd'),
        tryFilters: t('todo.tryFilters'),
        selected: t('todo.selected'),
        all: t('todo.allStatuses'),
        none: t('todo.none'),
        complete: t('todo.completed'),
        delete: t('todo.delete')
      }
    })
  },

  onLoad() {
    // Store bound references so ws.off() can find the exact same function
    this._onTodoCreated    = this.handleTodoCreated.bind(this)
    this._onTodoUpdated    = this.handleTodoUpdated.bind(this)
    this._onTodoDeleted    = this.handleTodoDeleted.bind(this)
    this._onCatCreated     = this.handleCategoryCreated.bind(this)
    this._onCatUpdated     = this.handleCategoryUpdated.bind(this)
    this._onCatDeleted     = this.handleCategoryDeleted.bind(this)
    ws.on('todo_created',     this._onTodoCreated)
    ws.on('todo_updated',     this._onTodoUpdated)
    ws.on('todo_deleted',     this._onTodoDeleted)
    ws.on('category_created', this._onCatCreated)
    ws.on('category_updated', this._onCatUpdated)
    ws.on('category_deleted', this._onCatDeleted)
  },

  onUnload() {
    ws.off('todo_created',     this._onTodoCreated)
    ws.off('todo_updated',     this._onTodoUpdated)
    ws.off('todo_deleted',     this._onTodoDeleted)
    ws.off('category_created', this._onCatCreated)
    ws.off('category_updated', this._onCatUpdated)
    ws.off('category_deleted', this._onCatDeleted)
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.applyI18n()
    if (!this._loaded) {
      this.fetchData()
    } else {
      this.fetchData(true)
    }
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh())
  },

  // WebSocket event handlers
  handleTodoCreated(todo) {
    const exists = this.data.todos.find(t => t.id === todo.id)
    if (!exists) {
      const todos = [todo, ...this.data.todos]  // new array, don't mutate in place
      this.setData({ todos })
      this.applyFilter()
    }
  },

  handleTodoUpdated(todo) {
    const idx = this.data.todos.findIndex(t => t.id === todo.id)
    if (idx !== -1) {
      const todos = [...this.data.todos]  // shallow copy
      todos[idx] = todo
      this.setData({ todos })
      this.applyFilter()
    }
  },

  handleTodoDeleted(data) {
    const todos = this.data.todos.filter(t => t.id !== data.id && t.id !== Number(data.id))
    this.setData({ todos })
    this.applyFilter()
  },

  handleCategoryCreated(category) {
    const exists = this.data.categories.find(c => c.id === category.id)
    if (!exists) {
      const categories = [...this.data.categories, category]
      const categoryNames = [t('todo.allCategories'), ...categories.map(c => c.name)]
      const formCategoryOptions = [t('todo.noCategory'), ...categories.map(c => c.name)]
      this.setData({ categories, categoryNames, formCategoryOptions })
    }
  },

  handleCategoryUpdated(category) {
    const idx = this.data.categories.findIndex(c => c.id === category.id)
    if (idx !== -1) {
      const categories = [...this.data.categories]
      categories[idx] = category
      const categoryNames = [t('todo.allCategories'), ...categories.map(c => c.name)]
      this.setData({ categories, categoryNames })
    }
  },

  handleCategoryDeleted(data) {
    const categories = this.data.categories.filter(c => c.id !== data.id && c.id !== Number(data.id))
    const categoryNames = [t('todo.allCategories'), ...categories.map(c => c.name)]
    const formCategoryOptions = [t('todo.noCategory'), ...categories.map(c => c.name)]
    this.setData({ categories, categoryNames, formCategoryOptions })
  },

  async fetchData(silent) {
    if (!silent) this.setData({ loading: true })
    try {
      const [todosRes, catsRes] = await Promise.all([
        api.get('/api/todos'),
        api.get('/api/categories')
      ])
      const todos = (todosRes.data || todosRes) || []
      const categories = (catsRes.data || catsRes) || []
      const categoryNames = [t('todo.allCategories'), ...categories.map(c => c.name)]
      const formCategoryOptions = [t('todo.noCategory'), ...categories.map(c => c.name)]
      this.setData({ todos, categories, categoryNames, formCategoryOptions })
      this.applyFilter()
      this._loaded = true
    } catch (err) {
      console.error('Fetch todos error:', err)
    } finally {
      if (!silent) this.setData({ loading: false })
    }
  },

  // ---- Computed getters (called from wxml via WXS is not possible, so we compute in JS) ----

  getFilteredTodos() {
    const { todos, searchText, filterPriority, filterStatus, filterCategory } = this.data
    const pVal = ['all', 'high', 'medium', 'low'][filterPriority]
    const sVal = ['all', 'pending', 'completed'][filterStatus]

    return todos.filter(t => {
      if (searchText && t.content.toLowerCase().indexOf(searchText.toLowerCase()) === -1) return false
      if (pVal !== 'all' && t.priority !== pVal) return false
      if (sVal === 'pending' && t.done) return false
      if (sVal === 'completed' && !t.done) return false
      var filterCat = this.data.categories[filterCategory - 1];
      if (filterCategory !== 0 && filterCat) {
        var tCatId = (t.category && typeof t.category === 'object') ? t.category.id : t.category;
        if (tCatId !== filterCat.id) return false;
      }
      return true
    })
  },

  applyFilter() {
    const filtered = this.getFilteredTodos()
    const pending = filtered.filter(t => !t.done)
    const pinned = pending.filter(t => t.pinned)
    const regular = pending.filter(t => !t.pinned)
    const completed = filtered.filter(t => t.done)
    const pendingCount = this.data.todos.filter(t => !t.done).length
    const completedCount = this.data.todos.filter(t => t.done).length
    this.setData({ pinned, regular, completed, pendingCount, completedCount })
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
    this.applyFilter()
  },

  onPriorityChange(e) {
    this.setData({ filterPriority: e.detail.value })
    this.applyFilter()
  },

  onStatusChange(e) {
    this.setData({ filterStatus: e.detail.value })
    this.applyFilter()
  },

  onCategoryChange(e) {
    this.setData({ filterCategory: e.detail.value })
    this.applyFilter()
  },

  // Close all other todo action menus when one opens
  onTodoMenuOpen(e) {
    const openedId = e.detail.id
    const comps = this.selectAllComponents('.todo-item-comp')
    if (comps) {
      comps.forEach(comp => {
        if (comp.data.todo && comp.data.todo.id !== openedId) {
          comp.closeMenu()
        }
      })
    }
  },

  onToggleSelectMode() {
    this.setData({
      selectMode: !this.data.selectMode,
      selectedIds: []
    })
  },

  onToggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const { selectedIds } = this.data
    const idx = selectedIds.indexOf(id)
    if (idx === -1) {
      this.setData({ selectedIds: [...selectedIds, id] })
    } else {
      this.setData({ selectedIds: selectedIds.filter((_, i) => i !== idx) })
    }
  },

  onSelectAll() {
    const { todos } = this.data
    const allIds = todos.map(t => t.id)
    this.setData({ selectedIds: allIds })
  },

  onDeselectAll() {
    this.setData({ selectedIds: [] })
  },

  async onBatchDelete() {
    const { selectedIds } = this.data
    if (selectedIds.length === 0) return
    wx.showModal({
      title: t('todo.batchDelete', { n: selectedIds.length }),
      content: t('todo.confirmBatchDelete', { n: selectedIds.length }),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: t('common.loading') })
        try {
          await Promise.all(selectedIds.map(id => api.del('/api/todos/' + id)))
          this.setData({ selectMode: false, selectedIds: [] })
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: t('common.deleted'), icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: t('common.error'), icon: 'none' })
        }
      }
    })
  },

  async onBatchComplete() {
    const { selectedIds, todos } = this.data
    if (selectedIds.length === 0) return
    const toComplete = selectedIds.filter(id => {
      const todo = todos.find(t => t.id === id)
      return todo && !todo.done
    })
    if (toComplete.length === 0) {
      wx.showToast({ title: t('todo.allAlreadyCompleted'), icon: 'none' })
      return
    }
    wx.showModal({
      title: t('todo.batchComplete', { n: toComplete.length }),
      content: t('todo.confirmBatchComplete', { n: toComplete.length }),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: t('common.loading') })
        try {
          await Promise.all(toComplete.map(id => api.patch('/api/todos/' + id + '/toggle')))
          this.setData({ selectMode: false, selectedIds: [] })
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: t('common.completed'), icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: t('common.error'), icon: 'none' })
        }
      }
    })
  },

  onSearchClear() {
    this.setData({ searchText: '' })
    this.applyFilter()
  },

  onToggleCompleted() {
    this.setData({ completedExpanded: !this.data.completedExpanded })
  },

  onClearCompleted() {
    const completed = this.data.todos.filter(t => t.done)
    if (completed.length === 0) return
    wx.showModal({
      title: t('todo.clearCompleted'),
      content: t('todo.confirmClearCompleted', { n: completed.length }),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: t('common.loading') })
        try {
          await Promise.all(completed.map(t => api.del('/api/todos/' + t.id)))
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: t('common.cleared'), icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: t('common.error'), icon: 'none' })
        }
      }
    })
  },

  // ---- CRUD ----

  onAddTask() {
    this.setData({
      showFormModal: true,
      formTitle: t('todo.new'),
      editingId: null,
      formPriorityIdx: 1,
      formCategoryIdx: 0,
      formPriorityLabel: t('todo.medium'),
      form: {
        content: '',
        priority: 'medium',
        category: ''
      }
    })
  },

  onTodoEdit(e) {
    const id = e.detail.id
    const todo = this.data.todos.find(t => t.id === id)
    if (!todo) return
    const priorityIdx = this.priorityOptions.indexOf(todo.priority || 'medium')
    // category idx: 0 is "None", 1+ is actual category index + 1
    let catIdx = 0
    var editCatId = (todo.category && typeof todo.category === 'object') ? todo.category.id : todo.category;
    if (editCatId) {
      const ci = this.data.categories.findIndex(c => c.id === editCatId)
      if (ci !== -1) { catIdx = ci + 1 }
    }
    const priorityLabel = [t('todo.high'), t('todo.medium'), t('todo.low')][priorityIdx]
    this.setData({
      showFormModal: true,
      formTitle: t('todo.edit'),
      editingId: id,
      formPriorityIdx: priorityIdx,
      formCategoryIdx: catIdx,
      formPriorityLabel: priorityLabel,
      form: {
        content: todo.content || '',
        priority: todo.priority || 'medium',
        category: editCatId || ''
      }
    })
  },

  async onTodoToggle(e) {
    const id = e.detail.id
    try {
      await api.patch('/api/todos/' + id + '/toggle')
      this.fetchData(true)
    } catch (err) {
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  async onTodoPin(e) {
    const id = e.detail.id
    try {
      await api.patch('/api/todos/' + id + '/pin')
      this.fetchData(true)
    } catch (err) {
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  onTodoDelete(e) {
    const id = e.detail.id
    wx.showModal({
      title: t('todo.delete'),
      content: t('todo.confirmDelete'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/todos/' + id)
          this.fetchData(true)
        } catch (err) {
          wx.showToast({ title: t('common.error'), icon: 'none' })
        }
      }
    })
  },

  // ---- Form Modal ----

  onCloseModal() {
    this.setData({ showFormModal: false })
  },

  onFormContentInput(e) {
    this.setData({ 'form.content': e.detail.value })
  },

  onFormPriorityChange(e) {
    const idx = Number(e.detail.value)
    const val = this.priorityOptions[idx]
    const label = [t('todo.high'), t('todo.medium'), t('todo.low')][idx]
    this.setData({ 'form.priority': val, formPriorityIdx: idx, formPriorityLabel: label })
  },

  onFormCategoryChange(e) {
    const idx = Number(e.detail.value)
    // idx 0 is "None", idx > 0 is actual category (idx - 1 in categories array)
    if (idx === 0) {
      this.setData({
        'form.category': '',
        formCategoryIdx: 0
      })
    } else {
      const cat = this.data.categories[idx - 1]
      this.setData({
        'form.category': cat ? cat.id : '',
        formCategoryIdx: idx
      })
    }
  },

  async onFormSave() {
    const { form, editingId } = this.data
    if (!form.content.trim()) {
      wx.showToast({ title: t('todo.contentRequired'), icon: 'none' })
      return
    }

    const data = {
      content: form.content.trim(),
      priority: form.priority
    }
    if (form.category) {
      data.category_id = form.category
    }

    wx.showLoading({ title: t('common.loading') })
    try {
      if (editingId) {
        await api.put('/api/todos/' + editingId, data)
      } else {
        await api.post('/api/todos', data)
      }
      this.setData({ showFormModal: false })
      this.fetchData(true)
      wx.hideLoading()
      wx.showToast({ title: editingId ? t('common.updated') : t('common.added'), icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: t('common.error'), icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: t('todo.shareTitle'),
      path: '/pages/todos/todos'
    }
  }
})
