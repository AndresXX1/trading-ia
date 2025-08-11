 
/* eslint-disable no-unused-vars */
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

// ✅ CONFIGURACIÓN DE API MEJORADA
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for MT5 operations
  headers: {
    'Content-Type': 'application/json',
  }
})

// ✅ INTERCEPTOR MEJORADO PARA TOKENS
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log de requests para debugging
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    })
    
    return config
  },
  error => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// ✅ INTERCEPTOR MEJORADO PARA RESPUESTAS
api.interceptors.response.use(
  response => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data
    })
    return response
  },
  error => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })
    
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ✅ FUNCIONES DE FALLBACK MEJORADAS
const generateFallbackData = (symbol, timeframe, count) => {
  console.log(`🔄 Generando datos de fallback para ${symbol}`)
  
  const basePrices = {
    'EURUSD': 1.0850,
    'GBPUSD': 1.2650,
    'USDJPY': 148.50,
    'AUDUSD': 0.6750,
    'USDCHF': 0.8950,
    'USDCAD': 1.3450,
    'EURJPY': 161.20,
    'GBPJPY': 187.80
  }
  
  const basePrice = basePrices[symbol] || 1.0850
  const candles = []
  let currentPrice = basePrice
  
  for (let i = 0; i < count; i++) {
    const time = new Date(Date.now() - (count - i) * 60 * 60 * 1000)
    const volatility = symbol.includes('JPY') ? 0.3 : 0.0003
    const change = (Math.random() - 0.5) * volatility
    
    currentPrice += change
    currentPrice = Math.max(currentPrice, 0.0001)
    
    const open = currentPrice
    const high = currentPrice + Math.random() * volatility * 0.5
    const low = currentPrice - Math.random() * volatility * 0.5
    const close = currentPrice + (Math.random() - 0.5) * volatility * 0.3
    
    candles.push({
      time: time.toISOString(),
      open: parseFloat(open.toFixed(symbol.includes('JPY') ? 2 : 5)),
      high: parseFloat(high.toFixed(symbol.includes('JPY') ? 2 : 5)),
      low: parseFloat(low.toFixed(symbol.includes('JPY') ? 2 : 5)),
      close: parseFloat(close.toFixed(symbol.includes('JPY') ? 2 : 5)),
      volume: Math.floor(Math.random() * 2000) + 500
    })
    
    currentPrice = close
  }
  
  const lastCandle = candles[candles.length - 1]
  
  return {
    symbol,
    timeframe,
    count,
    data: { candles },
    price: lastCandle.close,
    timestamp: new Date().toISOString(),
    source: 'fallback_simulation'
  }
}

