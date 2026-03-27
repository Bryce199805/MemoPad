import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const getAPIKey = () => localStorage.getItem('memo_api_key')

let api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json', 'X-API-Key': getAPIKey() || '' }
})

export const setAPIKey = (key) => {
  localStorage.setItem('memo_api_key', key)
  api.defaults.headers['X-API-Key'] = key
}

export const hasAPIKey = () => !!localStorage.getItem('memo_api_key')

export const verifyAPIKey = async (key) => {
  try {
    const res = await axios.get(`${API_BASE}/api/verify`, {
      headers: { 'X-API-Key': key }
    })
    return res.data.success && res.data.data?.status === 'valid'
  } catch {
    return false
  }
}

export default api
