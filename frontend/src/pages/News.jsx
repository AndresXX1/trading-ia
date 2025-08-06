import React, { useState, useEffect } from 'react'

const News = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

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
    { id: 'all', name: 'Todas', icon: '📰' },
    { id: 'stocks', name: 'Acciones', icon: '📈' },
    { id: 'crypto', name: 'Cripto', icon: '₿' },
    { id: 'economy', name: 'Economía', icon: '🏦' },
    { id: 'commodities', name: 'Materias Primas', icon: '🥇' }
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

  const getTimeAgo = (dateString) => {
    const now = new Date()
    const publishedDate = new Date(dateString)
    const diffInHours = Math.floor((now - publishedDate) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Hace menos de 1 hora'
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '📈'
      case 'negative': return '📉'
      case 'neutral': return '➖'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Noticias del Mercado</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Noticias del Mercado</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar noticias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros de categorías */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition duration-200 ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Lista de noticias */}
      {filteredNews.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron noticias</h3>
          <p className="text-gray-600">Prueba con diferentes filtros o términos de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNews.map(article => (
            <article key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
              <div className="relative">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getImpactColor(article.impact)}`}>
                    {article.impact === 'high' ? 'Alto Impacto' : 
                     article.impact === 'medium' ? 'Medio Impacto' : 'Bajo Impacto'}
                  </span>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {getSentimentIcon(article.sentiment)}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-blue-600 font-medium">{article.source}</span>
                  <span className="text-sm text-gray-500">{getTimeAgo(article.publishedAt)}</span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                  {article.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.summary}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {categories.find(cat => cat.id === article.category)?.icon}
                      <span className="ml-1">{categories.find(cat => cat.id === article.category)?.name}</span>
                    </span>
                  </div>
                  
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                    Leer más
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Paginación (placeholder) */}
      {filteredNews.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Anterior
            </button>
            <button className="px-3 py-2 text-sm text-white bg-blue-600 border border-blue-600 rounded-md">
              1
            </button>
            <button className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              3
            </button>
            <button className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default News