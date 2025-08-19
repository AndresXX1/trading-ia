"use client"
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSelector } from "react-redux"
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Badge,
  CircularProgress,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material"
import {
  ShowChart,
  Refresh,
  Settings,
  Fullscreen,
  SmartToy,
  Psychology,
  Analytics,
  PlayArrow,
  Pause,
  Star,
  Warning,
  Speed,
  Assessment,
  Close,
  ExpandMore,
  PlayCircleOutline,
  TrendingFlat,
  Timeline as TimelineIcon,
  ShowChartOutlined,
  ImageOutlined,
  SignalCellular4Bar,
  NetworkCheck,
  Update,
} from "@mui/icons-material"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line } from "react-chartjs-2"
import annotationPlugin from "chartjs-plugin-annotation"
import "chartjs-adapter-date-fns"
import api from "../api/index"
import "./charts.css"
import SettingsDialog from "./settings-dialog"

// Registrar componentes de Chart.js incluyendo anotaciones
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  annotationPlugin,
)

// ✅ ErrorBoundary simple integrado
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Chart Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            height: 600,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            backgroundColor: "rgba(255,255,255,0.02)",
            borderRadius: 2,
            border: "1px solid rgba(255,69,0,0.3)",
          }}
        >
          <Warning sx={{ fontSize: 64, color: "#ff4500" }} />
          <Typography variant="h6" sx={{ color: "#ff4500" }}>
            Error en el gráfico
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
            Ha ocurrido un error temporal. Recarga la página para continuar.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{
              borderColor: "#00ffff",
              color: "#00ffff",
              "&:hover": { backgroundColor: "rgba(0,255,255,0.1)" },
            }}
          >
            Recargar Página
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}

const Charts = () => {
  const { user } = useSelector((state) => state.auth)

  // ✅ Referencias mejoradas
  const chartContainerRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const wsRef = useRef(null)
  const mountedRef = useRef(true)
  const priceUpdateInterval = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Estados principales
  const [selectedPair, setSelectedPair] = useState("EURUSD")
  const [availablePairs, setAvailablePairs] = useState([
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD",
    "USDCHF",
    "USDCAD",
    "EURJPY",
    "GBPJPY",
  ])
  // ✅ MODIFICADO: timeframe solo para visualización del gráfico
  const [timeframe, setTimeframe] = useState("H1")
  const [chartType, setChartType] = useState("candlestick")
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [chartData, setChartData] = useState(null)
  const [signals, setSignals] = useState([])
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [chartKey, setChartKey] = useState(0)
  const [isChartReady, setIsChartReady] = useState(false)
const [extendedRiskManagement, setExtendedRiskManagement] = useState({
  coolDownHours: 0,
  riskByStrategy: {}
});

  // ✅ NUEVOS Estados para tiempo real mejorado
  const [realTimePrice, setRealTimePrice] = useState(null)
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null)
  const [priceLatency, setPriceLatency] = useState(0)
  const [dataFreshness, setDataFreshness] = useState("stale") // 'fresh', 'recent', 'stale'
  const [tickCount, setTickCount] = useState(0)
  const [priceHistory, setPriceHistory] = useState([])
  const [connectionQuality, setConnectionQuality] = useState("good") // 'excellent', 'good', 'poor', 'disconnected'
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Estados existentes
  const [mt5Data, setMt5Data] = useState(null)
  const [chartImageUrl, setChartImageUrl] = useState(null)
  const [chartImageLoading, setChartImageLoading] = useState(false)
  const [chartImageError, setChartImageError] = useState(false)
  const [multiPairPrices, setMultiPairPrices] = useState({})
  const [selectedSignalDetails, setSelectedSignalDetails] = useState(null)
  const [signalDetailsOpen, setSignalDetailsOpen] = useState(false)
  const [chartAnnotations, setChartAnnotations] = useState([])
  const [imageGenerationAttempted, setImageGenerationAttempted] = useState(false)
  const [currentSignalId, setCurrentSignalId] = useState(null)
const [mt5Session, setMt5Session] = useState(null);
  const [riskLocked, setRiskLocked] = useState(false)
  // Estados de UI
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" })
  const [watchlist, setWatchlist] = useState(["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"])

  // Configuración de indicadores
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: false,
    ema20: false,
    rsi: false,
    macd: false,
    bollinger: false,
    fibonacci: false,
    support_resistance: true,
  })

  // ✅ NUEVA Configuración de tiempo real
  const [realtimeSettings, setRealtimeSettings] = useState({
    updateInterval: 1000, // 1 segundo por defecto
    maxRetries: 5,
    reconnectDelay: 2000,
    dataValidationTimeout: 5000,
    enableTickByTick: true,
    priceHistoryLimit: 100,
  })

  // ✅ NUEVO: Estado para gestión de riesgo
  const [riskManagement, setRiskManagement] = useState({
    totalCapital: 10000,
    riskPercentage: 2,
    isLocked: false,
    calculatedLotSize: 0.1,
    maxRiskAmount: 200,
  })

  // ✅ MODIFICADO: Estado para configuración de IA con temporalidad incluida
  const [aiSettings, setAiSettings] = useState({
    // ✅ NUEVO: Temporalidad para análisis (independiente del gráfico)
    analysisTimeframe: "H1",
    confluenceThreshold: 0.6,
    enabledAnalyses: ["elliott_wave", "fibonacci", "support_resistance"],
    elliottWaveWeight: 0.25,
    fibonacciWeight: 0.25,
    chartPatternsWeight: 0.25,
    supportResistanceWeight: 0.25,
  })

  const timeframes = [
    { value: "M1", label: "1 Minuto" },
    { value: "M5", label: "5 Minutos" },
    { value: "M15", label: "15 Minutos" },
    { value: "M30", label: "30 Minutos" },
    { value: "H1", label: "1 Hora" },
    { value: "H4", label: "4 Horas" },
    { value: "D1", label: "1 Día" },
    { value: "W1", label: "1 Semana" },
  ]

  // ✅ NUEVO: Configuraciones específicas por temporalidad
  const getTimeframeSpecificConfig = useCallback(
    (timeframe) => {
      const baseConfig = {
        confluence_threshold: aiSettings.confluenceThreshold,
        enable_elliott_wave: aiSettings.enabledAnalyses.includes("elliott_wave"),
        enable_fibonacci: aiSettings.enabledAnalyses.includes("fibonacci"),
        enable_chart_patterns: aiSettings.enabledAnalyses.includes("chart_patterns"),
        enable_support_resistance: aiSettings.enabledAnalyses.includes("support_resistance"),
        elliott_wave_weight: aiSettings.elliottWaveWeight,
        fibonacci_weight: aiSettings.fibonacciWeight,
        chart_patterns_weight: aiSettings.chartPatternsWeight,
        support_resistance_weight: aiSettings.supportResistanceWeight,
      }

      // ✅ NUEVO: Configuraciones específicas según temporalidad
      switch (timeframe) {
        case "M1":
        case "M5":
          return {
            ...baseConfig,
            // Scalping: Mayor peso a S/R y patrones rápidos
            confluence_threshold: Math.max(baseConfig.confluence_threshold, 0.7),
            support_resistance_weight: 0.4,
            chart_patterns_weight: 0.3,
            fibonacci_weight: 0.2,
            elliott_wave_weight: 0.1,
            atr_multiplier_sl: 1.5, // Stop loss más ajustado
            risk_reward_ratio: 1.5,
          }

        case "M15":
        case "M30":
          return {
            ...baseConfig,
            // Intraday: Balance entre todos los análisis
            confluence_threshold: baseConfig.confluenceThreshold,
            atr_multiplier_sl: 2.0,
            risk_reward_ratio: 2.0,
          }

        case "H1":
          return {
            ...baseConfig,
            // Swing corto: Mayor peso a Elliott y Fibonacci
            elliott_wave_weight: 0.3,
            fibonacci_weight: 0.3,
            chart_patterns_weight: 0.25,
            support_resistance_weight: 0.15,
            atr_multiplier_sl: 2.5,
            risk_reward_ratio: 2.5,
          }

        case "H4":
          return {
            ...baseConfig,
            // Swing medio: Elliott Wave dominante
            elliott_wave_weight: 0.4,
            fibonacci_weight: 0.3,
            chart_patterns_weight: 0.2,
            support_resistance_weight: 0.1,
            confluence_threshold: Math.max(baseConfig.confluence_threshold - 0.1, 0.5),
            atr_multiplier_sl: 3.0,
            risk_reward_ratio: 3.0,
          }

        case "D1":
        case "W1":
          return {
            ...baseConfig,
            // Swing largo: Elliott Wave y patrones de largo plazo
            elliott_wave_weight: 0.5,
            fibonacci_weight: 0.25,
            chart_patterns_weight: 0.15,
            support_resistance_weight: 0.1,
            confluence_threshold: Math.max(baseConfig.confluence_threshold - 0.15, 0.45),
            atr_multiplier_sl: 4.0,
            risk_reward_ratio: 4.0,
          }

        default:
          return {
            ...baseConfig,
            atr_multiplier_sl: 2.0,
            risk_reward_ratio: 2.0,
          }
      }
    },
    [aiSettings],
  )

