"use client"
import React from "react"
import { Box, Card, CardContent, Typography, IconButton, Chip, CircularProgress, Button } from "@mui/material"
import { ShowChart, Fullscreen } from "@mui/icons-material"
import { Line } from "react-chartjs-2"
interface ChartErrorBoundaryState {
  hasError?: boolean;
}
interface ChartErrorBoundaryProps {
  children: React.ReactNode;
}

// Error boundary component
class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Chart Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ height: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.7)" }}>
            Error al cargar el gráfico
          </Typography>
        </Box>
      );
    }
      return this.props.children;

  }
}

const ChartDisplay = ({
  selectedPair,
  timeframe,
  chartData,
  loading,
  fullscreen,
  setFullscreen,
  realtimeEnabled,
  connectionStatus,
  dataFreshness,
  tickCount,
  chartKey,
  onLoadData,
  chartOptions,
  onChartRef,
}) => {
  const getDataFreshnessColor = (freshness) => {
    switch (freshness) {
      case "fresh":
        return "#00ff88"
      case "recent":
        return "#ffaa00"
      case "simulated":
        return "#9c27b0"
      default:
        return "#ff4444"
    }
  }

  return (
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
                  key={`chart-${selectedPair}-${timeframe}-${chartKey}-${tickCount}`}
                  ref={onChartRef}
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
              onClick={onLoadData}
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
  )
}

export default ChartDisplay
