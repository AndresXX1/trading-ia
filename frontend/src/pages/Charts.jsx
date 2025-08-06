import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, BarChart, Bar, Cell } from 'recharts'

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('1D')
  const [chartType, setChartType] = useState('line')
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState([])
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: false,
    rsi: false,
    macd: false
  })

  // Símbolos populares
  const popularSymbols = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 185.25, change: 2.34, changePercent: 1.28 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: -3.45, changePercent: -0.90 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.56, change: 1.89, changePercent: 1.34 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -5.67, changePercent: -2.23 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 153.40, change: 0.98, changePercent: 0.64 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change: 12.45, changePercent: 1.44 }
  ]

  const cryptoSymbols = [
    { symbol: 'BTC', name: 'Bitcoin', price: 45200, change: -890, changePercent: -1.93 },
    { symbol: 'ETH', name: 'Ethereum', price: 2650, change: 45, changePercent: 1.73 },
    { symbol: 'BNB', name: 'Binance Coin', price: 315, change: -8.5, changePercent: -2.63 },
    { symbol: 'ADA', name: 'Cardano', price: 0.52, change: 0.02, changePercent: 4.00 }
  ]

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M']

  // Generar datos de ejemplo para el gráfico
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const generateChartData = (symbol) => {
    const data = []
    const basePrice = popularSymbols.find(s => s.symbol === symbol)?.price || 100
    let price = basePrice * 0.95 // Comenzar un poco más bajo

    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.5) * (basePrice * 0.02)
      const open = i === 0 ? price : data[i - 1].close
      price += change
      
      const high = Math.max(open, price) + Math.random() * (basePrice * 0.01)
      const low = Math.min(open, price) - Math.random() * (basePrice * 0.01)
      const close = price
      
      const volume = Math.floor(Math.random() * 1000000) + 100000

      // Calcular SMA simple (20 períodos)
      let sma20 = null
      if (i >= 19) {
        const sum = data.slice(i - 19).reduce((acc, item) => acc + item.close, 0) + close
        sma20 = sum / 20
      }

      // Para el gráfico de velas necesitamos calcular algunos valores adicionales
      const bodyHeight = Math.abs(close - open)
      const bodyY = Math.min(open, close)
      const isGreen = close > open

      data.push({
        time: `${String(9 + Math.floor(i / 10)).padStart(2, '0')}:${String((i % 10) * 6).padStart(2, '0')}`,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
        sma20: sma20 ? parseFloat(sma20.toFixed(2)) : null,
        // Para el gráfico de velas
        wickTop: parseFloat((high - Math.max(open, close)).toFixed(2)),
        wickBottom: parseFloat((Math.min(open, close) - low).toFixed(2)),
        bodyHeight: parseFloat(bodyHeight.toFixed(2)),
        bodyY: parseFloat(bodyY.toFixed(2)),
        isGreen: isGreen
      })
    }

    return data
  }

  useEffect(() => {
    setLoading(true)
    // Simular carga de datos
    setTimeout(() => {
      setChartData(generateChartData(selectedSymbol))
      setLoading(false)
    }, 500)
  }, [generateChartData, selectedSymbol, timeframe])

  const selectedSymbolData = [...popularSymbols, ...cryptoSymbols].find(s => s.symbol === selectedSymbol)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{`Tiempo: ${label}`}</p>
          {chartType === 'candle' && data ? (
            <>
              <p className="text-sm text-gray-700">{`Apertura: $${data.open}`}</p>
              <p className="text-sm text-gray-700">{`Máximo: $${data.high}`}</p>
              <p className="text-sm text-gray-700">{`Mínimo: $${data.low}`}</p>
              <p className="text-sm text-gray-700">{`Cierre: $${data.close}`}</p>
              <p className="text-sm text-gray-700">{`Volumen: ${data.volume?.toLocaleString()}`}</p>
            </>
          ) : (
            payload.map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {`${entry.dataKey === 'close' ? 'Precio' : entry.dataKey === 'sma20' ? 'SMA(20)' : entry.dataKey}: $${entry.value}`}
              </p>
            ))
          )}
        </div>
      )
    }
    return null
  }

  // Componente personalizado para renderizar las velas
  const CandleStick = (props) => {
    const { payload, x, y, width, height } = props
    if (!payload) return null

    const { open, high, low, close } = payload
    const isGreen = close > open
    const color = isGreen ? '#22c55e' : '#ef4444'
    
    const candleWidth = Math.max(width * 0.6, 1)
    const wickWidth = 1
    const centerX = x + width / 2

    const topPrice = Math.max(open, close)
    const bottomPrice = Math.min(open, close)
    
    // Calcular posiciones Y basadas en el rango de precios
    const priceRange = high - low
    if (priceRange === 0) return null

    const bodyTop = y + ((high - topPrice) / priceRange) * height
    const bodyBottom = y + ((high - bottomPrice) / priceRange) * height
    const bodyHeight = bodyBottom - bodyTop

    return (
      <g>
        {/* Mecha superior */}
        <line
          x1={centerX}
          y1={y}
          x2={centerX}
          y2={bodyTop}
          stroke={color}
          strokeWidth={wickWidth}
        />
        {/* Cuerpo de la vela */}
        <rect
          x={centerX - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={Math.max(bodyHeight, 1)}
          fill={isGreen ? color : color}
          stroke={color}
          strokeWidth={isGreen ? 0 : 1}
          fillOpacity={isGreen ? 1 : 0}
        />
        {/* Mecha inferior */}
        <line
          x1={centerX}
          y1={bodyBottom}
          x2={centerX}
          y2={y + height}
          stroke={color}
          strokeWidth={wickWidth}
        />
      </g>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análisis de Gráficos</h2>
          <p className="text-gray-600">Análisis técnico y visualización de datos del mercado</p>
        </div>
        
        {/* Controles principales */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="Acciones">
              {popularSymbols.map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Criptomonedas">
              {cryptoSymbols.map(crypto => (
                <option key={crypto.symbol} value={crypto.symbol}>
                  {crypto.symbol} - {crypto.name}
                </option>
              ))}
            </optgroup>
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeframes.map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="line">Líneas</option>
            <option value="candle">Velas</option>
            <option value="area">Área</option>
          </select>
        </div>
      </div>

      {/* Información del símbolo seleccionado */}
      {selectedSymbolData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedSymbolData.symbol}</h3>
              <p className="text-gray-600">{selectedSymbolData.name}</p>
            </div>
            <div className="mt-2 sm:mt-0 text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${selectedSymbolData.price.toLocaleString()}
              </div>
              <div className={`flex items-center ${selectedSymbolData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <svg className={`w-4 h-4 mr-1 ${selectedSymbolData.change >= 0 ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">
                  {selectedSymbolData.change >= 0 ? '+' : ''}{selectedSymbolData.change.toFixed(2)} ({selectedSymbolData.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Panel de indicadores */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Indicadores Técnicos</h4>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={indicators.sma}
                  onChange={(e) => setIndicators(prev => ({ ...prev, sma: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">SMA (20)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={indicators.ema}
                  onChange={(e) => setIndicators(prev => ({ ...prev, ema: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">EMA (20)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={indicators.rsi}
                  onChange={(e) => setIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">RSI (14)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={indicators.macd}
                  onChange={(e) => setIndicators(prev => ({ ...prev, macd: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">MACD</span>
              </label>
            </div>

            {/* Análisis IA */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <h5 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Análisis IA
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tendencia:</span>
                  <span className="text-green-600 font-medium">Alcista</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Señal:</span>
                  <span className="text-blue-600 font-medium">Comprar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confianza:</span>
                  <span className="text-gray-900 font-medium">78%</span>
                </div>
              </div>
            </div>

            {/* Watchlist rápida */}
            <div className="mt-6">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Watchlist</h5>
              <div className="space-y-2">
                {popularSymbols.slice(0, 4).map(stock => (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`w-full text-left p-2 rounded-lg transition duration-200 ${
                      selectedSymbol === stock.symbol
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{stock.symbol}</span>
                      <span className={`text-xs ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico principal */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-semibold text-gray-900">
                {selectedSymbol} - {timeframe}
              </h4>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition duration-200">
                Pantalla Completa
              </button>
            </div>

            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'candle' ? (
                    <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      {/* Renderizar velas usando BarChart con colores personalizados */}
                      <Bar dataKey="high" fill="transparent" />
                      {chartData.map((entry, index) => {
                        const isGreen = entry.close > entry.open
                        return (
                          <Bar 
                            key={index}
                            dataKey={`candle_${index}`}
                            fill={isGreen ? '#22c55e' : '#ef4444'}
                          />
                        )
                      })}
                      
                      {indicators.sma && (
                        <Line 
                          type="monotone" 
                          dataKey="sma20" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={false}
                          name="SMA(20)"
                          connectNulls={false}
                        />
                      )}
                    </ComposedChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        domain={['dataMin - 5', 'dataMax + 5']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={false}
                        name="Precio"
                      />
                      {indicators.sma && (
                        <Line 
                          type="monotone" 
                          dataKey="sma20" 
                          stroke="#f59e0b" 
                          strokeWidth={1}
                          dot={false}
                          name="SMA(20)"
                          connectNulls={false}
                        />
                      )}
                    </LineChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fill="#2563eb"
                        fillOpacity={0.1}
                        dot={false}
                        name="Precio"
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* Volumen */}
            <div className="mt-6 h-24">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">Volumen</h5>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(-20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="volume">
                    {chartData.slice(-20).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.close > entry.open ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Análisis detallado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Soporte y Resistencia</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Resistencia 1:</span>
              <span className="font-medium text-red-600">${(selectedSymbolData?.price * 1.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Precio Actual:</span>
              <span className="font-medium">${selectedSymbolData?.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Soporte 1:</span>
              <span className="font-medium text-green-600">${(selectedSymbolData?.price * 0.95).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Indicadores Clave</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">RSI (14):</span>
              <span className="font-medium text-yellow-600">67.8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MACD:</span>
              <span className="font-medium text-green-600">Positivo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Volumen:</span>
              <span className="font-medium">Alto</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recomendación IA</h4>
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-3">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              COMPRAR
            </div>
            <p className="text-sm text-gray-600">
              Tendencia alcista con buen momentum. Recomendación de compra con 78% de confianza.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Charts