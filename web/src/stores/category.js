import { defineStore } from 'pinia'
import api from '../api/client'
import wsService from '../api/websocket'

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [],
    loading: false,
    error: null
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
      // Don't add to local state - WebSocket will broadcast the update
      return newCategory
    },
    async updateCategory(id, updates) {
      const res = await api.put(`/api/categories/${id}`, updates)
      const updatedCategory = res.data.data || res.data
      // Don't update local state - WebSocket will broadcast the update
      return updatedCategory
    },
    async deleteCategory(id) {
      await api.delete(`/api/categories/${id}`)
      // Don't remove from local state - WebSocket will broadcast the update
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
      wsService.on('category_created', (category) => this.handleCategoryCreated(category))
      wsService.on('category_updated', (category) => this.handleCategoryUpdated(category))
      wsService.on('category_deleted', (data) => this.handleCategoryDeleted(data))
    }
  }
})
