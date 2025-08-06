import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Skeleton,
  Pagination,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material'
import {
  Search,
  Refresh,
  TrendingUp,
  TrendingDown,
  Remove,
  Article,
  ShowChart,
  CurrencyBitcoin,
  AccountBalance,
  LocalAtm,
  ArrowForward,
  AccessTime
} from '@mui/icons-material'
import './news.css'

const News = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Datos de ejemplo - en una app real vendrían de una API
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mockNews = [
    {
      id: 1,
      title: "Bitcoin alcanza nuevo máximo mensual tras aprobación de ETF",
      summary: "El precio de Bitcoin se disparó un 8% después de que la SEC aprobara el primer ETF de Bitcoin al contado, llevando el precio por encima de los $45,000.",
      category: "crypto",
      source: "CoinDesk",
      publishedAt: "2024-01-15T10:30:00Z",
      image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=200&fit=crop",
      impact: "high",
      sentiment: "positive"
    },
    {
      id: 2,
      title: "Fed mantiene tasas de interés sin cambios en reunión de enero",
      summary: "La Reserva Federal decidió mantener las tasas de interés entre 5.25% y 5.50%, señalando un enfoque cauteloso ante la inflación persistente.",
      category: "economy",
      source: "Reuters",
      publishedAt: "2024-01-15T09:45:00Z",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop",
      impact: "high",
      sentiment: "neutral"
    },
    {
      id: 3,
      title: "Apple reporta ingresos récord en el Q4 2023",
      summary: "Apple superó las expectativas con ingresos de $119.6 mil millones, impulsado por las fuertes ventas del iPhone 15 y servicios.",
      category: "stocks",
      source: "Bloomberg",
      publishedAt: "2024-01-15T08:20:00Z",
      image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=200&fit=crop",
      impact: "medium",
      sentiment: "positive"
    },
    {
      id: 4,
      title: "Tensiones geopolíticas impulsan el precio del oro",
      summary: "El oro subió un 2.3% en la sesión de hoy debido a las crecientes tensiones en Medio Oriente y la búsqueda de activos refugio por parte de los inversores.",
      category: "commodities",
      source: "MarketWatch",
      publishedAt: "2024-01-15T07:15:00Z",
      image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=200&fit=crop",
      impact: "medium",
      sentiment: "neutral"
    },
    {
      id: 5,
      title: "Tesla anuncia nueva planta de producción en México",
      summary: "Tesla confirmó la construcción de una nueva gigafábrica en Nuevo León, México, con una inversión estimada de $5 mil millones.",
      category: "stocks",
      source: "CNBC",
      publishedAt: "2024-01-15T06:30:00Z",
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=200&fit=crop",
      impact: "medium",
      sentiment: "positive"
    },
    {
      id: 6,
      title: "Ethereum prepara importante actualización de red",
      summary: "La red Ethereum se prepara para la actualización Dencun, que promete reducir significativamente las tarifas de gas para las transacciones.",
      category: "crypto",
      source: "CoinTelegraph",
      publishedAt: "2024-01-15T05:45:00Z",
      image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop",
      impact: "medium",
      sentiment: "positive"
    }
  ]

  const categories = [
    { id: 'all', name: 'Todas', icon: <Article /> },
    { id: 'stocks', name: 'Acciones', icon: <ShowChart /> },
    { id: 'crypto', name: 'Cripto', icon: <CurrencyBitcoin /> },
    { id: 'economy', name: 'Economía', icon: <AccountBalance /> },
    { id: 'commodities', name: 'Materias Primas', icon: <LocalAtm /> }
  ]

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setNews(mockNews)
      setLoading(false)
    }, 1000)
  }, [mockNews])

  const filteredNews = news.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const paginatedNews = filteredNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage)

  const getTimeAgo = (dateString) => {
    const now = new Date()
    const publishedDate = new Date(dateString)
    const diffInHours = Math.floor((now - publishedDate) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Hace menos de 1 hora'
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`
  }

  const getImpactChip = (impact) => {
    const configs = {
      high: { label: 'Alto Impacto', className: 'impact-high' },
      medium: { label: 'Medio Impacto', className: 'impact-medium' },
      low: { label: 'Bajo Impacto', className: 'impact-low' }
    }
    return configs[impact] || configs.low
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="sentiment-positive" />
      case 'negative': return <TrendingDown className="sentiment-negative" />
      case 'neutral': return <Remove className="sentiment-neutral" />
      default: return <Remove className="sentiment-neutral" />
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  if (loading) {
    return (
      <Box className="news-container">
        <Container maxWidth="xl">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" className="news-title" sx={{ mb: 2 }}>
              Noticias del Mercado
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Card className="news-card-skeleton">
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent>
                    <Skeleton variant="text" height={30} />
                    <Skeleton variant="text" height={20} width="80%" />
                    <Skeleton variant="text" height={60} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Skeleton variant="rectangular" width={80} height={24} />
                      <Skeleton variant="rectangular" width={60} height={24} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    )
  }

  return (
    <Box className="news-container">
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 3,
          mb: 4
        }}>
          <Typography variant="h4" className="news-title">
            Noticias del Mercado
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="news-search"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="search-icon" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleRefresh}
              className="refresh-button"
              startIcon={<Refresh />}
            >
              Actualizar
            </Button>
          </Box>
        </Box>

        {/* Filtros de categorías */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
          {categories.map(category => (
            <Chip
              key={category.id}
              icon={category.icon}
              label={category.name}
              onClick={() => setSelectedCategory(category.id)}
              className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>

        {/* Lista de noticias */}
        {filteredNews.length === 0 ? (
          <Box className="no-news">
            <Article sx={{ fontSize: 64, color: 'rgba(255,255,255,0.3)', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
              No se encontraron noticias
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Prueba con diferentes filtros o términos de búsqueda
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
              {paginatedNews.map(article => (
                <Grid 
                  item 
                  xs={12} 
                  sm={6} 
                  md={6} 
                  lg={4} 
                  xl={4}
                  key={article.id}
                  sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    maxWidth: { xs: '100%', sm: '50%', md: '50%', lg: '33.333%', xl: '33.333%' }
                  }}
                >
                  <Card className="news-card" sx={{ width: '100%', maxWidth: { xs: '100%', lg: '400px' } }}>
                    <Box className="news-card-media">
                      <CardMedia
                        component="img"
                        height="200"
                        image={article.image}
                        alt={article.title}
                      />
                      <Box className="news-card-badges">
                        <Chip
                          size="small"
                          label={getImpactChip(article.impact).label}
                          className={`impact-chip ${getImpactChip(article.impact).className}`}
                        />
                        <Tooltip title={`Sentimiento: ${article.sentiment}`}>
                          <Box className="sentiment-icon">
                            {getSentimentIcon(article.sentiment)}
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>

                    <CardContent className="news-card-content">
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="caption" className="news-source">
                          {article.source}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime sx={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} />
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {getTimeAgo(article.publishedAt)}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="h6" className="news-title-card">
                        {article.title}
                      </Typography>

                      <Typography variant="body2" className="news-summary">
                        {article.summary}
                      </Typography>

                      <Box className="news-card-footer" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          size="small"
                          icon={categories.find(cat => cat.id === article.category)?.icon}
                          label={categories.find(cat => cat.id === article.category)?.name}
                          className="category-tag"
                        />
                        <Button
                          size="small"
                          endIcon={<ArrowForward />}
                          className="read-more-button"
                        >
                          Leer más
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Paginación */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, value) => setCurrentPage(value)}
                  className="news-pagination"
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  )
}

export default News
