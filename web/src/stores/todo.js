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
      this.todos.unshift(newTodo)
      return newTodo
    },
    async updateTodo(id, updates) {
      const res = await api.put(`/api/todos/${id}`, updates)
      const updatedTodo = res.data.data || res.data
      const idx = this.todos.findIndex(t => t.id === id)
      if (idx !== -1) this.todos[idx] = updatedTodo
      return updatedTodo
    },
    async deleteTodo(id) {
      await api.delete(`/api/todos/${id}`)
      this.todos = this.todos.filter(t => t.id !== id)
    },
    async toggleTodo(id) {
      const res = await api.patch(`/api/todos/${id}/toggle`)
      const updatedTodo = res.data.data || res.data
      const idx = this.todos.findIndex(t => t.id === id)
      if (idx !== -1) this.todos[idx] = updatedTodo
      return updatedTodo
    },
    async pinTodo(id) {
      const res = await api.patch(`/api/todos/${id}/pin`)
      const updatedTodo = res.data.data || res.data
      const idx = this.todos.findIndex(t => t.id === id)
      if (idx !== -1) this.todos[idx] = updatedTodo
      return updatedTodo
    }
  }
})
