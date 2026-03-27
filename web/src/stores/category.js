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
      this.categories.push(newCategory)
      return newCategory
    },
    async updateCategory(id, updates) {
      const res = await api.put(`/api/categories/${id}`, updates)
      const updatedCategory = res.data.data || res.data
      const idx = this.categories.findIndex(c => c.id === id)
      if (idx !== -1) this.categories[idx] = updatedCategory
      return updatedCategory
    },
    async deleteCategory(id) {
      await api.delete(`/api/categories/${id}`)
      this.categories = this.categories.filter(c => c.id !== id)
    }
  }
})