const handleRiskLocked = (locked) => {
  setRiskManagement((prev) => ({
    ...prev,
    isLocked: locked,
  }))
}


  // ✅ Función para mostrar snackbar
  const showSnackbar = useCallback((message, severity = "info") => {
    setSnackbar({ open: true, message, severity })
  }, [])

  // ✅ NUEVA: Función para validar frescura de datos
  const validateDataFreshness = useCallback((timestamp) => {
    if (!timestamp) return "stale"

    const now = Date.now()
    const dataAge = now - new Date(timestamp).getTime()

    if (dataAge < 2000) return "fresh" // Menos de 2 segundos
    if (dataAge < 10000) return "recent" // Menos de 10 segundos
    return "stale" // Más de 10 segundos
  }, [])

  // ✅ NUEVA: Función para calcular latencia
  const calculateLatency = useCallback((requestTime, responseTime) => {
    if (!requestTime || !responseTime) return 0
    return responseTime - requestTime
  }, [])

  // ✅ NUEVA: Función para calcular tamaño del lote basado en gestión de riesgo
  const calculateLotSize = useCallback((signal, riskConfig) => {
    if (!signal || !signal.entry_price || !signal.stop_loss || !riskConfig) {
      return 0.1 // Lote por defecto
    }

    try {
      // Calcular distancia al stop loss en pips
      const entryPrice = signal.entry_price
      const stopLoss = signal.stop_loss
      const priceDifference = Math.abs(entryPrice - stopLoss)

      // Determinar valor del pip según el par
      const isJPY = signal.symbol.includes("JPY")
      const pipValue = isJPY ? 0.01 : 0.0001
      const pipsDistance = priceDifference / pipValue

      // Calcular cantidad máxima a arriesgar
      const maxRiskAmount = (riskConfig.totalCapital * riskConfig.riskPercentage) / 100

      // Valor monetario por pip (aproximado para pares principales)
      let pipValueUSD = 1 // Por defecto $1 por pip por mini lote

      if (isJPY) {
        pipValueUSD = 0.91 // Aproximación para pares JPY
      } else if (signal.symbol.startsWith("GBP")) {
        pipValueUSD = 1.25 // Aproximación para pares GBP
      }

      // Calcular lote: Riesgo máximo ÷ (Pips de distancia × Valor por pip)
      const calculatedLot = maxRiskAmount / (pipsDistance * pipValueUSD)

      // Redondear a 2 decimales y aplicar límites
      const finalLot = Math.max(0.01, Math.min(calculatedLot, 10)) // Entre 0.01 y 10 lotes

      console.log("📊 Cálculo de lote:", {
        symbol: signal.symbol,
        capital: riskConfig.totalCapital,
        riskPercentage: riskConfig.riskPercentage,
        maxRiskAmount,
        pipsDistance: pipsDistance.toFixed(1),
        pipValueUSD,
        calculatedLot: finalLot.toFixed(2),
      })

      return Number.parseFloat(finalLot.toFixed(2))
    } catch (error) {
      console.error("Error calculando tamaño del lote:", error)
      return 0.1
    }
  }, [])

  // ✅ NUEVA: Función para evaluar calidad de conexión
  const evaluateConnectionQuality = useCallback((latency, successRate) => {
    if (successRate < 0.5) return "disconnected"
    if (latency > 2000 || successRate < 0.8) return "poor"
    if (latency > 1000 || successRate < 0.95) return "good"
    return "excellent"
  }, [])

  // ✅ Función mejorada para destruir chart
  const destroyChart = useCallback(() => {
    if (chartInstanceRef.current) {
      try {
        console.log("Destroying chart instance...")
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      } catch (error) {
        console.warn("Error destroying chart:", error)
        chartInstanceRef.current = null
      }
    }
    setIsChartReady(false)
  }, [])

  // ✅ Función para limpiar todas las instancias de Chart.js
  const cleanupAllCharts = useCallback(() => {
    try {
      destroyChart()
      Object.keys(ChartJS.instances).forEach((key) => {
        const instance = ChartJS.instances[key]
        if (instance && typeof instance.destroy === "function") {
          try {
            instance.destroy()
          } catch (error) {
            console.warn("Error destroying global chart instance:", error)
          }
        }
      })
      ChartJS.instances = {}
    } catch (error) {
      console.warn("Error during chart cleanup:", error)
    }
  }, [destroyChart])

  // ✅ Función mejorada para reiniciar el chart
  const resetChart = useCallback(() => {
    destroyChart()
    setChartKey((prev) => prev + 1)
    setIsChartReady(false)
  }, [destroyChart])

  // ✅ MEJORADA: Función para obtener precio actual con validación de timestamp
  const getMT5DataForPair = useCallback(
    async (pair, forceUpdate = false) => {
      const now = Date.now()
      const requestTime = now
      const lastUpdate = multiPairPrices[pair]?.lastUpdate || 0

      // Control de frecuencia mejorado
      if (!forceUpdate && now - lastUpdate < realtimeSettings.updateInterval) {
        console.log(`Precio de ${pair} actualizado recientemente, saltando...`)
        return multiPairPrices[pair]?.price
      }

      try {
        console.log(`🔄 Obteniendo precio actual para ${pair} desde backend...`)
        const response = await api.getMT5Data(pair)
        const responseTime = Date.now()

        if (response.price && mountedRef.current) {
          const newPrice = Number.parseFloat(response.price.toFixed(pair.includes("JPY") ? 2 : 5))
          const timestamp = new Date()
          const latency = calculateLatency(requestTime, responseTime)

          // ✅ CORREGIDO: Validar si los datos son realmente del backend
          const isRealTime = response.source === "mt5_api" || response.source === "mt5_live"
          const isSimulated = response.source === "fallback_simulation"

          // Actualizar el estado de precios múltiples con metadatos
          setMultiPairPrices((prev) => ({
            ...prev,
            [pair]: {
              price: newPrice,
              timestamp: timestamp,
              lastUpdate: now,
              source: response.source || "api",
              latency: latency,
              isRealTime: isRealTime,
              simulated: isSimulated,
              serverTimestamp: response.timestamp,
              quality: isSimulated ? "simulated" : latency < 1000 ? "excellent" : latency < 2000 ? "good" : "poor",
            },
          }))

          // Si es el par seleccionado, también actualizar el precio principal
          if (pair === selectedPair) {
            setRealTimePrice(newPrice)
            setLastPriceUpdate(timestamp)
            setPriceLatency(latency)
            setDataFreshness(isRealTime ? "fresh" : isSimulated ? "simulated" : "recent")
            setTickCount((prev) => prev + 1)

            // Actualizar historial de precios
            setPriceHistory((prev) => [
              ...prev.slice(-(realtimeSettings.priceHistoryLimit - 1)),
              { price: newPrice, timestamp, latency, isRealTime, isSimulated },
            ])

            updateChartWithRealPrice({
              price: newPrice,
              timestamp: timestamp,
              isRealTime: isRealTime,
              isSimulated: isSimulated,
            })
          }

          console.log(
            `✅ Precio actualizado para ${pair}:`,
            newPrice,
            `(Latencia: ${latency}ms, Fuente: ${response.source})`,
          )
          return newPrice
        }
      } catch (error) {
        console.error(`❌ Error obteniendo precio actual para ${pair}:`, error)

        // ✅ MEJORADO: Solo generar precio simulado si no hay precio previo
        if (!multiPairPrices[pair]) {
          const basePrices = {
            EURUSD: 1.085,
            GBPUSD: 1.265,
            USDJPY: 148.5,
            AUDUSD: 0.675,
            USDCHF: 0.895,
            USDCAD: 1.345,
            EURJPY: 161.2,
            GBPJPY: 187.8,
          }

          const basePrice = basePrices[pair] || 1.0
          const volatility = pair.includes("JPY") ? 0.5 : 0.0005
          const simulatedPrice = basePrice + (Math.random() - 0.5) * volatility
          const formattedPrice = Number.parseFloat(simulatedPrice.toFixed(pair.includes("JPY") ? 2 : 5))

          setMultiPairPrices((prev) => ({
            ...prev,
            [pair]: {
              price: formattedPrice,
              timestamp: new Date(),
              lastUpdate: now,
              simulated: true,
              isRealTime: false,
              source: "local_simulation",
              quality: "simulated",
            },
          }))

          console.log(`⚠️ Usando precio simulado para ${pair}:`, formattedPrice)
          return formattedPrice
        }
      }

      return multiPairPrices[pair]?.price || null
    },
    [
      multiPairPrices,
      selectedPair,
      realtimeSettings.updateInterval,
      realtimeSettings.priceHistoryLimit,
      validateDataFreshness,
      calculateLatency,
    ],
  )

  // ✅ MEJORADA: Función para actualizar precios de múltiples pares
  const updateMultiplePairPrices = useCallback(async () => {
    const uniquePairs = [
      ...new Set([
        selectedPair,
        ...signals
          .slice(0, 5)
          .map((signal) => signal.symbol)
          .filter(Boolean),
      ]),
    ]

    console.log("🔄 Actualizando precios para pares:", uniquePairs)

    // ✅ NUEVO: Actualizar en paralelo para mejor rendimiento
    const updatePromises = uniquePairs.map(async (pair) => {
      try {
        await getMT5DataForPair(pair)
        // Pequeña pausa entre llamadas para evitar sobrecarga
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`Error actualizando precio para ${pair}:`, error)
      }
    })

    await Promise.allSettled(updatePromises)
  }, [selectedPair, signals, getMT5DataForPair])

  // ✅ MEJORADA: Obtener precio actual de MT5
  const getMT5Data = async () => {
    try {
      const requestTime = Date.now()
      const response = await api.getMT5Data(selectedPair)
      const responseTime = Date.now()

      if (response.price && mountedRef.current) {
        const newPrice = Number.parseFloat(response.price.toFixed(selectedPair.includes("JPY") ? 2 : 5))
        const latency = responseTime - requestTime

        setRealTimePrice(newPrice)
        setLastPriceUpdate(new Date())
        setPriceLatency(latency)
        setDataFreshness(validateDataFreshness(response.timestamp))
        setTickCount((prev) => prev + 1)

        // Actualizar historial
        setPriceHistory((prev) => [
          ...prev.slice(-(realtimeSettings.priceHistoryLimit - 1)),
          {
            price: newPrice,
            timestamp: new Date(),
            latency,
            isRealTime: validateDataFreshness(response.timestamp) === "fresh",
          },
        ])

        updateChartWithRealPrice({
          price: newPrice,
          timestamp: new Date(),
          isRealTime: validateDataFreshness(response.timestamp) === "fresh",
        })

        console.log(`✅ Precio actualizado: ${selectedPair} = ${newPrice} (Latencia: ${latency}ms)`)
      }
    } catch (error) {
      console.error("❌ Error obteniendo precio actual:", error)
      simulatePriceUpdate()
    }
  }

  // ✅ Cleanup al desmontar el componente
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cleanupAllCharts()
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [cleanupAllCharts])

  // ✅ Cargar datos iniciales
  useEffect(() => {
    if (mountedRef.current) {
      loadAvailablePairs()
      loadInitialSignals()
      setTimeout(() => {
        if (mountedRef.current) {
          loadRealChartData()
        }
      }, 500)
    }
  }, [])

  // ✅ MEJORADO: Configurar WebSocket con reconexión automática
  useEffect(() => {
    if (realtimeEnabled && user?.id && mountedRef.current) {
      connectWebSocket()
      startRealTimePriceUpdates() // Añadir esto para iniciar inmediatamente
    } else {
      disconnectWebSocket()
      stopRealTimePriceUpdates() // Añadir esto para detener
    }
    return () => {
      disconnectWebSocket()
      stopRealTimePriceUpdates()
    }
  }, [realtimeEnabled, user?.id])

  // ✅ Mejorado: Cargar datos cuando cambie el par o timeframe
  useEffect(() => {
    if (selectedPair && timeframe && mountedRef.current) {
      // Limpieza total para evitar datos viejos
      cleanupAllCharts()
      setChartData(null)
      setPriceHistory([])
      setRealTimePrice(null)
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setChartKey((prev) => prev + 1)
          loadRealChartData()
        }
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [selectedPair, timeframe, cleanupAllCharts])

  // ✅ NUEVO: Efecto para monitorear calidad de conexión
  useEffect(() => {
    if (realtimeEnabled && priceHistory.length > 10) {
      const recentPrices = priceHistory.slice(-10)
      const avgLatency = recentPrices.reduce((sum, p) => sum + (p.latency || 0), 0) / recentPrices.length
      const realTimeCount = recentPrices.filter((p) => p.isRealTime).length
      const successRate = realTimeCount / recentPrices.length

      const quality = evaluateConnectionQuality(avgLatency, successRate)
      setConnectionQuality(quality)
    }
  }, [priceHistory, realtimeEnabled, evaluateConnectionQuality])

  // ✅ MEJORADA: Función para cargar pares disponibles
  const loadAvailablePairs = async () => {
    try {
      const response = await api.getAvailablePairs()
      if (mountedRef.current && response.pairs) {
        const pairs = Array.isArray(response.pairs)
          ? response.pairs.map((pair) => (typeof pair === "string" ? pair : pair.symbol || pair.name || pair))
          : ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"]

        setAvailablePairs(pairs.filter((pair) => typeof pair === "string"))
      }
    } catch (error) {
      console.error("Error cargando pares:", error)
      if (mountedRef.current) {
        setAvailablePairs(["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF", "USDCAD", "EURJPY", "GBPJPY"])
        showSnackbar("Usando pares por defecto", "warning")
      }
    }
  }

  const loadInitialSignals = async () => {
    try {
      const response = await api.getInitialSignals(80)
      if (mountedRef.current) {
        setSignals(response.signals || [])
      }
    } catch (error) {
      console.error("Error cargando señales:", error)
      if (mountedRef.current) {
        const mockSignals = generateMockSignals()
        setSignals(mockSignals)
        showSnackbar("Usando señales de ejemplo", "info")
      }
    }
  }

  const generateMockSignals = () => {
    const pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"]
    const signalTypes = ["buy", "sell"]
    const signals = []

    for (let i = 0; i < 10; i++) {
      signals.push({
        _id: `mock_${i}`,
        symbol: pairs[Math.floor(Math.random() * pairs.length)],
        signal_type: signalTypes[Math.floor(Math.random() * signalTypes.length)],
        confluence_score: Math.random() * 0.4 + 0.6,
        entry_price: 1.1 + Math.random() * 0.1,
        timeframe: timeframes[Math.floor(Math.random() * timeframes.length)].value,
        created_at: new Date(Date.now() - Math.random() * 86400000),
        technical_analyses: [
          {
            type: "elliott_wave",
            confidence: Math.random(),
            data: {
              pattern: { direction: "bullish" },
              market_state: "trending",
            },
          },
        ],
      })
    }
    return signals
  }

  // ✅ CORREGIDA: Función para cargar datos reales de MT5
  const loadRealChartData = async () => {
    if (!selectedPair || !mountedRef.current) return

    setLoading(true)
    try {
      const response = await api.getMT5Data(selectedPair, timeframe, 100)

      if (mountedRef.current && response.data) {
        const realData = processRealMT5Data(response.data)
        setMt5Data(response.data)
        setChartData(realData)
        setIsChartReady(true)

        // ✅ CORREGIDO: Establecer precio actual basado en datos reales
        if (response.data.candles && response.data.candles.length > 0) {
          const lastCandle = response.data.candles[response.data.candles.length - 1]
          const currentPrice = Number.parseFloat(lastCandle.close.toFixed(selectedPair.includes("JPY") ? 2 : 5))
          setRealTimePrice(currentPrice)
          setLastPriceUpdate(new Date())
          console.log("✅ Precio actual establecido desde datos MT5:", currentPrice)
        }

        showSnackbar(`Datos reales cargados para ${selectedPair}`, "success")
      }
    } catch (error) {
      console.error("Error cargando datos reales:", error)
      if (mountedRef.current) {
        const fallbackData = generateRealisticFallbackData()
        setChartData(fallbackData)
        setIsChartReady(true)
        showSnackbar("Usando datos simulados (MT5 no disponible)", "warning")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  // ✅ Procesar datos reales de MT5
  const processRealMT5Data = (mt5Data) => {
    if (!mt5Data || !mt5Data.candles) return null

    const data = []
    const labels = []

    mt5Data.candles.forEach((candle) => {
      const time = new Date(candle.time)
      labels.push(time)

      data.push({
        x: time,
        y: Number.parseFloat(candle.close.toFixed(selectedPair.includes("JPY") ? 2 : 5)),
      })
    })

    const datasets = [
      {
        label: `${selectedPair} Precio Real`,
        data,
        borderColor: "#00ffff",
        backgroundColor: "rgba(0, 255, 255, 0.1)",
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: "#00ffff",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1,
      },
    ]

    if (indicators.sma20 && data.length >= 20) {
      const sma20Data = calculateSMA(data, 20)
      datasets.push({
        label: "SMA 20",
        data: sma20Data,
        borderColor: "#ff6b6b",
        backgroundColor: "transparent",
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      })
    }

    if (indicators.sma50 && data.length >= 50) {
      const sma50Data = calculateSMA(data, 50)
      datasets.push({
        label: "SMA 50",
        data: sma50Data,
        borderColor: "#4ecdc4",
        backgroundColor: "transparent",
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      })
    }

    return {
      labels,
      datasets,
    }
  }

  // ✅ CORREGIDA: Datos de fallback más realistas
  const generateRealisticFallbackData = () => {
    const data = []
    const labels = []

    const basePrices = {
      EURUSD: 1.085,
      GBPUSD: 1.265,
      USDJPY: 148.5,
      AUDUSD: 0.675,
      USDCHF: 0.895,
      USDCAD: 1.345,
      EURJPY: 161.2,
      GBPJPY: 187.8,
    }

    let currentPrice = basePrices[selectedPair] || 1.085

    for (let i = 0; i < 100; i++) {
      const time = new Date(Date.now() - (100 - i) * 60 * 60 * 1000)
      labels.push(time)

      const volatility = selectedPair.includes("JPY") ? 0.3 : 0.0003
      const trend = Math.sin(i * 0.05) * 0.0001
      const noise = (Math.random() - 0.5) * volatility

      if (Math.random() < 0.05) {
        const gap = (Math.random() - 0.5) * volatility * 2
        currentPrice += gap
      }

      currentPrice += trend + noise
      currentPrice = Math.max(currentPrice, 0.0001)

      data.push({
        x: time,
        y: Number.parseFloat(currentPrice.toFixed(selectedPair.includes("JPY") ? 2 : 5)),
      })
    }

    // ✅ CORREGIDO: Establecer precio actual basado en los datos generados
    if (data.length > 0 && mountedRef.current) {
      const lastPrice = data[data.length - 1].y
      setRealTimePrice(lastPrice)
      setLastPriceUpdate(new Date())
      console.log("✅ Precio actual establecido desde datos simulados:", lastPrice)
    }

    const datasets = [
      {
        label: `${selectedPair} Precio (Simulado)`,
        data,
        borderColor: "#00ffff",
        backgroundColor: "rgba(0, 255, 255, 0.1)",
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: "#00ffff",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1,
      },
    ]

    if (indicators.sma20 && data.length >= 20) {
      const sma20Data = calculateSMA(data, 20)
      datasets.push({
        label: "SMA 20",
        data: sma20Data,
        borderColor: "#ff6b6b",
        backgroundColor: "transparent",
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      })
    }

    if (indicators.sma50 && data.length >= 50) {
      const sma50Data = calculateSMA(data, 50)
      datasets.push({
        label: "SMA 50",
        data: sma50Data,
        borderColor: "#4ecdc4",
        backgroundColor: "transparent",
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      })
    }

    return {
      labels,
      datasets,
    }
  }

  // ✅ Función para calcular SMA
  const calculateSMA = (data, period) => {
    const smaData = []
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        smaData.push({ x: data[i].x, y: null })
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, point) => acc + point.y, 0)
        const average = sum / period
        smaData.push({
          x: data[i].x,
          y: Number.parseFloat(average.toFixed(selectedPair.includes("JPY") ? 2 : 5)),
        })
      }
    }
    return smaData
  }

  // ✅ MEJORADA: Función para generar imagen del gráfico con control de bucle
  const generateChartImage = useCallback(
    async (signal) => {
      if (!signal || chartImageLoading) return

      const signalId = `${signal._id || signal.id}-${signal.symbol}-${signal.timeframe}-${signal.created_at}`

      if (currentSignalId === signalId && chartImageUrl) {
        console.log("Imagen ya generada para esta señal:", signalId)
        return
      }

      setChartImageLoading(true)
      setChartImageError(false)
      setChartImageUrl(null)
      setCurrentSignalId(signalId)

      try {
        console.log("Generando imagen del gráfico para:", signal.symbol, signalId)

        const response = await api.generateChartImage({
          symbol: signal.symbol,
          timeframe: signal.timeframe,
          technical_analyses: signal.technical_analyses,
          entry_price: signal.entry_price,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
        })

        console.log("Respuesta API chart image:", response)

        const imageUrl = response.chart_image_url || response.image_url || response.chart_url || response.url

        if (imageUrl && mountedRef.current) {
          let finalImageUrl = imageUrl

          if (imageUrl.startsWith("data:image")) {
            finalImageUrl = imageUrl
          } else if (imageUrl.startsWith("/")) {
            const baseUrl = "http://127.0.0.1:8000"
            finalImageUrl = baseUrl + imageUrl
          } else if (imageUrl.startsWith("http")) {
            finalImageUrl = imageUrl
          }

          console.log("URL final de imagen:", finalImageUrl)
          setChartImageUrl(finalImageUrl)
        } else {
          console.warn("No se recibió URL de imagen en la respuesta:", response)
          generateLocalChartImage(signal)
        }
      } catch (error) {
        console.error("Error generando imagen del gráfico:", error)
        setChartImageError(true)
        generateLocalChartImage(signal)
      } finally {
        if (mountedRef.current) {
          setChartImageLoading(false)
        }
      }
    },
    [chartImageLoading, chartImageUrl, currentSignalId],
  )

  // ✅ Función para generar gráfico local como fallback
  const generateLocalChartImage = (signal) => {
    try {
      if (!chartInstanceRef.current) {
        console.warn("No hay instancia de gráfico disponible para generar imagen local")
        return
      }

      const canvas = chartInstanceRef.current.canvas
      if (canvas) {
        const imageUrl = canvas.toDataURL("image/png", 0.8)
        setChartImageUrl(imageUrl)
        console.log("Imagen del gráfico generada localmente")
      }
    } catch (error) {
      console.error("Error generando gráfico local:", error)
      setChartImageError(true)
    }
  }

  // ✅ MODIFICADA: Análisis con IA usando temporalidad de configuración
