import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Chip,
  DialogContent
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';

// Datos de pares de forex
const FOREX_PAIRS = [
  // Pares Major
  { key: 'EURUSD', label: 'EUR/USD', category: 'Major' },
  { key: 'GBPUSD', label: 'GBP/USD', category: 'Major' },
  { key: 'USDJPY', label: 'USD/JPY', category: 'Major' },
  { key: 'USDCHF', label: 'USD/CHF', category: 'Major' },
  { key: 'AUDUSD', label: 'AUD/USD', category: 'Major' },
  { key: 'USDCAD', label: 'USD/CAD', category: 'Major' },
  { key: 'NZDUSD', label: 'NZD/USD', category: 'Major' },
  
  // Pares Cross
  { key: 'EURGBP', label: 'EUR/GBP', category: 'Cross' },
  { key: 'EURJPY', label: 'EUR/JPY', category: 'Cross' },
  { key: 'GBPJPY', label: 'GBP/JPY', category: 'Cross' },
  { key: 'EURCHF', label: 'EUR/CHF', category: 'Cross' },
  { key: 'GBPCHF', label: 'GBP/CHF', category: 'Cross' },
  { key: 'AUDCAD', label: 'AUD/CAD', category: 'Cross' },
  { key: 'AUDCHF', label: 'AUD/CHF', category: 'Cross' },
  { key: 'AUDJPY', label: 'AUD/JPY', category: 'Cross' },
];

// Sesiones de trading UTC
const SESSIONS_UTC = [
  { key: 'london', label: 'Londres', start: '08:00', end: '17:00' },
  { key: 'newyork', label: 'Nueva York', start: '13:00', end: '22:00' },
  { key: 'tokyo', label: 'Tokio', start: '00:00', end: '09:00' },
  { key: 'sydney', label: 'Sidney', start: '22:00', end: '07:00' },
];

