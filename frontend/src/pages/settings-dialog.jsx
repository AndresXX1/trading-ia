/* eslint-disable no-unused-vars */
"use client"
import { useState, useCallback, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Divider,
  Tabs,
  Tab,
  LinearProgress,
} from "@mui/material"
import {
  Settings,
  Shield,
  Lock,
  Psychology,
  PlayArrow,
  AccountBalanceWallet,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Sync as SyncIcon,
} from "@mui/icons-material"
import { saveMT5Profile, setAutoReconnect, setRemember } from "../features/auth/mt5-slice"
import api from "../api/index"
import AutoTradingComponent from "./automatic-execution"
import { clearMT5LocalStorage } from "../utils/clear-mt5-storage"

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
  const [accountData, setAccountData] = useState(mt5Session);
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
    setAccountData(mt5Session);
  }, [mt5Session]);

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
  account: statusResponse.connected ? statusResponse : prev.account,  // ✅ mantiene la cuenta previa
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
  connected: prev.connected,   // ✅ no forzar a false
  status: prev.status,         // ✅ mantiene el estado previo
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
  if (!userId || !mt5State.connected) return;

  try {
    console.log("[v0] Bloqueando configuración de riesgo...");

    await api.lockRiskConfiguration({
      total_capital: mt5State.account?.balance || 10000,
      risk_percentage: mt5Form.risk_percentage || 2,
      source: "mt5",
      mt5_snapshot: mt5State.account,
      extended_risk_config: {
        max_daily_loss: mt5Form.max_daily_loss || null,
        max_trades_per_day: mt5Form.max_trades_per_day || null,
      },
    });

    setMt5State((prev) => ({
      ...prev,
      riskLocked: true,
    }));

    showSnackbar("✅ Gestión de riesgo bloqueada correctamente", "success");
  } catch (err) {
    console.error("[v0] Error bloqueando riesgo:", err);
    showSnackbar(`❌ Error al bloquear gestión de riesgo: ${err?.message || "Error desconocido"}`, "error");
  }
};

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
  const userId = localStorage.getItem("userId") // 👈 obtenemos el id del usuario desde localStorage

  if (!userId) {
    console.error("❌ No se encontró userId en localStorage")
    showSnackbar("❌ Error: usuario no identificado", "error")
    return
  }

  const payload = {
    user_id: userId,               // 🔹 ahora sí va en el body
    login: mt5Form.login || "",
    server: mt5Form.server || "",
    account_type: mt5Form.type || "demo",
    ai_settings: aiSettings || {}, // toda la config de IA
  }

  console.log("📤 Guardando configuración completa:", payload)

  dispatch(saveMT5Profile(payload))
    .unwrap()
    .then(() => {
      showSnackbar("✅ Configuración guardada correctamente", "success")
      onClose()
    })
    .catch((err) => {
      console.error("❌ Error guardando configuración:", err)
      showSnackbar("❌ Error guardando configuración", "error")
    })
}

