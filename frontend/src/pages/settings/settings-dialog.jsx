/* eslint-disable no-unused-vars */
"use client"
import { useState, useCallback, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Chip, Tabs, Tab } from "@mui/material"
import { Settings, Shield, Psychology, PlayArrow } from "@mui/icons-material"
import { saveMT5Profile, setAutoReconnect, setRemember } from "../../features/auth/mt5-slice"
import api from "../../api/index.js"
import AutoTradingComponent from "./automatic-execution"
import { clearMT5LocalStorage } from "../../utils/clear-mt5-storage"

import MT5AccountTab from "./mt5-account-tab"
import RiskManagementTab from "./risk-management-tab"
import AIConfluencesTab from "./ai-confluences-tab"

function getSystemTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  } catch {
    return "America/New_York"
  }
}

const TRADING_STRATEGIES = [
  {
    key: "scalping",
    label: "Scalping",
    description: "Operaciones rápidas de 1-5 minutos aprovechando pequeños movimientos del precio",
    timeframes: ["M1", "M5"],
    riskLevel: "Alto",
  },
  {
    key: "day_trading",
    label: "Day Trading",
    description: "Operaciones intradiarias que se cierran antes del final del día",
    timeframes: ["M15", "M30", "H1"],
    riskLevel: "Medio-Alto",
  },
  {
    key: "swing_trading",
    label: "Swing Trading",
    description: "Operaciones de varios días a semanas siguiendo tendencias de mediano plazo",
    timeframes: ["H4", "D1"],
    riskLevel: "Medio",
  },
  {
    key: "position_trading",
    label: "Position Trading",
    description: "Operaciones de largo plazo basadas en análisis fundamental y tendencias principales",
    timeframes: ["D1", "W1"],
    riskLevel: "Bajo",
  },
]

const TRADING_STRATEGIES_ADVANCED = [
  {
    key: "maleta",
    label: "Estrategia Maleta",
    description:
      "Estrategia desarrollada por Jhonatan Nuñez que utiliza el indicador Maleta Stochastic JR para identificar puntos de entrada y salida óptimos en el mercado.",
    icon: "💼",
    timeframes: ["M15", "M30", "H1", "H4"],
    riskLevel: "Medio",
  },
  {
    key: "position_trading",
    label: "Trading de Posición",
    description:
      "Estrategia a largo plazo que mantiene posiciones durante semanas o meses, basada en análisis fundamental y técnico de tendencias principales.",
    icon: "📈",
    timeframes: ["D1", "W1"],
    riskLevel: "Bajo",
  },
  {
    key: "swing_trading_advanced",
    label: "Swing Trading Avanzado",
    description:
      "Captura movimientos de precio de mediano plazo (días a semanas) utilizando análisis técnico avanzado y patrones de reversión.",
    icon: "🔄",
    timeframes: ["H4", "D1"],
    riskLevel: "Medio",
  },
  {
    key: "algorithmic_trading",
    label: "Trading Algorítmico",
    description:
      "Estrategias sistemáticas basadas en algoritmos predefinidos que ejecutan operaciones automáticamente según reglas específicas.",
    icon: "🤖",
    timeframes: ["M5", "M15", "M30", "H1"],
    riskLevel: "Medio-Alto",
  },
  {
    key: "pairs_trading",
    label: "Trading por Pares",
    description:
      "Estrategia que opera la diferencia de precio entre dos activos correlacionados, comprando uno y vendiendo otro simultáneamente.",
    icon: "⚖️",
    timeframes: ["H1", "H4", "D1"],
    riskLevel: "Medio",
  },
  {
    key: "mean_reversion",
    label: "Reversión a la Media",
    description:
      "Estrategia contraria que busca oportunidades cuando los precios se alejan significativamente de su valor promedio histórico.",
    icon: "📊",
    timeframes: ["M30", "H1", "H4"],
    riskLevel: "Medio-Alto",
  },
  {
    key: "social_trading",
    label: "Social Trading",
    description:
      "Estrategia que replica las operaciones de traders exitosos o utiliza señales de la comunidad para tomar decisiones de trading.",
    icon: "👥",
    timeframes: ["M15", "M30", "H1"],
    riskLevel: "Variable",
  },
  {
    key: "carry_trade",
    label: "Carry Trade",
    description:
      "Estrategia que aprovecha las diferencias en las tasas de interés entre divisas, manteniendo posiciones a largo plazo.",
    icon: "💰",
    timeframes: ["D1", "W1"],
    riskLevel: "Bajo-Medio",
  },
  {
    key: "hedging_strategy",
    label: "Estrategia de Cobertura",
    description:
      "Técnica de gestión de riesgo que utiliza posiciones opuestas para proteger el capital de movimientos adversos del mercado.",
    icon: "🛡️",
    timeframes: ["H1", "H4", "D1"],
    riskLevel: "Bajo",
  },
  {
    key: "pyramiding",
    label: "Piramidación",
    description:
      "Estrategia que añade posiciones adicionales a una operación ganadora para maximizar las ganancias en tendencias fuertes.",
    icon: "🔺",
    timeframes: ["M30", "H1", "H4"],
    riskLevel: "Alto",
  },
]

const FOREX_PAIRS = [
  { key: "EURUSD", label: "EUR/USD", category: "Major" },
  { key: "GBPUSD", label: "GBP/USD", category: "Major" },
  { key: "USDJPY", label: "USD/JPY", category: "Major" },
  { key: "USDCHF", label: "USD/CHF", category: "Major" },
  { key: "AUDUSD", label: "AUD/USD", category: "Major" },
  { key: "USDCAD", label: "USD/CAD", category: "Major" },
  { key: "NZDUSD", label: "NZD/USD", category: "Major" },
  { key: "EURGBP", label: "EUR/GBP", category: "Cross" },
  { key: "EURJPY", label: "EUR/JPY", category: "Cross" },
  { key: "GBPJPY", label: "GBP/JPY", category: "Cross" },
  { key: "AUDJPY", label: "AUD/JPY", category: "Cross" },
  { key: "CHFJPY", label: "CHF/JPY", category: "Cross" },
]

