import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const getAPIKey = () => localStorage.getItem('memo_api_key')

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json', 'X-API-Key': getAPIKey() || '' }
})

export const setAPIKey = (key) => {
  localStorage.setItem('memo_api_key', key)
  api.defaults.headers['X-API-Key'] = key
}

export const hasAPIKey = () => !!localStorage.getItem('memo_api_key')

export default api
