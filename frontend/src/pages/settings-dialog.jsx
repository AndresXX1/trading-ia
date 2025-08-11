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
  Speed,
  AccountBalanceWallet,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Sync as SyncIcon,
} from "@mui/icons-material"
import {
  connectMT5,
  fetchMT5Account,
  disconnectMT5,
  autoConnectMT5,
  loadMT5Profile,
  saveMT5Profile,
  deleteMT5Profile,
  setAutoReconnect,
  setRemember,
} from "../features/auth/mt5-slice"
import api from "../api"

function getSystemTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  } catch {
    return "America/New_York"
  }
}

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

export default function SettingsDialog({
  open,
  onClose,
  riskManagement,
  setRiskManagement,
  aiSettings,
  setAiSettings,
  realtimeSettings,
  setRealtimeSettings,
  showSnackbar,
  timeframes,
}) {
  const dispatch = useDispatch()
  const mt5 = useSelector((state) => state.mt5 || {})
  const isConnected = !!mt5.connected
  const account = mt5.account || null
  const connectStatus = mt5.status || "idle"
  const connectError = mt5.error || null

  const [settingsTab, setSettingsTab] = useState(0)

  // Formulario conexión MT5
  const [mt5Form, setMt5Form] = useState({
    type: mt5.account_type || "demo", // 'demo' | 'real'
    server: mt5.lastServer || (typeof window !== "undefined" ? localStorage.getItem("mt5LastServer") || "" : ""),
    login: mt5.lastLogin || (typeof window !== "undefined" ? localStorage.getItem("mt5LastLogin") || "" : ""),
    password: "",
  })

  const [rememberSession, setRememberSession] = useState(mt5.remember || false)
  const [autoReconnect, setAutoReconnectLocal] = useState(mt5.autoReconnect || false)
  const [locking, setLocking] = useState(false)

  // Cargar perfil, autoconectar y traer estado de lock
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        await dispatch(loadMT5Profile())
        if (autoReconnect || mt5.autoReconnect) {
          await dispatch(autoConnectMT5()).unwrap()
          await dispatch(fetchMT5Account()).unwrap()
        }
      } catch {
        // silenciar
      }
      // Consultar estado de lock de riesgo
      try {
        const data = await api.getRiskLockStatus()
        if (data?.locked) {
          setRiskManagement((prev) => ({
            ...prev,
            isLocked: true,
            lockedAt: data.locked_at,
            totalCapital: Number(data.total_capital) || prev.totalCapital,
            riskPercentage: Number(data.risk_percentage) || prev.riskPercentage,
          }))
        }
      } catch {
        // no-op
      }
    })()
  }, [autoReconnect, dispatch, mt5.autoReconnect, open, setRiskManagement])

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

  const handleExecutionTypeChange = (key) => {
    setAiSettings((prev) => ({
      ...prev,
      selectedExecutionType: key,
    }))
  }

  const selectedTimeZone = aiSettings.sessionsTimeZone || getSystemTimeZone()

  // Asegurar consistencia: si default no está permitido, ajustar - ACTUALIZADO
  useEffect(() => {
    if (!allowedExecutionTypes.includes(defaultExecutionType) && allowedExecutionTypes.length > 0) {
      setAiSettings((prev) => ({ ...prev, defaultExecutionType: allowedExecutionTypes[0] }))
    }
  }, [allowedExecutionTypes, defaultExecutionType, setAiSettings])

  // Función para toggle de tipos de ejecución - NUEVA
  // eslint-disable-next-line no-unused-vars
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
    // Construir payload con snapshot de MT5
    const payload = {
      total_capital: Number(riskManagement.totalCapital) || 0,
      risk_percentage: Number(riskManagement.riskPercentage) || 1,
      source: "mt5",
      mt5_snapshot: account
        ? {
            login: account.login ?? mt5.lastLogin ?? null,
            server: account.server ?? mt5.lastServer ?? null,
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
      showSnackbar("✅ Configuración de riesgo bloqueada y guardada en tu perfil", "success")
      setSettingsTab(2) // ir a Confluencias IA
    } catch (e) {
      showSnackbar(`❌ Error al bloquear en el servidor: ${e?.message || "Error desconocido"}`, "error")
    } finally {
      setLocking(false)
    }
  }, [
    riskManagement.totalCapital,
    riskManagement.riskPercentage,
    account,
    mt5.lastLogin,
    mt5.lastServer,
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
    try {
      await dispatch(
        connectMT5({
          login: mt5Form.login,
          password: mt5Form.password,
          server: mt5Form.server,
          account_type: mt5Form.type,
          remember: rememberSession,
        }),
      ).unwrap()
      await dispatch(fetchMT5Account()).unwrap()
      if (rememberSession) {
        await dispatch(
          saveMT5Profile({ login: mt5Form.login, server: mt5Form.server, account_type: mt5Form.type }),
        ).unwrap()
      }
      showSnackbar("✅ Conectado a MetaTrader 5 correctamente", "success")
      setSettingsTab(1)
    } catch (err) {
      showSnackbar(`❌ Error al conectar MT5: ${err?.message || "Error desconocido"}`, "error")
    }
  }

  const handleDisconnectMT5 = async () => {
    try {
      await dispatch(disconnectMT5()).unwrap()
      showSnackbar("🔌 Desconectado de MetaTrader 5", "info")
    } catch (err) {
      showSnackbar(`⚠️ No se pudo desconectar: ${err?.message || "Error desconocido"}`, "warning")
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

  const clearProfile = async () => {
    try {
      await dispatch(deleteMT5Profile()).unwrap()
      setRememberSession(false)
      showSnackbar("🗑️ Perfil de MT5 eliminado", "info")
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      showSnackbar("⚠️ No se pudo eliminar el perfil", "warning")
    }
  }

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
                  <Speed />
                  {"Tiempo Real"}
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
                    {
                      "Conecta tu cuenta MT5 (Demo o Real). Puedes recordar el perfil (sin contraseña) para reconectar automáticamente."
                    }
                  </Alert>
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
                    onChange={(e) => setMt5Form((prev) => ({ ...prev, server: e.target.value }))}
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
                    onChange={(e) => setMt5Form((prev) => ({ ...prev, login: e.target.value }))}
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
                    onChange={(e) => setMt5Form((prev) => ({ ...prev, password: e.target.value }))}
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
                      onClick={handleConnectMT5}
                      disabled={connectStatus === "loading"}
                      startIcon={<LoginIcon />}
                      sx={{
                        backgroundColor: "#00ffff",
                        color: "#000000",
                        "&:hover": { backgroundColor: "#00cccc" },
                      }}
                    >
                      {isConnected ? "Reconectar" : "Conectar"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => dispatch(fetchMT5Account())}
                      disabled={!isConnected || connectStatus === "loading"}
                      startIcon={<SyncIcon />}
                      sx={{
                        borderColor: "#00ffff",
                        color: "#00ffff",
                        "&:hover": { borderColor: "#00cccc", backgroundColor: "rgba(0,255,255,0.1)" },
                      }}
                    >
                      {"Actualizar cuenta"}
                    </Button>
                    <Button
                      variant="text"
                      onClick={handleDisconnectMT5}
                      disabled={!isConnected}
                      startIcon={<LogoutIcon />}
                      sx={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {"Desconectar"}
                    </Button>
                    <Button variant="text" onClick={clearProfile} sx={{ color: "rgba(255,255,255,0.7)" }}>
                      {"Eliminar perfil guardado"}
                    </Button>
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
                          {account.server || mt5.lastServer || "N/D"}
                        </Typography>
                      </Card>
                      <Card
                        sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Login"}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {account.login || mt5.lastLogin || "N/D"}
                        </Typography>
                      </Card>
                      <Card
                        sx={{ p: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {"Tipo"}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {(account.account_type || mt5.account_type || mt5Form.type || "demo").toUpperCase()}
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
                    {`Conectado a MT5 (${(account?.account_type || mt5.account_type || "demo").toUpperCase()}) • Saldo: ${
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
                  "El capital total se fija automáticamente con tu saldo MT5. Al bloquear esta configuración, se guardará en tu perfil y no podrás modificarla luego."
                }
              </Typography>
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(0,255,255,0.2)",
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    {"💰 Configuración de Capital"}
                  </Typography>
                  <TextField
                    fullWidth
                    label="Capital Total (USD)"
                    type="number"
                    value={riskManagement.totalCapital}
                    disabled
                    sx={{
                      mb: 2,
                      "& .MuiInputLabel-root": { color: "#00ffff" },
                      "& .MuiOutlinedInput-root": { color: "#ffffff" },
                    }}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Typography sx={{ color: "#00ffff", mr: 1 }}>$</Typography>,
                    }}
                    helperText="Fijado automáticamente por saldo MT5. Modifica tu capital desde MetaTrader para actualizarlo aquí."
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
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
                  {!riskManagement.isLocked && (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={lockRiskConfiguration}
                      disabled={locking || !riskManagement.totalCapital || riskManagement.totalCapital <= 0}
                      sx={{
                        backgroundColor: "#ff6b6b",
                        color: "#ffffff",
                        "&:hover": { backgroundColor: "#ff5252" },
                        "&:disabled": { backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" },
                      }}
                    >
                      {locking ? "Bloqueando..." : "🔒 Bloquear Configuración (persistente)"}
                    </Button>
                  )}
                  {riskManagement.isLocked && (
                    <Alert severity="success" sx={{ backgroundColor: "rgba(76,175,80,0.1)", mt: 2 }}>
                      <Typography variant="body2">
                        {"✅ Configuración bloqueada el "}
                        {riskManagement.lockedAt ? new Date(riskManagement.lockedAt).toLocaleString() : "N/A"}
                      </Typography>
                    </Alert>
                  )}
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(0,255,255,0.2)",
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    {"📊 Cálculos Automáticos"}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}>
                      {"Máximo a Arriesgar por Operación:"}
                    </Typography>
                    <Typography variant="h4" sx={{ color: "#00ff88", fontWeight: "bold" }}>
                      {`${((riskManagement.totalCapital * riskManagement.riskPercentage) / 100).toLocaleString()}`}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.1)" }} />
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}>
                      {"Lote Calculado (ejemplo EURUSD, 50 pips SL):"}
                    </Typography>
                    <Typography variant="h5" sx={{ color: "#00ffff", fontWeight: "bold" }}>
                      {`${((riskManagement.totalCapital * riskManagement.riskPercentage) / 100 / 50).toFixed(2)} lotes`}
                    </Typography>
                  </Box>
                  <Alert severity="info" sx={{ backgroundColor: "rgba(33,150,243,0.1)" }}>
                    <Typography variant="caption">
                      {
                        "💡 El tamaño del lote se calcula automáticamente por señal usando la distancia al SL y el valor del pip."
                      }
                    </Typography>
                  </Alert>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* PESTAÑA 2: CONFLUENCIAS IA - MEJORADA */}
        {settingsTab === 2 && (
          <Box sx={{ p: 3 }}>
            {/* Sección 1: Configuración General */}
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

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: "#00ffff" }}>{"Temporalidad para Análisis IA"}</InputLabel>
                    <Select
                      value={aiSettings.analysisTimeframe || "H1"}
                      onChange={(e) =>
                        setAiSettings((prev) => ({
                          ...prev,
                          analysisTimeframe: e.target.value,
                        }))
                      }
                      sx={{
                        color: "#ffffff",
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,255,255,0.3)" },
                      }}
                    >
                      {tfOptions.map((tf) => (
                        <MenuItem key={tf.value} value={tf.value}>
                          {tf.label}
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
                      mt: -6,
                      mb: 2
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "#9c27b0", mb: 1, fontWeight: "bold" }}>
                      {"Configuración Actual:"}
                    </Typography>
                    <Chip
                      label={`${aiSettings.analysisTimeframe || "H1"} - ${
                        tfOptions.find((tf) => tf.value === (aiSettings.analysisTimeframe || "H1"))?.label || "1 Hora"
                      }`}
                      sx={{ backgroundColor: "#9c27b0", color: "#ffffff", mb: 1 }}
                    />
                    <Chip
                      label={`Umbral: ${((aiSettings.confluenceThreshold ?? 0.6) * 100).toFixed(0)}%`}
                      sx={{ backgroundColor: "rgba(156,39,176,0.7)", color: "#ffffff" }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Card>

            {/* Sección 2: Análisis Técnicos */}
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
                  {
                    "Selecciona qué tipos de análisis técnico utilizará la IA para generar confluencias y señales de trading."
                  }
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

            {/* Sección 3: Pesos de Análisis */}
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

            {/* Sección 4: Tipos de Ejecución */}
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
                  {
                    "El servidor determinará automáticamente si la señal es de compra o venta. Selecciona cómo se ejecutará la orden."
                  }
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

        {/* PESTAÑA 3: TIEMPO REAL */}
        {settingsTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#00ffff" }}>
              {"⚡ Configuración de Tiempo Real"}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Intervalo de Actualización (ms)"
                  type="number"
                  value={realtimeSettings.updateInterval}
                  onChange={(e) =>
                    setRealtimeSettings((prev) => ({
                      ...prev,
                      updateInterval: Number.parseInt(e.target.value) || 1000,
                    }))
                  }
                  sx={{
                    mb: 2,
                    "& .MuiInputLabel-root": { color: "#00ffff" },
                    "& .MuiOutlinedInput-root": { color: "#ffffff" },
                  }}
                  helperText="Menor valor = mayor frecuencia (mínimo 500ms)"
                />
                <TextField
                  fullWidth
                  label="Máximo Intentos de Reconexión"
                  type="number"
                  value={realtimeSettings.maxRetries}
                  onChange={(e) =>
                    setRealtimeSettings((prev) => ({
                      ...prev,
                      maxRetries: Number.parseInt(e.target.value) || 3,
                    }))
                  }
                  sx={{
                    mb: 2,
                    "& .MuiInputLabel-root": { color: "#00ffff" },
                    "& .MuiOutlinedInput-root": { color: "#ffffff" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!realtimeSettings.enableTickByTick}
                      onChange={(e) =>
                        setRealtimeSettings((prev) => ({
                          ...prev,
                          enableTickByTick: e.target.checked,
                        }))
                      }
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                      }}
                    />
                  }
                  label="Habilitar Tick-by-Tick"
                  sx={{ color: "#ffffff", mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!realtimeSettings.autoReconnect}
                      onChange={(e) =>
                        setRealtimeSettings((prev) => ({
                          ...prev,
                          autoReconnect: e.target.checked,
                        }))
                      }
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                      }}
                    />
                  }
                  label="Reconexión Automática"
                  sx={{ color: "#ffffff", mb: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: "1px solid rgba(0,255,255,0.2)" }}>
        <Button onClick={onClose} sx={{ color: "#ffffff" }}>
          {"Cancelar"}
        </Button>
        <Button
          onClick={() => {
            if (rememberSession) {
              dispatch(saveMT5Profile({ login: mt5Form.login, server: mt5Form.server, account_type: mt5Form.type }))
            }
            showSnackbar("✅ Configuración guardada correctamente", "success")
            onClose()
          }}
          disabled={settingsTab === 2 && !weightsValid}
          sx={{
            backgroundColor: settingsTab === 2 && !weightsValid ? "rgba(255,255,255,0.1)" : "#00ffff",
            color: settingsTab === 2 && !weightsValid ? "rgba(255,255,255,0.3)" : "#000000",
            "&:hover": {
              backgroundColor: settingsTab === 2 && !weightsValid ? "rgba(255,255,255,0.1)" : "#00cccc",
            },
          }}
        >
          {"Guardar Configuración"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