// ✅ MODIFICADA: Análisis con IA usando temporalidad de configuración
 const analyzeWithAI = async () => {
    if (!mt5Session || !mt5Session.connected) {
    setSettingsOpen(true); // abre settings si no hay sesión
    return;
  }
    if (!selectedPair) {
      showSnackbar("Selecciona un par de divisas", "warning")
      return
    }

    if (!riskManagement.isLocked) {
      showSnackbar("⚠️ Debes configurar y bloquear la gestión de riesgo primero", "warning")
      setSettingsOpen(true)
      return
    }

    setAnalyzing(true)
    try {
      const analysisTimeframe = aiSettings.analysisTimeframe
      const timeframeConfig = getTimeframeSpecificConfig(analysisTimeframe)

 const analysisConfig = {
        ...timeframeConfig,
        total_capital: riskManagement.totalCapital,
        risk_percentage: riskManagement.riskPercentage,
        max_risk_amount: (riskManagement.totalCapital * riskManagement.riskPercentage) / 100,
        trader_type: aiSettings?.selectedStrategy || "swing_trading",
        trading_strategy: aiSettings?.selectedTradingStrategy || "swing_trading",
        max_daily_loss_percent: extendedRiskManagement?.maxDailyLossPercent || 5,
        max_weekly_loss_percent: extendedRiskManagement?.maxWeeklyLossPercent || 15,
        max_daily_profit_percent: extendedRiskManagement?.maxDailyProfitPercent || 10,
        max_open_trades: extendedRiskManagement?.maxOpenTrades || 5,
        min_rrr: extendedRiskManagement?.minRRR || 2,
        max_losing_streak: extendedRiskManagement?.maxLosingStreak || 3,
        cool_down_hours: extendedRiskManagement?.coolDownHours || 4,
        risk_by_strategy: extendedRiskManagement?.riskByStrategy || {
          scalping: { riskPercent: 1, maxTrades: 5 },
          day_trading: { riskPercent: 2, maxTrades: 3 },
          swing_trading: { riskPercent: 2, maxTrades: 2 },
          position_trading: { riskPercent: 3, maxTrades: 1 },
          maleta: { riskPercent: 2, maxTrades: 2 },
        },
        risk_management_locked: riskManagement.isLocked,
      }

      console.log(`🔄 Analizando ${selectedPair} en temporalidad ${analysisTimeframe}`)
      console.log("📊 Configuración enviada:", analysisConfig)

      const response = await api.analyzePair(selectedPair, analysisTimeframe, analysisConfig)

      const newSignals = response.signals || []
      if (mountedRef.current) {
        const signalsWithLots = newSignals.map((signal) => {
          const calculatedLot = calculateLotSize(signal, riskManagement)
          return {
            ...signal,
            calculated_lot_size: calculatedLot,
            max_risk_amount: (riskManagement.totalCapital * riskManagement.riskPercentage) / 100,
            risk_percentage: riskManagement.riskPercentage,
            analysis_timeframe: analysisTimeframe,
          }
        })

        setSignals((prev) => [...signalsWithLots, ...prev].slice(0, 50))

        if (signalsWithLots.length > 0) {
          const latestSignal = signalsWithLots[0]
          setSelectedSignalDetails(latestSignal)
          setSignalDetailsOpen(true)
          createChartAnnotations(latestSignal)
          showSnackbar(
            `📊 Nueva señal ${latestSignal.signal_type.toUpperCase()} para ${latestSignal.symbol} ` +
              `(${analysisTimeframe}) - Lote: ${latestSignal.calculated_lot_size}, Riesgo: $${latestSignal.max_risk_amount}`,
            "success",
          )
        } else {
          showSnackbar(
            `No se detectaron confluencias suficientes en ${analysisTimeframe} (Umbral: ${(analysisConfig.confluence_threshold * 100).toFixed(0)}%)`,
            "info",
          )
        }
      }
    } catch (error) {
      console.error("Error en análisis IA:", error)
      if (mountedRef.current) {
        showSnackbar(`Error en análisis IA: ${error.message || "Error desconocido"}`, "error")
      }
    } finally {
      if (mountedRef.current) {
        setAnalyzing(false)
      }
    }
    console.log("Analizando con IA con la cuenta:", mt5Session.login);
  }

  // ✅ Función para crear anotaciones en el gráfico
  const createChartAnnotations = (signal) => {
    if (!signal || !chartData) return

    const annotations = []
    const currentPrice = signal.entry_price

    // Línea de entrada
    annotations.push({
      type: "line",
      yMin: currentPrice,
      yMax: currentPrice,
      borderColor: signal.signal_type.toLowerCase() === "buy" ? "#00ff88" : "#ff4444",
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        content: `Entrada: ${currentPrice.toFixed(selectedPair.includes("JPY") ? 2 : 5)}`,
        enabled: true,
        position: "end",
      },
    })

    if (signal.stop_loss) {
      annotations.push({
        type: "line",
        yMin: signal.stop_loss,
        yMax: signal.stop_loss,
        borderColor: "#ff4444",
        borderWidth: 1,
        borderDash: [3, 3],
        label: {
          content: `SL: ${signal.stop_loss.toFixed(selectedPair.includes("JPY") ? 2 : 5)}`,
          enabled: true,
          position: "end",
        },
      })
    }

    if (signal.take_profit) {
      annotations.push({
        type: "line",
        yMin: signal.take_profit,
        yMax: signal.take_profit,
        borderColor: "#00ff88",
        borderWidth: 1,
        borderDash: [3, 3],
        label: {
          content: `TP: ${signal.take_profit.toFixed(selectedPair.includes("JPY") ? 2 : 5)}`,
          enabled: true,
          position: "end",
        },
      })
    }

    setChartAnnotations(annotations)
  }

  // ✅ Función para generar explicación en lenguaje natural
  const generateNaturalLanguageExplanation = (signal) => {
    if (!signal || !signal.technical_analyses) return "No hay análisis disponible."

    let explanation = `Esta señal de ${signal.signal_type.toUpperCase()} para ${signal.symbol} tiene una confluencia del ${(signal.confluence_score * 100).toFixed(0)}%, lo que indica `

    if (signal.confluence_score >= 0.8) {
      explanation += "una oportunidad muy sólida con múltiples confirmaciones técnicas. "
    } else if (signal.confluence_score >= 0.6) {
      explanation += "una oportunidad moderada con buenas confirmaciones técnicas. "
    } else {
      explanation += "una oportunidad con confirmaciones técnicas limitadas. "
    }

    // ✅ NUEVO: Mencionar la temporalidad de análisis
    if (signal.analysis_timeframe) {
      explanation += `\n\nEste análisis se realizó en temporalidad ${signal.analysis_timeframe}, `

      switch (signal.analysis_timeframe) {
        case "M1":
        case "M5":
          explanation += "optimizada para scalping con mayor peso en soportes/resistencias y patrones de corto plazo. "
          break
        case "M15":
        case "M30":
          explanation += "balanceada para trading intraday con análisis equilibrado. "
          break
        case "H1":
          explanation += "enfocada en swing trading corto con énfasis en Elliott Wave y Fibonacci. "
          break
        case "H4":
          explanation += "orientada a swing trading medio con dominio de análisis Elliott Wave. "
          break
        case "D1":
        case "W1":
          explanation += "diseñada para swing trading de largo plazo con análisis estructural profundo. "
          break
      }
    }

    // Análisis Elliott Wave
    const elliottAnalysis = signal.technical_analyses.find((a) => a.type === "elliott_wave")
    if (elliottAnalysis && elliottAnalysis.data) {
      explanation += `\n\nAnálisis de Ondas Elliott: El mercado muestra un patrón ${elliottAnalysis.data.pattern?.direction || "indefinido"} `
      explanation += `en estado de ${elliottAnalysis.data.market_state || "análisis"}. `

      if (elliottAnalysis.data.pattern?.waves && elliottAnalysis.data.pattern.waves.length >= 5) {
        explanation += `Se han identificado las 5 ondas principales del patrón, con la onda 5 completándose cerca de ${elliottAnalysis.data.pattern.waves[4]?.price}. `
      }

      if (elliottAnalysis.data.targets && elliottAnalysis.data.targets.length > 0) {
        const mainTarget = elliottAnalysis.data.targets[0]
        explanation += `El objetivo principal se encuentra en ${mainTarget.price.toFixed(selectedPair.includes("JPY") ? 2 : 5)} con una probabilidad del ${(mainTarget.probability * 100).toFixed(0)}%. `
      }
    }

    // Análisis Fibonacci
    const fibAnalysis = signal.technical_analyses.find((a) => a.type === "fibonacci")
    if (fibAnalysis && fibAnalysis.data) {
      explanation += `\n\nNiveles Fibonacci: El precio se encuentra operando entre los niveles de ${fibAnalysis.data.swing_low?.toFixed(selectedPair.includes("JPY") ? 2 : 5)} y ${fibAnalysis.data.swing_high?.toFixed(selectedPair.includes("JPY") ? 2 : 5)}. `

      if (fibAnalysis.data.levels && fibAnalysis.data.levels.length > 0) {
        const strongestLevel = fibAnalysis.data.levels.reduce((prev, current) =>
          current.strength > prev.strength ? current : prev,
        )
        explanation += `El nivel más fuerte se encuentra en ${strongestLevel.price.toFixed(selectedPair.includes("JPY") ? 2 : 5)} (${(strongestLevel.ratio * 100).toFixed(1)}% Fibonacci) con una fuerza del ${(strongestLevel.strength * 100).toFixed(0)}%. `
      }
    }

    // Análisis Soportes y Resistencias
    const srAnalysis = signal.technical_analyses.find((a) => a.type === "support_resistance")
    if (srAnalysis && srAnalysis.data && srAnalysis.data.levels) {
      const resistances = srAnalysis.data.levels.filter((l) => l.type === "resistance").length
      const supports = srAnalysis.data.levels.filter((l) => l.type === "support").length

      explanation += `\n\nSoportes y Resistencias: Se han identificado ${supports} niveles de soporte y ${resistances} niveles de resistencia. `

      const strongestLevel = srAnalysis.data.levels.reduce((prev, current) =>
        current.touches > prev.touches ? current : prev,
      )

      if (strongestLevel) {
        explanation += `El nivel más significativo es una ${strongestLevel.type} en ${strongestLevel.price.toFixed(selectedPair.includes("JPY") ? 2 : 5)}, que ha sido tocada ${strongestLevel.touches} veces, indicando su importancia. `
      }
    }

    explanation += `\n\nRecomendación de Trading: `
    if (signal.signal_type.toLowerCase() === "buy") {
      explanation += `Se recomienda una posición de COMPRA con entrada en ${signal.entry_price?.toFixed(selectedPair.includes("JPY") ? 2 : 5)}, `
    } else {
      explanation += `Se recomienda una posición de VENTA con entrada en ${signal.entry_price?.toFixed(selectedPair.includes("JPY") ? 2 : 5)}, `
    }

    explanation += `stop loss en ${signal.stop_loss?.toFixed(selectedPair.includes("JPY") ? 2 : 5)} `
    explanation += `y take profit en ${signal.take_profit?.toFixed(selectedPair.includes("JPY") ? 2 : 5)}. `

    // Calcular risk/reward
    if (signal.entry_price && signal.stop_loss && signal.take_profit) {
      const risk = Math.abs(signal.entry_price - signal.stop_loss)
      const reward = Math.abs(signal.take_profit - signal.entry_price)
      const rrRatio = reward / risk

      explanation += `Esta configuración ofrece una relación riesgo/beneficio de 1:${rrRatio.toFixed(2)}, `

      if (rrRatio >= 2) {
        explanation += `lo cual es excelente para la gestión de riesgo.`
      } else if (rrRatio >= 1.5) {
        explanation += `lo cual es aceptable para esta oportunidad.`
      } else {
        explanation += `por lo que se recomienda evaluar cuidadosamente el riesgo.`
      }
    }

    return explanation
  }

  // ✅ MEJORADO: WebSocket con reconexión automática
  const connectWebSocket = useCallback(() => {
    if (!user?.id || !mountedRef.current) return

    const wsUrl = `ws://127.0.0.1:8000/api/signals/ws/${user.id}`
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      if (mountedRef.current) {
        setConnectionStatus("connected")
        setReconnectAttempts(0)
        showSnackbar("🟢 Conectado a análisis en tiempo real", "success")
        startRealTimePriceUpdates()
      }
    }

    wsRef.current.onmessage = (event) => {
      if (!mountedRef.current) return

      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error("Error procesando mensaje WebSocket:", error)
      }
    }

    wsRef.current.onclose = () => {
      if (mountedRef.current) {
        setConnectionStatus("disconnected")
        stopRealTimePriceUpdates()

        // ✅ NUEVO: Reconexión automática
        if (realtimeEnabled && reconnectAttempts < realtimeSettings.maxRetries) {
          setReconnectAttempts((prev) => prev + 1)
          showSnackbar(
            `🔄 Reconectando... (Intento ${reconnectAttempts + 1}/${realtimeSettings.maxRetries})`,
            "warning",
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && realtimeEnabled) {
              connectWebSocket()
            }
          }, realtimeSettings.reconnectDelay)
        } else if (reconnectAttempts >= realtimeSettings.maxRetries) {
          showSnackbar("❌ Máximo de intentos de reconexión alcanzado", "error")
          setRealtimeEnabled(false)
        }
      }
    }

    wsRef.current.onerror = (error) => {
      console.error("Error WebSocket:", error)
      if (mountedRef.current) {
        setConnectionStatus("error")
        stopRealTimePriceUpdates()
      }
    }
  }, [user?.id, realtimeEnabled, reconnectAttempts, realtimeSettings.maxRetries, realtimeSettings.reconnectDelay])

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setConnectionStatus("disconnected")
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    stopRealTimePriceUpdates()
  }

  // ✅ MEJORADO: Manejo de mensajes WebSocket con señales detalladas
  const handleWebSocketMessage = (data) => {
    if (!mountedRef.current) return

    switch (data.type) {
      case "new_signals":
      case "new_realtime_signals":
        // eslint-disable-next-line no-case-declarations
        const newSignals = data.signals || []
        setSignals((prev) => [...newSignals, ...prev].slice(0, 50))

        if (newSignals.length > 0) {
          const latestSignal = newSignals[0]
          setSelectedSignalDetails(latestSignal)
          setSignalDetailsOpen(true)
          createChartAnnotations(latestSignal)
        }

        showSnackbar(`📊 Nueva señal para ${data.pair}`, "info")
        break
      case "signals_update":
        setSignals(data.signals || [])
        break
      case "price_update":
        updateChartWithRealPrice(data)
        break
      default:
        console.log("Mensaje WebSocket no manejado:", data)
    }
  }

  // ✅ MEJORADA: Actualizaciones de precio en tiempo real
  const startRealTimePriceUpdates = useCallback(() => {
    if (priceUpdateInterval.current) {
      clearInterval(priceUpdateInterval.current)
    }
    // Configurar intervalo para actualizaciones periódicas
    priceUpdateInterval.current = setInterval(() => {
      if (mountedRef.current && realtimeEnabled) {
        updateMultiplePairPrices() // Usar esta función en lugar de getMT5Data
      }
    }, realtimeSettings.updateInterval)

    // Actualizar inmediatamente
    updateMultiplePairPrices()
  }, [realtimeEnabled, realtimeSettings.updateInterval, updateMultiplePairPrices])

  const stopRealTimePriceUpdates = () => {
    if (priceUpdateInterval.current) {
      clearInterval(priceUpdateInterval.current)
      priceUpdateInterval.current = null
    }
  }

  // ✅ CORREGIDA: Simulación de precio actualizada
  const simulatePriceUpdate = () => {
    if (!chartData || !chartData.datasets[0] || !realtimeEnabled) return

    const lastPoint = chartData.datasets[0].data[chartData.datasets[0].data.length - 1]
    if (!lastPoint) return

    const volatility = selectedPair.includes("JPY") ? 0.1 : 0.0001
    const change = (Math.random() - 0.5) * volatility
    const newPrice = Math.max(lastPoint.y + change, 0.0001)
    const formattedPrice = Number.parseFloat(newPrice.toFixed(selectedPair.includes("JPY") ? 2 : 5))

    // ✅ CORREGIDO: Actualizar precio actual en simulación
    setRealTimePrice(formattedPrice)
    setLastPriceUpdate(new Date())
    setDataFreshness("simulated")

    updateChartWithRealPrice({
      price: formattedPrice,
      timestamp: new Date(),
      isRealTime: false,
    })
  }

  const updateChartWithRealPrice = useCallback(
    (priceData) => {
      if (!priceData || !priceData.price || !mountedRef.current) return
      // Actualizar el estado del precio en tiempo real
      setRealTimePrice(priceData.price)
      setLastPriceUpdate(new Date())

      // Actualizar el gráfico solo si tenemos datos y una instancia del gráfico
      setChartData((prevData) => {
        if (!prevData || !prevData.datasets || !prevData.datasets[0]) {
          return prevData
        }

        const newPoint = {
          x: priceData.timestamp || new Date(),
          y: Number.parseFloat(priceData.price.toFixed(selectedPair.includes("JPY") ? 2 : 5)),
        }

        // Crear una copia profunda de los datos del gráfico
        const newChartData = JSON.parse(JSON.stringify(prevData))

        // Actualizar los datos principales
        newChartData.datasets[0].data = [...newChartData.datasets[0].data.slice(-99), newPoint]
        newChartData.labels = newChartData.datasets[0].data.map((point) => point.x)

        // Actualizar indicadores si están habilitados
        if (indicators.sma20 && newChartData.datasets[0].data.length >= 20) {
          const sma20Data = calculateSMA(newChartData.datasets[0].data, 20)
          if (newChartData.datasets[1]) {
            newChartData.datasets[1].data = sma20Data
          }
        }

        return newChartData
      })

      // Forzar actualización del chart
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.update()
        } catch (error) {
          console.error("Error updating chart:", error)
          // Si hay error al actualizar, forzar un reset del chart
          resetChart()
        }
      }
    },
    [selectedPair, indicators, resetChart],
  )

  // Actualizar indicadores cuando cambien
  useEffect(() => {
    if (chartData && chartData.datasets[0]) {
      const priceData = chartData.datasets[0].data
      const newChartData = processRealMT5Data({
        candles: priceData.map((point) => ({ time: point.x, close: point.y })),
      })
      if (newChartData) {
        newChartData.datasets[0].data = priceData
        setChartData(newChartData)
      }
    }
  }, [indicators])

  // ✅ MEJORADO: Manejo seguro de referencia del chart
  const handleChartRef = useCallback((chartElement) => {
    if (chartElement && mountedRef.current) {
      try {
        if (chartElement.canvas && chartElement.canvas.ownerDocument) {
          console.log("Chart reference acquired")
          chartInstanceRef.current = chartElement
        } else {
          console.warn("Chart element does not have valid DOM reference")
        }
      } catch (error) {
        console.error("Error setting chart reference:", error)
      }
    }
  }, [])

  // ✅ MEJORADAS: Opciones del chart con anotaciones y manejo de errores
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: realtimeEnabled ? 0 : 750,
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#ffffff",
            font: {
              size: 12,
            },
            filter: (legendItem) => legendItem.text !== "undefined",
          },
          onClick: (e, legendItem, legend) => {
            try {
              if (legend.chart && legend.chart.canvas && legend.chart.canvas.ownerDocument) {
                const index = legendItem.datasetIndex
                const chart = legend.chart
                const meta = chart.getDatasetMeta(index)
                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null
                chart.update()
              }
            } catch (error) {
              console.warn("Error in legend click:", error)
            }
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#00ffff",
          bodyColor: "#ffffff",
          borderColor: "#00ffff",
          borderWidth: 1,
          callbacks: {
            title: (context) => {
              if (!context || !context[0]) return ""
              return new Date(context[0].parsed.x).toLocaleString()
            },
            label: (context) => {
              const value = context.parsed.y
              if (value === null || value === undefined) return ""
              const decimals = selectedPair.includes("JPY") ? 2 : 5
              return `${context.dataset.label}: ${value.toFixed(decimals)}`
            },
          },
        },
        annotation: {
          annotations: chartAnnotations.reduce((acc, annotation, index) => {
            acc[`annotation${index}`] = annotation
            return acc
          }, {}),
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: timeframe.includes("M") ? "minute" : "hour",
            displayFormats: {
              minute: "HH:mm",
              hour: "HH:mm",
              day: "MMM dd",
            },
          },
          grid: {
            color: "rgba(0, 255, 255, 0.1)",
            borderColor: "rgba(0, 255, 255, 0.3)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            maxTicksLimit: 10,
          },
        },
        y: {
          position: "right",
          grid: {
            color: "rgba(0, 255, 255, 0.1)",
            borderColor: "rgba(0, 255, 255, 0.3)",
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            callback: (value) => {
              const decimals = selectedPair.includes("JPY") ? 2 : 5
              return typeof value === "number" ? value.toFixed(decimals) : value
            },
          },
        },
      },
    }),
    [realtimeEnabled, selectedPair, timeframe, chartAnnotations],
  )

  // ✅ Función para ejecutar señal
  const executeSignal = async (signal) => {
    try {
      showSnackbar(`Ejecutando señal ${signal.signal_type.toUpperCase()} para ${signal.symbol}...`, "info")

      const response = await api.executeOrder({
        symbol: signal.symbol,
        signal_type: signal.signal_type,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit: signal.take_profit,
        lot_size: 0.1,
      })

      if (response.success) {
        showSnackbar(
          `Orden ${signal.signal_type.toUpperCase()} ejecutada exitosamente - Ticket: ${response.ticket}`,
          "success",
        )
      } else {
        showSnackbar(`Error ejecutando orden: ${response.error}`, "error")
      }
    } catch (error) {
      console.error("Error ejecutando señal:", error)
      showSnackbar("Error al ejecutar la orden", "error")
    }
  }

  const getSignalTypeColor = (signalType) => {
    switch (signalType?.toLowerCase()) {
      case "buy":
        return "#00ff88"
      case "sell":
        return "#ff4444"
      default:
        return "#ffaa00"
    }
  }

  const getConfluenceColor = (score) => {
    if (score >= 0.8) return "#00ff88"
    if (score >= 0.6) return "#ffaa00"
    return "#ff4444"
  }

  // ✅ NUEVO: Función para obtener color de calidad de conexión
  const getConnectionQualityColor = (quality) => {
    switch (quality) {
      case "excellent":
        return "#00ff88"
      case "good":
        return "#00ffff"
      case "poor":
        return "#ffaa00"
      case "disconnected":
        return "#ff4444"
      default:
        return "#ffffff"
    }
  }

  // ✅ NUEVO: Función para obtener color de frescura de datos
  const getDataFreshnessColor = (freshness) => {
    switch (freshness) {
      case "fresh":
        return "#00ff88"
      case "recent":
        return "#ffaa00"
      case "stale":
        return "#ff4444"
      case "simulated":
        return "#9c27b0"
      default:
        return "#ffffff"
    }
  }

  // ✅ NUEVO: Componente mejorado para mostrar el gráfico
  const ChartImageComponent = ({ signal, imageUrl, isLoading, onRetry }) => {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    const handleImageLoad = useCallback(() => {
      setImageLoading(false)
      setImageError(false)
    }, [])

    const handleImageError = useCallback(
      (error) => {
        console.error("Error cargando imagen del gráfico:", imageUrl, error)
        setImageLoading(false)
        setImageError(true)
      },
      [imageUrl],
    )

    const handleRetry = useCallback(() => {
      setImageError(false)
      setImageLoading(true)
      onRetry()
    }, [onRetry])

    if (!imageUrl && !isLoading) {
      return (
        <Box
          sx={{
            width: "100%",
            height: 300,
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(0,255,255,0.1)",
            gap: 2,
          }}
        >
          <ImageOutlined sx={{ fontSize: 48, color: "rgba(255,255,255,0.3)" }} />
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
            No se pudo generar el gráfico con análisis técnico
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRetry}
            sx={{
              borderColor: "#00ffff",
              color: "#00ffff",
              "&:hover": { backgroundColor: "rgba(0,255,255,0.1)" },
            }}
          >
            Reintentar
          </Button>
        </Box>
      )
    }

    return (
      <Box
        sx={{
          width: "100%",
          height: 300,
          backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(0,255,255,0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Loading overlay */}
        {(isLoading || imageLoading) && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 2,
            }}
          >
            <CircularProgress sx={{ color: "#00ffff", mb: 2 }} />
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Generando gráfico con análisis técnico...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {imageError && !isLoading && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              textAlign: "center",
              p: 2,
            }}
          >
            <Warning sx={{ fontSize: 48, color: "#ffaa00" }} />
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Error cargando el gráfico
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRetry}
              sx={{
                borderColor: "#00ffff",
                color: "#00ffff",
                "&:hover": { backgroundColor: "rgba(0,255,255,0.1)" },
              }}
            >
              Reintentar
            </Button>
          </Box>
        )}

        {/* Image */}
        {imageUrl && !imageError && (
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={`Gráfico con análisis técnico para ${signal.symbol}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 8,
              display: imageLoading ? "none" : "block",
            }}
            crossOrigin="anonymous"
          />
        )}
      </Box>
    )
  }

  // ✅ NUEVO: Componente de estado de tiempo real mejorado
  const RealTimeStatusPanel = () => {
    return (
      <Card
        sx={{
          backgroundColor: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,255,255,0.2)",
          mb: 2,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: "#00ffff", mb: 2, display: "flex", alignItems: "center" }}>
            <NetworkCheck sx={{ mr: 1 }} />
            Estado de Tiempo Real
          </Typography>

          <Grid container spacing={2}>
            {/* Estado de Conexión */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: getConnectionQualityColor(connectionQuality),
                    animation: connectionStatus === "connected" ? "pulse 2s infinite" : "none",
                  }}
                />
                <Typography variant="body2" sx={{ color: "#ffffff" }}>
                  <strong>Conexión:</strong> {connectionStatus === "connected" ? "Conectado" : "Desconectado"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <SignalCellular4Bar
                  sx={{
                    fontSize: 16,
                    color: getConnectionQualityColor(connectionQuality),
                  }}
                />
                <Typography variant="body2" sx={{ color: "#ffffff" }}>
                  <strong>Calidad:</strong> {connectionQuality}
                </Typography>
              </Box>
            </Grid>

            {/* Datos de Precio */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Update
                  sx={{
                    fontSize: 16,
                    color: getDataFreshnessColor(dataFreshness),
                  }}
                />
                <Typography variant="body2" sx={{ color: "#ffffff" }}>
                  <strong>Datos:</strong>{" "}
                  {dataFreshness === "fresh"
                    ? "En vivo"
                    : dataFreshness === "recent"
                      ? "Recientes"
                      : dataFreshness === "simulated"
                        ? "Simulados"
                        : "Obsoletos"}
                </Typography>
              </Box>

              {priceLatency > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Speed sx={{ fontSize: 16, color: priceLatency < 1000 ? "#00ff88" : "#ffaa00" }} />
                  <Typography variant="body2" sx={{ color: "#ffffff" }}>
                    <strong>Latencia:</strong> {priceLatency}ms
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Estadísticas */}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <strong>Ticks:</strong> {tickCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <strong>Última actualización:</strong>{" "}
                  {lastPriceUpdate ? lastPriceUpdate.toLocaleTimeString() : "N/A"}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <strong>Intervalo:</strong> {realtimeSettings.updateInterval}ms
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    )
  }

  // ✅ COMPONENTE MEJORADO: SignalDetailsDialog optimizado sin parpadeos y con cálculo correcto de pips
  const SignalDetailsDialog = React.memo(() => {
    // Memoizar la señal para evitar cambios de referencia innecesarios
    const signal = useMemo(() => selectedSignalDetails, [selectedSignalDetails])
    // ID único de la señal para evitar regeneraciones innecesarias
    const signalId = useMemo(() => {
      if (!signal) return null
      return `${signal._id || signal.id}-${signal.symbol}-${signal.timeframe}-${signal.created_at}`
    }, [signal])

    // ✅ NUEVO: Estados locales optimizados para evitar parpadeos
    const [localStates, setLocalStates] = useState({
      isUpdatingPrice: false,
      lastManualUpdate: null,
      imageGenerationAttempted: false,
      localChartImageUrl: null,
      localChartImageLoading: false,
      localChartImageError: false,
    })

    // ✅ MEJORADO: Obtener precio actual específico para la señal (memoizado para evitar recálculos)
    const currentPriceForSignal = useMemo(() => {
      if (!signal) return null
      // Primero intentar obtener el precio del estado de precios múltiples
      const pairPrice = multiPairPrices[signal.symbol]
      if (pairPrice && pairPrice.price) {
        return pairPrice.price
      }
      // Si la señal es del mismo par que está seleccionado, usar el precio en tiempo real
      if (signal.symbol === selectedPair && realTimePrice) {
        return realTimePrice
      }
      // Como último recurso, generar un precio simulado basado en el precio de entrada
      if (signal.entry_price) {
        const volatility = signal.symbol.includes("JPY") ? 0.5 : 0.0005
        const change = (Math.random() - 0.5) * volatility
        const simulatedPrice = signal.entry_price + change
        return Number.parseFloat(simulatedPrice.toFixed(signal.symbol.includes("JPY") ? 2 : 5))
      }
      return null
    }, [signal, multiPairPrices, selectedPair, realTimePrice])

    // ✅ CORREGIDO: Calcular diferencia y porcentaje considerando BUY/SELL
    const priceDifference = useMemo(() => {
      if (!signal || !currentPriceForSignal || !signal.entry_price || !signal.signal_type) return null
      const entryPrice = signal.entry_price
      const currentPrice = currentPriceForSignal
      const signalType = signal.signal_type.toLowerCase()
      let diff, percentage, isProfit

      if (signalType === "buy") {
        // Para BUY: ganancia cuando precio actual > precio entrada
        diff = currentPrice - entryPrice
        percentage = (diff / entryPrice) * 100
        isProfit = diff > 0
      } else if (signalType === "sell") {
        // Para SELL: ganancia cuando precio actual < precio entrada
        diff = entryPrice - currentPrice
        percentage = (diff / entryPrice) * 100
        isProfit = diff > 0
      } else {
        // Fallback para tipos desconocidos
        diff = currentPrice - entryPrice
        percentage = (diff / entryPrice) * 100
        isProfit = diff > 0
      }

      return {
        absolute: diff,
        percentage: percentage,
        isProfit: isProfit,
        signalType: signalType,
      }
    }, [signal, currentPriceForSignal])

    // ✅ CORREGIDO: Calcular pips correctamente para JPY y considerando BUY/SELL
    const pipsCalculation = useMemo(() => {
      if (!priceDifference || !signal) return null
      const isJPY = signal.symbol.includes("JPY")
      // ✅ CORREGIDO: Valor de pip correcto para JPY vs no-JPY
      const pipValue = isJPY ? 0.01 : 0.0001
      // Calcular pips basado en la diferencia absoluta
      const pips = Math.abs(priceDifference.absolute) / pipValue
      // ✅ NUEVO: Información adicional sobre el cálculo
      const pipInfo = {
        pips: pips.toFixed(1),
        isJPY: isJPY,
        pipValue: pipValue,
        signalType: priceDifference.signalType,
        isProfit: priceDifference.isProfit,
        // ✅ NUEVO: Valor monetario aproximado del movimiento en pips
        pipValueUSD: isJPY ? pips * 0.91 : pips * 1.0, // Aproximación
        direction: priceDifference.isProfit ? "favorable" : "desfavorable",
      }
      return pipInfo
    }, [priceDifference, signal])

    // ✅ OPTIMIZADO: Función para actualizar precio manualmente sin causar parpadeos
    const handleUpdatePrice = useCallback(async () => {
      if (!signal || !signal.symbol || localStates.isUpdatingPrice) return
      // ✅ OPTIMIZACIÓN: Actualizar estado local inmediatamente para evitar parpadeo
      setLocalStates((prev) => ({ ...prev, isUpdatingPrice: true }))
      try {
        console.log(`🔄 Actualizando precio manualmente para ${signal.symbol}...`)
        // Forzar actualización del precio
        await getMT5DataForPair(signal.symbol, true)
        // ✅ OPTIMIZACIÓN: Actualizar estados locales sin afectar el componente padre
        setLocalStates((prev) => ({
          ...prev,
          lastManualUpdate: new Date(),
          isUpdatingPrice: false,
        }))
        showSnackbar(`✅ Precio actualizado para ${signal.symbol}`, "success")
      } catch (error) {
        console.error("❌ Error actualizando precio:", error)
        showSnackbar(`❌ Error actualizando precio de ${signal.symbol}`, "error")
        setLocalStates((prev) => ({ ...prev, isUpdatingPrice: false }))
      }
    }, [signal, localStates.isUpdatingPrice, getMT5DataForPair, showSnackbar])

    // ✅ OPTIMIZADO: Función para limpiar el estado cuando se cierra el modal
    const handleCloseDialog = useCallback(() => {
      setSignalDetailsOpen(false)
      setChartImageUrl(null)
      setChartImageError(false)
      setChartImageLoading(false)
      setImageGenerationAttempted(false)
      setCurrentSignalId(null)
      // Limpiar estados locales
      setLocalStates({
        isUpdatingPrice: false,
        lastManualUpdate: null,
        imageGenerationAttempted: false,
        localChartImageUrl: null,
        localChartImageLoading: false,
        localChartImageError: false,
      })
    }, [
      setSignalDetailsOpen,
      setChartImageUrl,
      setChartImageError,
      setChartImageLoading,
      setImageGenerationAttempted,
      setCurrentSignalId,
    ])

    // ✅ OPTIMIZADO: Función para reintentar la generación de imagen
    const handleRetryChartImage = useCallback(() => {
      if (signal) {
        setLocalStates((prev) => ({
          ...prev,
          imageGenerationAttempted: false,
          localChartImageError: false,
          localChartImageUrl: null,
        }))
        setChartImageError(false)
        setChartImageUrl(null)
        setCurrentSignalId(null)
        console.log("Reintentando generación de imagen para:", signal.symbol)
        generateChartImage(signal)
      }
    }, [signal, generateChartImage, setChartImageUrl, setChartImageError, setCurrentSignalId])

    // ✅ OPTIMIZADO: Efecto para generar imagen solo una vez por señal
    useEffect(() => {
      if (
        signalDetailsOpen &&
        signal &&
        signalId &&
        !localStates.imageGenerationAttempted &&
        currentSignalId !== signalId
      ) {
        console.log("Generando imagen del gráfico para señal:", signalId)
        setLocalStates((prev) => ({ ...prev, imageGenerationAttempted: true }))
        generateChartImage(signal)
      }
    }, [signalDetailsOpen, signalId, localStates.imageGenerationAttempted, currentSignalId, generateChartImage, signal])

    // ✅ OPTIMIZADO: Efecto para limpiar estado cuando se cierra el modal
    useEffect(() => {
      if (!signalDetailsOpen) {
        setLocalStates((prev) => ({
          ...prev,
          imageGenerationAttempted: false,
          isUpdatingPrice: false,
          lastManualUpdate: null,
        }))
      }
    }, [signalDetailsOpen])

    // ✅ OPTIMIZADO: Efecto para actualizar precio de la señal cuando se abre el modal (solo una vez)
    useEffect(() => {
      if (signalDetailsOpen && signal && signal?.symbol && !multiPairPrices[signal.symbol]) {
        // Solo actualizar si no hay precio previo para evitar bucle
        console.log("Obteniendo precio inicial para señal:", signal.symbol)
        getMT5DataForPair(signal.symbol)
      }
    }, [signalDetailsOpen, signal, multiPairPrices, getMT5DataForPair])

    // ✅ OPTIMIZADO: Determinar si los datos de esta señal específica están en tiempo real (memoizado)
    const signalDataStatus = useMemo(() => {
      if (!signal) return { isLive: false, status: "unknown", quality: "unknown" }
      const pairData = multiPairPrices[signal.symbol]
      // Si es el par seleccionado y tiempo real está habilitado
      if (signal.symbol === selectedPair && realtimeEnabled && connectionStatus === "connected") {
        return {
          isLive: dataFreshness === "fresh" && !pairData?.simulated,
          status: pairData?.simulated ? "simulated" : dataFreshness,
          quality: connectionQuality,
          isSelectedPair: true,
          source: pairData?.source || "unknown",
        }
      }
      // Si hay datos específicos para este par
      if (pairData) {
        const dataAge = Date.now() - new Date(pairData.timestamp).getTime()
        let status = "stale"
        if (pairData.simulated) {
          status = "simulated"
        } else if (dataAge < 2000) {
          status = "fresh"
        } else if (dataAge < 10000) {
          status = "recent"
        }
        return {
          isLive: pairData.isRealTime && status === "fresh" && !pairData.simulated,
          status: status,
          quality: pairData.quality || "unknown",
          isSelectedPair: false,
          latency: pairData.latency,
          source: pairData.source || "unknown",
        }
      }
      // Sin datos específicos
      return {
        isLive: false,
        status: "no_data",
        quality: "unknown",
        isSelectedPair: false,
        source: "none",
      }
    }, [signal, multiPairPrices, selectedPair, realtimeEnabled, connectionStatus, dataFreshness, connectionQuality])

    // ✅ OPTIMIZADO: Generar explicación en lenguaje natural (memoizada)
    const naturalExplanation = useMemo(() => {
      return generateNaturalLanguageExplanation(signal)
    }, [signal])

    if (!signal) return null

    return (
      <Dialog
        open={signalDetailsOpen}
        onClose={handleCloseDialog}
        maxWidth="xl"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "rgba(0,0,0,0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(0,255,255,0.3)",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ color: "#00ffff", borderBottom: "1px solid rgba(0,255,255,0.2)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h5">
              Señal {signal.signal_type?.toUpperCase()} - {signal.symbol}
              {/* ✅ NUEVO: Mostrar temporalidad de análisis */}
              {signal.analysis_timeframe && (
                <Chip
                  label={`Análisis: ${aiSettings.analysisTimeframe}`}
                  sx={{
                    ml: 2,
                    backgroundColor: "#9c27b0",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
              )}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Chip
                label={`Confluencia: ${((signal.confluence_score || 0) * 100).toFixed(0)}%`}
                sx={{
                  backgroundColor: getConfluenceColor(signal.confluence_score || 0) + "20",
                  color: getConfluenceColor(signal.confluence_score || 0),
                  border: `1px solid ${getConfluenceColor(signal.confluence_score || 0)}40`,
                }}
              />
              <IconButton onClick={handleCloseDialog} sx={{ color: "#ffffff" }}>
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ color: "#ffffff", p: 3 }}>
          <Grid container spacing={3}>
            {/* Panel de imagen del gráfico */}
            <Grid item xs={12} md={4}>
              <Card sx={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)", mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    <ImageOutlined sx={{ mr: 1, verticalAlign: "middle" }} />
                    Gráfico con Análisis
                  </Typography>

                  {/* Componente mejorado para mostrar la imagen */}
                  <ChartImageComponent
                    signal={signal}
                    imageUrl={chartImageUrl}
                    isLoading={chartImageLoading}
                    onRetry={handleRetryChartImage}
                  />

                  {/* Información básica de trading */}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="h6" sx={{ color: "#00ffff" }}>
                        Información de Trading
                      </Typography>
                      {/* ✅ OPTIMIZADO: Botón para actualizar precio */}
                      <Tooltip title="Actualizar precio actual">
                        <IconButton
                          onClick={handleUpdatePrice}
                          disabled={localStates.isUpdatingPrice}
                          size="small"
                          sx={{
                            color: "#00ffff",
                            backgroundColor: "rgba(0,255,255,0.1)",
                            border: "1px solid rgba(0,255,255,0.3)",
                            "&:hover": {
                              backgroundColor: "rgba(0,255,255,0.2)",
                            },
                            "&:disabled": {
                              color: "rgba(0,255,255,0.5)",
                            },
                          }}
                        >
                          {localStates.isUpdatingPrice ? (
                            <CircularProgress size={16} sx={{ color: "#00ffff" }} />
                          ) : (
                            <Refresh sx={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="body2" sx={{ color: "#00ff88" }}>
                        <strong>Entrada:</strong>{" "}
                        {signal.entry_price?.toFixed(signal.symbol.includes("JPY") ? 2 : 5) || "N/A"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#ff4444" }}>
                        <strong>Stop Loss:</strong>{" "}
                        {signal.stop_loss?.toFixed(signal.symbol.includes("JPY") ? 2 : 5) || "N/A"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#00ff88" }}>
                        <strong>Take Profit:</strong>{" "}
                        {signal.take_profit?.toFixed(signal.symbol.includes("JPY") ? 2 : 5) || "N/A"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#ffffff" }}>
                        <strong>Timeframe:</strong> {signal.timeframe || signal.analysis_timeframe || "N/A"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#ffffff" }}>
                        <strong>Estado:</strong> {signal.status || "Activo"}
                      </Typography>

                      {/* ✅ OPTIMIZADO: Mostrar precio actual específico para la señal */}
                      {currentPriceForSignal && (
                        <Box
                          sx={{
                            backgroundColor: "rgba(0,255,255,0.1)",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(0,255,255,0.3)",
                            position: "relative",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#00ffff",
                              fontWeight: "bold",
                              mb: 1,
                            }}
                          >
                            <strong>Precio Actual:</strong>{" "}
                            {currentPriceForSignal.toFixed(signal.symbol.includes("JPY") ? 2 : 5)}
                            {/* Chips de estado optimizados */}
                            {signalDataStatus.isLive && signalDataStatus.status === "fresh" && (
                              <Chip
                                label="🔴 EN VIVO"
                                size="small"
                                sx={{
                                  ml: 1,
                                  backgroundColor: "#00ff88",
                                  color: "#000000",
                                  fontSize: "10px",
                                  height: "16px",
                                  animation: "pulse 2s infinite",
                                }}
                              />
                            )}
                            {!signalDataStatus.isLive && signalDataStatus.status === "recent" && (
                              <Chip
                                label="🟡 RECIENTE"
                                size="small"
                                sx={{
                                  ml: 1,
                                  backgroundColor: "#ffaa00",
                                  color: "#000000",
                                  fontSize: "10px",
                                  height: "16px",
                                }}
                              />
                            )}
                            {signalDataStatus.status === "simulated" && (
                              <Chip
                                label="🟣 SIM"
                                size="small"
                                sx={{
                                  ml: 1,
                                  backgroundColor: "#9c27b0",
                                  color: "#ffffff",
                                  fontSize: "10px",
                                  height: "16px",
                                }}
                              />
                            )}
                          </Typography>
                          {/* ✅ OPTIMIZADO: Mostrar información de actualización manual */}
                          {localStates.lastManualUpdate && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#00ff88",
                                fontSize: "9px",
                                display: "block",
                              }}
                            >
                              ✅ Actualizado manualmente: {localStates.lastManualUpdate.toLocaleTimeString()}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* ✅ MEJORADO: Mostrar diferencia con precio de entrada considerando BUY/SELL */}
                      {priceDifference && (
                        <Box
                          sx={{
                            backgroundColor: "rgba(255,255,255,0.02)",
                            padding: "8px",
                            borderRadius: "4px",
                            border: `1px solid ${priceDifference.isProfit ? "#00ff88" : "#ff4444"}40`,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: priceDifference.isProfit ? "#00ff88" : "#ff4444",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            <strong>Diferencia ({priceDifference.signalType.toUpperCase()}):</strong>{" "}
                            {priceDifference.isProfit ? "+" : ""}
                            {priceDifference.absolute.toFixed(signal.symbol.includes("JPY") ? 2 : 5)}(
                            {priceDifference.isProfit ? "+" : ""}
                            {priceDifference.percentage.toFixed(2)}%)
                          </Typography>
                          {/* ✅ CORREGIDO: Mostrar pips con cálculo correcto */}
                          {pipsCalculation && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: priceDifference.isProfit ? "#00ff88" : "#ff4444",
                                  fontSize: "11px",
                                }}
                              >
                                <strong>Pips:</strong> {priceDifference.isProfit ? "+" : "-"}
                                {pipsCalculation.pips} pips
                                {pipsCalculation.isJPY && (
                                  <Chip
                                    label="JPY"
                                    size="small"
                                    sx={{
                                      ml: 1,
                                      height: "14px",
                                      fontSize: "8px",
                                      backgroundColor: "#ffaa00",
                                      color: "#000000",
                                    }}
                                  />
                                )}
                              </Typography>
                              {/* ✅ NUEVO: Información adicional sobre el cálculo de pips */}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: "9px",
                                  display: "block",
                                  mt: 0.5,
                                }}
                              >
                                Valor pip: {pipsCalculation.pipValue} | Dirección: {pipsCalculation.direction}
                              </Typography>
                            </Box>
                          )}
                          {/* ✅ MEJORADO: Indicador de rendimiento */}
                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgba(255,255,255,0.6)",
                              fontSize: "10px",
                              mt: 0.5,
                            }}
                          >
                            {priceDifference.isProfit ? "📈 Ganando" : "📉 Perdiendo"} | Tipo:{" "}
                            {priceDifference.signalType.toUpperCase()}
                          </Typography>
                        </Box>
                      )}

                      {/* ✅ OPTIMIZADO: Información de última actualización con más detalles */}
                      {multiPairPrices[signal.symbol] && (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            backgroundColor: "rgba(255,255,255,0.02)",
                            borderRadius: "4px",
                            border: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(255,255,255,0.7)",
                              fontSize: "10px",
                              display: "block",
                            }}
                          >
                            <strong>Última actualización:</strong>{" "}
                            {new Date(multiPairPrices[signal.symbol].timestamp).toLocaleTimeString()}
                          </Typography>
                          {multiPairPrices[signal.symbol].latency && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: multiPairPrices[signal.symbol].latency < 1000 ? "#00ff88" : "#ffaa00",
                                fontSize: "10px",
                                display: "block",
                              }}
                            >
                              <strong>Latencia:</strong> {multiPairPrices[signal.symbol].latency}ms
                            </Typography>
                          )}
                          {signalDataStatus.quality !== "unknown" && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: getConnectionQualityColor(signalDataStatus.quality),
                                fontSize: "10px",
                                display: "block",
                              }}
                            >
                              <strong>Calidad:</strong> {signalDataStatus.quality}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Explicación en lenguaje natural */}
            <Grid item xs={12} md={8}>
              <Card sx={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)", mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    <Psychology sx={{ mr: 1, verticalAlign: "middle" }} />
                    Explicación del Análisis
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#ffffff",
                      lineHeight: 1.6,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {naturalExplanation}
                  </Typography>
                </CardContent>
              </Card>

              {/* Análisis técnicos detallados */}
              <Card sx={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    <Analytics sx={{ mr: 1, verticalAlign: "middle" }} />
                    Análisis Técnicos Detallados
                  </Typography>
                  {signal.technical_analyses && signal.technical_analyses.length > 0 ? (
                    signal.technical_analyses.map((analysis, index) => (
                      <Accordion
                        key={`${analysis.type}-${index}`}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          color: "#ffffff",
                          mb: 1,
                          "&:before": { display: "none" },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMore sx={{ color: "#00ffff" }} />}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              width: "100%",
                              mr: 2,
                            }}
                          >
                            <Typography variant="subtitle1">
                              {analysis.type === "elliott_wave" && (
                                <TimelineIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                              )}
                              {analysis.type === "fibonacci" && (
                                <ShowChartOutlined sx={{ mr: 1, verticalAlign: "middle" }} />
                              )}
                              {analysis.type === "support_resistance" && (
                                <TrendingFlat sx={{ mr: 1, verticalAlign: "middle" }} />
                              )}
                              {analysis.description || analysis.type.replace("_", " ").toUpperCase()}
                            </Typography>
                            <Chip
                              label={`${((analysis.confidence || 0) * 100).toFixed(0)}%`}
                              size="small"
                              sx={{
                                backgroundColor: getConfluenceColor(analysis.confidence || 0) + "20",
                                color: getConfluenceColor(analysis.confidence || 0),
                              }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2">Análisis detallado para {analysis.type}</Typography>
                        </AccordionDetails>
                      </Accordion>
                    ))
                  ) : (
                    <Box
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      <Analytics sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                      <Typography variant="body1">No hay análisis técnicos detallados disponibles</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: "1px solid rgba(0,255,255,0.2)" }}>
          <Button onClick={handleCloseDialog} sx={{ color: "#ffffff" }}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            onClick={() => executeSignal(signal)}
            startIcon={<PlayCircleOutline />}
            sx={{
              backgroundColor: getSignalTypeColor(signal.signal_type),
              color: "#000000",
              "&:hover": {
                backgroundColor: getSignalTypeColor(signal.signal_type),
                opacity: 0.8,
              },
            }}
          >
            Ejecutar Señal
          </Button>
        </DialogActions>
      </Dialog>
    )
  })

  // ✅ NUEVO: Añadir displayName para debugging
  SignalDetailsDialog.displayName = "SignalDetailsDialog"

  return (
    <ChartErrorBoundary>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          color: "#ffffff",
          p: 2,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h3" sx={{ color: "#00ffff", fontWeight: "bold", mb: 1 }}>
                📊 Análisis de Gráficos IA - Tiempo Real
              </Typography>
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Trading inteligente con confluencias técnicas y datos en vivo
                {realTimePrice && (
                  <Chip
                    label={`${selectedPair}: ${realTimePrice.toFixed(selectedPair.includes("JPY") ? 2 : 5)}`}
                    sx={{
                      ml: 2,
                      backgroundColor: getDataFreshnessColor(dataFreshness) + "20",
                      color: getDataFreshnessColor(dataFreshness),
                      border: `1px solid ${getDataFreshnessColor(dataFreshness)}40`,
                    }}
                  />
                )}
                {/* ✅ NUEVO: Mostrar temporalidad de análisis configurada */}
                <Chip
                  label={`Análisis: ${aiSettings.analysisTimeframe}`}
                  sx={{
                    ml: 2,
                    backgroundColor: "#9c27b0",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Tooltip title={`Estado: ${connectionStatus} | Calidad: ${connectionQuality}`}>
                <Badge color={connectionStatus === "connected" ? "success" : "error"} variant="dot">
                  <IconButton
                    onClick={() => {
                      setRealtimeEnabled(!realtimeEnabled)
                      if (!realtimeEnabled) {
                        resetChart() // Limpiar el gráfico antes de iniciar tiempo real
                        loadRealChartData().then(() => {
                          startRealTimePriceUpdates()
                        })
                      } else {
                        stopRealTimePriceUpdates()
                      }
                    }}
                  >
                    {realtimeEnabled ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Badge>
              </Tooltip>
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: "#00ffff" }}>
                <Settings />
              </IconButton>
            </Box>
          </Box>

          {/* ✅ NUEVO: Panel de estado de tiempo real */}
          {realtimeEnabled && <RealTimeStatusPanel />}

          {/* ✅ MODIFICADO: Controles principales sin selector de timeframe */}
          <Card
            sx={{
              mb: 3,
              backgroundColor: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(0,255,255,0.2)",
            }}
          >
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: "#00ffff" }}>Par de Divisas</InputLabel>
                    <Select
                      value={selectedPair}
                      onChange={(e) => setSelectedPair(e.target.value)}
                      sx={{
                        color: "#ffffff",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(0,255,255,0.3)",
                        },
                      }}
                    >
                      {availablePairs.map((pair) => (
                        <MenuItem key={pair} value={pair}>
                          {pair}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: "#00ffff" }}>Timeframe Gráfico</InputLabel>
                    <Select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      sx={{
                        color: "#ffffff",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(0,255,255,0.3)",
                        },
                      }}
                    >
                      {timeframes.map((tf) => (
                        <MenuItem key={tf.value} value={tf.value}>
                          {tf.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: "#00ffff" }}>Tipo de Gráfico</InputLabel>
                    <Select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value)}
                      sx={{
                        color: "#ffffff",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(0,255,255,0.3)",
                        },
                      }}
                    >
                      <MenuItem value="candlestick">Velas Japonesas</MenuItem>
                      <MenuItem value="line">Líneas</MenuItem>
                      <MenuItem value="area">Área</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    variant="contained"
                    onClick={analyzeWithAI}
                    disabled={analyzing}
                    startIcon={analyzing ? <CircularProgress size={20} /> : <Psychology />}
                    fullWidth
                    sx={{
                      backgroundColor: "#00ffff",
                      color: "#000000",
                      "&:hover": {
                        backgroundColor: "#00cccc",
                      },
                    }}
                  >
                    {analyzing ? "Analizando..." : "Analizar con IA"}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={1}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      resetChart()
                      loadRealChartData()
                    }}
                    disabled={loading}
                    startIcon={<Refresh />}
                    fullWidth
                    sx={{
                      borderColor: "#00ffff",
                      color: "#00ffff",
                      "&:hover": {
                        borderColor: "#00cccc",
                        backgroundColor: "rgba(0,255,255,0.1)",
                      },
                    }}
                  >
                    Actualizar
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Layout principal */}
          <Grid container spacing={3}>
            {/* Panel lateral */}
            <Grid item xs={12} lg={2.5}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Watchlist */}
                <Card
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(0,255,255,0.2)",
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: "#00ffff" }}>
                      <Star sx={{ mr: 1, verticalAlign: "middle" }} />
                      Watchlist
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {watchlist.map((pair) => (
                        <Button
                          key={pair}
                          variant={selectedPair === pair ? "contained" : "outlined"}
                          onClick={() => setSelectedPair(pair)}
                          size="small"
                          sx={{
                            borderColor: selectedPair === pair ? "#00ff88" : "rgba(255,255,255,0.3)",
                            backgroundColor: selectedPair === pair ? "#00ff88" : "transparent",
                            color: selectedPair === pair ? "#000000" : "#ffffff",
                            "&:hover": {
                              backgroundColor: selectedPair === pair ? "#00cc66" : "rgba(255,255,255,0.1)",
                            },
                          }}
                        >
                          {pair}
                          {multiPairPrices[pair] && (
                            <Chip
                              label={multiPairPrices[pair].price?.toFixed(pair.includes("JPY") ? 2 : 5)}
                              size="small"
                              sx={{
                                ml: 1,
                                height: "16px",
                                fontSize: "10px",
                                backgroundColor: multiPairPrices[pair].isRealTime ? "#00ff88" : "#ffaa00",
                                color: "#000000",
                              }}
                            />
                          )}
                        </Button>
                      ))}
                    </Box>
                  </CardContent>
                </Card>

                {/* Indicadores técnicos */}
                <Card
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(0,255,255,0.2)",
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: "#00ffff" }}>
                      <Assessment sx={{ mr: 1, verticalAlign: "middle" }} />
                      Indicadores
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {Object.entries(indicators)
                        .slice(0, 4)
                        .map(([key, value]) => (
                          <FormControlLabel
                            key={key}
                            control={
                              <Switch
                                checked={value}
                                onChange={(e) => setIndicators((prev) => ({ ...prev, [key]: e.target.checked }))}
                                sx={{
                                  "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "#00ff88",
                                  },
                                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: "#00ff88",
                                  },
                                }}
                              />
                            }
                            label={key.toUpperCase()}
                            sx={{ color: "#ffffff", m: 0 }}
                          />
                        ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Grid>

            {/* Gráfico principal */}
            <Grid item xs={12} lg={6.5}>
              <Card
                sx={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(0,255,255,0.2)",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" sx={{ color: "#00ffff" }}>
                      <ShowChart sx={{ mr: 1, verticalAlign: "middle" }} />
                      {selectedPair} - {timeframe}
                      {realtimeEnabled && connectionStatus === "connected" && (
                        <Chip
                          label={
                            dataFreshness === "fresh"
                              ? "🔴 EN VIVO"
                              : dataFreshness === "recent"
                                ? "🟡 RECIENTE"
                                : dataFreshness === "simulated"
                                  ? "🟣 SIMULADO"
                                  : "⚫ OBSOLETO"
                          }
                          size="small"
                          sx={{
                            ml: 2,
                            backgroundColor: getDataFreshnessColor(dataFreshness),
                            color: dataFreshness === "simulated" ? "#ffffff" : "#000000",
                            animation: dataFreshness === "fresh" ? "pulse 2s infinite" : "none",
                          }}
                        />
                      )}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton onClick={() => setFullscreen(!fullscreen)} sx={{ color: "#00ffff" }}>
                        <Fullscreen />
                      </IconButton>
                    </Box>
                  </Box>
                  {loading ? (
                    <Box sx={{ height: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CircularProgress sx={{ color: "#00ffff" }} />
                      <Typography variant="body1" sx={{ ml: 2, color: "rgba(255,255,255,0.7)" }}>
                        Cargando datos de {selectedPair}...
                      </Typography>
                    </Box>
                  ) : chartData ? (
                    <Box sx={{ height: fullscreen ? "80vh" : 600, position: "relative" }}>
                      <ChartErrorBoundary>
                        {chartData && (
                          <Line
                            key={`chart-${selectedPair}-${timeframe}-${chartKey}-${tickCount}`} // Añadir tickCount para forzar re-render
                            ref={handleChartRef}
                            data={chartData}
                            options={chartOptions}
                            updateMode={realtimeEnabled ? "resize" : "none"}
                            redraw={realtimeEnabled}
                          />
                        )}
                      </ChartErrorBoundary>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 600,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                      }}
                    >
                      <ShowChart sx={{ fontSize: 64, color: "rgba(255,255,255,0.3)" }} />
                      <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)" }}>
                        Selecciona un par para ver el gráfico
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={loadRealChartData}
                        sx={{
                          borderColor: "#00ffff",
                          color: "#00ffff",
                          "&:hover": {
                            backgroundColor: "rgba(0,255,255,0.1)",
                          },
                        }}
                      >
                        Cargar Datos
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Panel de señales */}
            <Grid item xs={12} lg={3}>
              <Card
                sx={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(0,255,255,0.2)",
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" sx={{ color: "#00ffff" }}>
                      <SmartToy sx={{ mr: 1, verticalAlign: "middle" }} />
                      Señales IA
                    </Typography>
                    <Chip
                      label={signals.length}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(0,255,255,0.2)",
                        color: "#00ffff",
                      }}
                    />
                  </Box>
                  <Box sx={{ maxHeight: 600, overflowY: "auto" }}>
                    {signals.length > 0 ? (
                      signals.slice(0, 80).map((signal, index) => (
                        <Card
                          key={signal._id || signal.id || index}
                          sx={{
                            mb: 1,
                            backgroundColor: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            cursor: "pointer",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              backgroundColor: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(0,255,255,0.3)",
                              transform: "translateY(-1px)",
                            },
                          }}
                          onClick={() => {
                            setSelectedSignalDetails(signal)
                            setSignalDetailsOpen(true)
                            if (signal.symbol === selectedPair) {
                              createChartAnnotations(signal)
                            }
                          }}
                        >
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                              <Typography variant="body2" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                                {signal.symbol}
                                {/* ✅ NUEVO: Mostrar temporalidad de análisis en la señal */}
                                {signal.analysis_timeframe && (
                                  <Chip
                                    label={signal.analysis_timeframe}
                                    size="small"
                                    sx={{
                                      ml: 1,
                                      height: "14px",
                                      fontSize: "8px",
                                      backgroundColor: "#9c27b0",
                                      color: "#ffffff",
                                    }}
                                  />
                                )}
                                {multiPairPrices[signal.symbol] && (
                                  <Chip
                                    label={multiPairPrices[signal.symbol].price?.toFixed(
                                      signal.symbol.includes("JPY") ? 2 : 5,
                                    )}
                                    size="small"
                                    sx={{
                                      ml: 1,
                                      height: "16px",
                                      fontSize: "9px",
                                      backgroundColor: multiPairPrices[signal.symbol].isRealTime
                                        ? "#00ff88"
                                        : "#ffaa00",
                                      color: "#000000",
                                    }}
                                  />
                                )}
                              </Typography>
                              <Chip
                                label={signal.signal_type?.toUpperCase() || "N/A"}
                                size="small"
                                sx={{
                                  backgroundColor: getSignalTypeColor(signal.signal_type) + "20",
                                  color: getSignalTypeColor(signal.signal_type),
                                  border: `1px solid ${getSignalTypeColor(signal.signal_type)}40`,
                                }}
                              />
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                                Confluencia
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={(signal.confluence_score || 0) * 100}
                                  sx={{
                                    width: 40,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: "rgba(255,255,255,0.1)",
                                    "& .MuiLinearProgress-bar": {
                                      backgroundColor: getConfluenceColor(signal.confluence_score || 0),
                                    },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{ color: getConfluenceColor(signal.confluence_score || 0) }}
                                >
                                  {((signal.confluence_score || 0) * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                                Entrada: {signal.entry_price?.toFixed(selectedPair.includes("JPY") ? 2 : 5) || "N/A"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                                {signal.timeframe || signal.analysis_timeframe}
                              </Typography>
                            </Box>
                            {signal.created_at && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "rgba(255,255,255,0.5)",
                                  display: "block",
                                  mt: 0.5,
                                }}
                              >
                                {new Date(signal.created_at).toLocaleString()}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Box
                        sx={{
                          textAlign: "center",
                          py: 4,
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        <SmartToy sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          No hay señales disponibles
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={analyzeWithAI}
                          disabled={analyzing}
                          size="small"
                          sx={{
                            borderColor: "#00ffff",
                            color: "#00ffff",
                            "&:hover": {
                              backgroundColor: "rgba(0,255,255,0.1)",
                            },
                          }}
                        >
                          Generar Señales
                        </Button>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Floating Action Button */}
          <Fab
            onClick={analyzeWithAI}
            disabled={analyzing}
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              backgroundColor: "#00ffff",
              color: "#000000",
              zIndex: 1000,
              "&:hover": {
                backgroundColor: "#00cccc",
              },
            }}
          >
            {analyzing ? <CircularProgress size={24} sx={{ color: "#000000" }} /> : <SmartToy />}
          </Fab>

          {/* ✅ MEJORADO: Dialog de configuración con temporalidad incluida */}
          <SettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            riskManagement={riskManagement}
            onRiskLocked={handleRiskLocked}
            onMT5StateChange={setMt5Session}
            setRiskManagement={setRiskManagement}
            aiSettings={aiSettings}
            setAiSettings={setAiSettings}
            realtimeSettings={realtimeSettings}
            setRealtimeSettings={setRealtimeSettings}
            showSnackbar={showSnackbar}
            mt5Session={mt5Session}
            setMt5Session={setMt5Session}
            timeframes={timeframes} // ✅ NUEVO: Pasar timeframes al dialog
          />

          {/* Dialog de detalles de señal */}
          <SignalDetailsDialog />

          {/* Snackbar para notificaciones */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Alert
              onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              severity={snackbar.severity}
              sx={{
                backgroundColor: "rgba(0,0,0,0.9)",
                color: "#ffffff",
                border: "1px solid rgba(0,255,255,0.3)",
              }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ChartErrorBoundary>
  )
}
export default Charts