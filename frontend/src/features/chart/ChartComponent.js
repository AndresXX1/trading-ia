/* eslint-disable no-unused-vars */
import React, { useEffect, useRef } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { useDispatch, useSelector } from 'react-redux'
import { fetchSignals } from './chartSlice'

const ChartComponent = ({ pair = 'EURUSD', timeframe = 'H1' }) => {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const dispatch = useDispatch()
  const { data, signals, status } = useSelector(state => state.chart)
  
  useEffect(() => {
    // Inicializar gráfico
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        backgroundColor: '#1e293b',
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })
    
    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })
    
    // Ajustar tamaño en redimensionamiento
    const handleResize = () => {
      chartRef.current.applyOptions({ 
        width: chartContainerRef.current.clientWidth 
      })
    }
    
    window.addEventListener('resize', handleResize)
    
    // Limpieza
    return () => {
      window.removeEventListener('resize', handleResize)
      chartRef.current.remove()
    }
  }, [])
  
  useEffect(() => {
    // Cargar datos y señales
    dispatch(fetchSignals({ pair, timeframe }))
  }, [dispatch, pair, timeframe])
  
  useEffect(() => {
    // Actualizar datos del gráfico
    if (data && candleSeriesRef.current) {
      candleSeriesRef.current.setData(data)
      
      // Dibujar soportes/resistencias
      signals.supportResistance?.levels.forEach(level => {
        const line = chartRef.current.addLine({
          price: level.price,
          color: level.type === 'support' ? '#10b981' : '#ef4444',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `${level.type.toUpperCase()} (${level.touches})`,
        })
      })
      
      // Dibujar objetivos de Elliott Wave
      signals.elliottWave?.targets.forEach(target => {
        const line = chartRef.current.addLine({
          price: target.price,
          color: '#3b82f6',
          lineWidth: 2,
          axisLabelVisible: true,
          title: `${target.type} (${(target.probability * 100).toFixed(0)}%)`,
        })
      })
    }
  }, [data, signals])
  
  return (
    <div className="w-full bg-slate-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{pair} - {timeframe}</h2>
        {status === 'loading' && <div className="text-blue-400">Cargando...</div>}
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}

export default ChartComponent