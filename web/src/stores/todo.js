import { defineStore } from 'pinia'
import api from '../api/client'
import wsService from '../api/websocket'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    loading: false,
    error: null,
    _wsHandlers: null
  }),
  actions: {
    async fetchTodos() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get('/api/todos')
        this.todos = res.data.data || res.data
      } catch (err) {
        this.error = err.response?.data?.error || err.message
        throw err
      } finally {
        this.loading = false
      }
    },
    async createTodo(todo) {
      const res = await api.post('/api/todos', todo)
      const newTodo = res.data.data || res.data
      // Apply optimistically from HTTP response; WS message is idempotent confirmation
      this.handleTodoCreated(newTodo)
      return newTodo
    },
    async updateTodo(id, updates) {
      const res = await api.put(`/api/todos/${id}`, updates)
      const updatedTodo = res.data.data || res.data
      this.handleTodoUpdated(updatedTodo)
      return updatedTodo
    },
    async deleteTodo(id) {
      await api.delete(`/api/todos/${id}`)
      this.handleTodoDeleted({ id })
    },
    async toggleTodo(id) {
      const res = await api.patch(`/api/todos/${id}/toggle`)
      const updatedTodo = res.data.data || res.data
      this.handleTodoUpdated(updatedTodo)
      return updatedTodo
    },
    async pinTodo(id) {
      const res = await api.patch(`/api/todos/${id}/pin`)
      const updatedTodo = res.data.data || res.data
      this.handleTodoUpdated(updatedTodo)
      return updatedTodo
    },
    // Batch operations — single request replaces N sequential requests
    async batchDeleteTodos(ids) {
      await api.delete('/api/todos/batch', { data: { ids } })
      this.handleTodosBatchDeleted({ ids })
    },
    async batchToggleTodos(ids) {
      await api.patch('/api/todos/batch/toggle', { ids })
      // Re-fetch for accurate state after toggle (server determines final done value)
      await this.fetchTodos()
    },
    async batchMarkDoneTodos(ids) {
      await api.patch('/api/todos/batch/done', { ids })
      this.handleTodosBatchUpdated({ ids })
    },
    // WebSocket event handlers
    handleTodoCreated(todo) {
      const exists = this.todos.find(t => t.id === todo.id)
      if (!exists) {
        this.todos.unshift(todo)
      }
    },
    handleTodoUpdated(todo) {
      const idx = this.todos.findIndex(t => t.id === todo.id)
      if (idx !== -1) {
        this.todos[idx] = todo
      }
    },
    handleTodoDeleted(data) {
      this.todos = this.todos.filter(t => t.id !== Number(data.id) && t.id !== data.id)
    },
    handleTodosBatchDeleted(data) {
      const deletedIds = new Set(data.ids.map(Number))
      this.todos = this.todos.filter(t => !deletedIds.has(t.id))
    },
    handleTodosBatchUpdated(data) {
      // Mark affected todos as done in-place without a re-fetch
      const updatedIds = new Set(data.ids.map(Number))
      this.todos = this.todos.map(t => updatedIds.has(t.id) ? { ...t, done: true } : t)
    },
    subscribeToUpdates() {
      // Guard against double-subscription (e.g. login → logout → login)
      if (this._wsHandlers) return
      const handlers = {
        todo_created:        (todo) => this.handleTodoCreated(todo),
        todo_updated:        (todo) => this.handleTodoUpdated(todo),
        todo_deleted:        (data) => this.handleTodoDeleted(data),
        todos_batch_deleted: (data) => this.handleTodosBatchDeleted(data),
        todos_batch_updated: (data) => this.handleTodosBatchUpdated(data)
      }
      this._wsHandlers = handlers
      for (const [event, fn] of Object.entries(handlers)) {
        wsService.on(event, fn)
      }
    },
    unsubscribeFromUpdates() {
      if (!this._wsHandlers) return
      for (const [event, fn] of Object.entries(this._wsHandlers)) {
        wsService.off(event, fn)
      }
      this._wsHandlers = null
    }
  }
})