// Nuevo sistema de tipos de ejecución
const EXECUTION_TYPES = [
  {
    key: "market",
    label: "Ejecución por Mercado",
    description: "Ejecuta inmediatamente al precio actual del mercado",
  },
  {
    key: "limit",
    label: "Ejecución Limit",
    description: "Espera a un precio mejor - compra más barato o vende más caro",
  },
  {
    key: "stop",
    label: "Ejecución Stop",
    description: "Se activa cuando el precio rompe un nivel - para entrar en tendencias",
  },
]

// Reference session windows in UTC
const SESSIONS_UTC = [
  { key: "sydney", label: "Sídney", start: 22, end: 7 }, // spans midnight
  { key: "tokyo", label: "Tokio", start: 0, end: 9 },
  { key: "london", label: "Londres", start: 8, end: 17 },
  { key: "newyork", label: "Nueva York", start: 13, end: 22 },
]

const OVERLAPS_UTC = [
  { label: "Londres + Nueva York", start: 13, end: 17 },
  { label: "Sídney + Tokio", start: 0, end: 7 },
  { label: "Tokio + Londres", start: 8, end: 9 },
]

const TIMEZONES_BY_COUNTRY = [
  { code: "AR", label: "Argentina (Buenos Aires)", tz: "America/Argentina/Buenos_Aires" },
  { code: "MX", label: "México (Ciudad de México)", tz: "America/Mexico_City" },
  { code: "ES", label: "España (Madrid)", tz: "Europe/Madrid" },
  { code: "CL", label: "Chile (Santiago)", tz: "America/Santiago" },
  { code: "CO", label: "Colombia (Bogotá)", tz: "America/Bogota" },
  { code: "PE", label: "Perú (Lima)", tz: "America/Lima" },
  { code: "US", label: "Estados Unidos (Nueva York)", tz: "America/New_York" },
  { code: "GB", label: "Reino Unido (Londres)", tz: "Europe/London" },
]

function formatSessionRangeInZone(startUtcHour, endUtcHour, tz) {
  const now = new Date()
  const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const start = new Date(ref)
  start.setUTCHours(startUtcHour, 0, 0, 0)
  const end = new Date(ref)
  if (endUtcHour >= startUtcHour) {
    end.setUTCHours(endUtcHour, 0, 0, 0)
  } else {
    end.setUTCDate(end.getUTCDate() + 1)
    end.setUTCHours(endUtcHour, 0, 0, 0)
  }
  const fmt = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })
  return `${fmt.format(start)} - ${fmt.format(end)}`
}