const generateMockSignals = (count = 10) => {
  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']
  const signalTypes = ['buy', 'sell']
  const timeframes = ['M15', 'M30', 'H1', 'H4', 'D1']
  const signals = []
  
  for (let i = 0; i < count; i++) {
    const symbol = pairs[Math.floor(Math.random() * pairs.length)]
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)]
    const basePrice = symbol === 'EURUSD' ? 1.0850 : symbol === 'GBPUSD' ? 1.2650 : 148.50
    
    signals.push({
      _id: `mock_signal_${i}`,
      id: `mock_signal_${i}`,
      symbol: symbol,
      signal_type: signalType,
      confluence_score: Math.random() * 0.4 + 0.6,
      entry_price: basePrice + (Math.random() - 0.5) * 0.01,
      stop_loss: signalType === 'buy' ? basePrice - 0.005 : basePrice + 0.005,
      take_profit: signalType === 'buy' ? basePrice + 0.01 : basePrice - 0.01,
      timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
      status: 'ACTIVE',
      created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      technical_analyses: [
        {
          type: 'elliott_wave',
          confidence: Math.random(),
          description: 'Elliott Wave Analysis',
          data: {
            direction: signalType === 'buy' ? 'bullish' : 'bearish', // Renamed from 'pattern'
            market_state: 'completion_wave_5',
            pattern: {
              waves: [
                { price: basePrice - 0.01, type: 'impulse' },
                { price: basePrice - 0.005, type: 'correction' },
                { price: basePrice + 0.005, type: 'impulse' },
                { price: basePrice, type: 'correction' },
                { price: basePrice + 0.01, type: 'impulse' }
              ]
            },
            targets: [
              { price: signalType === 'buy' ? basePrice + 0.015 : basePrice - 0.015, probability: 0.7, type: 'primary' }
            ]
          }
        },
        {
          type: 'fibonacci',
          confidence: Math.random(),
          description: 'Fibonacci Retracement',
          data: {
            swing_low: basePrice - 0.02,
            swing_high: basePrice + 0.02,
            levels: [
              { ratio: 0.236, price: basePrice + 0.005, strength: 0.6 },
              { ratio: 0.382, price: basePrice + 0.008, strength: 0.7 },
              { ratio: 0.618, price: basePrice + 0.012, strength: 0.8 }
            ]
          }
        },
        {
          type: 'support_resistance',
          confidence: Math.random(),
          description: 'Support and Resistance Levels',
          data: {
            levels: Array.from({ length: 63 }, (_, index) => ({
              price: basePrice + (Math.random() - 0.5) * 0.02,
              type: Math.random() > 0.5 ? 'resistance' : 'support',
              touches: Math.floor(Math.random() * 50) + 30,
              strength: Math.random()
            }))
          }
        }
      ]
    })
  }
  
  return signals
}

