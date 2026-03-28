import axios from 'axios'

// API base URL - relative in production (proxied by Nginx)
const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3000')

// Get API key from storage
const getAPIKey = () => localStorage.getItem('memo_api_key')

// Create axios instance
const createApiClient = () => {
  const instance = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })

  // Request interceptor - add API key
  instance.interceptors.request.use(
    config => {
      const key = getAPIKey()
      if (key) {
        config.headers['X-API-Key'] = key
      }
      return config
    },
    error => Promise.reject(error)
  )

  // Response interceptor - handle errors
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        // Clear invalid API key
        localStorage.removeItem('memo_api_key')
        // Dispatch event for auth store
        window.dispatchEvent(new CustomEvent('auth:invalid'))
      }
      return Promise.reject(error)
    }
  )

  return instance
}

// Export singleton
const api = createApiClient()

export default api

// Utility functions
export const hasAPIKey = () => !!getAPIKey()
export const getAPIKeyFromStorage = () => getAPIKey()
