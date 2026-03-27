import { defineStore } from 'pinia'
import api from '../api/client'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchTodos() {
      this.loading = true
      try {
        const res = await api.todos.get('/api/todos')
        this.todos = res.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async createTodo(todo) {
      const res = await api.todos.post('/api/todos', todo)
      this.todos.unshift(res.data)
      return res.data
    },
    async updateTodo(id, updates) {
      const res = await api.todos.put(`/api/todos/${id}`, updates)
      const idx = this.todos.findIndex(t => t.id === id)
      if (idx !== -1) this.todos[idx] = res.data
      return res.data
    },
    async deleteTodo(id) {
      await api.todos.delete(`/api/todos/${id}`)
      this.todos = this.todos.filter(t => t.id !== id)
    },
    async toggleTodo(id) {
      const res = await api.todos.patch(`/api/todos/${id}/toggle`)
      const idx = this.todos.findIndex(t => t.id === id)
      if (idx !== -1) this.todos[idx] = res.data
      return res.data
    },
    async pinTodo(id) {
      const res = await api.todos.patch(`/api/todos/${id}/pin`)
      const idx = this.todos.findIndex(t => t.id === id)
      if (idx !== -1) this.todos[idx] = res.data
      return res.data
    }
  }
})
