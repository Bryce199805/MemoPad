import { defineStore } from 'pinia'
import api from '../api/client'
import wsService from '../api/websocket'

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
      // Don't add to local state - WebSocket will broadcast the update
      return newCountdown
    },
    async updateCountdown(id, updates) {
      const res = await api.put(`/api/countdowns/${id}`, updates)
      const updatedCountdown = res.data.data || res.data
      // Don't update local state - WebSocket will broadcast the update
      return updatedCountdown
    },
    async deleteCountdown(id) {
      await api.delete(`/api/countdowns/${id}`)
      // Don't remove from local state - WebSocket will broadcast the update
    },
    // WebSocket event handlers
    handleCountdownCreated(countdown) {
      const exists = this.countdowns.find(c => c.id === countdown.id)
      if (!exists) {
        this.countdowns.push(countdown)
      }
    },
    handleCountdownUpdated(countdown) {
      const idx = this.countdowns.findIndex(c => c.id === countdown.id)
      if (idx !== -1) {
        this.countdowns[idx] = countdown
      }
    },
    handleCountdownDeleted(data) {
      this.countdowns = this.countdowns.filter(c => c.id !== Number(data.id) && c.id !== data.id)
    },
    subscribeToUpdates() {
      wsService.on('countdown_created', (countdown) => this.handleCountdownCreated(countdown))
      wsService.on('countdown_updated', (countdown) => this.handleCountdownUpdated(countdown))
      wsService.on('countdown_deleted', (data) => this.handleCountdownDeleted(data))
    }
  }
})
