 
"use client"
import {
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
  Chip,
  Alert,
  Button,
} from "@mui/material"
import { Save as SaveIcon } from "@mui/icons-material"

const TRADING_STRATEGIES = [
  {
    key: "scalping",
    label: "Scalping",
    description: "Operaciones muy rápidas de 1-5 minutos. Alta frecuencia, ganancias pequeñas pero consistentes.",
    timeframes: ["M1", "M5"],
    riskLevel: "Alto",
  },
  {
    key: "day_trading",
    label: "Day Trading",
    description: "Operaciones intradiarias que se cierran el mismo día. Balance entre velocidad y análisis.",
    timeframes: ["M15", "M30", "H1"],
    riskLevel: "Medio-Alto",
  },
  {
    key: "swing_trading",
    label: "Swing Trading",
    description: "Operaciones de varios días a semanas. Análisis más profundo, menos estrés.",
    timeframes: ["H4", "D1"],
    riskLevel: "Medio",
  },
  {
    key: "position_trading",
    label: "Position Trading",
    description: "Operaciones de largo plazo (semanas a meses). Enfoque en tendencias principales.",
    timeframes: ["D1", "W1"],
    riskLevel: "Bajo",
  },
]

const TRADING_STRATEGIES_ADVANCED = [
  {
    key: "maleta",
    label: "Estrategia Maleta",
    description: "Estrategia integral que combina múltiples enfoques técnicos para maximizar oportunidades.",
    timeframes: ["M15", "M30", "H1", "H4"],
    icon: "💼",
  },
  {
    key: "breakout",
    label: "Breakout Trading",
    description: "Especializada en rupturas de niveles clave con confirmación de volumen.",
    timeframes: ["M30", "H1", "H4"],
    icon: "🚀",
  },
  {
    key: "trend_following",
    label: "Trend Following",
    description: "Sigue tendencias establecidas con indicadores de momentum y dirección.",
    timeframes: ["H1", "H4", "D1"],
    icon: "📈",
  },
  {
    key: "mean_reversion",
    label: "Mean Reversion",
    description: "Aprovecha retrocesos y correcciones en niveles de soporte/resistencia.",
    timeframes: ["M15", "M30", "H1"],
    icon: "🔄",
  },
]

const ANALYSIS_TYPES = [
  {
    key: "technical_indicators",
    label: "Indicadores Técnicos",
    description: "RSI, MACD, Bollinger Bands, Moving Averages, etc.",
  },
  {
    key: "support_resistance",
    label: "Soporte y Resistencia",
    description: "Niveles clave horizontales y diagonales",
  },
  {
    key: "candlestick_patterns",
    label: "Patrones de Velas",
    description: "Doji, Hammer, Engulfing, etc.",
  },
  {
    key: "chart_patterns",
    label: "Patrones de Gráfico",
    description: "Triángulos, Banderas, Hombro-Cabeza-Hombro, etc.",
  },
]

const WEIGHT_FIELDS = [
  {
    key: "technicalIndicatorsWeight",
    label: "Indicadores Técnicos",
    description: "Peso para RSI, MACD, Bollinger Bands, etc.",
  },
  {
    key: "supportResistanceWeight",
    label: "Soporte y Resistencia",
    description: "Peso para niveles clave horizontales y diagonales",
  },
  {
    key: "candlestickPatternsWeight",
    label: "Patrones de Velas",
    description: "Peso para patrones como Doji, Hammer, Engulfing",
  },
  {
    key: "chartPatternsWeight",
    label: "Patrones de Gráfico",
    description: "Peso para triángulos, banderas, etc.",
  },
]

const EXECUTION_TYPES = [
  {
    key: "market",
    label: "Market",
    description: "Ejecución inmediata al precio actual del mercado",
  },
  {
    key: "limit",
    label: "Limit",
    description: "Espera un precio específico más favorable",
  },
  {
    key: "stop",
    label: "Stop",
    description: "Se activa cuando el precio rompe un nivel específico",
  },
]

const AIConfluencesTab = ({
  aiSettings,
  setAiSettings,
  selectedStrategy,
  handleStrategyChange,
  selectedExecutionType,
  handleExecutionTypeChange,
  handleSaveAIConfiguration,
  getCombinedTimeframes,
  weightsValid,
  totalWeights,
}) => {
  return (
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
            {
              "Selecciona tu tipo de trader. Esto determinará automáticamente las temporalidades disponibles y seleccionará una aleatoriamente para el análisis."
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
            {
              "Selecciona la estrategia de trading específica que deseas utilizar. Cada estrategia tiene sus propias características y temporalidades recomendadas."
            }
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
            label={
              TRADING_STRATEGIES_ADVANCED.find((s) => s.key === (aiSettings.selectedTradingStrategy || "maleta"))
                ?.label || "Estrategia Maleta"
            }
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
                  backgroundColor: selectedExecutionType === et.key ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.02)",
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

      {/* Botón de guardar */}
      <Box
        sx={{
          position: "sticky",
          bottom: 20,
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
          mt: 3,
          mb: 2,
        }}
      >
        <Button
          variant="contained"
          onClick={handleSaveAIConfiguration}
          sx={{
            backgroundColor: "#00ff88",
            color: "#000",
            fontWeight: "bold",
            px: 4,
            py: 1.5,
            boxShadow: "0 4px 12px rgba(0, 255, 136, 0.3)",
            "&:hover": {
              backgroundColor: "#00cc66",
              boxShadow: "0 6px 16px rgba(0, 255, 136, 0.4)",
            },
          }}
          startIcon={<SaveIcon />}
        >
          💾
        </Button>
      </Box>
    </Box>
  )
}

export default AIConfluencesTab