// ✅ EXPORTACIÓN PRINCIPAL CON TODAS LAS FUNCIONES
export default {
  // ✅ AUTENTICACIÓN
  async login(email, password) {
    try {
      const response = await api.post('/api/auth/auth/login', { email, password })
      return response.data
    } catch (error) {
      console.error('❌ Error en login:', error)
      throw error
    }
  },
  async getRiskLockStatus() {
    const response = await api.get("/api/auth/auth/risk/status")
    return response.data
  },

  async lockRiskConfiguration({ total_capital, risk_percentage, source = "mt5", mt5_snapshot = null }) {
    const response = await api.post("/api/auth/auth/risk/lock", {
      total_capital,
      risk_percentage,
      source,
      mt5_snapshot,
    })
    return response.data
  },

  async register(userData) {
    try {
      const response = await api.post('/api/auth/auth/register', userData)
      return response.data
    } catch (error) {
      console.error('❌ Error en registro:', error)
      throw error
    }
  },

  // ✅ MT5 DATA - FUNCIÓN PRINCIPAL PARA CHARTS-IMPROVED.TSX
  async getMT5Data(symbol, timeframe = 'H1', count = 100) {
    try {
      console.log(`🔄 Llamando al backend: ${API_BASE_URL}/api/mt5/data`)
      
      const response = await api.post('/api/mt5/data', {
        symbol,
        timeframe,
        count
      })

      if (response.data) {
        console.log(`✅ Respuesta del backend para ${symbol}:`, response.data)
        
        return {
          symbol: response.data.symbol || symbol,
          timeframe: response.data.timeframe || timeframe,
          count: response.data.count || count,
          data: response.data.data || response.data,
          // ✅ PRECIO ACTUAL del último candle
          price: response.data.price || (response.data.data?.candles ? response.data.data.candles[response.data.data.candles.length - 1]?.close : null),
          timestamp: response.data.timestamp || new Date().toISOString(),
          source: response.data.source || 'mt5_api'
        }
      }
    } catch (error) {
      console.error(`❌ Error llamando al backend para ${symbol}:`, error)
      
      // ✅ FALLBACK: Solo si falla la llamada real
      console.log('🔄 Usando datos de fallback...')
      return generateFallbackData(symbol, timeframe, count)
    }
  },

  // ✅ PRECIO ACTUAL ESPECÍFICO
  async getCurrentPrice(symbol) {
    try {
      const response = await api.get(`/api/mt5/price/${symbol}`)
      return {
        symbol,
        price: response.data.price,
        timestamp: response.data.timestamp || new Date().toISOString(),
        source: 'mt5_live'
      }
    } catch (error) {
      console.error(`❌ Error obteniendo precio actual para ${symbol}:`, error)
      
      // Fallback usando getMT5Data
      const data = await this.getMT5Data(symbol, 'M1', 1)
      return {
        symbol,
        price: data.price,
        timestamp: data.timestamp,
        source: data.source
      }
    }
  },

  // ✅ PARES DISPONIBLES
  async getAvailablePairs() {
    const response = await api.get('/api/signals/signals/pairs/')
    return response.data
  },

  // ✅ SEÑALES INICIALES
  async getInitialSignals(limit = 20) {
    try {
      const response = await api.get('/api/signals/signals/', {
        params: { limit }
      })
      return {
        signals: response.data.signals || response.data.data || response.data || []
      }
    } catch (error) {
      console.error('❌ Error obteniendo señales iniciales:', error)
      return {
        signals: generateMockSignals(limit)
      }
    }
  },
// ✅ ANÁLISIS CON IA - MODIFICADO para enviar configuración por body
// ✅ ANÁLISIS CON IA - MODIFICADO para incluir gestión de riesgo
async analyzePair(pair, timeframe, config = null) {
  const defaultConfig = {
    // Configuración de confluencias
    confluence_threshold: 0.6,
    enable_elliott_wave: true,
    enable_fibonacci: true,
    enable_chart_patterns: true,
    enable_support_resistance: true,
    elliott_wave_weight: 0.25,
    fibonacci_weight: 0.25,
    chart_patterns_weight: 0.3,
    support_resistance_weight: 0.2,

    // Gestión de riesgo
    total_capital: 10000,
    risk_percentage: 2,
    max_risk_amount: 200,

    // Configuración fija
    atr_multiplier_sl: 2.0,
    risk_reward_ratio: 2.0,
  }

  const analysisConfig = config || defaultConfig

  const TF_ALIASES = {
    "1m": "M1",
    "5m": "M5", 
    "15m": "M15",
    "30m": "M30",
    "1h": "H1",
    h1: "H1",
    "60m": "H1",
    "4h": "H4",
    h4: "H4", 
    "1d": "D1",
    d1: "D1",
    "1w": "W1",
    w1: "W1",
  }

  // ✅ CORREGIDO: Normalizar timeframe correctamente
  const normalizedTimeframe = TF_ALIASES[String(timeframe).toLowerCase()] ?? String(timeframe).toUpperCase()

  // ✅ CORREGIDO: Incluir timeframe en el body (esto es lo que faltaba!)
  const requestBody = {
    ...analysisConfig,
    timeframe: normalizedTimeframe, // ← ESTO ES CLAVE: timeframe en el body
    risk_per_trade:
      analysisConfig.risk_per_trade != null
        ? analysisConfig.risk_per_trade
        : analysisConfig.risk_percentage != null
          ? Number(analysisConfig.risk_percentage)
          : undefined,
  }

  console.log('🔄 Analizando par con timeframe en body:', { 
    pair, 
    originalTimeframe: timeframe,
    normalizedTimeframe: normalizedTimeframe,
    capital: analysisConfig.total_capital,
    riskPercentage: analysisConfig.risk_percentage,
    maxRisk: analysisConfig.max_risk_amount,
    requestBody: requestBody
  })

  // ✅ CORREGIDO: Enviar requestBody (que incluye timeframe) en lugar de analysisConfig
  const response = await api.post(`/api/signals/signals/analyze/${pair}`, requestBody, {
    // Opcional: también puedes pasar timeframe en query params como fallback
    params: {
      timeframe: normalizedTimeframe
    }
  })
  
  console.log('✅ Respuesta del análisis:', {
    timeframeEnviado: normalizedTimeframe,
    timeframeRecibido: response.data.timeframe,
    signals: response.data.signals?.length || 0,
    response: response.data
  })

  return response.data
},


  // ----- MT5 CONEXIÓN -----
  async connectMT5Account({ login, password, server, account_type, remember = false }) {
    const response = await api.post("/api/mt5/connect", { login, password, server, account_type, remember })
    return response.data
  },
  async autoConnectMT5() {
    const response = await api.post("/api/mt5/autoconnect")
    return response.data
  },
  async disconnectMT5Account() {
    const response = await api.post("/api/mt5/disconnect")
    return response.data
  },
  async getMT5Status() {
    const response = await api.get("/api/mt5/status")
    return response.data
  },
  // Perfil en DB (sin password)
  async getMT5Profile() {
    const response = await api.get("/api/mt5/profile")
    return response.data
  },
  async saveMT5Profile({ login, server, account_type }) {
    const response = await api.post("/api/mt5/profile/save", { login, server, account_type })
    return response.data
  },
  async deleteMT5Profile() {
    const response = await api.delete("/api/mt5/profile")
    return response.data
  },
  // ✅ GENERAR IMAGEN DE GRÁFICO
  async generateChartImage(signalData) {
    try {
      const response = await api.post('/api/charts/generate', signalData)
      return {
        chart_image_url: response.data.chart_image_url || response.data.image_url || response.data.url
      }
    } catch (error) {
      console.error('❌ Error generando imagen:', error)
      return {
        chart_image_url: null,
        error: error.message
      }
    }
  },

  // ✅ EJECUTAR ORDEN
  async executeOrder(orderData) {
    try {
      const response = await api.post('/api/mt5/execute', orderData)
      return {
        success: response.data.success || false,
        ticket: response.data.ticket || response.data.order_id,
        error: response.data.error
      }
    } catch (error) {
      console.error('❌ Error ejecutando orden:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  // ✅ ÓRDENES DEL USUARIO
  async getUserOrders() {
    try {
      const response = await api.get('/api/mt5/orders')
      return response.data
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error)
      return { orders: [] }
    }
  },

  // ✅ POSICIONES ABIERTAS
  async getOpenPositions() {
    try {
      const response = await api.get('/api/mt5/positions')
      return response.data
    } catch (error) {
      console.error('❌ Error obteniendo posiciones:', error)
      return { positions: [] }
    }
  },

  // ✅ ESTADO DEL SISTEMA
  async getSystemStatus() {
    try {
      const response = await api.get('/api/status')
      return response.data
    } catch (error) {
      console.error('❌ Error obteniendo estado del sistema:', error)
      return { status: 'unknown', mt5_connected: false }
    }
  },

  // ✅ HEALTH CHECK
  async getHealthCheck() {
    try {
      const response = await api.get('/health')
      return response.data
    } catch (error) {
      console.error('❌ Error en health check:', error)
      return { status: 'error' }
    }
  },

  // ✅ TEST MT5 INTEGRATION
  async testMT5Integration() {
    try {
      const response = await api.get('/api/test/mt5')
      return response.data
    } catch (error) {
      console.error('❌ Error en test MT5:', error)
      return { connected: false, error: error.message }
    }
  },

  // ✅ RECONECTAR MT5
  async reconnectMT5() {
    try {
      const response = await api.post('/api/admin/reconnect-mt5')
      return response.data
    } catch (error) {
      console.error('❌ Error reconectando MT5:', error)
      return { success: false, error: error.message }
    }
  },

  // ✅ CONFIGURACIÓN DE SEÑALES
  async updateSignalSettings(settings) {
    try {
      const response = await api.post('/api/signals/settings/', settings)
      return response.data
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error)
      throw error
    }
  },

  // ✅ ELIMINAR SEÑAL
  async deleteSignal(signalId) {
    try {
      const response = await api.delete(`/api/signals/${signalId}`)
      return response.data
    } catch (error) {
      console.error('❌ Error eliminando señal:', error)
      throw error
    }
  },

  // ✅ TEST GENERACIÓN DE GRÁFICOS
  async testChartGeneration() {
    try {
      const response = await api.get('/api/charts/test')
      return response.data
    } catch (error) {
      console.error('❌ Error en test de gráficos:', error)
      return { success: false, error: error.message }
    }
  },

  // ✅ MÉTODOS LEGACY (mantener compatibilidad)
  async getRealTimeData() {
    try {
      const response = await api.get('/market-data/realtime')
      return response
    } catch (error) {
      console.warn('Real-time data not available, using fallback')
      return { data: [], timestamp: new Date().toISOString() }
    }
  },

  async getNews() {
    try {
      const response = await api.get('/news')
      return response.data
    } catch (error) {
      console.error('❌ Error obteniendo noticias:', error)
      return { news: [] }
    }
  },

  // ✅ OBTENER SEÑALES POR PAR Y TIMEFRAME
  async getSignals(pair, timeframe, limit = 50) {
    try {
      const response = await api.get(`/signals/${pair}/${timeframe}`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('❌ Error obteniendo señales:', error)
      return { signals: [] }
    }
  },

  // ✅ UTILIDADES
  isTokenExpired(token) {
    try {
      const decoded = jwtDecode(token)
      return decoded.exp < Date.now() / 1000
    } catch {
      return true
    }
  },

  // ✅ FUNCIÓN AUXILIAR PARA GENERAR SEÑAL MOCK
  generateMockSignal(symbol, timeframe) {
    const basePrice = symbol === 'EURUSD' ? 1.0850 : symbol === 'GBPUSD' ? 1.2650 : 148.50
    const signalType = Math.random() > 0.5 ? 'buy' : 'sell'
    
    return {
      _id: `new_signal_${Date.now()}`,
      id: `new_signal_${Date.now()}`,
      symbol: symbol,
      signal_type: signalType,
      confluence_score: Math.random() * 0.3 + 0.7,
      entry_price: basePrice + (Math.random() - 0.5) * 0.01,
      stop_loss: signalType === 'buy' ? basePrice - 0.005 : basePrice + 0.005,
      take_profit: signalType === 'buy' ? basePrice + 0.01 : basePrice - 0.01,
      timeframe: timeframe,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      technical_analyses: [
        {
          type: 'elliott_wave',
          confidence: 0.8,
          description: 'Elliott Wave Analysis',
          data: {
            pattern: { direction: signalType === 'buy' ? 'bullish' : 'bearish' },
            market_state: 'completion_wave_5'
          }
        }
      ]
    }
  },

  // ✅ FUNCIÓN PARA MÚLTIPLES PARES (NUEVA)
  async getMultiplePairPrices(symbols) {
    const promises = symbols.map(symbol => this.getCurrentPrice(symbol))
    const results = await Promise.allSettled(promises)
    
    const prices = {}
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        prices[symbols[index]] = result.value
      } else {
        console.error(`Error obteniendo precio para ${symbols[index]}:`, result.reason)
      }
    })
    
    return prices
  },

  // ✅ Obtener información de cuenta MT5
  async getMT5AccountInfo() {
    try {
      const response = await api.get("/api/mt5/account")
      // Ejemplo esperado: { balance, equity, margin_free, currency, server, login, account_type, name, leverage }
      return response.data
    } catch (error) {
      console.error("❌ Error obteniendo cuenta MT5:", error)
      throw error
    }
  },

  // ✅ FUNCIÓN PARA VALIDAR CONEXIÓN
  async validateConnection() {
    try {
      const response = await api.get('/health', { timeout: 5000 })
      return { connected: true, status: response.data }
    } catch (error) {
      return { connected: false, error: error.message }
    }
  }
}
