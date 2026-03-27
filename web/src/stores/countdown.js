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
      try {
        const res = await api.countdowns.get('/api/countdowns')
        this.countdowns = res.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async createCountdown(countdown) {
      const res = await api.countdowns.post('/api/countdowns', countdown)
      this.countdowns.push(res.data)
      return res.data
    },
    async updateCountdown(id, updates) {
      const res = await api.countdowns.put(`/api/countdowns/${id}`, updates)
      const idx = this.countdowns.findIndex(c => c.id === id)
      if (idx !== -1) this.countdowns[idx] = res.data
      return res.data
    },
    async deleteCountdown(id) {
      await api.countdowns.delete(`/api/countdowns/${id}`)
      this.countdowns = this.countdowns.filter(c => c.id !== id)
    }
  }
})
