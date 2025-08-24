"use client"
import { Box, Card, CardContent, Typography, Chip, LinearProgress, Button } from "@mui/material"
import { SmartToy } from "@mui/icons-material"

const SignalsList = ({ signals, analyzing, multiPairPrices, selectedPair, onSignalClick, onAnalyzeWithAI }) => {
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
                onClick={() => onSignalClick(signal)}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                      {signal.symbol}
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
                          label={multiPairPrices[signal.symbol].price?.toFixed(signal.symbol.includes("JPY") ? 2 : 5)}
                          size="small"
                          sx={{
                            ml: 1,
                            height: "16px",
                            fontSize: "9px",
                            backgroundColor: multiPairPrices[signal.symbol].isRealTime ? "#00ff88" : "#ffaa00",
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
                      <Typography variant="caption" sx={{ color: getConfluenceColor(signal.confluence_score || 0) }}>
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
                onClick={onAnalyzeWithAI}
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
  )
}

export default SignalsList