const mapAiSettingsToBackend = (settings) => ({
  // Timeframe
  timeframe: settings.analysisTimeframe || "H1",

  // Confluencia y riesgo
  confluence_threshold: settings.confluenceThreshold ?? 0.6,
  risk_per_trade: settings.riskPerTrade ?? 2.0,
  lot_size: settings.lotSize ?? 0.1,
  atr_multiplier_sl: settings.atrMultiplierSl ?? 2.0,
  risk_reward_ratio: settings.riskRewardRatio ?? 2.0,

  // Activar/desactivar análisis (basado en tu array `enabledAnalyses`)
  enable_elliott_wave: settings.enabledAnalyses?.includes("elliott_wave") ?? false,
  enable_fibonacci: settings.enabledAnalyses?.includes("fibonacci") ?? false,
  enable_chart_patterns: settings.enabledAnalyses?.includes("chart_patterns") ?? false,
  enable_support_resistance: settings.enabledAnalyses?.includes("support_resistance") ?? false,

  // Pesos
  elliott_wave_weight: settings.elliottWaveWeight ?? 0.25,
  fibonacci_weight: settings.fibonacciWeight ?? 0.25,
  chart_patterns_weight: settings.chartPatternsWeight ?? 0.25,
  support_resistance_weight: settings.supportResistanceWeight ?? 0.25,

  // Config por defecto (si aún no la manejas en el frontend)
  trader_type: settings.traderType || null,
  trader_timeframes: settings.traderTimeframes || ["H1"],
  trading_strategy: settings.tradingStrategy || null,
  strategy_timeframes: settings.strategyTimeframes || ["H1"],
  execution_type: settings.executionType || "market",
  allowed_execution_types: settings.allowedExecutionTypes || ["market"],
  combined_timeframes: settings.combinedTimeframes || [],
  custom_weights: settings.customWeights || {},
  risk_management_locked: settings.riskManagementLocked ?? false,
})

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,255,255,0.3)",
          minHeight: "70vh",
        },
      }}
    >
      <DialogTitle sx={{ color: "#00ffff", borderBottom: "1px solid rgba(0,255,255,0.2)" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Settings sx={{ mr: 1 }} />
            {"Configuración de Trading Profesional"}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {riskManagement.isLocked && (
              <Chip
                label="🔒 RIESGO BLOQUEADO"
                sx={{
                  backgroundColor: "#00ff88",
                  color: "#000000",
                  fontWeight: "bold",
                }}
              />
            )}
            {autoTradingActive && (
              <Chip
                label="🚀 AUTO-TRADING ACTIVO"
                sx={{
                  backgroundColor: "#ff6b6b",
                  color: "#ffffff",
                  fontWeight: "bold",
                  animation: "pulse 2s infinite",
                }}
              />
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Pestañas */}
        <Box sx={{ borderBottom: 1, borderColor: "rgba(0,255,255,0.2)" }}>
          <Tabs
            value={settingsTab}
            onChange={(e, newValue) => setSettingsTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                color: "rgba(255,255,255,0.7)",
                "&.Mui-selected": {
                  color: "#00ffff",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#00ffff",
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountBalanceWallet />
                  {"Cuenta MT5"}
                  {isConnected && (
                    <Chip
                      label="Conectado"
                      size="small"
                      sx={{ ml: 1, height: 18, bgcolor: "#00ff88", color: "#000" }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Shield />
                  {"Gestión de Riesgo"}
                  {riskManagement.isLocked && <Lock sx={{ fontSize: 16 }} />}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Psychology />
                  {"Confluencias IA"}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PlayArrow />
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
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Card
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(0,255,255,0.2)",
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    {"🔌 Conexión a MetaTrader 5"}
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
                    {"Conecta tu cuenta MT5 (Demo o Real). Los datos se cargan automáticamente al abrir esta ventana."}
                  </Alert>

                  {connectStatus === "loading" && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: "#00ffff", mb: 1 }}>
                        Cargando datos MT5...
                      </Typography>
                      <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#00ffff" } }} />
                    </Box>
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={rememberSession}
                        onChange={(e) => setRememberSession(e.target.checked)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                        }}
                      />
                    }
                    label="Recordar perfil (sin contraseña)"
                    sx={{ color: "#ffffff", mb: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoReconnect}
                        onChange={(e) => setAutoReconnectLocal(e.target.checked)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                        }}
                      />
                    }
                    label="Auto reconectar al abrir"
                    sx={{ color: "#ffffff", mb: 2 }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: "#00ffff" }}>{"Tipo de Cuenta"}</InputLabel>
                    <Select
                      value={mt5Form.type}
                      onChange={(e) => setMt5Form((prev) => ({ ...prev, type: e.target.value }))}
                      sx={{ color: "#ffffff" }}
                    >
                      <MenuItem value="demo">{"Demo"}</MenuItem>
                      <MenuItem value="real">{"Real"}</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Servidor (ej: Broker-Demo/Real)"
                    value={mt5Form.server}
                    onChange={(e) => {
                      console.log("[v0] Server value changed:", e.target.value)
                      setMt5Form((prev) => ({ ...prev, server: e.target.value }))
                    }}
                    sx={{
                      mb: 2,
                      "& .MuiInputLabel-root": { color: "#00ffff" },
                      "& .MuiOutlinedInput-root": { color: "#ffffff" },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Login (Número de Cuenta)"
                    type="text"
                    value={mt5Form.login}
                    onChange={(e) => {
                      console.log("[v0] Login value changed:", e.target.value)
                      setMt5Form((prev) => ({ ...prev, login: e.target.value }))
                    }}
                    sx={{
                      mb: 2,
                      "& .MuiInputLabel-root": { color: "#00ffff" },
                      "& .MuiOutlinedInput-root": { color: "#ffffff" },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Contraseña"
                    type="password"
                    value={mt5Form.password}
                    onChange={(e) => {
                      console.log("[v0] Password value changed:", e.target.value ? "***" : "empty")
                      setMt5Form((prev) => ({ ...prev, password: e.target.value }))
                    }}
                    sx={{
                      mb: 2,
                      "& .MuiInputLabel-root": { color: "#00ffff" },
                      "& .MuiOutlinedInput-root": { color: "#ffffff" },
                    }}
                  />
                  {connectStatus === "loading" && (
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#00ffff" } }} />
                    </Box>
                  )}
                  {connectError && (
                    <Alert
                      severity="error"
                      sx={{
                        mb: 2,
                        backgroundColor: "rgba(244,67,54,0.1)",
                        color: "#ffffff",
                        border: "1px solid rgba(244,67,54,0.3)",
                      }}
                    >
                      {connectError}
                    </Alert>
                  )}
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConnectMT5}
                      disabled={
                        connectStatus === "loading" || !mt5Form.login || !mt5Form.password || !mt5Form.server || !userId
                      }
                      startIcon={connectStatus === "loading" ? <SyncIcon /> : <LoginIcon />}
                      sx={{ minWidth: 140 }}
                    >
                      {connectStatus === "loading" ? "Conectando..." : "Conectar"}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={() => loadUserMT5StateFunc()}
                      disabled={connectStatus === "loading"}
                      startIcon={<SyncIcon />}
                      sx={{
                        borderColor: "#00ffff",
                        color: "#00ffff",
                        "&:hover": { borderColor: "#00cccc", backgroundColor: "rgba(0,255,255,0.1)" },
                      }}
                    >
                      {"Actualizar cuenta"}
                    </Button>

                    {/* <Button
                      variant="outlined"
                      onClick={handleAutoReconnect}
                      disabled={connectStatus === "loading" || isConnected}
                      startIcon={<SyncIcon />}
                      sx={{
                        borderColor: "#00ff88",
                        color: "#00ff88",
                        "&:hover": { borderColor: "#00cc66", backgroundColor: "rgba(0,255,136,0.1)" },
                      }}
                    >
                      {"Auto-reconectar"}
                    </Button> */}

                    <Button
                      variant="text"
                      onClick={handleDisconnectMT5}
                      disabled={!isConnected}
                      startIcon={<LogoutIcon />}
                      sx={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {"Desconectar"}
                    </Button>

                    <Button variant="text" onClick={clearProfileFunc} sx={{ color: "rgba(255,255,255,0.7)" }}>
                      {"Eliminar perfil guardado"}
                    </Button>
                  </Box>

                  <Box sx={{ mt: 2, p: 1, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: "#666", display: "block" }}>
                      Debug: Server: {mt5Form.server ? "✓" : "✗"} | Login: {mt5Form.login ? "✓" : "✗"} | Password:{" "}
                      {mt5Form.password ? "✓" : "✗"} | User: {userId ? "✓" : "✗"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#666", display: "block" }}>
                      Estado: {connectStatus} | Conectado: {isConnected ? "Sí" : "No"} | Tipo: {mt5State.account_type}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              <Grid item xs={12} md={7}>
                <Card
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(0,255,255,0.2)",
                    p: 2,
                    height: "100%",
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    {"💳 Información de Cuenta"}
                  </Typography>
                  {!isConnected ? (
                    <Box
                      sx={{
                        py: 6,
                        textAlign: "center",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <AccountBalanceWallet sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
                      <Typography>{"Conéctate a una cuenta MT5 para ver tu saldo y detalles."}</Typography>
                    </Box>
                  ) : account ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
                      <Card sx={{ p: 2, background: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Saldo"}
                        </Typography>
                        <Typography variant="h5" sx={{ color: "#00ff88", fontWeight: "bold" }}>
                          {account.currency ? `${account.currency} ` : "$"}
                          {Number(account.balance ?? 0).toLocaleString()}
                        </Typography>
                      </Card>
                      <Card sx={{ p: 2, background: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Equidad"}
                        </Typography>
                        <Typography variant="h5" sx={{ color: "#00ffff", fontWeight: "bold" }}>
                          {account.currency ? `${account.currency} ` : "$"}
                          {Number(account.equity ?? 0).toLocaleString()}
                        </Typography>
                      </Card>
                      <Card
                        sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Margen Libre"}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {account.currency ? `${account.currency} ` : "$"}
                          {Number(account.margin_free ?? 0).toLocaleString()}
                        </Typography>
                      </Card>
                      <Card
                        sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Servidor"}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {account.server || "N/D"}
                        </Typography>
                      </Card>
                      <Card
                        sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Login"}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {account.login || "N/D"}
                        </Typography>
                      </Card>
                      <Card
                        sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Tipo"}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {(account.account_type || "demo").toUpperCase()}
                        </Typography>
                      </Card>
                    </Box>
                  ) : (
                    <Box sx={{ py: 4 }}>
                      <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#00ffff" } }} />
                    </Box>
                  )}
                  <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.1)" }} />
                  {/* Capital fijado automáticamente desde Saldo MT5 */}
                  {isConnected && account?.balance != null && (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      <Chip
                        label={`Capital fijado automáticamente: ${
                          account.currency ? account.currency + " " : "$"
                        }${Number(account.balance).toLocaleString()}`}
                        size="small"
                        sx={{ bgcolor: "rgba(0,255,255,0.15)", color: "#00ffff" }}
                      />
                    </Box>
                  )}
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* PESTAÑA 1: GESTIÓN DE RIESGO */}
        {settingsTab === 1 && (
          <Box sx={{ p: 3 }}>
            {isConnected && (
              <Alert
                severity="success"
                sx={{
                  mb: 3,
                  backgroundColor: "rgba(76,175,80,0.15)",
                  border: "1px solid rgba(76,175,80,0.35)",
                  color: "#ffffff",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountBalanceWallet />
                  <Typography variant="body2">
                    {`Conectado a MT5 (${(account?.account_type || "demo").toUpperCase()}) • Saldo: ${
                      account?.currency ? account.currency + " " : "$"
                    }${Number(account?.balance ?? 0).toLocaleString()}`}
                  </Typography>
                </Box>
              </Alert>
            )}
            <Alert
              severity="warning"
              sx={{
                mb: 3,
                backgroundColor: "rgba(255,193,7,0.1)",
                border: "1px solid rgba(255,193,7,0.3)",
                color: "#ffffff",
              }}
            >
              <Typography variant="body2">
                <strong>{"⚠️ IMPORTANTE:"}</strong>{" "}
                {
                  "Todas las configuraciones de gestión de riesgo se bloquearán juntas. Al confirmar, se guardará en tu perfil y no podrás modificarlas luego."
                }
              </Typography>
            </Alert>

            <Card
              sx={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(0,255,255,0.2)",
                p: 3,
              }}
            >
              <Typography variant="h6" sx={{ color: "#00ffff", mb: 3 }}>
                {"💰 Configuración Completa de Gestión de Riesgo"}
              </Typography>

              <Grid container spacing={4}>
                {/* Configuración Básica - Ahora más compacta */}
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" sx={{ color: "#00ff88", mb: 3, fontWeight: "bold" }}>
                    {"📊 Configuración Básica"}
                  </Typography>

                  <TextField
                    fullWidth
                    label="Capital Total (USD)"
                    type="number"
                    value={riskManagement.totalCapital}
                    disabled
                    sx={{
                      mb: 3,
                      "& .MuiInputLabel-root": { color: "#00ffff" },
                      "& .MuiOutlinedInput-root": { color: "#ffffff" },
                    }}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Typography sx={{ color: "#00ffff", mr: 1 }}>$</Typography>,
                    }}
                    helperText="Fijado automáticamente por saldo MT5"
                  />

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: "#00ffff" }}>{"Riesgo por Operación"}</InputLabel>
                    <Select
                      value={riskManagement.riskPercentage}
                      onChange={(e) =>
                        setRiskManagement((prev) => ({
                          ...prev,
                          riskPercentage: Number(e.target.value),
                        }))
                      }
                      disabled={riskManagement.isLocked}
                      sx={{
                        color: riskManagement.isLocked ? "rgba(255,255,255,0.5)" : "#ffffff",
                      }}
                    >
                      <MenuItem value={1}>{"1% - Muy Conservador"}</MenuItem>
                      <MenuItem value={2}>{"2% - Balanceado"}</MenuItem>
                      <MenuItem value={3}>{"3% - Agresivo (Máximo)"}</MenuItem>
                    </Select>
                  </FormControl>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: "rgba(0,255,255,0.1)",
                      borderRadius: 1,
                      border: "1px solid rgba(0,255,255,0.3)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "#00ffff", mb: 2, fontWeight: "bold", textAlign: "center" }}
                    >
                      💰 Resumen Principal
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: "center", mb: 1 }}>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                            Capital Total
                          </Typography>
                          <Typography variant="h6" sx={{ color: "#00ffff", fontWeight: "bold" }}>
                            ${riskManagement.totalCapital.toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                            Riesgo
                          </Typography>
                          <Typography variant="h6" sx={{ color: "#ff6b6b", fontWeight: "bold" }}>
                            {riskManagement.riskPercentage}%
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                            Máximo
                          </Typography>
                          <Typography variant="h6" sx={{ color: "#00ff88", fontWeight: "bold" }}>
                            ${((riskManagement.totalCapital * riskManagement.riskPercentage) / 100).toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle1" sx={{ color: "#ff6b6b", mb: 3, fontWeight: "bold" }}>
                    {"⚠️ Configuración Avanzada"}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: "#ffc107", mb: 2, fontWeight: "bold" }}>
                      📈 Límites Diarios y Semanales
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Pérdida máxima diaria (%)"
                          type="number"
                          value={extendedRiskManagement.maxDailyLossPercent}
                          onChange={(e) =>
                            setExtendedRiskManagement((prev) => ({
                              ...prev,
                              maxDailyLossPercent: Number(e.target.value),
                            }))
                          }
                          disabled={riskManagement.isLocked}
                          sx={{
                            "& .MuiInputLabel-root": { color: "#00ffff" },
                            "& .MuiOutlinedInput-root": { color: "#ffffff" },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Pérdida máxima semanal (%)"
                          type="number"
                          value={extendedRiskManagement.maxWeeklyLossPercent}
                          onChange={(e) =>
                            setExtendedRiskManagement((prev) => ({
                              ...prev,
                              maxWeeklyLossPercent: Number(e.target.value),
                            }))
                          }
                          disabled={riskManagement.isLocked}
                          sx={{
                            "& .MuiInputLabel-root": { color: "#00ffff" },
                            "& .MuiOutlinedInput-root": { color: "#ffffff" },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Ganancia máxima diaria (%)"
                          type="number"
                          value={extendedRiskManagement.maxDailyProfitPercent}
                          onChange={(e) =>
                            setExtendedRiskManagement((prev) => ({
                              ...prev,
                              maxDailyProfitPercent: Number(e.target.value),
                            }))
                          }
                          disabled={riskManagement.isLocked}
                          sx={{
                            "& .MuiInputLabel-root": { color: "#00ffff" },
                            "& .MuiOutlinedInput-root": { color: "#ffffff" },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ color: "#9c27b0", mb: 2, fontWeight: "bold" }}>
                      🎯 Límites de Operaciones
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Máximo operaciones abiertas"
                          type="number"
                          value={extendedRiskManagement.maxOpenTrades}
                          onChange={(e) =>
                            setExtendedRiskManagement((prev) => ({ ...prev, maxOpenTrades: Number(e.target.value) }))
                          }
                          disabled={riskManagement.isLocked}
                          sx={{
                            "& .MuiInputLabel-root": { color: "#00ffff" },
                            "& .MuiOutlinedInput-root": { color: "#ffffff" },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Relación R:R mínima"
                          type="number"
                          value={extendedRiskManagement.minRRR}
                          onChange={(e) =>
                            setExtendedRiskManagement((prev) => ({ ...prev, minRRR: Number(e.target.value) }))
                          }
                          disabled={riskManagement.isLocked}
                          sx={{
                            "& .MuiInputLabel-root": { color: "#00ffff" },
                            "& .MuiOutlinedInput-root": { color: "#ffffff" },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ color: "#f44336", mb: 2, fontWeight: "bold" }}>
                      🛡️ Protección de Capital
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Racha máxima de pérdidas"
                          type="number"
                          value={extendedRiskManagement.maxLosingStreak}
                          onChange={(e) =>
                            setExtendedRiskManagement((prev) => ({ ...prev, maxLosingStreak: Number(e.target.value) }))
                          }
                          disabled={riskManagement.isLocked}
                          sx={{
                            "& .MuiInputLabel-root": { color: "#00ffff" },
                            "& .MuiOutlinedInput-root": { color: "#ffffff" },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                      {!riskManagement.isLocked && (
                        <Button style={{marginbutton: 2}}
                          variant="contained"
                          color="primary"
                          fullWidth
                          onClick={handleLockRiskConfig}
                          disabled={!mt5State.connected}
                        >
                          Bloquear Gestión de Riesgo
                        </Button>
                      )}

                      {riskManagement.isLocked && (
                        <Typography
                          variant="body1"
                          color="success.main"
                          align="center"
                          sx={{ mt: 2 }}
                        >
                          🔒 Gestión de riesgo bloqueada
                        </Typography>
                      )}
                  <Box sx={{ mt: 2, p: 3, backgroundColor: "rgba(0,255,136,0.1)", borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ color: "#00ff88", mb: 3, fontWeight: "bold", textAlign: "center" }}>
                      📊 Resumen Detallado de Configuración
                    </Typography>

                    <Grid container spacing={3}>
                      {/* Cálculos de Trading */}
                      <Grid item xs={12} md={4}>
                        <Box
                          sx={{
                            p: 2,
                            backgroundColor: "rgba(255,193,7,0.1)",
                            borderRadius: 1,
                            border: "1px solid rgba(255,193,7,0.3)",
                            height: "100%",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ color: "#ffc107", mb: 2, fontWeight: "bold", textAlign: "center" }}
                          >
                            📈 Cálculos de Trading
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  Lote Calculado
                                </Typography>
                                <Typography variant="h6" sx={{ color: "#ffc107", fontWeight: "bold" }}>
                                  {(
                                    (riskManagement.totalCapital * riskManagement.riskPercentage) /
                                    100 /
                                    100 /
                                    10
                                  ).toFixed(2)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  R:R Mínima
                                </Typography>
                                <Typography variant="h6" sx={{ color: "#ffc107", fontWeight: "bold" }}>
                                  1:{extendedRiskManagement.minRRR}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>

                      {/* Límites Temporales */}
                      <Grid item xs={12} md={4}>
                        <Box
                          sx={{
                            p: 2,
                            backgroundColor: "rgba(156,39,176,0.1)",
                            borderRadius: 1,
                            border: "1px solid rgba(156,39,176,0.3)",
                            height: "100%",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ color: "#9c27b0", mb: 2, fontWeight: "bold", textAlign: "center" }}
                          >
                            ⏰ Límites Temporales
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  Pérd. Máx. Diaria
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#ff6b6b", fontWeight: "bold" }}>
                                  {extendedRiskManagement.maxDailyLossPercent}%
                                </Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                  $
                                  {(
                                    (riskManagement.totalCapital * extendedRiskManagement.maxDailyLossPercent) /
                                    100
                                  ).toLocaleString()}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  Pérd. Máx. Semanal
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#ff6b6b", fontWeight: "bold" }}>
                                  {extendedRiskManagement.maxWeeklyLossPercent}%
                                </Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                  $
                                  {(
                                    (riskManagement.totalCapital * extendedRiskManagement.maxWeeklyLossPercent) /
                                    100
                                  ).toLocaleString()}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12}>
                              <Box sx={{ textAlign: "center", mt: 1 }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  Ganancia Máx. Diaria
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#00ff88", fontWeight: "bold" }}>
                                  {extendedRiskManagement.maxDailyProfitPercent}% • $
                                  {(
                                    (riskManagement.totalCapital * extendedRiskManagement.maxDailyProfitPercent) /
                                    100
                                  ).toLocaleString()}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>

                      {/* Protección de Capital */}
                      <Grid item xs={12} md={4}>
                        <Box
                          sx={{
                            p: 2,
                            backgroundColor: "rgba(244,67,54,0.1)",
                            borderRadius: 1,
                            border: "1px solid rgba(244,67,54,0.3)",
                            height: "100%",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ color: "#f44336", mb: 2, fontWeight: "bold", textAlign: "center" }}
                          >
                            🛡️ Protección de Capital
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  Racha Máx. de Pérdidas
                                </Typography>
                                <Typography variant="h6" sx={{ color: "#f44336", fontWeight: "bold" }}>
                                  {extendedRiskManagement.maxLosingStreak}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                  operaciones consecutivas
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
                                  Estado de Configuración
                                </Typography>
                                <Typography
                                  variant="h6"
                                  sx={{ color: riskManagement.isLocked ? "#00ff88" : "#ffc107", fontWeight: "bold" }}
                                >
                                  {riskManagement.isLocked ? "🔒 Bloqueada" : "🔓 Editable"}
                                </Typography>
                                {riskManagement.isLocked && riskManagement.lockedAt && (
                                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                                    desde {new Date(riskManagement.lockedAt).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Box>
        )}

       {/* PESTAÑA 2: CONFLUENCIAS IA - COMPLETA */}
{settingsTab === 2 && (
  <Box sx={{ p: 3 }}>
    {/* Sección Tipo de Trader */}
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(0,255,255,0.2)",
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
        {"👤 Tipo de Trader"}
      </Typography>

      <Alert severity="info" sx={{ mb: 3, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
        <Typography variant="body2">
          {"Selecciona tu tipo de trader. Esto determinará automáticamente las temporalidades disponibles y seleccionará una aleatoriamente para el análisis."}
        </Typography>
      </Alert>

      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "rgba(0,255,136,0.1)",
          borderRadius: 1,
          border: "1px solid rgba(0,255,136,0.3)",
        }}
      >
        <Typography variant="body2" sx={{ color: "#00ff88", fontWeight: "bold", mb: 1 }}>
          {"Tipo Seleccionado:"}
        </Typography>
        <Chip
          label={TRADING_STRATEGIES.find((s) => s.key === selectedStrategy)?.label || "Day Trading"}
          sx={{ backgroundColor: "#00ff88", color: "#000000", fontWeight: "bold", mr: 2 }}
        />
        <Chip
          label={`Temporalidad: ${aiSettings.analysisTimeframe || "H1"} (Auto-seleccionada)`}
          sx={{ backgroundColor: "rgba(0,255,255,0.7)", color: "#000000", fontWeight: "bold" }}
        />
      </Box>

      <Grid container spacing={2}>
        {TRADING_STRATEGIES.map((strategy) => (
          <Grid item xs={12} md={6} key={strategy.key}>
            <Card
              sx={{
                p: 2.5,
                height: "100%",
                backgroundColor:
                  selectedStrategy === strategy.key ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.02)",
                border:
                  selectedStrategy === strategy.key
                    ? "2px solid rgba(0,255,136,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(0,255,255,0.08)",
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => handleStrategyChange(strategy.key)}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: selectedStrategy === strategy.key ? "#00ff88" : "rgba(255,255,255,0.5)",
                    backgroundColor: selectedStrategy === strategy.key ? "#00ff88" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 0.5,
                    transition: "all 0.2s ease",
                  }}
                >
                  {selectedStrategy === strategy.key && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#000000",
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold", mb: 1 }}>
                    {strategy.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.4, mb: 2 }}>
                    {strategy.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                    <Chip
                      label={`Riesgo: ${strategy.riskLevel}`}
                      size="small"
                      sx={{
                        backgroundColor:
                          strategy.riskLevel === "Alto"
                            ? "rgba(255,107,107,0.2)"
                            : strategy.riskLevel === "Medio-Alto"
                            ? "rgba(255,193,7,0.2)"
                            : strategy.riskLevel === "Medio"
                            ? "rgba(33,150,243,0.2)"
                            : "rgba(76,175,80,0.2)",
                        color: "#ffffff",
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    {"Temporalidades disponibles: " + strategy.timeframes.join(", ")}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Card>

    {/* Estrategias Avanzadas */}
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,165,0,0.2)",
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: "#ffa500", display: "flex", alignItems: "center", gap: 1 }}>
        {"📊 Estrategias de Trading"}
      </Typography>

      <Alert severity="info" sx={{ mb: 3, backgroundColor: "rgba(255,165,0,0.1)", color: "#ffffff" }}>
        <Typography variant="body2">
          {"Selecciona la estrategia de trading específica que deseas utilizar. Cada estrategia tiene sus propias características y temporalidades recomendadas."}
        </Typography>
      </Alert>

      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "rgba(255,165,0,0.1)",
          borderRadius: 1,
          border: "1px solid rgba(255,165,0,0.3)",
        }}
      >
        <Typography variant="body2" sx={{ color: "#ffa500", fontWeight: "bold", mb: 1 }}>
          {"Estrategia Seleccionada:"}
        </Typography>
        <Chip
          label={TRADING_STRATEGIES_ADVANCED.find((s) => s.key === (aiSettings.selectedTradingStrategy || "maleta"))?.label || "Estrategia Maleta"}
          sx={{ backgroundColor: "#ffa500", color: "#000000", fontWeight: "bold", mr: 2 }}
        />
        <Chip
          label={`Temporalidades: ${TRADING_STRATEGIES_ADVANCED.find((s) => s.key === (aiSettings.selectedTradingStrategy || "maleta"))?.timeframes.join(", ") || "M15, M30, H1, H4"}`}
          sx={{ backgroundColor: "rgba(255,165,0,0.7)", color: "#000000", fontWeight: "bold" }}
        />
      </Box>

      <Grid container spacing={2}>
        {TRADING_STRATEGIES_ADVANCED.map((strategy) => (
          <Grid item xs={12} md={6} key={strategy.key}>
            <Card
              sx={{
                p: 2.5,
                height: "100%",
                backgroundColor:
                  (aiSettings.selectedTradingStrategy || "maleta") === strategy.key
                    ? "rgba(255,165,0,0.15)"
                    : "rgba(255,255,255,0.02)",
                border:
                  (aiSettings.selectedTradingStrategy || "maleta") === strategy.key
                    ? "2px solid rgba(255,165,0,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(255,165,0,0.08)",
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => {
                setAiSettings((prev) => ({
                  ...prev,
                  selectedTradingStrategy: strategy.key,
                }))
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Typography variant="h4" sx={{ fontSize: "2rem" }}>
                  {strategy.icon}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ color: "#ffffff", mb: 1, fontWeight: "bold" }}>
                    {strategy.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#cccccc", mb: 2, lineHeight: 1.4 }}>
                    {strategy.description}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {strategy.timeframes.map((tf) => (
                      <Chip
                        key={tf}
                        label={tf}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255,165,0,0.2)",
                          color: "#ffa500",
                          fontSize: "0.7rem",
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Card>

    {/* Configuración General de Confluencias */}
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(0,255,255,0.2)",
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
        {"🎯 Configuración General de Confluencias"}
      </Typography>

      <Alert severity="info" sx={{ mb: 3, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
        <Typography variant="body2">
          {`Selecciona la temporalidad de análisis de las opciones combinadas disponibles para ${TRADING_STRATEGIES.find((s) => s.key === selectedStrategy)?.label || "Day Trading"} y ${TRADING_STRATEGIES_ADVANCED.find((s) => s.key === (aiSettings.selectedTradingStrategy || "maleta"))?.label || "Estrategia Maleta"}. Temporalidades disponibles: ${getCombinedTimeframes().join(", ")}`}
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "#00ffff" }}>{"Temporalidad de Análisis"}</InputLabel>
            <Select
              value={aiSettings.analysisTimeframe || getCombinedTimeframes()[0] || "H1"}
              onChange={(e) =>
                setAiSettings((prev) => ({
                  ...prev,
                  analysisTimeframe: e.target.value,
                }))
              }
              sx={{ color: "#ffffff" }}
            >
              {getCombinedTimeframes().map((timeframe) => (
                <MenuItem key={timeframe} value={timeframe}>
                  {timeframe === "M1" && "1 Minuto"}
                  {timeframe === "M5" && "5 Minutos"}
                  {timeframe === "M15" && "15 Minutos"}
                  {timeframe === "M30" && "30 Minutos"}
                  {timeframe === "H1" && "1 Hora"}
                  {timeframe === "H4" && "4 Horas"}
                  {timeframe === "D1" && "1 Día"}
                  {timeframe === "W1" && "1 Semana"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "#00ffff" }}>{"Umbral de Confluencia"}</InputLabel>
            <Select
              value={aiSettings.confluenceThreshold ?? 0.6}
              onChange={(e) =>
                setAiSettings((prev) => ({
                  ...prev,
                  confluenceThreshold: Number(e.target.value),
                }))
              }
              sx={{ color: "#ffffff" }}
            >
              <MenuItem value={0.5}>{"50% - Conservador"}</MenuItem>
              <MenuItem value={0.6}>{"60% - Balanceado"}</MenuItem>
              <MenuItem value={0.7}>{"70% - Agresivo"}</MenuItem>
              <MenuItem value={0.8}>{"80% - Muy Agresivo"}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box
            sx={{
              p: 2,
              backgroundColor: "rgba(156,39,176,0.1)",
              borderRadius: 1,
              border: "1px solid rgba(156,39,176,0.3)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" sx={{ color: "#9c27b0", mb: 1, fontWeight: "bold" }}>
              {"Configuración Actual:"}
            </Typography>
            <Chip
              label={`Tipo: ${TRADING_STRATEGIES.find((s) => s.key === selectedStrategy)?.label || "Day Trading"}`}
              sx={{ backgroundColor: "#9c27b0", color: "#ffffff", mb: 1 }}
            />
            <Chip
              label={`Temporalidad: ${aiSettings.analysisTimeframe || TRADING_STRATEGIES.find((s) => s.key === selectedStrategy)?.timeframes[0] || "H1"}`}
              sx={{ backgroundColor: "rgba(156,39,176,0.7)", color: "#ffffff", mb: 1 }}
            />
            <Chip
              label={`Umbral: ${((aiSettings.confluenceThreshold ?? 0.6) * 100).toFixed(0)}%`}
              sx={{ backgroundColor: "rgba(156,39,176,0.5)", color: "#ffffff" }}
            />
          </Box>
        </Grid>
      </Grid>
    </Card>

    {/* Tipos de Análisis Técnico */}
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(0,255,255,0.2)",
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
        {"🔧 Tipos de Análisis Técnico"}
      </Typography>

      <Alert severity="info" sx={{ mb: 3, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
        <Typography variant="body2">
          {"Selecciona qué tipos de análisis técnico utilizará la IA para generar confluencias y señales de trading."}
        </Typography>
      </Alert>

      <Grid container spacing={2}>
        {ANALYSIS_TYPES.map((analysis) => (
          <Grid item xs={12} md={6} key={analysis.key}>
            <Card
              sx={{
                p: 2.5,
                height: "100%",
                backgroundColor: (aiSettings?.enabledAnalyses || []).includes(analysis.key)
                  ? "rgba(0,255,136,0.1)"
                  : "rgba(255,255,255,0.02)",
                border: (aiSettings?.enabledAnalyses || []).includes(analysis.key)
                  ? "1px solid rgba(0,255,136,0.3)"
                  : "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(0,255,255,0.08)",
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => {
                const isEnabled = (aiSettings?.enabledAnalyses || []).includes(analysis.key)
                if (isEnabled) {
                  setAiSettings((prev) => ({
                    ...prev,
                    enabledAnalyses: (prev.enabledAnalyses || []).filter((a) => a !== analysis.key),
                  }))
                } else {
                  setAiSettings((prev) => ({
                    ...prev,
                    enabledAnalyses: [...(prev.enabledAnalyses || []), analysis.key],
                  }))
                }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Switch
                  checked={(aiSettings?.enabledAnalyses || []).includes(analysis.key)}
                  onChange={(e) => {
                    e.stopPropagation()
                    if (e.target.checked) {
                      setAiSettings((prev) => ({
                        ...prev,
                        enabledAnalyses: [...(prev.enabledAnalyses || []), analysis.key],
                      }))
                    } else {
                      setAiSettings((prev) => ({
                        ...prev,
                        enabledAnalyses: (prev.enabledAnalyses || []).filter((a) => a !== analysis.key),
                      }))
                    }
                  }}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold", mb: 1 }}>
                    {analysis.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                    {analysis.description}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Card>
    {/* Pesos de Análisis */}
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(0,255,255,0.2)",
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
        {"⚖️ Pesos de Análisis"}
      </Typography>

      <Alert severity="warning" sx={{ mb: 3, backgroundColor: "rgba(255,193,7,0.1)", color: "#ffffff" }}>
        <Typography variant="body2">
          {"Los pesos determinan la importancia relativa de cada análisis. Deben sumar exactamente 1.0 (100%)."}
        </Typography>
      </Alert>

      <Grid container spacing={2}>
        {WEIGHT_FIELDS.map((weight) => (
          <Grid item xs={12} md={6} key={weight.key}>
            <Card
              sx={{
                p: 2.5,
                height: "100%",
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold", mb: 1 }}>
                {weight.label}
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 2, lineHeight: 1.4 }}>
                {weight.description}
              </Typography>
              <TextField
                fullWidth
                label={`Peso ${weight.label}`}
                type="number"
                step="0.05"
                inputProps={{ min: 0, max: 1 }}
                value={aiSettings?.[weight.key] ?? 0.25}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 0
                  setAiSettings((prev) => ({
                    ...prev,
                    [weight.key]: value,
                    ...(weight.key === "supportResistanceWeight" && {
                      support_resistance_weight: value,
                    }),
                  }))
                }}
                sx={{
                  "& .MuiInputLabel-root": { color: "#00ffff" },
                  "& .MuiOutlinedInput-root": { color: "#ffffff" },
                }}
                helperText={`Valor actual: ${((aiSettings?.[weight.key] ?? 0.25) * 100).toFixed(1)}%`}
              />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Validación de pesos */}
      <Box
        sx={{
          mt: 3,
          p: 2.5,
          backgroundColor: weightsValid ? "rgba(76,175,80,0.1)" : "rgba(244,67,54,0.1)",
          borderRadius: 1,
          border: weightsValid ? "1px solid rgba(76,175,80,0.3)" : "1px solid rgba(244,67,54,0.3)",
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: weightsValid ? "#00ff88" : "#ff4444",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {weightsValid ? "✅" : "⚠️"}
          {`Total: ${totalWeights.toFixed(2)} (${(totalWeights * 100).toFixed(1)}%)`}
        </Typography>
        {!weightsValid && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            {"Los pesos deben sumar exactamente 1.0 para que el análisis funcione correctamente."}
          </Typography>
        )}
      </Box>
    </Card>

    {/* Tipo de Ejecución MT5 */}
    <Card
      sx={{
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(0,255,255,0.2)",
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
        {"🛠️ Tipo de Ejecución MT5"}
      </Typography>

      <Alert severity="info" sx={{ mb: 3, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
        <Typography variant="body2">
          {"El servidor determinará automáticamente si la señal es de compra o venta. Selecciona cómo se ejecutará la orden."}
        </Typography>
      </Alert>

      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: "rgba(0,255,136,0.1)",
          borderRadius: 1,
          border: "1px solid rgba(0,255,136,0.3)",
        }}
      >
        <Typography variant="body2" sx={{ color: "#00ff88", fontWeight: "bold", mb: 1 }}>
          {"Tipo Seleccionado:"}
        </Typography>
        <Chip
          label={EXECUTION_TYPES.find((et) => et.key === selectedExecutionType)?.label || "Market"}
          sx={{ backgroundColor: "#00ff88", color: "#000000", fontWeight: "bold" }}
        />
      </Box>

      <Grid container spacing={2}>
        {EXECUTION_TYPES.map((et) => (
          <Grid item xs={12} md={4} key={et.key}>
            <Card
              sx={{
                p: 2.5,
                height: "100%",
                backgroundColor:
                  selectedExecutionType === et.key ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.02)",
                border:
                  selectedExecutionType === et.key
                    ? "2px solid rgba(0,255,136,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(0,255,255,0.08)",
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => handleExecutionTypeChange(et.key)}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "2px solid",
                    borderColor: selectedExecutionType === et.key ? "#00ff88" : "rgba(255,255,255,0.5)",
                    backgroundColor: selectedExecutionType === et.key ? "#00ff88" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 0.5,
                    transition: "all 0.2s ease",
                  }}
                >
                  {selectedExecutionType === et.key && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#000000",
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold", mb: 1 }}>
                    {et.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                    {et.description}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          mt: 3,
          p: 2.5,
          backgroundColor: "rgba(156,39,176,0.1)",
          borderRadius: 1,
          border: "1px solid rgba(156,39,176,0.3)",
        }}
      >
        <Typography variant="body2" sx={{ color: "#bb86fc", fontWeight: "bold", mb: 2 }}>
          {"🔄 Cómo funcionará tu selección:"}
        </Typography>
        {selectedExecutionType === "market" && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
            {"• Las señales se ejecutarán inmediatamente al precio actual del mercado"}
            <br />
            {"• No hay espera - entrada instantánea cuando llegue la señal"}
          </Typography>
        )}
        {selectedExecutionType === "limit" && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
            {"• Señal COMPRA = Buy Limit (espera precio más bajo para entrar)"}
            <br />
            {"• Señal VENTA = Sell Limit (espera precio más alto para entrar)"}
            <br />
            {"• Mejor precio de entrada, pero puede no ejecutarse si el precio no llega"}
          </Typography>
        )}
        {selectedExecutionType === "stop" && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
            {"• Señal COMPRA = Buy Stop (entra cuando el precio rompe resistencia hacia arriba)"}
            <br />
            {"• Señal VENTA = Sell Stop (entra cuando el precio rompe soporte hacia abajo)"}
            <br />
            {"• Ideal para seguir tendencias y rupturas de niveles clave"}
          </Typography>
        )}
      </Box>
    </Card>


            {/* Sección 5: Sesiones Forex */}
            <Card
              sx={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(0,255,255,0.2)",
                p: 3,
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", mb: 3 }}
              >
                <Typography variant="h6" sx={{ color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
                  {"🕒 Sesiones de Forex por País"}
                </Typography>
                <FormControl sx={{ minWidth: 280 }}>
                  <InputLabel sx={{ color: "#00ffff" }}>{"País / Zona horaria"}</InputLabel>
                  <Select
                    value={selectedTimeZone}
                    onChange={(e) =>
                      setAiSettings((prev) => ({
                        ...prev,
                        sessionsTimeZone: e.target.value,
                      }))
                    }
                    sx={{ color: "#ffffff" }}
                  >
                    <MenuItem value={getSystemTimeZone()}>{`Automático (Sistema) - ${getSystemTimeZone()}`}</MenuItem>
                    {TIMEZONES_BY_COUNTRY.map((opt) => (
                      <MenuItem key={opt.tz} value={opt.tz}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Sesiones principales */}
              <Typography variant="subtitle1" sx={{ mb: 2, color: "#ffffff", fontWeight: "bold" }}>
                {"📈 Sesiones Principales"}
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {SESSIONS_UTC.map((s) => (
                  <Grid item xs={12} sm={6} md={3} key={s.key}>
                    <Card
                      sx={{
                        p: 2,
                        height: "100%",
                        background: "rgba(0,255,255,0.04)",
                        border: "1px solid rgba(0,255,255,0.15)",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}>
                        {"Sesión"}
                      </Typography>
                      <Typography variant="h6" sx={{ color: "#00ffff", fontWeight: "bold", mb: 2 }}>
                        {s.label}
                      </Typography>
                      <Chip
                        label={formatSessionRangeInZone(s.start, s.end, selectedTimeZone)}
                        sx={{
                          backgroundColor: "rgba(0,255,255,0.15)",
                          color: "#00ffff",
                          fontWeight: "bold",
                        }}
                      />
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Superposiciones */}
              <Typography variant="subtitle1" sx={{ mb: 2, color: "#00ffff", fontWeight: "bold" }}>
                {"🔗 Superposiciones (Mayor Liquidez)"}
              </Typography>
              <Grid container spacing={2}>
                {OVERLAPS_UTC.map((o, i) => (
                  <Grid item xs={12} md={4} key={i}>
                    <Card
                      sx={{
                        p: 2.5,
                        height: "100%",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}>
                        {o.label}
                      </Typography>
                      <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                        {formatSessionRangeInZone(o.start, o.end, selectedTimeZone)}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Alert severity="info" sx={{ mt: 3, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
                <Typography variant="body2">
                  {
                    "Los horarios están aproximados a ventanas UTC típicas. Los cambios por horario de verano pueden mover las sesiones."
                  }
                </Typography>
              </Alert>
            </Card>
          </Box>
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
    try {
      const userId = localStorage.getItem("userId")

      const payload = {
        user_id: userId,
        login: mt5Form.login || "",
        server: mt5Form.server || "",
        account_type: mt5Form.type || "demo",
        ai_settings: mapAiSettingsToBackend(aiSettings),  // 👈 Asegurate de pasar el estado completo
      }

      console.log("🔍 Payload enviado al back:", payload)
console.log("🔍 Payload enviado al back:", JSON.stringify(payload, null, 2))
      dispatch(saveMT5Profile(payload))

      showSnackbar("✅ Configuración guardada correctamente", "success")
      onClose()
    } catch (err) {
      console.error("❌ Error construyendo payload:", err)
    }
  }}
  disabled={settingsTab === 2 && !weightsValid}
>
  {"Guardar Configuración"}
</Button>





        QA
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog
