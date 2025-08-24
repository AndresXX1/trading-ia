 
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
  Button,
  Alert,
} from "@mui/material"
import { AccountBalanceWallet } from "@mui/icons-material"

const RiskManagementTab = ({
  riskManagement,
  setRiskManagement,
  extendedRiskManagement,
  setExtendedRiskManagement,
  handleLockRiskConfig,
  mt5State,
  isConnected,
  account,
}) => {
  return (
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
              <Typography variant="subtitle2" sx={{ color: "#00ffff", mb: 2, fontWeight: "bold", textAlign: "center" }}>
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
                    onChange={(e) => setExtendedRiskManagement((prev) => ({ ...prev, minRRR: Number(e.target.value) }))}
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
              <Button
                style={{ marginbutton: 2 }}
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
              <Typography variant="body1" color="success.main" align="center" sx={{ mt: 2 }}>
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
                            {((riskManagement.totalCapital * riskManagement.riskPercentage) / 100 / 100 / 10).toFixed(
                              2,
                            )}
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
  )
}

export default RiskManagementTab