const SettingsDialog = ({
  open,
  onClose,
  riskManagement,
  setRiskManagement,
  showSnackbar,
  onRiskLocked,
  mt5Session,
  setMt5Session,
  aiSettings,
  setAiSettings,
  timeframes,
}) => {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.user || {})
  const [accountData, setAccountData] = useState(mt5Session)
  const [mt5State, setMt5State] = useState({
    connected: false,
    account: null,
    status: "idle",
    error: null,
    account_type: "demo",
    remember: false,
    autoReconnect: false,
  })

  const isConnected = !!mt5State.connected
  const account = mt5State.account || null
  const connectStatus = mt5State.status || "idle"
  const connectError = mt5State.error || null

  const [settingsTab, setSettingsTab] = useState(0)

  // 🔹 Extensión de configuración de riesgo
  const [extendedRiskManagement, setExtendedRiskManagement] = useState({
    ...riskManagement,
    maxDailyLossPercent: 5, // % máximo de pérdida diaria
    maxWeeklyLossPercent: 15, // % máximo de pérdida semanal
    maxDailyProfitPercent: 10, // % máximo de ganancia diaria
    maxOpenTrades: 5, // Límite de operaciones simultáneas
    minRRR: 2, // Relación Riesgo:Beneficio mínima
    maxLosingStreak: 3, // Racha máxima de pérdidas antes de pausar
    coolDownHours: 4, // Horas de pausa tras racha
    riskByStrategy: {
      // Perfiles por estrategia
      scalping: { riskPercent: 1, maxTrades: 5 },
      day_trading: { riskPercent: 2, maxTrades: 3 },
      swing_trading: { riskPercent: 2, maxTrades: 2 },
      position_trading: { riskPercent: 3, maxTrades: 1 },
      maleta: { riskPercent: 2, maxTrades: 2 },
    },
  })

  // Formulario conexión MT5 - now loads from backend instead of localStorage
  const [mt5Form, setMt5Form] = useState({
    type: "demo", // 'demo' | 'real'
    server: "",
    login: "",
    password: "",
  })

  const [rememberSession, setRememberSession] = useState(false)
  const [autoReconnect, setAutoReconnectLocal] = useState(false)
  const [locking, setLocking] = useState(false)

  const [autoTradingActive, setAutoTradingActive] = useState(false)
  const [autoTradingSettings, setAutoTradingSettings] = useState({
    selectedPairs: ["EURUSD", "GBPUSD"],
    activeSessions: ["london", "newyork"],
    maxConcurrentTrades: 3,
    enableSessionFiltering: true,
    pauseOnNews: true,
    autoStopLoss: true,
    autoTakeProfit: true,
  })

  const [userId, setUserId] = useState(null)

  useEffect(() => {
    setAccountData(mt5Session)
  }, [mt5Session])

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    console.log("[v0] Loaded User ID from localStorage:", storedUserId)
    if (storedUserId) {
      setUserId(storedUserId)
    }
  }, [])

  useEffect(() => {
    if (open && userId) {
      console.log("[v0] Dialog abierto, cargando datos MT5 y gestión de riesgo automáticamente...")

      const loadInitialData = async () => {
        try {
          // 1. Cargar perfil guardado (sin contraseña)
          const res = await loadMT5ProfileFromBackendFunc()

          // ✅ Si existe ai_settings en el perfil, hidratar estado local
          if (res?.profile?.ai_settings) {
            console.log("[v0] Restaurando ai_settings guardados:", res.profile.ai_settings)
            setAiSettings(res.profile.ai_settings)
          }

          // 2. Verificar estado de conexión actual
          await checkMT5Status()

          // 3. Si está conectado, cargar información de cuenta
          await loadUserMT5StateFunc()

          // 4. 🔒 Cargar estado de gestión de riesgo
          try {
            const riskStatus = await api.getRiskLockStatus()
            console.log("[v0] Estado de gestión de riesgo:", riskStatus)

            setRiskManagement((prev) => ({
              ...prev,
              totalCapital: riskStatus.total_capital || prev.totalCapital,
              riskPercentage: riskStatus.risk_percentage || prev.riskPercentage,
              isLocked: riskStatus.locked || false,
              lockedAt: riskStatus.locked_at || null,
              extended: riskStatus.extended_risk_config || null,
            }))
          } catch (err) {
            console.error("[v0] Error cargando gestión de riesgo:", err)
          }

          console.log("[v0] Datos iniciales cargados correctamente")
        } catch (error) {
          console.error("[v0] Error cargando datos iniciales:", error)
        }
      }

      loadInitialData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId])

  const checkMT5Status = async () => {
    if (!userId) return

    try {
      console.log("[v0] Verificando estado de conexión MT5...")
      const statusResponse = await api.getMT5Status()

      setMt5State((prev) => ({
        ...prev,
        connected: statusResponse.connected || prev.connected,
        account: statusResponse.connected ? statusResponse : prev.account, // ✅ mantiene la cuenta previa
        account_type: statusResponse.account_type || prev.account_type || "demo",
        status: statusResponse.connected ? "connected" : prev.status,
      }))

      // Si está conectado según el status, intentar obtener info de cuenta
      if (statusResponse.connected) {
        console.log("[v0] MT5 conectado según status, obteniendo información de cuenta...")
        await loadUserMT5StateFunc()
      }
    } catch (error) {
      console.error("[v0] Error verificando estado MT5:", error)
      setMt5State((prev) => ({
        ...prev,
        connected: prev.connected, // ✅ no forzar a false
        status: prev.status, // ✅ mantiene el estado previo
      }))
    }
  }

  const loadMT5ProfileFromBackendFunc = async () => {
    if (!userId) return

    try {
      console.log("[v0] Cargando perfil MT5 desde backend...")
      const profileResponse = await api.getMT5Profile()

      if (profileResponse.exists && profileResponse.profile) {
        const profile = profileResponse.profile
        console.log("[v0] Perfil MT5 encontrado:", profile)

        setMt5Form((prev) => ({
          ...prev,
          type: profile.account_type || "demo",
          server: profile.server || "",
          login: profile.login || "",
          // No cargar password por seguridad
        }))

        // Mostrar notificación de perfil cargado
        showSnackbar("✅ Perfil MT5 cargado automáticamente", "info")
      } else {
        console.log("[v0] No se encontró perfil MT5 guardado")
      }
    } catch (error) {
      console.error("[v0] Error cargando perfil MT5:", error)
      // No mostrar error al usuario ya que es normal no tener perfil guardado
    }
  }

  const loadUserMT5StateFunc = async () => {
    if (!userId) return

    try {
      console.log("[v0] Cargando estado de cuenta MT5...")
      const response = await api.getMT5AccountInfo()

      console.log("[v0] Respuesta de cuenta MT5:", response)

      const isConnected = !!response?.connected

      // 🔹 Actualizamos el estado local
      setMt5State((prev) => ({
        ...prev,
        connected: isConnected,
        account: isConnected ? response : null,
        account_type: response?.account_type || "demo",
        status: isConnected ? "connected" : "idle",
      }))

      // 🔹 Notificamos al padre (Charts) con setMt5Session
      if (setMt5Session) {
        setMt5Session(isConnected ? response : null)
      }

      if (isConnected) {
        console.log("[v0] Cuenta MT5 conectada, datos actualizados")
      }
    } catch (error) {
      console.error("[v0] Error cargando estado MT5:", error)

      // 🔹 Estado local
      setMt5State((prev) => ({
        ...prev,
        connected: false,
        account: null,
        status: "idle",
      }))

      // 🔹 Estado global (padre)
      if (setMt5Session) {
        setMt5Session(null)
      }
    }
  }

  // Sync toggles con Redux (para compartir en toda la app)
  useEffect(() => {
    dispatch(setRemember(rememberSession))
    dispatch(setAutoReconnect(autoReconnect))
  }, [rememberSession, autoReconnect, dispatch])

  // Capital = Saldo MT5 (inmutable desde UI)
  useEffect(() => {
    if (isConnected && account?.balance != null) {
      setRiskManagement((prev) => ({
        ...prev,
        totalCapital: Number(account.balance) || 0,
      }))
    }
  }, [isConnected, account?.balance, setRiskManagement])

  // Opciones por defecto para temporalidades
  const defaultTimeframes = [
    { value: "M1", label: "1 Minuto" },
    { value: "M5", label: "5 Minutos" },
    { value: "M15", label: "15 Minutos" },
    { value: "M30", label: "30 Minutos" },
    { value: "H1", label: "1 Hora" },
    { value: "H4", label: "4 Horas" },
    { value: "D1", label: "1 Día" },
    { value: "W1", label: "1 Semana" },
  ]

  const tfOptions = Array.isArray(timeframes) && timeframes.length > 0 ? timeframes : defaultTimeframes

  // Validación de pesos (deben sumar 1.0)
  const totalWeights =
    (aiSettings?.elliottWaveWeight || 0) +
    (aiSettings?.fibonacciWeight || 0) +
    (aiSettings?.chartPatternsWeight || 0) +
    (aiSettings?.supportResistanceWeight || 0)

  const weightsValid = Math.abs(totalWeights - 1.0) < 0.01

  // Defaults y helpers AI settings - ACTUALIZADO para tipos de ejecución
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allowedExecutionTypes = aiSettings.allowedExecutionTypes || ["market"]
  const defaultExecutionType =
    aiSettings.defaultExecutionType && allowedExecutionTypes.includes(aiSettings.defaultExecutionType)
      ? aiSettings.defaultExecutionType
      : allowedExecutionTypes[0] || "market"

  const selectedExecutionType = aiSettings.selectedExecutionType || "market"
  const selectedStrategy = aiSettings.selectedStrategy || "day_trading"

  const getCombinedTimeframes = () => {
    const traderTypeTimeframes = TRADING_STRATEGIES.find((s) => s.key === selectedStrategy)?.timeframes || []
    const tradingStrategyTimeframes =
      TRADING_STRATEGIES_ADVANCED.find((s) => s.key === (aiSettings.selectedTradingStrategy || "maleta"))?.timeframes ||
      []

    // Combinar ambas arrays y eliminar duplicados
    const combinedTimeframes = [...new Set([...traderTypeTimeframes, ...tradingStrategyTimeframes])]

    // Ordenar las temporalidades de menor a mayor
    const timeframeOrder = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"]
    return combinedTimeframes.sort((a, b) => timeframeOrder.indexOf(a) - timeframeOrder.indexOf(b))
  }

  const analyzePair = async (pair) => {
    console.log("🔍 DEBUG - Estado completo de aiSettings:", aiSettings)
    console.log("🔍 DEBUG - selectedStrategy:", aiSettings?.selectedStrategy)
    console.log("🔍 DEBUG - selectedTradingStrategy:", aiSettings?.selectedTradingStrategy)
    console.log("🔍 DEBUG - aiSettings es null/undefined?", aiSettings === null || aiSettings === undefined)

    // Verificar si aiSettings existe
    if (!aiSettings) {
      console.log("❌ DEBUG - aiSettings es null o undefined")
      showSnackbar("❌ Error: Configuración no inicializada", "error")
      return
    }

    console.log("🔍 DEBUG - selectedStrategy desde estado local:", selectedStrategy)
    console.log("🔍 DEBUG - Comparando valores:")
    console.log("  - aiSettings.selectedStrategy:", aiSettings.selectedStrategy)
    console.log("  - selectedStrategy (estado local):", selectedStrategy)

    const userSelectedStrategy = aiSettings.selectedStrategy || selectedStrategy
    const userSelectedTradingStrategy = aiSettings.selectedTradingStrategy

    console.log("🔍 DEBUG - userSelectedStrategy final:", userSelectedStrategy)
    console.log("🔍 DEBUG - userSelectedTradingStrategy final:", userSelectedTradingStrategy)
    console.log("🔍 DEBUG - Validación selectedStrategy:", !!userSelectedStrategy)
    console.log("🔍 DEBUG - Validación selectedTradingStrategy:", !!userSelectedTradingStrategy)

    if (!userSelectedStrategy) {
      console.log("❌ DEBUG - selectedStrategy es falsy:", userSelectedStrategy)
      console.log("❌ DEBUG - Deteniendo ejecución por falta de selectedStrategy")
      showSnackbar("❌ Debes seleccionar un Tipo de Trader antes de analizar", "error")
      return
    }

    if (!userSelectedTradingStrategy) {
      console.log("❌ DEBUG - selectedTradingStrategy es falsy:", userSelectedTradingStrategy)
      console.log("❌ DEBUG - Deteniendo ejecución por falta de selectedTradingStrategy")
      showSnackbar("❌ Debes seleccionar una Estrategia de Trading antes de analizar", "error")
      return
    }

    console.log("✅ DEBUG - Todas las validaciones pasaron, construyendo requestBody...")
    console.log("✅ DEBUG - Valores que se enviarán:")
    console.log("  - trader_type:", userSelectedStrategy)
    console.log("  - trading_strategy:", userSelectedTradingStrategy)

    const getSafeTimeframes = (strategies, key) => {
      const strategy = strategies.find((s) => s.key === key)
      return strategy?.timeframes || []
    }

    const getSafeCombinedTimeframes = () => {
      const traderTypeTimeframes = getSafeTimeframes(TRADING_STRATEGIES, userSelectedStrategy)
      const tradingStrategyTimeframes = getSafeTimeframes(TRADING_STRATEGIES_ADVANCED, userSelectedTradingStrategy)

      // Combinar ambas arrays y eliminar duplicados
      const combinedTimeframes = [...new Set([...traderTypeTimeframes, ...tradingStrategyTimeframes])]

      // Ordenar las temporalidades de menor a mayor
      const timeframeOrder = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"]
      return combinedTimeframes.sort((a, b) => timeframeOrder.indexOf(a) - timeframeOrder.indexOf(b))
    }

    const requestBody = {
      // Configuración básica
      timeframe: aiSettings.analysisTimeframe,
      confluence_threshold: aiSettings.confluenceThreshold,

      // Análisis técnicos habilitados
      enable_elliott_wave: true,
      enable_fibonacci: true,
      enable_chart_patterns: true,
      enable_support_resistance: true,

      // Pesos de análisis
      elliott_wave_weight: aiSettings.elliottWaveWeight || 0.25,
      fibonacci_weight: aiSettings.fibonacciWeight || 0.25,
      chart_patterns_weight: aiSettings.chartPatternsWeight || 0.3,
      support_resistance_weight: aiSettings.supportResistanceWeight || 0.2,

      // Gestión de riesgo
      total_capital: riskManagement.totalBalance || 10000,
      risk_percentage: riskManagement.riskPerTrade || 2,
      max_risk_amount: ((riskManagement.totalBalance || 10000) * (riskManagement.riskPerTrade || 2)) / 100,
      atr_multiplier_sl: 2.0,
      risk_reward_ratio: 2.0,

      trader_type: userSelectedStrategy,
      trader_timeframes: getSafeTimeframes(TRADING_STRATEGIES, userSelectedStrategy),
      trading_strategy: userSelectedTradingStrategy,
      strategy_timeframes: getSafeTimeframes(TRADING_STRATEGIES_ADVANCED, userSelectedTradingStrategy),
      combined_timeframes: getSafeCombinedTimeframes(),

      // Tipo de ejecución
      execution_type: selectedExecutionType || "market",
      allowed_execution_types: allowedExecutionTypes.length > 0 ? allowedExecutionTypes : ["market"],
    }

    console.log("🔄 Analizando par con valores REALES seleccionados por el usuario:", {
      pair,
      timeframe: aiSettings.analysisTimeframe,
      confluenceThreshold: aiSettings.confluenceThreshold,
      executionType: selectedExecutionType,
      allowedExecutionTypes: allowedExecutionTypes,
      traderType: userSelectedStrategy, // Valor real seleccionado
      traderTimeframes: getSafeTimeframes(TRADING_STRATEGIES, userSelectedStrategy),
      tradingStrategy: userSelectedTradingStrategy, // Valor real seleccionado
      strategyTimeframes: getSafeTimeframes(TRADING_STRATEGIES_ADVANCED, userSelectedTradingStrategy),
      combinedTimeframes: getSafeCombinedTimeframes(),
      riskManagement: {
        totalBalance: riskManagement.totalBalance,
        riskPerTrade: riskManagement.riskPerTrade,
      },
      requestBody: requestBody,
    })

    console.log("🚀 DEBUG - RequestBody completo que se enviará:", requestBody)
    console.log("🚀 DEBUG - Verificando propiedades críticas en requestBody:")
    console.log("  - requestBody.trader_type:", requestBody.trader_type)
    console.log("  - requestBody.trading_strategy:", requestBody.trading_strategy)

    try {
      const response = await api.post(`/api/signals/signals/analyze/${pair}`, requestBody)

      console.log("✅ Respuesta del análisis:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Error en análisis:", error)
      throw error
    }
  }

  const getRandomTimeframeForStrategy = (strategyKey) => {
    const strategy = TRADING_STRATEGIES.find((s) => s.key === strategyKey)
    if (!strategy || !strategy.timeframes.length) return "H1"

    const randomIndex = Math.floor(Math.random() * strategy.timeframes.length)
    return strategy.timeframes[randomIndex]
  }

  const handleExecutionTypeChange = (key) => {
    setAiSettings((prev) => ({
      ...prev,
      selectedExecutionType: key,
    }))
  }

  const handleStrategyChange = (key) => {
    const strategy = TRADING_STRATEGIES.find((s) => s.key === key)
    const randomTimeframe = getRandomTimeframeForStrategy(key)
    setAiSettings((prev) => ({
      ...prev,
      selectedStrategy: key,
      analysisTimeframe: randomTimeframe,
    }))
  }

  const handleAutoTradingToggle = () => {
    if (!isConnected) {
      showSnackbar("⚠️ Debes conectarte a MT5 antes de activar la ejecución automática", "warning")
      return
    }

    if (!riskManagement.isLocked) {
      showSnackbar("⚠️ Debes bloquear la configuración de riesgo antes de activar la ejecución automática", "warning")
      setSettingsTab(1)
      return
    }

    if (autoTradingSettings.selectedPairs.length === 0) {
      showSnackbar("⚠️ Debes seleccionar al menos un par de divisas para operar", "warning")
      return
    }

    setAutoTradingActive(!autoTradingActive)
    showSnackbar(
      autoTradingActive ? "🛑 Ejecución automática detenida" : "🚀 Ejecución automática iniciada",
      autoTradingActive ? "info" : "success",
    )
  }

  const selectedTimeZone = aiSettings.sessionsTimeZone || getSystemTimeZone()

  // Asegurar consistencia: si default no está permitido, ajustar - ACTUALIZADO
  useEffect(() => {
    if (!allowedExecutionTypes.includes(defaultExecutionType) && allowedExecutionTypes.length > 0) {
      setAiSettings((prev) => ({ ...prev, defaultExecutionType: allowedExecutionTypes[0] }))
    }
  }, [allowedExecutionTypes, defaultExecutionType, setAiSettings])

  // Función para toggle de tipos de ejecución - NUEVA

  const toggleExecutionType = (key) => {
    const isEnabled = allowedExecutionTypes.includes(key)

    if (isEnabled && allowedExecutionTypes.length === 1) {
      // No permitir deshabilitar si es el único tipo activo
      showSnackbar("⚠️ Debe tener al menos un tipo de ejecución habilitado", "warning")
      return
    }

    if (isEnabled) {
      const next = allowedExecutionTypes.filter((k) => k !== key)
      setAiSettings((prev) => ({
        ...prev,
        allowedExecutionTypes: next,
        defaultExecutionType: prev.defaultExecutionType === key ? next[0] || undefined : prev.defaultExecutionType,
      }))
    } else {
      const next = [...allowedExecutionTypes, key]
      setAiSettings((prev) => ({
        ...prev,
        allowedExecutionTypes: next,
      }))
    }
  }

  const lockRiskConfigurationServer = useCallback(async () => {
    // Construir payload con snapshot de MT5 y configuraciones avanzadas
    const payload = {
      total_capital: Number(riskManagement.totalCapital) || 0,
      risk_percentage: Number(riskManagement.riskPercentage) || 1,
      extended_risk_config: {
        maxDailyLossPercent: extendedRiskManagement.maxDailyLossPercent,
        maxWeeklyLossPercent: extendedRiskManagement.maxWeeklyLossPercent,
        maxDailyProfitPercent: extendedRiskManagement.maxDailyProfitPercent,
        maxOpenTrades: extendedRiskManagement.maxOpenTrades,
        minRRR: extendedRiskManagement.minRRR,
        maxLosingStreak: extendedRiskManagement.maxLosingStreak,
        coolDownHours: extendedRiskManagement.coolDownHours,
        riskByStrategy: extendedRiskManagement.riskByStrategy,
      },
      source: "mt5",
      mt5_snapshot: account
        ? {
            login: account.login ?? null,
            server: account.server ?? null,
            currency: account.currency ?? null,
            balance: account.balance ?? null,
            equity: account.equity ?? null,
            margin_free: account.margin_free ?? null,
          }
        : null,
    }

    setLocking(true)
    try {
      const data = await api.lockRiskConfiguration(payload)
      setRiskManagement((prev) => ({
        ...prev,
        isLocked: true,
        lockedAt: data.locked_at,
        totalCapital: Number(data.total_capital),
        riskPercentage: Number(data.risk_percentage),
      }))
      showSnackbar("✅ Configuración de riesgo completa bloqueada y guardada en tu perfil", "success")
      setSettingsTab(2) // ir a Confluencias IA
    } catch (e) {
      showSnackbar(`❌ Error al bloquear en el servidor: ${e?.message || "Error desconocido"}`, "error")
    } finally {
      setLocking(false)
    }
  }, [
    riskManagement.totalCapital,
    riskManagement.riskPercentage,
    extendedRiskManagement, // Agregar dependencia de configuraciones avanzadas
    account,
    setRiskManagement,
    showSnackbar,
  ])

  const lockRiskConfiguration = useCallback(() => {
    const confirmed = window.confirm(
      [
        "⚠️ ADVERTENCIA DE SEGURIDAD ⚠️",
        "",
        "Estás a punto de BLOQUEAR tu configuración de gestión de riesgo. Este bloqueo quedará guardado en tu perfil de usuario y no podrás cambiarlo desde la aplicación.",
        "",
        `• Capital Total (desde MT5): $${Number(riskManagement.totalCapital || 0).toLocaleString()}`,
        `• Riesgo por Operación: ${riskManagement.riskPercentage}%`,
        `• Máximo a Arriesgar: $${(
          (Number(riskManagement.totalCapital || 0) * Number(riskManagement.riskPercentage || 0)) / 100
        ).toLocaleString()}`,
        "",
        "¿Confirmas el bloqueo permanente?",
      ].join("\n"),
    )
    if (confirmed) {
      lockRiskConfigurationServer()
    }
  }, [riskManagement.totalCapital, riskManagement.riskPercentage, lockRiskConfigurationServer])

  const handleConnectMT5 = async () => {
    console.log("[v0] Iniciando conexión MT5...")
    console.log("[v0] Datos del formulario:", mt5Form)
    console.log("[v0] Usuario ID:", userId)

    if (!userId) {
      showSnackbar("❌ Error: Usuario no autenticado", "error")
      return
    }

    if (!mt5Form.login || !mt5Form.password || !mt5Form.server) {
      showSnackbar("❌ Por favor completa todos los campos requeridos", "error")
      return
    }

    setMt5State((prev) => ({ ...prev, status: "loading" }))

    try {
      const response = await api.connectMT5Account({
        login: mt5Form.login,
        password: mt5Form.password,
        server: mt5Form.server,
        account_type: mt5Form.type,
        remember: rememberSession,
      })

      console.log("[v0] Respuesta de conexión MT5:", response)

      setMt5State({
        connected: true,
        account: response,
        status: "connected",
        error: null,
        account_type: mt5Form.type,
        remember: rememberSession,
        autoReconnect: autoReconnect,
      })

      if (rememberSession) {
        try {
          await api.saveMT5Profile({
            login: mt5Form.login,
            server: mt5Form.server,
            account_type: mt5Form.type,
          })
          console.log("[v0] Perfil MT5 guardado correctamente")
        } catch (error) {
          console.error("[v0] Error guardando perfil MT5:", error)
        }
      }

      showSnackbar("✅ Conectado a MetaTrader 5 correctamente", "success")
      setSettingsTab(1) // Cambiar a pestaña de gestión de riesgo
    } catch (err) {
      console.error("[v0] Error conectando MT5:", err)
      setMt5State((prev) => ({
        ...prev,
        status: "error",
        error: err?.message || "Error desconocido",
      }))
      showSnackbar(`❌ Error al conectar MT5: ${err?.message || "Error desconocido"}`, "error")
    }
  }

  const handleDisconnectMT5 = async () => {
    if (!userId) return

    console.log("[v0] Iniciando desconexión MT5...")
    setMt5State((prev) => ({ ...prev, status: "loading" }))

    try {
      await api.disconnectMT5Account()

      // 🔹 Limpia el estado local
      setMt5State({
        connected: false,
        account: null,
        status: "idle",
        error: null,
        account_type: "demo",
        remember: false,
        autoReconnect: false,
      })

      // 🔹 Limpia el formulario
      setMt5Form({
        type: "demo",
        server: "",
        login: "",
        password: "",
      })

      clearMT5LocalStorage()
      console.log("[v0] Desconexión MT5 completada")
      showSnackbar("✅ Desconectado de MetaTrader 5", "success")

      // 🔥 Aquí notificamos al padre que no hay sesión
      if (setMt5Session) {
        setMt5Session(null)
      }
    } catch (err) {
      console.error("[v0] Error desconectando MT5:", err)
      setMt5State((prev) => ({
        ...prev,
        status: "error",
        error: err?.message || "Error desconocido",
      }))
      showSnackbar(`❌ Error al desconectar MT5: ${err?.message || "Error desconocido"}`, "error")
    }
  }
  const handleLockRiskConfig = async () => {
    if (!userId || !mt5State.connected) return

    try {
      console.log("[v0] Bloqueando configuración de riesgo...")

      await api.lockRiskConfiguration({
        total_capital: mt5State.account?.balance || 10000,
        risk_percentage: mt5Form.risk_percentage || 2,
        source: "mt5",
        mt5_snapshot: mt5State.account,
        extended_risk_config: {
          max_daily_loss: mt5Form.max_daily_loss || null,
          max_trades_per_day: mt5Form.max_trades_per_day || null,
        },
      })

      setMt5State((prev) => ({
        ...prev,
        riskLocked: true,
      }))

      showSnackbar("✅ Gestión de riesgo bloqueada correctamente", "success")
    } catch (err) {
      console.error("[v0] Error bloqueando riesgo:", err)
      showSnackbar(`❌ Error al bloquear gestión de riesgo: ${err?.message || "Error desconocido"}`, "error")
    }
  }

  const handleAutoReconnect = async () => {
    if (!userId) return

    console.log("[v0] Intentando auto-reconexión MT5...")
    setMt5State((prev) => ({ ...prev, status: "loading" }))

    try {
      const response = await api.autoConnectMT5()

      if (response.connected) {
        // Cargar información completa de la cuenta
        await loadUserMT5StateFunc()
        showSnackbar("✅ Reconectado automáticamente a MT5", "success")
      } else {
        setMt5State((prev) => ({ ...prev, status: "idle" }))
        showSnackbar("⚠️ No se pudo reconectar automáticamente", "warning")
      }
    } catch (error) {
      console.error("[v0] Error en auto-reconexión:", error)
      setMt5State((prev) => ({ ...prev, status: "error", error: error.message }))
      showSnackbar("❌ Error en auto-reconexión", "error")
    }
  }
  const handleSaveConfiguration = () => {
    if (settingsTab === 2) {
      // Pestaña de confluencias de IA - Solo configuración de IA
      handleSaveAIConfiguration()
    } else if (settingsTab === 0) {
      // Pestaña de MT5 - Solo configuración de cuenta
      const mt5Payload = {
        user_id: userId,
        login: mt5Form.login || "",
        server: mt5Form.server || "",
        account_type: mt5Form.type || "demo",
      }
      dispatch(saveMT5Profile(mt5Payload))
    }
  }
  const mapAiSettingsToBackend = (aiSettings) => {
    return {
      // Configuración básica
      timeframe: aiSettings.analysisTimeframe || "H1",
      confluence_threshold: aiSettings.confluenceThreshold ?? 0.6,
      risk_per_trade: aiSettings.riskPerTrade ?? 2.0,
      lot_size: aiSettings.lotSize ?? 0.1,
      atr_multiplier_sl: aiSettings.atrMultiplierSl ?? 2.0,
      risk_reward_ratio: aiSettings.riskRewardRatio ?? 2.0,

      // Análisis habilitados (mapear correctamente)
      enable_elliott_wave: aiSettings.enabledAnalyses?.includes("elliott_wave") ?? true,
      enable_fibonacci: aiSettings.enabledAnalyses?.includes("fibonacci") ?? true,
      enable_chart_patterns: aiSettings.enabledAnalyses?.includes("chart_patterns") ?? true,
      enable_support_resistance: aiSettings.enabledAnalyses?.includes("support_resistance") ?? true,

      // Pesos de análisis
      elliott_wave_weight: aiSettings.elliottWaveWeight ?? 0.25,
      fibonacci_weight: aiSettings.fibonacciWeight ?? 0.25,
      chart_patterns_weight: aiSettings.chartPatternsWeight ?? 0.25,
      support_resistance_weight: aiSettings.supportResistanceWeight ?? 0.25,

      // Configuración de ejecución
      execution_type: aiSettings.selectedExecutionType || "market",
      allowed_execution_types: [aiSettings.selectedExecutionType || "market"],

      // Tipos de trader y estrategias (campos correctos para el backend)
      trader_type: aiSettings.selectedStrategy || null,
      trading_strategy: aiSettings.selectedTradingStrategy || null,
      trader_timeframes: [aiSettings.analysisTimeframe || "H1"],
      strategy_timeframes: [aiSettings.analysisTimeframe || "H1"],

      // Configuración adicional
      combined_timeframes: [],
      custom_weights: {},
      risk_management_locked: false,
    }
  }

  const clearProfileFunc = async () => {
    try {
      await api.deleteMT5Profile()

      // Limpiar formulario
      setMt5Form({
        type: "demo",
        server: "",
        login: "",
        password: "",
      })

      console.log("[v0] Perfil MT5 eliminado")
      showSnackbar("✅ Perfil eliminado correctamente", "success")
    } catch (error) {
      console.error("[v0] Error eliminando perfil:", error)
      showSnackbar("❌ Error eliminando perfil", "error")
    }
  }

  const ANALYSIS_TYPES = [
    {
      key: "elliott_wave",
      label: "Elliott Wave",
      description: "Identifica ondas de impulso y corrección para predecir movimientos futuros del precio",
    },
    {
      key: "fibonacci",
      label: "Fibonacci",
      description: "Encuentra niveles de soporte/resistencia usando retrocesos y extensiones de Fibonacci",
    },
    {
      key: "chart_patterns",
      label: "Patrones de Gráfico",
      description: "Detecta formaciones como triángulos, banderas, hombro-cabeza-hombro para anticipar rupturas",
    },
    {
      key: "support_resistance",
      label: "Soporte/Resistencia",
      description: "Identifica niveles clave donde el precio históricamente rebota o se detiene",
    },
  ]

  const WEIGHT_FIELDS = [
    {
      key: "elliottWaveWeight",
      label: "Elliott Wave",
      description: "Peso del análisis de ondas Elliott en la decisión final de confluencia",
    },
    {
      key: "fibonacciWeight",
      label: "Fibonacci",
      description: "Importancia de los niveles de Fibonacci en el cálculo de confluencia",
    },
    {
      key: "chartPatternsWeight",
      label: "Patrones",
      description: "Influencia de los patrones de gráfico en la evaluación de señales",
    },
    {
      key: "supportResistanceWeight",
      label: "Soporte/Resistencia",
      description: "Peso de los niveles de soporte y resistencia en el análisis conjunto",
    },
  ]

  useEffect(() => {
    if (settingsTab === 2) {
      // Asumiendo que la pestaña 2 es confluencias de IA
      loadAIConfiguration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsTab])
  const loadAIConfiguration = async () => {
    try {
      console.log("🔄 Cargando configuración de IA...")

      const response = await api.loadAISettings()

      if (response.success && response.ai_settings) {
        console.log("✅ Configuración de IA cargada:", response.ai_settings)

        // Mapear del backend al estado local
        const backendToFrontend = {
          analysisTimeframe: response.ai_settings.timeframe || "H1",
          confluenceThreshold: response.ai_settings.confluence_threshold ?? 0.6,
          enabledAnalyses: response.ai_settings.enabled_analyses || [],
          elliottWaveWeight: response.ai_settings.elliott_wave_weight ?? 0.25,
          fibonacciWeight: response.ai_settings.fibonacci_weight ?? 0.25,
          chartPatternsWeight: response.ai_settings.chart_patterns_weight ?? 0.25,
          supportResistanceWeight: response.ai_settings.support_resistance_weight ?? 0.25,
          selectedStrategy: response.ai_settings.selected_strategy || "day_trading",
          selectedTradingStrategy: response.ai_settings.selected_trading_strategy || "maleta",
          selectedExecutionType: response.ai_settings.selected_execution_type || "market",
          allowedExecutionTypes: response.ai_settings.allowed_execution_types || ["market"],
          sessionsTimeZone: response.ai_settings.sessions_timezone || "America/New_York",
        }

        setAiSettings(backendToFrontend)
        showSnackbar("✅ Configuración de IA cargada", "success")
      } else {
        console.log("ℹ️ No hay configuración guardada, usando valores por defecto")
        // Usar configuración por defecto
      }
    } catch (error) {
      console.error("❌ Error cargando configuración de IA:", error)
      showSnackbar("❌ Error cargando configuración de IA", "error")
    }
  }

  const handleSaveAIConfiguration = async () => {
    try {
      console.log("🔄 Guardando configuración de IA específica...")
      console.log("🔍 aiSettings actuales:", aiSettings)

      // Validar que tenemos los datos necesarios
      if (!aiSettings.selectedStrategy) {
        showSnackbar("❌ Error: Debes seleccionar un Tipo de Trader", "error")
        return
      }

      if (!aiSettings.selectedTradingStrategy) {
        showSnackbar("❌ Error: Debes seleccionar una Estrategia de Trading", "error")
        return
      }

      // Validar pesos
      const totalWeights =
        (aiSettings.elliottWaveWeight || 0) +
        (aiSettings.fibonacciWeight || 0) +
        (aiSettings.chartPatternsWeight || 0) +
        (aiSettings.supportResistanceWeight || 0)

      if (Math.abs(totalWeights - 1.0) >= 0.01) {
        showSnackbar("❌ Error: Los pesos deben sumar exactamente 100%", "error")
        return
      }

      // Preparar payload solo con configuración de IA
      const aiConfigPayload = mapAiSettingsToBackend(aiSettings)

      console.log("📤 Enviando payload de IA:", aiConfigPayload)

      const response = await api.saveAISettings(aiConfigPayload)

      if (response.success) {
        console.log("✅ Configuración de IA guardada:", response.ai_settings)
        showSnackbar("✅ Configuración de IA guardada correctamente", "success")
        onClose()
      } else {
        showSnackbar("❌ Error guardando configuración de IA", "error")
      }
    } catch (error) {
      console.error("❌ Error guardando configuración de IA:", error)
      showSnackbar("❌ Error guardando configuración de IA", "error")
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "rgba(0,0,0,0.95)",
          border: "1px solid rgba(0,255,255,0.3)",
          color: "#ffffff",
          minHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "rgba(0,255,255,0.1)",
          borderBottom: "1px solid rgba(0,255,255,0.2)",
          color: "#00ffff",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Settings />
        {"⚙️ Configuración Avanzada"}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: "rgba(0,255,255,0.2)" }}>
          <Tabs
            value={settingsTab}
            onChange={(e, newValue) => setSettingsTab(newValue)}
            sx={{
              "& .MuiTab-root": { color: "rgba(255,255,255,0.7)" },
              "& .Mui-selected": { color: "#00ffff !important" },
              "& .MuiTabs-indicator": { backgroundColor: "#00ffff" },
            }}
          >
            <Tab
              icon={<Settings />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {"Cuenta MT5"}
                  {isConnected && (
                    <Chip label="Activo" size="small" sx={{ ml: 1, height: 18, bgcolor: "#00ff88", color: "#000" }} />
                  )}
                </Box>
              }
            />
            <Tab
              icon={<Shield />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {"Gestión de Riesgo"}
                  {riskManagement.isLocked && (
                    <Chip label="Activo" size="small" sx={{ ml: 1, height: 18, bgcolor: "#00ff88", color: "#000" }} />
                  )}
                </Box>
              }
            />
            <Tab
              icon={<Psychology />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {"Confluencias IA"}
                  {aiSettings && Object.keys(aiSettings).length > 0 && (
                    <Chip label="Activo" size="small" sx={{ ml: 1, height: 18, bgcolor: "#00ff88", color: "#000" }} />
                  )}
                </Box>
              }
            />
            <Tab
              icon={<PlayArrow />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {"Ejecución Automática"}
                  {autoTradingActive && (
                    <Chip label="Activo" size="small" sx={{ ml: 1, height: 18, bgcolor: "#00ff88", color: "#000" }} />
                  )}
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* PESTAÑA 0: CUENTA MT5 */}
        {settingsTab === 0 && (
          <MT5AccountTab
            mt5Form={mt5Form}
            setMt5Form={setMt5Form}
            mt5State={mt5State}
            rememberSession={rememberSession}
            setRememberSession={setRememberSession}
            autoReconnect={autoReconnect}
            setAutoReconnectLocal={setAutoReconnectLocal}
            handleConnectMT5={handleConnectMT5}
            handleDisconnectMT5={handleDisconnectMT5}
            loadUserMT5StateFunc={loadUserMT5StateFunc}
            clearProfileFunc={clearProfileFunc}
            userId={userId}
          />
        )}

        {/* PESTAÑA 1: GESTIÓN DE RIESGO */}
        {settingsTab === 1 && (
          <RiskManagementTab
            riskManagement={riskManagement}
            setRiskManagement={setRiskManagement}
            extendedRiskManagement={extendedRiskManagement}
            setExtendedRiskManagement={setExtendedRiskManagement}
            handleLockRiskConfig={handleLockRiskConfig}
            mt5State={mt5State}
            isConnected={isConnected}
            account={account}
          />
        )}

        {/* PESTAÑA 2: CONFLUENCIAS IA */}
        {settingsTab === 2 && (
          <AIConfluencesTab
            aiSettings={aiSettings}
            setAiSettings={setAiSettings}
            selectedStrategy={selectedStrategy}
            handleStrategyChange={handleStrategyChange}
            selectedExecutionType={selectedExecutionType}
            handleExecutionTypeChange={handleExecutionTypeChange}
            handleSaveAIConfiguration={handleSaveAIConfiguration}
            getCombinedTimeframes={getCombinedTimeframes}
            weightsValid={weightsValid}
            totalWeights={totalWeights}
          />
        )}

        {/* PESTAÑA 3: EJECUCIÓN AUTOMÁTICA */}
        {settingsTab === 3 && (
          <Box sx={{ p: 3 }}>
            <AutoTradingComponent
              autoTradingActive={autoTradingActive}
              autoTradingSettings={autoTradingSettings}
              isConnected={isConnected}
              riskManagement={riskManagement}
              selectedTimeZone={selectedTimeZone}
              onAutoTradingToggle={handleAutoTradingToggle}
              onSettingsChange={setAutoTradingSettings}
              showSnackbar={showSnackbar}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: "1px solid rgba(0,255,255,0.2)" }}>
        <Button onClick={onClose} sx={{ color: "#ffffff" }}>
          {"Cancelar"}
        </Button>
        <Button
          onClick={() => {
            if (settingsTab === 2) {
              // Solo para la pestaña de confluencias de IA
              handleSaveAIConfiguration()
            } else {
              // Para otras pestañas, mantener la lógica original
              try {
                const userId = localStorage.getItem("userId")

                const payload = {
                  user_id: userId,
                  login: mt5Form.login || "",
                  server: mt5Form.server || "",
                  account_type: mt5Form.type || "demo",
                  ai_settings: mapAiSettingsToBackend(aiSettings),
                }

                console.log("🔍 Payload enviado al back:", payload)
                console.log("🔍 Payload enviado al back:", JSON.stringify(payload, null, 2))
                dispatch(saveMT5Profile(payload))

                showSnackbar("✅ Configuración guardada correctamente", "success")
                onClose()
              } catch (err) {
                console.error("❌ Error construyendo payload:", err)
              }
            }
          }}
        >
          {settingsTab === 2 ? "Guardar Configuración de IA" : "Guardar Configuración"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog
