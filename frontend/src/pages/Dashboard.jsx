/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  Badge,
  InputAdornment,
  Fab
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  AccountBalance,
  Timeline,
  Search,
  FilterList,
  Sort,
  Refresh,
  Settings,
  Notifications,
  SmartToy,
  Psychology,
  AutoGraph,
  CandlestickChart,
  Analytics,
  School,
  History,
  Star,
  Warning,
  CheckCircle,
  Cancel,
  PlayArrow,
  Pause,
  Stop,
  Speed,
  Assessment,
  TrendingFlat,
  SwapVert,
  CalendarToday,
  AttachMoney,
  BarChart,
  PieChart,
  DonutLarge
} from '@mui/icons-material'
import './dashboard.css'

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth)
  const location = useLocation()
  const isMainDashboard = location.pathname === '/dashboard'

  // Estados para el dashboard
  const [activeTab, setActiveTab] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [filterBy, setFilterBy] = useState('all')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Datos mock para el dashboard
  const [portfolioData] = useState({
    totalValue: 125430.89,
    todayPnL: 2642.34,
    todayPnLPercent: 2.15,
    openPositions: 12,
    winningPositions: 8,
    losingPositions: 4,
    winRate: 73.5,
    totalTrades: 156,
    avgWin: 245.67,
    avgLoss: -123.45
  })

  const [tradingHistory, setTradingHistory] = useState([
    {
      id: 1,
      symbol: 'BTC/USDT',
      type: 'BUY',
      entry: 45200.50,
      exit: 46800.75,
      quantity: 0.5,
      pnl: 800.13,
      pnlPercent: 3.54,
      date: '2024-01-15T14:30:00Z',
      status: 'closed',
      confluenceScore: 0.85,
      aiSignal: true
    },
    {
      id: 2,
      symbol: 'ETH/USDT',
      type: 'SELL',
      entry: 2650.30,
      exit: 2580.45,
      quantity: 2.0,
      pnl: -139.70,
      pnlPercent: -2.63,
      date: '2024-01-15T12:15:00Z',
      status: 'closed',
      confluenceScore: 0.72,
      aiSignal: true
    },
    {
      id: 3,
      symbol: 'AAPL',
      type: 'BUY',
      entry: 185.50,
      exit: null,
      quantity: 50,
      pnl: 425.00,
      pnlPercent: 4.58,
      date: '2024-01-15T10:45:00Z',
      status: 'open',
      confluenceScore: 0.91,
      aiSignal: true
    }
  ])

  const [aiSignals] = useState([
    {
      id: 1,
      symbol: 'TSLA',
      signal: 'BUY',
      confluenceScore: 0.89,
      targetPrice: 245.80,
      currentPrice: 238.45,
      stopLoss: 230.00,
      analyses: ['Elliott Wave', 'Fibonacci', 'Support/Resistance'],
      strength: 'HIGH',
      timeframe: '4H'
    },
    {
      id: 2,
      symbol: 'GOLD',
      signal: 'SELL',
      confluenceScore: 0.76,
      targetPrice: 1985.50,
      currentPrice: 2010.30,
      stopLoss: 2025.00,
      analyses: ['Chart Pattern', 'Fibonacci'],
      strength: 'MEDIUM',
      timeframe: '1D'
    }
  ])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simular actualización de datos
    setTimeout(() => {
      setRefreshing(false)
    }, 2000)
  }

  const filteredHistory = tradingHistory.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterBy === 'all' || trade.status === filterBy || trade.type.toLowerCase() === filterBy
    return matchesSearch && matchesFilter
  })

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date) - new Date(a.date)
      case 'symbol':
        return a.symbol.localeCompare(b.symbol)
      case 'pnl':
        return b.pnl - a.pnl
      case 'confluence':
        return b.confluenceScore - a.confluenceScore
      default:
        return 0
    }
  })

  if (!isMainDashboard) {
    return <Outlet />
  }

  return (
    <Box className="dashboard-container">
      <Container maxWidth="xl">
        {/* Header del Dashboard */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" className="dashboard-title">
              Dashboard de Trading IA
            </Typography>
            <Typography variant="h6" className="dashboard-subtitle">
              Bienvenido de vuelta, {user?.name || user?.email}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<School />}
              onClick={() => setTutorialOpen(true)}
              className="tutorial-button"
              size="small"
            >
              Tutorial de Uso IA Trading
            </Button>
            <IconButton onClick={handleRefresh} className="refresh-icon" disabled={refreshing}>
              <Refresh className={refreshing ? 'rotating' : ''} />
            </IconButton>
          </Box>
        </Box>

        {/* Tarjetas de Resumen */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="summary-card portfolio">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" className="card-label">
                      Valor del Portfolio
                    </Typography>
                    <Typography variant="h4" className="card-value">
                      ${portfolioData.totalValue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" className="card-change positive">
                      +{portfolioData.todayPnLPercent}% hoy
                    </Typography>
                  </Box>
                  <Avatar className="card-icon portfolio-icon">
                    <AccountBalance />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="summary-card pnl">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" className="card-label">
                      P&L Hoy
                    </Typography>
                    <Typography variant="h4" className="card-value">
                      +${portfolioData.todayPnL.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" className="card-change positive">
                      En {portfolioData.openPositions} operaciones
                    </Typography>
                  </Box>
                  <Avatar className="card-icon pnl-icon">
                    <TrendingUp />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="summary-card positions">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" className="card-label">
                      Posiciones Abiertas
                    </Typography>
                    <Typography variant="h4" className="card-value">
                      {portfolioData.openPositions}
                    </Typography>
                    <Typography variant="body2" className="card-change">
                      {portfolioData.winningPositions} ganando, {portfolioData.losingPositions} perdiendo
                    </Typography>
                  </Box>
                  <Avatar className="card-icon positions-icon">
                    <ShowChart />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card className="summary-card winrate">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" className="card-label">
                      Tasa de Éxito
                    </Typography>
                    <Typography variant="h4" className="card-value">
                      {portfolioData.winRate}%
                    </Typography>
                    <Typography variant="body2" className="card-change positive">
                      Últimos 30 días
                    </Typography>
                  </Box>
                  <Avatar className="card-icon winrate-icon">
                    <Star />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Contenido Principal con Tabs */}
        <Card className="main-content-card">
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 255, 255, 0.2)' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              className="dashboard-tabs"
            >
              <Tab icon={<History />} label="Historial de Operaciones" />
              <Tab icon={<SmartToy />} label="Señales IA" />
              <Tab icon={<Analytics />} label="Análisis Avanzado" />
              <Tab icon={<Assessment />} label="Estadísticas" />
              <Tab icon={<Settings />} label="Configuración" />
            </Tabs>
          </Box>

          {/* Tab 1: Historial de Operaciones */}
          {activeTab === 0 && (
            <Box className="tab-content">
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  placeholder="Buscar por símbolo o par..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-field"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search className="search-icon" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" className="filter-select">
                  <InputLabel>Filtrar por</InputLabel>
                  <Select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    label="Filtrar por"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="open">Abiertos</MenuItem>
                    <MenuItem value="closed">Cerrados</MenuItem>
                    <MenuItem value="buy">Compras</MenuItem>
                    <MenuItem value="sell">Ventas</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" className="sort-select">
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Ordenar por"
                  >
                    <MenuItem value="date">Fecha</MenuItem>
                    <MenuItem value="symbol">Símbolo</MenuItem>
                    <MenuItem value="pnl">P&L</MenuItem>
                    <MenuItem value="confluence">Confluencia</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TableContainer component={Paper} className="history-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Símbolo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Entrada</TableCell>
                      <TableCell>Salida</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>P&L</TableCell>
                      <TableCell>Confluencia</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedHistory.map((trade) => (
                      <TableRow key={trade.id} className="history-row">
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" className="symbol-text">
                              {trade.symbol}
                            </Typography>
                            {trade.aiSignal && (
                              <Tooltip title="Señal generada por IA">
                                <SmartToy className="ai-indicator" />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={trade.type}
                            className={`type-chip ${trade.type.toLowerCase()}`}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>${trade.entry.toLocaleString()}</TableCell>
                        <TableCell>
                          {trade.exit ? `$${trade.exit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>{trade.quantity}</TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            className={`pnl-text ${trade.pnl >= 0 ? 'positive' : 'negative'}`}
                          >
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            <br />
                            <span className="pnl-percent">
                              ({trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                            </span>
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={trade.confluenceScore * 100}
                              className="confluence-bar"
                              sx={{ width: 60, height: 6 }}
                            />
                            <Typography variant="caption">
                              {(trade.confluenceScore * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={trade.status}
                            className={`status-chip ${trade.status}`}
                            size="small"
                            icon={trade.status === 'open' ? <PlayArrow /> : <CheckCircle />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(trade.date).toLocaleDateString()}
                            <br />
                            {new Date(trade.date).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 2: Señales IA */}
          {activeTab === 1 && (
            <Box className="tab-content">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" className="section-title">
                  Señales Generadas por IA
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Psychology />}
                  onClick={() => setAiAnalysisOpen(true)}
                  className="ai-analysis-button"
                >
                  Generar Nuevo Análisis
                </Button>
              </Box>

              <Grid container spacing={3}>
                {aiSignals.map((signal) => (
                  <Grid item xs={12} md={6} key={signal.id}>
                    <Card className="signal-card">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" className="signal-symbol">
                              {signal.symbol}
                            </Typography>
                            <Typography variant="caption" className="signal-timeframe">
                              Timeframe: {signal.timeframe}
                            </Typography>
                          </Box>
                          <Chip
                            label={signal.signal}
                            className={`signal-chip ${signal.signal.toLowerCase()}`}
                            icon={signal.signal === 'BUY' ? <TrendingUp /> : <TrendingDown />}
                          />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" className="signal-label">
                            Confluencia Score
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={signal.confluenceScore * 100}
                              className="confluence-progress"
                              sx={{ flex: 1, height: 8 }}
                            />
                            <Typography variant="body2" className="confluence-score">
                              {(signal.confluenceScore * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" className="signal-label">
                              Precio Actual
                            </Typography>
                            <Typography variant="body1" className="signal-price">
                              ${signal.currentPrice}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" className="signal-label">
                              Precio Objetivo
                            </Typography>
                            <Typography variant="body1" className="signal-price target">
                              ${signal.targetPrice}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" className="signal-label">
                              Stop Loss
                            </Typography>
                            <Typography variant="body1" className="signal-price stop">
                              ${signal.stopLoss}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" className="signal-label">
                              Fuerza
                            </Typography>
                            <Chip
                              label={signal.strength}
                              size="small"
                              className={`strength-chip ${signal.strength.toLowerCase()}`}
                            />
                          </Grid>
                        </Grid>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" className="signal-label">
                            Análisis Confluentes
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {signal.analyses.map((analysis, index) => (
                              <Chip
                                key={index}
                                label={analysis}
                                size="small"
                                className="analysis-chip"
                              />
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            className="execute-button"
                            startIcon={<PlayArrow />}
                          >
                            Ejecutar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            className="watch-button"
                            startIcon={<Star />}
                          >
                            Observar
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Tab 3: Análisis Avanzado */}
          {activeTab === 2 && (
            <Box className="tab-content">
              <Typography variant="h6" className="section-title" sx={{ mb: 3 }}>
                Herramientas de Análisis Avanzado
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={4}>
                  <Card className="analysis-tool-card">
                    <CardContent>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar className="tool-icon elliott">
                          <AutoGraph />
                        </Avatar>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                          Ondas de Elliott
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
                          Análisis de patrones de ondas para predecir movimientos futuros
                        </Typography>
                        <Button variant="contained" className="tool-button">
                          Analizar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Card className="analysis-tool-card">
                    <CardContent>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar className="tool-icon fibonacci">
                          <Timeline />
                        </Avatar>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                          Fibonacci
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
                          Niveles de retroceso y extensión de Fibonacci
                        </Typography>
                        <Button variant="contained" className="tool-button">
                          Calcular
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Card className="analysis-tool-card">
                    <CardContent>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar className="tool-icon patterns">
                          <CandlestickChart />
                        </Avatar>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                          Patrones Chartistas
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
                          Detección automática de patrones de velas japonesas
                        </Typography>
                        <Button variant="contained" className="tool-button">
                          Detectar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Card className="analysis-tool-card">
                    <CardContent>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar className="tool-icon support">
                          <BarChart />
                        </Avatar>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                          Soporte y Resistencia
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
                          Identificación de niveles clave de precio
                        </Typography>
                        <Button variant="contained" className="tool-button">
                          Identificar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Card className="analysis-tool-card">
                    <CardContent>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar className="tool-icon confluence">
                          <DonutLarge />
                        </Avatar>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                          Detector de Confluencias
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
                          Encuentra puntos donde múltiples análisis confluyen
                        </Typography>
                        <Button variant="contained" className="tool-button">
                          Detectar
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Card className="analysis-tool-card">
                    <CardContent>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar className="tool-icon risk">
                          <Speed />
                        </Avatar>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                          Gestión de Riesgo
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
                          Calculadora de posición y gestión de riesgo
                        </Typography>
                        <Button variant="contained" className="tool-button">
                          Calcular
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 4: Estadísticas */}
          {activeTab === 3 && (
            <Box className="tab-content">
              <Typography variant="h6" className="section-title" sx={{ mb: 3 }}>
                Estadísticas de Trading
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card className="stats-card">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Rendimiento General
                      </Typography>
                      <Box className="stats-grid">
                        <Box className="stat-item">
                          <Typography variant="caption">Total de Operaciones</Typography>
                          <Typography variant="h5">{portfolioData.totalTrades}</Typography>
                        </Box>
                        <Box className="stat-item">
                          <Typography variant="caption">Ganancia Promedio</Typography>
                          <Typography variant="h5" className="positive">
                            ${portfolioData.avgWin}
                          </Typography>
                        </Box>
                        <Box className="stat-item">
                          <Typography variant="caption">Pérdida Promedio</Typography>
                          <Typography variant="h5" className="negative">
                            ${portfolioData.avgLoss}
                          </Typography>
                        </Box>
                        <Box className="stat-item">
                          <Typography variant="caption">Ratio Ganancia/Pérdida</Typography>
                          <Typography variant="h5">
                            {(Math.abs(portfolioData.avgWin / portfolioData.avgLoss)).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card className="stats-card">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Análisis por Timeframe
                      </Typography>
                      <Box className="timeframe-stats">
                        {['1H', '4H', '1D', '1W'].map((tf) => (
                          <Box key={tf} className="timeframe-item">
                            <Typography variant="body2">{tf}</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.random() * 100}
                              className="timeframe-progress"
                            />
                            <Typography variant="caption">
                              {(Math.random() * 100).toFixed(0)}% éxito
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 5: Configuración */}
          {activeTab === 4 && (
            <Box className="tab-content">
              <Typography variant="h6" className="section-title" sx={{ mb: 3 }}>
                Configuración del Sistema
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card className="config-card">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Configuración de IA
                      </Typography>
                      <Box className="config-options">
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Umbral de Confluencia</InputLabel>
                          <Select defaultValue={0.6} label="Umbral de Confluencia">
                            <MenuItem value={0.5}>50% - Conservador</MenuItem>
                            <MenuItem value={0.6}>60% - Balanceado</MenuItem>
                            <MenuItem value={0.7}>70% - Agresivo</MenuItem>
                            <MenuItem value={0.8}>80% - Muy Agresivo</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Análisis Activos</InputLabel>
                          <Select multiple defaultValue={['elliott', 'fibonacci', 'patterns']}>
                            <MenuItem value="elliott">Ondas de Elliott</MenuItem>
                            <MenuItem value="fibonacci">Fibonacci</MenuItem>
                            <MenuItem value="patterns">Patrones Chartistas</MenuItem>
                            <MenuItem value="support">Soporte/Resistencia</MenuItem>
                          </Select>
                        </FormControl>

                        <TextField
                          fullWidth
                          label="Riesgo por Operación (%)"
                          type="number"
                          defaultValue={2}
                          sx={{ mb: 2 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card className="config-card">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Notificaciones
                      </Typography>
                      <Box className="notification-settings">
                        <Box className="setting-item">
                          <Typography variant="body2">Señales de Alta Confluencia</Typography>
                          <Button variant="outlined" size="small">Activado</Button>
                        </Box>
                        <Box className="setting-item">
                          <Typography variant="body2">Alertas de Stop Loss</Typography>
                          <Button variant="outlined" size="small">Activado</Button>
                        </Box>
                        <Box className="setting-item">
                          <Typography variant="body2">Objetivos Alcanzados</Typography>
                          <Button variant="outlined" size="small">Activado</Button>
                        </Box>
                        <Box className="setting-item">
                          <Typography variant="body2">Resumen Diario</Typography>
                          <Button variant="outlined" size="small">Desactivado</Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Card>

        {/* Floating Action Button para acciones rápidas */}
        <Fab
          color="primary"
          className="floating-action-button"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
        >
          <SmartToy />
        </Fab>

        {/* Dialog Tutorial */}
        <Dialog
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
          maxWidth="md"
          fullWidth
          className="tutorial-dialog"
        >
          <DialogTitle className="dialog-title">
            <SmartToy sx={{ mr: 1 }} />
            Tutorial de Uso IA Trading
          </DialogTitle>
          <DialogContent className="dialog-content">
            <Typography variant="body1" sx={{ mb: 2 }}>
              Bienvenido al sistema de trading con Inteligencia Artificial. Aquí aprenderás a usar todas las funcionalidades:
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#00ffff' }}>
                1. Detector de Confluencias
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Nuestro sistema analiza múltiples indicadores técnicos (Ondas de Elliott, Fibonacci, Patrones Chartistas, Soporte/Resistencia) 
                para encontrar puntos donde confluyen varios análisis, aumentando la probabilidad de éxito.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#00ffff' }}>
                2. Señales Automáticas
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                El sistema genera señales automáticamente cuando detecta confluencias con alta probabilidad. 
                Cada señal incluye precio de entrada, stop loss, take profit y score de confluencia.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#00ffff' }}>
                3. Gestión de Riesgo
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Todas las señales incluyen cálculos automáticos de stop loss basados en ATR y estructura del mercado, 
                asegurando una gestión de riesgo adecuada.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTutorialOpen(false)} className="dialog-button">
              Entendido
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Análisis IA */}
        <Dialog
          open={aiAnalysisOpen}
          onClose={() => setAiAnalysisOpen(false)}
          maxWidth="sm"
          fullWidth
          className="ai-dialog"
        >
          <DialogTitle className="dialog-title">
            <Psychology sx={{ mr: 1 }} />
            Generar Análisis con IA
          </DialogTitle>
          <DialogContent className="dialog-content">
            <TextField
              fullWidth
              label="Símbolo a Analizar"
              placeholder="Ej: BTC/USDT, AAPL, EUR/USD"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select defaultValue="4H">
                <MenuItem value="1H">1 Hora</MenuItem>
                <MenuItem value="4H">4 Horas</MenuItem>
                <MenuItem value="1D">1 Día</MenuItem>
                <MenuItem value="1W">1 Semana</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              El análisis incluirá todos los indicadores configurados y generará una señal si encuentra confluencias suficientes.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAiAnalysisOpen(false)} className="dialog-button-secondary">
              Cancelar
            </Button>
            <Button onClick={() => setAiAnalysisOpen(false)} className="dialog-button">
              Generar Análisis
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}

export default Dashboard