const AutoTradingComponent = () => {
  // Estado principal del trading automático
  const [autoTradingActive, setAutoTradingActive] = useState(false);
  const [settingsTab] = useState(3); // Simula que estamos en la pestaña 3
  
  // Configuración del auto trading
  const [autoTradingSettings, setAutoTradingSettings] = useState({
    selectedPairs: ['EURUSD', 'GBPUSD', 'USDJPY'], // Pares seleccionados por defecto
    activeSessions: ['london', 'newyork'], // Sesiones activas por defecto
    enableSessionFiltering: true,
    maxConcurrentTrades: 3,
    pauseOnNews: true,
    autoStopLoss: true,
    autoTakeProfit: true,
  });

  // Zona horaria seleccionada (por defecto UTC-3 para Argentina)
  const [selectedTimeZone] = useState('UTC-3');

  // Efecto para simular actualizaciones en tiempo real
  useEffect(() => {
    let interval;
    if (autoTradingActive) {
      interval = setInterval(() => {
        // Aquí podrías actualizar estadísticas en tiempo real
        console.log('Actualizando estadísticas de trading...');
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoTradingActive]);

  // Función para toggle del trading automático
  const handleAutoTradingToggle = () => {
    if (autoTradingActive) {
      // Detener trading
      setAutoTradingActive(false);
      console.log('Trading automático detenido');
    } else {
      // Iniciar trading - validar configuración
      if (autoTradingSettings.selectedPairs.length === 0) {
        alert('Debes seleccionar al menos un par de divisas');
        return;
      }
      if (autoTradingSettings.enableSessionFiltering && autoTradingSettings.activeSessions.length === 0) {
        alert('Debes seleccionar al menos una sesión de trading');
        return;
      }
      setAutoTradingActive(true);
      console.log('Trading automático iniciado');
    }
  };

  // Función para toggle de selección de pares
  const togglePairSelection = (pairKey) => {
    setAutoTradingSettings(prev => ({
      ...prev,
      selectedPairs: prev.selectedPairs.includes(pairKey)
        ? prev.selectedPairs.filter(p => p !== pairKey)
        : [...prev.selectedPairs, pairKey]
    }));
  };

  // Función para toggle de selección de sesiones
  const toggleSessionSelection = (sessionKey) => {
    setAutoTradingSettings(prev => ({
      ...prev,
      activeSessions: prev.activeSessions.includes(sessionKey)
        ? prev.activeSessions.filter(s => s !== sessionKey)
        : [...prev.activeSessions, sessionKey]
    }));
  };

  // Función para formatear horarios de sesión según zona horaria
  const formatSessionRangeInZone = (start, end, timeZone) => {
    // Conversión simple para UTC-3 (Argentina)
    const convertTime = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      let newHours = hours - 3; // UTC-3
      if (newHours < 0) newHours += 24;
      if (newHours >= 24) newHours -= 24;
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    return `${convertTime(start)} - ${convertTime(end)} (${timeZone})`;
  };

  return (
    <DialogContent sx={{ 
      backgroundColor: '#1a1a1a', 
      color: '#ffffff',
      minHeight: '100vh',
      '& .MuiTextField-root': {
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            borderColor: 'rgba(0,255,255,0.3)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(0,255,255,0.5)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#00ffff',
          },
        },
        '& .MuiInputLabel-root': {
          color: '#00ffff',
        },
        '& .MuiFormHelperText-root': {
          color: 'rgba(255,255,255,0.7)',
        },
      }
    }}>
      {settingsTab === 3 && (
        <Box sx={{ p: 3 }}>
          {/* Estado y Control Principal */}
          <Card
            sx={{
              backgroundColor: autoTradingActive ? "rgba(255,107,107,0.1)" : "rgba(255,255,255,0.05)",
              border: autoTradingActive ? "1px solid rgba(255,107,107,0.3)" : "1px solid rgba(0,255,255,0.2)",
              p: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
                {"🚀 Control de Ejecución Automática"}
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleAutoTradingToggle}
                startIcon={autoTradingActive ? <Stop /> : <PlayArrow />}
                sx={{
                  backgroundColor: autoTradingActive ? "#ff6b6b" : "#00ff88",
                  color: autoTradingActive ? "#ffffff" : "#000000",
                  fontWeight: "bold",
                  px: 4,
                  py: 1.5,
                  "&:hover": {
                    backgroundColor: autoTradingActive ? "#ff5252" : "#00cc70",
                  },
                }}
              >
                {autoTradingActive ? "DETENER TRADING" : "INICIAR TRADING"}
              </Button>
            </Box>

            {autoTradingActive ? (
              <Alert severity="error" sx={{ backgroundColor: "rgba(255,107,107,0.1)", color: "#ffffff" }}>
                <Typography variant="body2">
                  {
                    "🔴 TRADING AUTOMÁTICO ACTIVO - El sistema está operando automáticamente según tu configuración. Monitorea regularmente las operaciones."
                  }
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
                <Typography variant="body2">
                  {
                    "⚪ Trading automático desactivado. Configura los parámetros y presiona INICIAR TRADING para comenzar."
                  }
                </Typography>
              </Alert>
            )}

            {/* Estadísticas en tiempo real */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ p: 2, backgroundColor: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.2)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Operaciones Activas"}
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#00ffff", fontWeight: "bold" }}>
                    {autoTradingActive ? "2" : "0"}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ p: 2, backgroundColor: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Señales Hoy"}
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#00ff88", fontWeight: "bold" }}>
                    {autoTradingActive ? "7" : "0"}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ p: 2, backgroundColor: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.2)" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Pares Activos"}
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#ffc107", fontWeight: "bold" }}>
                    {autoTradingSettings.selectedPairs.length}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card
                  sx={{ p: 2, backgroundColor: "rgba(156,39,176,0.05)", border: "1px solid rgba(156,39,176,0.2)" }}
                >
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {"Sesiones Activas"}
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#9c27b0", fontWeight: "bold" }}>
                    {autoTradingSettings.activeSessions.length}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Card>

          {/* Selección de Pares de Divisas */}
          <Card
            sx={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,255,255,0.2)",
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
              {"💱 Pares de Divisas para Operar"}
            </Typography>

            <Alert severity="warning" sx={{ mb: 3, backgroundColor: "rgba(255,193,7,0.1)", color: "#ffffff" }}>
              <Typography variant="body2">
                {
                  "Selecciona los pares de divisas que el sistema operará automáticamente. Recomendamos comenzar con pares Major para mayor liquidez."
                }
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: "#00ff88", fontWeight: "bold", mb: 1 }}>
                {`Pares Seleccionados: ${autoTradingSettings.selectedPairs.length}`}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {autoTradingSettings.selectedPairs.map((pair) => (
                  <Chip
                    key={pair}
                    label={FOREX_PAIRS.find((p) => p.key === pair)?.label || pair}
                    sx={{ backgroundColor: "#00ff88", color: "#000000", fontWeight: "bold" }}
                  />
                ))}
              </Box>
            </Box>

            {/* Pares Major */}
            <Typography variant="subtitle1" sx={{ mb: 2, color: "#ffffff", fontWeight: "bold" }}>
              {"📈 Pares Major (Recomendados)"}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {FOREX_PAIRS.filter((pair) => pair.category === "Major").map((pair) => (
                <Grid item xs={12} sm={6} md={4} key={pair.key}>
                  <Card
                    sx={{
                      p: 2,
                      backgroundColor: autoTradingSettings.selectedPairs.includes(pair.key)
                        ? "rgba(0,255,136,0.15)"
                        : "rgba(255,255,255,0.02)",
                      border: autoTradingSettings.selectedPairs.includes(pair.key)
                        ? "1px solid rgba(0,255,136,0.3)"
                        : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(0,255,255,0.08)",
                        transform: "translateY(-2px)",
                      },
                    }}
                    onClick={() => togglePairSelection(pair.key)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Switch
                        checked={autoTradingSettings.selectedPairs.includes(pair.key)}
                        onChange={(e) => {
                          e.stopPropagation()
                          togglePairSelection(pair.key)
                        }}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {pair.label}
                        </Typography>
                        <Chip
                          label={pair.category}
                          size="small"
                          sx={{ backgroundColor: "rgba(0,255,255,0.2)", color: "#00ffff" }}
                        />
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pares Cross */}
            <Typography variant="subtitle1" sx={{ mb: 2, color: "#ffffff", fontWeight: "bold" }}>
              {"🔄 Pares Cross (Avanzados)"}
            </Typography>
            <Grid container spacing={2}>
              {FOREX_PAIRS.filter((pair) => pair.category === "Cross").map((pair) => (
                <Grid item xs={12} sm={6} md={4} key={pair.key}>
                  <Card
                    sx={{
                      p: 2,
                      backgroundColor: autoTradingSettings.selectedPairs.includes(pair.key)
                        ? "rgba(0,255,136,0.15)"
                        : "rgba(255,255,255,0.02)",
                      border: autoTradingSettings.selectedPairs.includes(pair.key)
                        ? "1px solid rgba(0,255,136,0.3)"
                        : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(0,255,255,0.08)",
                        transform: "translateY(-2px)",
                      },
                    }}
                    onClick={() => togglePairSelection(pair.key)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Switch
                        checked={autoTradingSettings.selectedPairs.includes(pair.key)}
                        onChange={(e) => {
                          e.stopPropagation()
                          togglePairSelection(pair.key)
                        }}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold" }}>
                          {pair.label}
                        </Typography>
                        <Chip
                          label={pair.category}
                          size="small"
                          sx={{ backgroundColor: "rgba(255,193,7,0.2)", color: "#ffc107" }}
                        />
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Card>

          {/* Configuración de Sesiones de Trading */}
          <Card
            sx={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,255,255,0.2)",
              p: 3,
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
              {"🕒 Horarios de Operación"}
            </Typography>

            <Alert severity="info" sx={{ mb: 3, backgroundColor: "rgba(33,150,243,0.1)", color: "#ffffff" }}>
              <Typography variant="body2">
                {
                  "Selecciona las sesiones de Forex durante las cuales el sistema ejecutará señales automáticamente. Las superposiciones ofrecen mayor liquidez."
                }
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoTradingSettings.enableSessionFiltering}
                    onChange={(e) =>
                      setAutoTradingSettings((prev) => ({
                        ...prev,
                        enableSessionFiltering: e.target.checked,
                      }))
                    }
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                    }}
                  />
                }
                label="Filtrar por Sesiones de Forex"
                sx={{ color: "#ffffff", mb: 2 }}
              />
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", ml: 4 }}>
                {"Si está desactivado, el sistema operará 24/7 sin restricciones de horario"}
              </Typography>
            </Box>

            {autoTradingSettings.enableSessionFiltering && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ color: "#00ff88", fontWeight: "bold", mb: 1 }}>
                    {`Sesiones Activas: ${autoTradingSettings.activeSessions.length}`}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {autoTradingSettings.activeSessions.map((sessionKey) => {
                      const session = SESSIONS_UTC.find((s) => s.key === sessionKey)
                      return (
                        <Chip
                          key={sessionKey}
                          label={session?.label || sessionKey}
                          sx={{ backgroundColor: "#00ff88", color: "#000000", fontWeight: "bold" }}
                        />
                      )
                    })}
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {SESSIONS_UTC.map((session) => (
                    <Grid item xs={12} md={6} key={session.key}>
                      <Card
                        sx={{
                          p: 2.5,
                          backgroundColor: autoTradingSettings.activeSessions.includes(session.key)
                            ? "rgba(0,255,136,0.15)"
                            : "rgba(255,255,255,0.02)",
                          border: autoTradingSettings.activeSessions.includes(session.key)
                            ? "1px solid rgba(0,255,136,0.3)"
                            : "1px solid rgba(255,255,255,0.1)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: "rgba(0,255,255,0.08)",
                            transform: "translateY(-2px)",
                          },
                        }}
                        onClick={() => toggleSessionSelection(session.key)}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Switch
                            checked={autoTradingSettings.activeSessions.includes(session.key)}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleSessionSelection(session.key)
                            }}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: "#00ff88",
                              },
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: "bold", mb: 1 }}>
                              {"Sesión " + session.label}
                            </Typography>
                            <Chip
                              label={formatSessionRangeInZone(session.start, session.end, selectedTimeZone)}
                              sx={{ backgroundColor: "rgba(0,255,255,0.15)", color: "#00ffff" }}
                            />
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Card>

          {/* Configuración Avanzada */}
          <Card
            sx={{
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(0,255,255,0.2)",
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: "#00ffff", display: "flex", alignItems: "center", gap: 1 }}>
              {"⚙️ Configuración Avanzada"}
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Máximo Operaciones Concurrentes"
                  type="number"
                  value={autoTradingSettings.maxConcurrentTrades}
                  onChange={(e) =>
                    setAutoTradingSettings((prev) => ({
                      ...prev,
                      maxConcurrentTrades: Number.parseInt(e.target.value) || 3,
                    }))
                  }
                  sx={{
                    mb: 2,
                    "& .MuiInputLabel-root": { color: "#00ffff" },
                    "& .MuiOutlinedInput-root": { color: "#ffffff" },
                  }}
                  helperText="Número máximo de operaciones abiertas simultáneamente"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={autoTradingSettings.pauseOnNews}
                      onChange={(e) =>
                        setAutoTradingSettings((prev) => ({
                          ...prev,
                          pauseOnNews: e.target.checked,
                        }))
                      }
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                      }}
                    />
                  }
                  label="Pausar durante Noticias de Alto Impacto"
                  sx={{ color: "#ffffff", mb: 1 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoTradingSettings.autoStopLoss}
                      onChange={(e) =>
                        setAutoTradingSettings((prev) => ({
                          ...prev,
                          autoStopLoss: e.target.checked,
                        }))
                      }
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                      }}
                    />
                  }
                  label="Stop Loss Automático"
                  sx={{ color: "#ffffff", mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={autoTradingSettings.autoTakeProfit}
                      onChange={(e) =>
                        setAutoTradingSettings((prev) => ({
                          ...prev,
                          autoTakeProfit: e.target.checked,
                        }))
                      }
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#00ff88" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#00ff88" },
                      }}
                    />
                  }
                  label="Take Profit Automático"
                  sx={{ color: "#ffffff", mb: 1 }}
                />
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 3, backgroundColor: "rgba(255,193,7,0.1)", color: "#ffffff" }}>
              <Typography variant="body2">
                <strong>{"⚠️ IMPORTANTE:"}</strong>{" "}
                {
                  "La ejecución automática requiere supervisión constante. Nunca dejes el sistema funcionando sin monitoreo regular. Asegúrate de tener configurados correctamente el Stop Loss y Take Profit."
                }
              </Typography>
            </Alert>
          </Card>
        </Box>
      )}
    </DialogContent>
  );
};

export default AutoTradingComponent;