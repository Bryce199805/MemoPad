import { defineStore } from 'pinia'
import api from '../api/client'
import wsService from '../api/websocket'

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [],
    loading: false,
    error: null,
    _wsHandlers: null
  }),
  actions: {
    async fetchCategories() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get('/api/categories')
        this.categories = res.data.data || res.data
      } catch (err) {
        this.error = err.response?.data?.error || err.message
        throw err
      } finally {
        this.loading = false
      }
    },
    async createCategory(category) {
      const res = await api.post('/api/categories', category)
      const newCategory = res.data.data || res.data
      // Apply optimistically from HTTP response; WS message is idempotent confirmation
      this.handleCategoryCreated(newCategory)
      return newCategory
    },
    async updateCategory(id, updates) {
      const res = await api.put(`/api/categories/${id}`, updates)
      const updatedCategory = res.data.data || res.data
      this.handleCategoryUpdated(updatedCategory)
      return updatedCategory
    },
    async deleteCategory(id) {
      await api.delete(`/api/categories/${id}`)
      this.handleCategoryDeleted({ id })
    },
    // WebSocket event handlers
    handleCategoryCreated(category) {
      const exists = this.categories.find(c => c.id === category.id)
      if (!exists) {
        this.categories.push(category)
      }
    },
    handleCategoryUpdated(category) {
      const idx = this.categories.findIndex(c => c.id === category.id)
      if (idx !== -1) {
        this.categories[idx] = category
      }
    },
    handleCategoryDeleted(data) {
      this.categories = this.categories.filter(c => c.id !== Number(data.id) && c.id !== data.id)
    },
    subscribeToUpdates() {
      // Guard against double-subscription (e.g. login → logout → login)
      if (this._wsHandlers) return
      const handlers = {
        category_created: (category) => this.handleCategoryCreated(category),
        category_updated: (category) => this.handleCategoryUpdated(category),
        category_deleted: (data) => this.handleCategoryDeleted(data)
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
