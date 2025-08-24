"use client"
import { useState, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Tooltip,
  Button,
} from "@mui/material"
import { Close, ImageOutlined, Refresh } from "@mui/icons-material"

const SignalDetails = ({
  signal,
  signalDetailsOpen,
  onClose,
  chartImageUrl,
  chartImageLoading,
  chartImageError,
  multiPairPrices,
  selectedPair,
  realtimeEnabled,
  connectionStatus,
  dataFreshness,
  connectionQuality,
  aiSettings,
  onRetryChartImage,
  onUpdatePrice,
  onExecuteSignal,
  generateNaturalLanguageExplanation,
}) => {
const [localStates, setLocalStates] = useState({
  isUpdatingPrice: false,
  lastManualUpdate: null as unknown as number,  // Initialize as null but cast to number
  imageGenerationAttempted: false,
  localChartImageUrl: null,
  localChartImageLoading: false,
  localChartImageError: false,
});

  const getConfluenceColor = (score) => {
    if (score >= 0.8) return "#00ff88"
    if (score >= 0.6) return "#ffaa00"
    return "#ff4444"
  }

  // Determinar precio actual para la señal
  const currentPriceForSignal = useMemo(() => {
    if (!signal) return null
    const pairData = multiPairPrices[signal.symbol]
    return pairData?.price || null
  }, [signal, multiPairPrices])

  // Estado de datos de la señal
  const signalDataStatus = useMemo(() => {
    if (!signal) return { isLive: false, status: "unknown", quality: "unknown" }
    const pairData = multiPairPrices[signal.symbol]

    if (signal.symbol === selectedPair && realtimeEnabled && connectionStatus === "connected") {
      return {
        isLive: dataFreshness === "fresh" && !pairData?.simulated,
        status: pairData?.simulated ? "simulated" : dataFreshness,
        quality: connectionQuality,
        isSelectedPair: true,
        source: pairData?.source || "unknown",
      }
    }

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

    return {
      isLive: false,
      status: "no_data",
      quality: "unknown",
      isSelectedPair: false,
      source: "none",
    }
  }, [signal, multiPairPrices, selectedPair, realtimeEnabled, connectionStatus, dataFreshness, connectionQuality])

  // Explicación en lenguaje natural
  const naturalExplanation = useMemo(() => {
    return generateNaturalLanguageExplanation ? generateNaturalLanguageExplanation(signal) : null
  }, [signal, generateNaturalLanguageExplanation])

  const handleUpdatePrice = useCallback(async () => {
    if (!signal || localStates.isUpdatingPrice) return

    setLocalStates((prev) => ({ ...prev, isUpdatingPrice: true }))
    try {
      await onUpdatePrice(signal.symbol)
setLocalStates((prev) => ({
  ...prev,
  lastManualUpdate: typeof prev.lastManualUpdate === 'number' ? prev.lastManualUpdate : Date.now(),
}));
    } catch (error) {
      console.error("Error updating price:", error)
    } finally {
      setLocalStates((prev) => ({ ...prev, isUpdatingPrice: false }))
    }
  }, [signal, localStates.isUpdatingPrice, onUpdatePrice])

  if (!signal) return null

  return (
    <Dialog
      open={signalDetailsOpen}
      onClose={onClose}
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
            <IconButton onClick={onClose} sx={{ color: "#ffffff" }}>
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

                {/* Imagen del gráfico */}
                <Box sx={{ position: "relative", mb: 2 }}>
                  {chartImageLoading ? (
                    <Box
                      sx={{
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderRadius: 1,
                      }}
                    >
                      <CircularProgress sx={{ color: "#00ffff" }} />
                      <Typography variant="body2" sx={{ ml: 2, color: "rgba(255,255,255,0.7)" }}>
                        Generando imagen...
                      </Typography>
                    </Box>
                  ) : chartImageError ? (
                    <Box
                      sx={{
                        height: 200,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderRadius: 1,
                        border: "1px dashed rgba(255,255,255,0.3)",
                      }}
                    >
                      <ImageOutlined sx={{ fontSize: 48, color: "rgba(255,255,255,0.3)", mb: 1 }} />
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 2 }}>
                        Error al generar imagen
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={onRetryChartImage}
                        sx={{
                          borderColor: "#00ffff",
                          color: "#00ffff",
                          "&:hover": {
                            backgroundColor: "rgba(0,255,255,0.1)",
                          },
                        }}
                      >
                        Reintentar
                      </Button>
                    </Box>
                  ) : chartImageUrl ? (
                    <img
                      src={chartImageUrl || "/placeholder.svg"}
                      alt={`Gráfico de ${signal.symbol}`}
                      style={{
                        width: "100%",
                        height: "auto",
                        borderRadius: "4px",
                        border: "1px solid rgba(0,255,255,0.3)",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderRadius: 1,
                        border: "1px dashed rgba(255,255,255,0.3)",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                        Imagen no disponible
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Información básica de trading */}
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="h6" sx={{ color: "#00ffff" }}>
                      Información de Trading
                    </Typography>
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

                    {/* Precio actual */}
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
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Botón de ejecución */}
                {onExecuteSignal && (
                  <Button
                    variant="contained"
                    onClick={() => onExecuteSignal(signal)}
                    fullWidth
                    sx={{
                      mt: 2,
                      backgroundColor: signal.signal_type === "buy" ? "#00ff88" : "#ff4444",
                      color: "#000000",
                      "&:hover": {
                        backgroundColor: signal.signal_type === "buy" ? "#00cc66" : "#cc3333",
                      },
                    }}
                  >
                    Ejecutar {signal.signal_type?.toUpperCase()}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Panel de análisis detallado */}
          <Grid item xs={12} md={8}>
            {naturalExplanation && (
              <Card sx={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#00ffff", mb: 2 }}>
                    Análisis Detallado
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#ffffff", lineHeight: 1.6 }}>
                    {naturalExplanation}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  )
}

export default SignalDetails
