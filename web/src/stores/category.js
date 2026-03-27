import { defineStore } from 'pinia'
import api from '../api/client'

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchCategories() {
      this.loading = true
      try {
        const res = await api.categories.get('/api/categories')
        this.categories = res.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async createCategory(category) {
      const res = await api.categories.post('/api/categories', category)
      this.categories.push(res.data)
      return res.data
    },
    async updateCategory(id, updates) {
      const res = await api.categories.put(`/api/categories/${id}`, updates)
      const idx = this.categories.findIndex(c => c.id === id)
      if (idx !== -1) this.categories[idx] = res.data
      return res.data
    },
    async deleteCategory(id) {
      await api.categories.delete(`/api/categories/${id}`)
      this.categories = this.categories.filter(c => c.id !== id)
    }
  }
})
