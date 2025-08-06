import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  BarChart,
  Schedule,
  FlashOn,
  TrendingUp,
  People,
  MonitorHeart,
  AttachMoney,
  SmartToy,
  Dashboard,
  Login,
  PersonAdd
} from '@mui/icons-material'
import './home.css'

const Home = () => {
  const { user, token } = useSelector((state) => state.auth)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const features = [
    {
      icon: <BarChart sx={{ fontSize: 32 }} />,
      title: 'Análisis Avanzado',
      description: 'Gráficos interactivos y análisis técnico potenciado por IA para identificar patrones y tendencias del mercado.',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)'
    },
    {
      icon: <Schedule sx={{ fontSize: 32 }} />,
      title: 'Noticias en Tiempo Real',
      description: 'Mantente actualizado with las noticias más relevantes del mercado que pueden impactar tus inversiones.',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
    },
    {
      icon: <FlashOn sx={{ fontSize: 32 }} />,
      title: 'IA Predictiva',
      description: 'Algoritmos de machine learning que analizan patrones históricos para predecir movimientos futuros del mercado.',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #fce7f3 100%)'
    }
  ]

  const stats = [
    { value: '98%', label: 'Precisión de Análisis', color: '#3b82f6' },
    { value: '15k+', label: 'Usuarios Activos', color: '#10b981' },
    { value: '24/7', label: 'Monitoreo de Mercados', color: '#8b5cf6' },
    { value: '$2M+', label: 'Volumen Analizado', color: '#f59e0b' }
  ]

  return (
    <Box className="home-container">
      {/* Hero Section */}
      <Box className="hero-section">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', py: { xs: 8, md: 12 } }}>
            <Typography 
              variant={isMobile ? "h3" : "h1"} 
              className="hero-title"
              sx={{ mb: 3, fontWeight: 'bold' }}
            >
              Trading con{' '}
              <Box component="span" className="gradient-text">
                Inteligencia Artificial
              </Box>
            </Typography>
            
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 4, 
                color: 'text.secondary', 
                maxWidth: '800px', 
                mx: 'auto',
                lineHeight: 1.6,
                fontSize: { xs: '1.1rem', md: '1.25rem' }
              }}
            >
              Potencia tus decisiones de trading con análisis avanzado, noticias en tiempo real 
              y herramientas de IA que te ayudan a identificar las mejores oportunidades del mercado.
            </Typography>

            {!token ? (
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                justifyContent="center"
                sx={{ mt: 4 }}
              >
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  size="large"
                  startIcon={<PersonAdd />}
                  className="cta-button primary"
                  sx={{ 
                    px: 4, 
                    py: 1.5,
                    fontSize: '1.1rem',
                    textTransform: 'none'
                  }}
                >
                  Comenzar Gratis
                </Button>
                <Button
                  component={Link}
                  to="/login"
                  variant="outlined"
                  size="large"
                  startIcon={<Login />}
                  className="cta-button secondary"
                  sx={{ 
                    px: 4, 
                    py: 1.5,
                    fontSize: '1.1rem',
                    textTransform: 'none'
                  }}
                >
                  Iniciar Sesión
                </Button>
              </Stack>
            ) : (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
                  ¡Bienvenido de vuelta, {user?.name || user?.email}!
                </Typography>
                <Button
                  component={Link}
                  to="/dashboard"
                  variant="contained"
                  size="large"
                  startIcon={<Dashboard />}
                  className="cta-button success"
                  sx={{ 
                    px: 4, 
                    py: 1.5,
                    fontSize: '1.1rem',
                    textTransform: 'none'
                  }}
                >
                  Ir al Dashboard
                </Button>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 10,   background: `
    radial-gradient(circle at 30% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(255, 0, 255, 0.1) 0%, transparent 50%)
  `,
  backgroundColor: '#1a1a1a' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2, color: "white" }}>
              Características Principales
            </Typography>
            <Typography variant="h6" sx={{ color: 'white', maxWidth: '600px', mx: 'auto' }}>
              Todo lo que necesitas para tomar decisiones inteligentes en el mercado
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center" alignItems="stretch">
            {features.map((feature, index) => (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4} 
                key={index}
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <Card 
                  className="feature-card" 
                  sx={{ 
                    height: '100%', 
                    position: 'relative',
                    width: '100%',
                    maxWidth: { xs: '400px', md: 'none' }
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Avatar 
                      sx={{ 
                        width: 64, 
                        height: 64, 
                        mx: 'auto', 
                        mb: 3,
                        background: feature.gradient,
                        boxShadow: 3
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: "white" }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'white', lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box className="stats-section">
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2, color: 'white' }}>
              Resultados que Hablan por Sí Solos
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Miles de traders confían en nuestra plataforma
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {stats.map((stat, index) => (
              <Grid 
                item 
                xs={6} 
                sm={3} 
                md={3} 
                key={index}
                sx={{ 
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <Box sx={{ textAlign: 'center', width: '100%' }}>
                  <Typography 
                    variant="h2" 
                    sx={{ 
                      fontWeight: 'bold', 
                      mb: 1,
                      color: stat.color,
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      {!token && (
        <Box className="cta-section">
          <Container maxWidth="md">
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 3 }}>
                ¿Listo para Revolucionar tu Trading?
              </Typography>
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4 }}>
                Únete a miles de traders que ya están usando IA para maximizar sus ganancias
              </Typography>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                size="large"
                startIcon={<SmartToy />}
                className="cta-button final"
                sx={{ 
                  px: 6, 
                  py: 2,
                  fontSize: '1.2rem',
                  textTransform: 'none'
                }}
              >
                Empezar Ahora - Es Gratis
              </Button>
            </Box>
          </Container>
        </Box>
      )}
    </Box>
  )
}

export default Home
