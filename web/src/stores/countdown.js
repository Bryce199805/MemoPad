import { defineStore } from 'pinia'
import api from '../api/client'
import wsService from '../api/websocket'

export const useCountdownStore = defineStore('countdown', {
  state: () => ({
    countdowns: [],
    loading: false,
    error: null,
    _wsHandlers: null
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
      // Apply optimistically from HTTP response; WS message is idempotent confirmation
      this.handleCountdownCreated(newCountdown)
      return newCountdown
    },
    async updateCountdown(id, updates) {
      const res = await api.put(`/api/countdowns/${id}`, updates)
      const updatedCountdown = res.data.data || res.data
      this.handleCountdownUpdated(updatedCountdown)
      return updatedCountdown
    },
    async deleteCountdown(id) {
      await api.delete(`/api/countdowns/${id}`)
      this.handleCountdownDeleted({ id })
    },
    // Batch operations — single request replaces N sequential requests
    async batchDeleteCountdowns(ids) {
      await api.delete('/api/countdowns/batch', { data: { ids } })
      this.handleCountdownsBatchDeleted({ ids })
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
    handleCountdownsBatchDeleted(data) {
      const deletedIds = new Set(data.ids.map(Number))
      this.countdowns = this.countdowns.filter(c => !deletedIds.has(c.id))
    },
    subscribeToUpdates() {
      // Guard against double-subscription (e.g. login → logout → login)
      if (this._wsHandlers) return
      const handlers = {
        countdown_created:        (countdown) => this.handleCountdownCreated(countdown),
        countdown_updated:        (countdown) => this.handleCountdownUpdated(countdown),
        countdown_deleted:        (data)      => this.handleCountdownDeleted(data),
        countdowns_batch_deleted: (data)      => this.handleCountdownsBatchDeleted(data)
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
