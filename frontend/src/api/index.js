import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.100.177:8000',
  timeout: 10000
})

// Interceptor para añadir token a las peticiones
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default {
  async login(email, password) {
    const response = await api.post('/api/auth/auth/login', { email, password })
    return response.data
  },
  
  async register(userData) {
    const response = await api.post('/api/auth/auth/register', userData)
    return response.data
  },
  
  async getSignals(pair, timeframe) {
    const response = await api.get(`/signals/${pair}/${timeframe}`)
    return response.data
  },
  
  async getRealTimeData() {
    const response = await api.get('/market-data/realtime')
    return response.data
  },
  
  async getNews() {
    const response = await api.get('/news')
    return response.data
  },
  
  isTokenExpired(token) {
    try {
      const decoded = jwtDecode(token)
      return decoded.exp < Date.now() / 1000
    } catch {
      return true
    }
  }
}