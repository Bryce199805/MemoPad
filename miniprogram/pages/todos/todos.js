const api = require('../../utils/api')
const auth = require('../../utils/auth')
const ws = require('../../utils/websocket')

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
    formTitle: 'Add Task',
    editingId: null,
    pinned: [],
    regular: [],
    completed: [],
    pendingCount: 0,
    completedCount: 0,
    priorityLabels: ['All', 'High', 'Medium', 'Low'],
    statusLabels: ['All', 'Pending', 'Completed'],
    formPriorityIdx: 1,
    formCategoryIdx: 0,
    formPriorityLabel: 'Medium',
    formCategoryOptions: ['None'],
    form: {
      content: '',
      priority: 'medium',
      category: ''
    }
  },

  priorityOptions: ['high', 'medium', 'low'],

  onLoad() {
    // Subscribe to WebSocket events
    ws.on('todo_created', this.handleTodoCreated.bind(this))
    ws.on('todo_updated', this.handleTodoUpdated.bind(this))
    ws.on('todo_deleted', this.handleTodoDeleted.bind(this))
    ws.on('category_created', this.handleCategoryCreated.bind(this))
    ws.on('category_updated', this.handleCategoryUpdated.bind(this))
    ws.on('category_deleted', this.handleCategoryDeleted.bind(this))
  },

  onUnload() {
    // Unsubscribe from WebSocket events
    ws.off('todo_created', this.handleTodoCreated.bind(this))
    ws.off('todo_updated', this.handleTodoUpdated.bind(this))
    ws.off('todo_deleted', this.handleTodoDeleted.bind(this))
    ws.off('category_created', this.handleCategoryCreated.bind(this))
    ws.off('category_updated', this.handleCategoryUpdated.bind(this))
    ws.off('category_deleted', this.handleCategoryDeleted.bind(this))
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.fetchData()
  },

  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh())
  },

  // WebSocket event handlers
  handleTodoCreated(todo) {
    const todos = this.data.todos
    const exists = todos.find(t => t.id === todo.id)
    if (!exists) {
      todos.unshift(todo)
      this.setData({ todos })
      this.applyFilter()
    }
  },

  handleTodoUpdated(todo) {
    const todos = this.data.todos
    const idx = todos.findIndex(t => t.id === todo.id)
    if (idx !== -1) {
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
    const categories = this.data.categories
    const exists = categories.find(c => c.id === category.id)
    if (!exists) {
      categories.push(category)
      const categoryNames = categories.map(c => c.name)
      const formCategoryOptions = ['None', ...categoryNames]
      this.setData({ categories, categoryNames, formCategoryOptions })
    }
  },

  handleCategoryUpdated(category) {
    const categories = this.data.categories
    const idx = categories.findIndex(c => c.id === category.id)
    if (idx !== -1) {
      categories[idx] = category
      const categoryNames = categories.map(c => c.name)
      this.setData({ categories, categoryNames })
    }
  },

  handleCategoryDeleted(data) {
    const categories = this.data.categories.filter(c => c.id !== data.id && c.id !== Number(data.id))
    const categoryNames = categories.map(c => c.name)
    const formCategoryOptions = ['None', ...categoryNames]
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
      const categoryNames = categories.map(c => c.name)
      const formCategoryOptions = ['None', ...categoryNames]
      this.setData({ todos, categories, categoryNames, formCategoryOptions })
      this.applyFilter()
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
      title: 'Delete Tasks',
      content: 'Delete ' + selectedIds.length + ' selected task(s)?',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: 'Deleting...' })
        try {
          await Promise.all(selectedIds.map(id => api.del('/api/todos/' + id)))
          this.setData({ selectMode: false, selectedIds: [] })
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: 'Deleted', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: 'Failed', icon: 'none' })
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
      wx.showToast({ title: 'All selected tasks are already completed', icon: 'none' })
      return
    }
    wx.showModal({
      title: 'Complete Tasks',
      content: 'Mark ' + toComplete.length + ' selected task(s) as completed?',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: 'Completing...' })
        try {
          await Promise.all(toComplete.map(id => api.patch('/api/todos/' + id + '/toggle')))
          this.setData({ selectMode: false, selectedIds: [] })
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: 'Completed', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: 'Failed', icon: 'none' })
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
      title: 'Clear Completed',
      content: 'Remove all ' + completed.length + ' completed task(s)?',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: 'Clearing...' })
        try {
          await Promise.all(completed.map(t => api.del('/api/todos/' + t.id)))
          this.fetchData(true)
          wx.hideLoading()
          wx.showToast({ title: 'Cleared', icon: 'success' })
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: 'Failed', icon: 'none' })
        }
      }
    })
  },

  // ---- CRUD ----

  onAddTask() {
    this.setData({
      showFormModal: true,
      formTitle: 'Add Task',
      editingId: null,
      formPriorityIdx: 1,
      formCategoryIdx: 0,
      formPriorityLabel: 'Medium',
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
    const priorityLabel = ['High', 'Medium', 'Low'][priorityIdx]
    this.setData({
      showFormModal: true,
      formTitle: 'Edit Task',
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
      wx.showToast({ title: 'Failed to update', icon: 'none' })
    }
  },

  async onTodoPin(e) {
    const id = e.detail.id
    try {
      await api.patch('/api/todos/' + id + '/pin')
      this.fetchData(true)
    } catch (err) {
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  onTodoDelete(e) {
    const id = e.detail.id
    wx.showModal({
      title: 'Delete Task',
      content: 'Are you sure?',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.del('/api/todos/' + id)
          this.fetchData(true)
        } catch (err) {
          wx.showToast({ title: 'Failed to delete', icon: 'none' })
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
    const label = ['High', 'Medium', 'Low'][idx]
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
      wx.showToast({ title: 'Please enter content', icon: 'none' })
      return
    }

    const data = {
      content: form.content.trim(),
      priority: form.priority
    }
    if (form.category) {
      data.category_id = form.category
    }

    wx.showLoading({ title: editingId ? 'Updating...' : 'Adding...' })
    try {
      if (editingId) {
        await api.put('/api/todos/' + editingId, data)
      } else {
        await api.post('/api/todos', data)
      }
      this.setData({ showFormModal: false })
      this.fetchData(true)
      wx.hideLoading()
      wx.showToast({ title: editingId ? 'Updated' : 'Added', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: 'Failed', icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: 'My Tasks - MemoPad',
      path: '/pages/todos/todos'
    }
  }
})
