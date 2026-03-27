import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Get API Key from localStorage
const getAPIKey = () => localStorage.getItem('memo_api_key')

// Create axios instance with auth
const createApiClient = () => {
  const key = getAPIKey()
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': key || ''
    }
  })
}

let api = createApiClient()

// Update API key and recreate client
export const setAPIKey = (key) => {
  localStorage.setItem('memo_api_key', key)
  api = createApiClient()
}

// Get current API key
export const getAPIKeyFromStorage = () => getAPIKey()

// Check if API key is set
export const hasAPIKey = () => !!getAPIKey()

// Verify API key is valid
export const verifyAPIKey = async (key) => {
  try {
    const res = await axios.get(`${API_BASE}/api/verify`, {
      headers: { 'X-API-Key': key }
    })
    return res.data.status === 'valid'
  } catch {
    return false
  }
}

export default {
  get todos() { return api },
  get countdowns() { return api },
  get categories() { return api },
  get stats() { return api }
}
