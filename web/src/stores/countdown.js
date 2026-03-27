import { defineStore } from 'pinia'
import api from '../api/client'

export const useCountdownStore = defineStore('countdown', {
  state: () => ({
    countdowns: [],
    loading: false,
    error: null
  }),
  actions: {
    async fetchCountdowns() {
      this.loading = true
      this.error = null
      try {
        const res = await api.get('/api/countdowns')
        this.countdowns = res.data.data || res.data
      } catch (err) {
        this.error = err.response?.data?.error || err.message
        throw err
      } finally {
        this.loading = false
      }
    },
    async createCountdown(countdown) {
      const res = await api.post('/api/countdowns', countdown)
      const newCountdown = res.data.data || res.data
      this.countdowns.push(newCountdown)
      return newCountdown
    },
    async updateCountdown(id, updates) {
      const res = await api.put(`/api/countdowns/${id}`, updates)
      const updatedCountdown = res.data.data || res.data
      const idx = this.countdowns.findIndex(c => c.id === id)
      if (idx !== -1) this.countdowns[idx] = updatedCountdown
      return updatedCountdown
    },
    async deleteCountdown(id) {
      await api.delete(`/api/countdowns/${id}`)
      this.countdowns = this.countdowns.filter(c => c.id !== id)
    }
  }
})
