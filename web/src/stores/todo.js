import { defineStore } from 'pinia'
import api from '../api/client'
import wsService from '../api/websocket'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    loading: false,
    error: null
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
      // Don't add to local state - WebSocket will broadcast the update
      return newTodo
    },
    async updateTodo(id, updates) {
      const res = await api.put(`/api/todos/${id}`, updates)
      const updatedTodo = res.data.data || res.data
      // Don't update local state - WebSocket will broadcast the update
      return updatedTodo
    },
    async deleteTodo(id) {
      await api.delete(`/api/todos/${id}`)
      // Don't remove from local state - WebSocket will broadcast the update
    },
    async toggleTodo(id) {
      const res = await api.patch(`/api/todos/${id}/toggle`)
      const updatedTodo = res.data.data || res.data
      // Don't update local state - WebSocket will broadcast the update
      return updatedTodo
    },
    async pinTodo(id) {
      const res = await api.patch(`/api/todos/${id}/pin`)
      const updatedTodo = res.data.data || res.data
      // Don't update local state - WebSocket will broadcast the update
      return updatedTodo
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
    subscribeToUpdates() {
      wsService.on('todo_created', (todo) => this.handleTodoCreated(todo))
      wsService.on('todo_updated', (todo) => this.handleTodoUpdated(todo))
      wsService.on('todo_deleted', (data) => this.handleTodoDeleted(data))
    }
  }
})
