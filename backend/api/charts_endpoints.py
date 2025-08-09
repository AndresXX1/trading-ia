from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional, Any
import asyncio
import json
from datetime import datetime, timedelta
import logging
import numpy as np
import pandas as pd
from database.models import User
from database.connection import get_database
from mt5.data_provider import MT5DataProvider
from api.auth import get_current_user
from bson import ObjectId
import io
import base64
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle, FancyBboxPatch
import seaborn as sns # type: ignore
import tempfile
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# Configurar matplotlib para no usar GUI
plt.switch_backend('Agg')

# Inicializar MT5 provider
mt5_provider = MT5DataProvider()

def prepare_for_json(data):
    """Prepara datos para serialización JSON"""
    if data is None:
        return None
    elif isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == "_id":
                if isinstance(value, ObjectId):
                    result["id"] = str(value)
                else:
                    result["id"] = str(value)
            else:
                result[key] = prepare_for_json(value)
        return result
    elif isinstance(data, (list, tuple)):
        return [prepare_for_json(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, pd.Timestamp):
        return data.isoformat()
    elif isinstance(data, (np.float32, np.float64, np.floating)):
        return float(data)
    elif isinstance(data, (np.int32, np.int64, np.integer)):
        return int(data)
    elif isinstance(data, (np.bool_)):
        return bool(data)
    else:
        try:
            json.dumps(data)
            return data
        except (TypeError, ValueError):
            return str(data)

@router.post("/generate")
async def generate_chart_image(
    signal_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Genera una imagen del gráfico con análisis técnico dibujado
    """
    try:
        symbol = signal_data.get("symbol")
        timeframe = signal_data.get("timeframe", "H1")
        technical_analyses = signal_data.get("technical_analyses", [])
        entry_price = signal_data.get("entry_price")
        stop_loss = signal_data.get("stop_loss")
        take_profit = signal_data.get("take_profit")
        
        logger.info(f"Generating chart for {symbol} {timeframe}")
        
        if not symbol:
            return JSONResponse(
                status_code=400,
                content={"error": "Symbol is required"}
            )
        
        # ✅ MEJORADO: Intentar conectar a MT5 si no está conectado
        if not mt5_provider.connected:
            logger.info("MT5 not connected, attempting to connect...")
            if not mt5_provider.connect():
                logger.warning("Failed to connect to MT5, using mock data")
                # Usar datos simulados si MT5 no está disponible
                data = generate_mock_data(symbol, timeframe)
            else:
                logger.info("MT5 connected successfully")
                data = mt5_provider.get_realtime_data(symbol, timeframe, 100)
        else:
            data = mt5_provider.get_realtime_data(symbol, timeframe, 100)
        
        # ✅ MEJORADO: Generar datos mock si no hay datos reales
        if data is None or (hasattr(data, 'empty') and data.empty):
            logger.warning(f"No real data available for {symbol}, generating mock data")
            data = generate_mock_data(symbol, timeframe)
        
        # ✅ MEJORADO: Generar la imagen del gráfico con mejor manejo de errores
        try:
            chart_image_url = await create_technical_analysis_chart(
                data, symbol, timeframe, technical_analyses, 
                entry_price, stop_loss, take_profit
            )
            
            if chart_image_url and not chart_image_url.startswith("/placeholder"):
                logger.info(f"Chart generated successfully for {symbol}")
                response_data = {
                    "chart_image_url": chart_image_url,
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "generated_at": datetime.utcnow().isoformat(),
                    "data_source": "mt5" if mt5_provider.connected else "mock"
                }
                return JSONResponse(content=response_data)
            else:
                raise Exception("Chart generation returned placeholder")
                
        except Exception as chart_error:
            logger.error(f"Error in chart generation: {chart_error}")
            # ✅ MEJORADO: Generar gráfico simple como fallback
            fallback_chart = await create_simple_fallback_chart(symbol, timeframe, entry_price)
            
            response_data = {
                "chart_image_url": fallback_chart,
                "symbol": symbol,
                "timeframe": timeframe,
                "generated_at": datetime.utcnow().isoformat(),
                "data_source": "fallback",
                "warning": "Using simplified chart due to generation error"
            }
            return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error generating chart image: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error generating chart image",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

def generate_mock_data(symbol: str, timeframe: str, periods: int = 100) -> pd.DataFrame:
    """
    Genera datos mock realistas para el gráfico usando la misma estructura que tu MT5DataProvider
    """
    try:
        logger.info(f"Generating mock data for {symbol} {timeframe}")
        
        # Precios base por símbolo
        base_prices = {
            'EURUSD': 1.0850,
            'GBPUSD': 1.2650,
            'USDJPY': 148.50,
            'AUDUSD': 0.6750,
            'USDCHF': 0.8950,
            'USDCAD': 1.3450,
            'EURJPY': 161.20,
            'GBPJPY': 187.80
        }
        
        base_price = base_prices.get(symbol, 1.0850)
        
        # Generar timestamps
        if timeframe == 'M1':
            freq = '1min'
        elif timeframe == 'M5':
            freq = '5min'
        elif timeframe == 'M15':
            freq = '15min'
        elif timeframe == 'M30':
            freq = '30min'
        elif timeframe == 'H1':
            freq = '1H'
        elif timeframe == 'H4':
            freq = '4H'
        elif timeframe == 'D1':
            freq = '1D'
        else:
            freq = '1H'
        
        end_time = datetime.now()
        timestamps = pd.date_range(end=end_time, periods=periods, freq=freq)
        
        # Generar precios realistas
        prices = []
        current_price = base_price
        
        for i in range(periods):
            # Volatilidad basada en el símbolo
            volatility = 0.3 if 'JPY' in symbol else 0.0003
            
            # Tendencia suave
            trend = np.sin(i * 0.05) * 0.0001
            
            # Ruido aleatorio
            noise = np.random.normal(0, volatility * 0.5)
            
            # Ocasionales gaps
            if np.random.random() < 0.02:
                gap = np.random.normal(0, volatility)
                current_price += gap
            
            current_price += trend + noise
            current_price = max(current_price, 0.0001)
            
            prices.append(current_price)
        
        # Crear DataFrame con la MISMA estructura que tu MT5DataProvider
        data = pd.DataFrame({
            'Open': prices,
            'High': [p * (1 + np.random.uniform(0, 0.001)) for p in prices],
            'Low': [p * (1 - np.random.uniform(0, 0.001)) for p in prices],
            'Close': prices,  # ← Usar 'Close' con mayúscula como en tu MT5DataProvider
            'Volume': np.random.randint(100, 1000, periods)
        }, index=timestamps)
        
        logger.info(f"Generated {len(data)} mock data points for {symbol}")
        return data
        
    except Exception as e:
        logger.error(f"Error generating mock data: {e}")
        # Datos mínimos de emergencia
        timestamps = pd.date_range(end=datetime.now(), periods=10, freq='1H')
        base_price = 1.0850
        prices = [base_price + np.random.normal(0, 0.001) for _ in range(10)]
        
        return pd.DataFrame({
            'Open': prices,
            'High': prices,
            'Low': prices,
            'Close': prices,  # ← Usar 'Close' con mayúscula
            'Volume': [100] * 10
        }, index=timestamps)

async def create_simple_fallback_chart(symbol: str, timeframe: str, entry_price: float = None) -> str:
    """
    Crea un gráfico simple como fallback cuando falla la generación principal
    """
    try:
        logger.info(f"Creating simple fallback chart for {symbol}")
        
        # Configurar matplotlib
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(10, 6))
        fig.patch.set_facecolor('#0a0a0a')
        ax.set_facecolor('#1a1a2e')
        
        # Generar datos simples
        x = np.linspace(0, 24, 50)  # 24 horas, 50 puntos
        base_price = entry_price if entry_price else 1.0850
        
        # Precio simulado con tendencia y ruido
        trend = np.sin(x * 0.3) * 0.01
        noise = np.random.normal(0, 0.005, len(x))
        prices = base_price + trend + noise
        
        # Dibujar línea de precio
        ax.plot(x, prices, color='#00ffff', linewidth=2, label=f'{symbol} Price')
        
        # Dibujar nivel de entrada si existe
        if entry_price:
            ax.axhline(y=entry_price, color='#00ff88', linestyle='--', 
                      linewidth=2, label=f'Entry: {entry_price:.5f}', alpha=0.8)
        
        # Configurar el gráfico
        ax.set_title(f'{symbol} - {timeframe} Chart (Simplified)', 
                    color='#00ffff', fontsize=14, fontweight='bold')
        ax.set_xlabel('Time (Hours)', color='white')
        ax.set_ylabel('Price', color='white')
        
        # Configurar ejes
        ax.tick_params(colors='white')
        ax.grid(True, alpha=0.3, color='#00ffff')
        
        # Leyenda
        ax.legend(loc='upper left', facecolor='#1a1a2e', 
                 edgecolor='#00ffff', labelcolor='white')
        
        # Ajustar layout
        plt.tight_layout()
        
        # Guardar imagen en memoria
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', facecolor='#0a0a0a',
                   edgecolor='none', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        
        # Convertir a base64
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        # Limpiar matplotlib
        plt.close(fig)
        
        chart_image_url = f"data:image/png;base64,{img_base64}"
        logger.info("Simple fallback chart created successfully")
        
        return chart_image_url
        
    except Exception as e:
        logger.error(f"Error creating simple fallback chart: {e}")
        return "/placeholder.svg?height=400&width=600&text=Chart+Generation+Error"

async def create_technical_analysis_chart(
    data: pd.DataFrame, 
    symbol: str, 
    timeframe: str, 
    technical_analyses: List[Dict],
    entry_price: float = None,
    stop_loss: float = None,
    take_profit: float = None
) -> str:
    """
    Crea un gráfico con análisis técnico dibujado
    """
    try:
        logger.info(f"Creating technical analysis chart for {symbol}")
        
        # Configurar el estilo del gráfico
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(12, 8))
        fig.patch.set_facecolor('#0a0a0a')
        ax.set_facecolor('#1a1a2e')
        
        # ✅ CORREGIDO: Validar y preparar datos con los nombres correctos de columnas
        if data is None or len(data) == 0:
            raise ValueError("No data available for chart generation")
        
        # ✅ CORREGIDO: Usar 'Close' con mayúscula como en tu MT5DataProvider
        if 'Close' not in data.columns:
            if 'close' in data.columns:
                data['Close'] = data['close']
            else:
                raise ValueError("No 'Close' price column found in data")
        
        # Preparar datos
        dates = data.index
        prices = data['Close']  # ← Usar 'Close' con mayúscula
        
        logger.info(f"Chart data: {len(dates)} points from {dates[0]} to {dates[-1]}")
        
        # Dibujar línea de precio principal
        ax.plot(dates, prices, color='#00ffff', linewidth=2, label=f'{symbol} Price')
        
        # Dibujar niveles de trading
        if entry_price:
            ax.axhline(y=entry_price, color='#00ff88', linestyle='--', linewidth=2,
                      label=f'Entry: {entry_price:.5f}', alpha=0.8)
        
        if stop_loss:
            ax.axhline(y=stop_loss, color='#ff4444', linestyle='--', linewidth=1,
                      label=f'Stop Loss: {stop_loss:.5f}', alpha=0.8)
        
        if take_profit:
            ax.axhline(y=take_profit, color='#00ff88', linestyle='--', linewidth=1,
                      label=f'Take Profit: {take_profit:.5f}', alpha=0.8)
        
        # ✅ MEJORADO: Dibujar análisis técnicos con mejor manejo de errores
        for analysis in technical_analyses:
            try:
                await draw_technical_analysis(ax, analysis, data, dates, prices)
            except Exception as analysis_error:
                logger.warning(f"Error drawing analysis {analysis.get('type', 'unknown')}: {analysis_error}")
                continue
        
        # Configurar el gráfico
        ax.set_title(f'{symbol} - {timeframe} Technical Analysis',
                    color='#00ffff', fontsize=16, fontweight='bold')
        ax.set_xlabel('Time', color='white')
        ax.set_ylabel('Price', color='white')
        
        # Configurar ejes
        ax.tick_params(colors='white')
        ax.grid(True, alpha=0.3, color='#00ffff')
        
        # ✅ MEJORADO: Formatear fechas en el eje X con mejor manejo
        try:
            if len(dates) > 0:
                # Determinar el formato de fecha basado en el timeframe
                if timeframe in ['M1', 'M5', 'M15', 'M30']:
                    date_format = '%H:%M'
                    locator = mdates.HourLocator(interval=2)
                elif timeframe in ['H1', 'H4']:
                    date_format = '%m/%d %H:%M'
                    locator = mdates.HourLocator(interval=6)
                else:
                    date_format = '%m/%d'
                    locator = mdates.DayLocator(interval=1)
                
                ax.xaxis.set_major_formatter(mdates.DateFormatter(date_format))
                ax.xaxis.set_major_locator(locator)
                plt.setp(ax.xaxis.get_majorticklabels(), rotation=45)
        except Exception as date_error:
            logger.warning(f"Error formatting dates: {date_error}")
        
        # Leyenda
        ax.legend(loc='upper left', facecolor='#1a1a2e', edgecolor='#00ffff',
                 labelcolor='white')
        
        # Ajustar layout
        plt.tight_layout()
        
        # Guardar imagen en memoria
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', facecolor='#0a0a0a',
                   edgecolor='none', dpi=150, bbox_inches='tight')
        img_buffer.seek(0)
        
        # Convertir a base64
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        # Limpiar matplotlib
        plt.close(fig)
        
        # Devolver data URL
        chart_image_url = f"data:image/png;base64,{img_base64}"
        
        logger.info(f"Technical analysis chart created successfully for {symbol}")
        return chart_image_url
        
    except Exception as e:
        logger.error(f"Error creating chart: {e}", exc_info=True)
        # En caso de error, devolver un gráfico simple
        return await create_simple_fallback_chart(symbol, timeframe, entry_price)

async def draw_technical_analysis(ax, analysis: Dict, data: pd.DataFrame, dates, prices):
    """
    Dibuja elementos de análisis técnico en el gráfico
    """
    try:
        analysis_type = analysis.get('type')
        analysis_data = analysis.get('data', {})
        confidence = analysis.get('confidence', 0)
        
        logger.debug(f"Drawing technical analysis: {analysis_type}")
        
        if analysis_type == 'support_resistance':
            await draw_support_resistance(ax, analysis_data, dates, prices)
        elif analysis_type == 'fibonacci':
            await draw_fibonacci_levels(ax, analysis_data, dates, prices)
        elif analysis_type == 'elliott_wave':
            await draw_elliott_waves(ax, analysis_data, dates, prices)
        elif analysis_type == 'chart_patterns':
            await draw_chart_patterns(ax, analysis_data, dates, prices)
        
    except Exception as e:
        logger.error(f"Error drawing technical analysis {analysis_type}: {e}")

async def draw_support_resistance(ax, data: Dict, dates, prices):
    """Dibuja niveles de soporte y resistencia"""
    try:
        levels = data.get('levels', [])
        
        for level in levels[:10]:  # Limitar a 10 niveles más importantes
            price = level.get('price')
            level_type = level.get('type')
            touches = level.get('touches', 0)
            strength = level.get('strength', 0)
            
            if price and touches > 30:  # Solo niveles importantes
                color = '#ff6b6b' if level_type == 'resistance' else '#4ecdc4'
                alpha = min(0.3 + (strength * 0.7), 1.0)
                
                ax.axhline(y=price, color=color, linestyle=':', linewidth=1,
                          alpha=alpha, label=f'{level_type.title()}: {price:.5f}')
                
                # Añadir texto con información del nivel
                ax.text(dates[-1], price, f'{level_type[0].upper()}: {touches}',
                       color=color, fontsize=8, ha='left', va='center')
        
    except Exception as e:
        logger.error(f"Error drawing support/resistance: {e}")

async def draw_fibonacci_levels(ax, data: Dict, dates, prices):
    """Dibuja niveles de Fibonacci"""
    try:
        levels = data.get('levels', [])
        swing_high = data.get('swing_high')
        swing_low = data.get('swing_low')
        
        if swing_high and swing_low:
            # Dibujar líneas de swing
            ax.axhline(y=swing_high, color='#ffaa00', linestyle='-', linewidth=1,
                      alpha=0.7, label=f'Swing High: {swing_high:.5f}')
            ax.axhline(y=swing_low, color='#ffaa00', linestyle='-', linewidth=1,
                      alpha=0.7, label=f'Swing Low: {swing_low:.5f}')
        
        # Dibujar niveles de Fibonacci
        for level in levels[:8]:  # Principales niveles de Fibonacci
            price = level.get('price')
            ratio = level.get('ratio')
            strength = level.get('strength', 0)
            
            if price and strength > 0.3:  # Solo niveles con buena fuerza
                alpha = min(0.2 + (strength * 0.6), 0.8)
                ax.axhline(y=price, color='#ffd700', linestyle='--', linewidth=1,
                          alpha=alpha)
                
                # Añadir etiqueta
                ax.text(dates[-1], price, f'{ratio*100:.1f}%',
                       color='#ffd700', fontsize=8, ha='left', va='center')
        
    except Exception as e:
        logger.error(f"Error drawing Fibonacci levels: {e}")

async def draw_elliott_waves(ax, data: Dict, dates, prices):
    """Dibuja ondas de Elliott"""
    try:
        pattern = data.get('pattern', {})
        waves = pattern.get('waves', [])
        
        if len(waves) >= 5:
            # Dibujar líneas conectando las ondas
            wave_prices = [wave.get('price') for wave in waves[:5]]
            wave_times = [pd.to_datetime(wave.get('timestamp')) for wave in waves[:5]]
            
            # Filtrar valores válidos
            valid_waves = [(t, p) for t, p in zip(wave_times, wave_prices) if t and p]
            
            if len(valid_waves) >= 3:
                times, prices_wave = zip(*valid_waves)
                ax.plot(times, prices_wave, color='#ff69b4', linewidth=2,
                       marker='o', markersize=6, alpha=0.8, label='Elliott Waves')
                
                # Etiquetar las ondas
                for i, (time, price) in enumerate(valid_waves):
                    ax.annotate(f'W{i+1}', (time, price),
                               xytext=(5, 5), textcoords='offset points',
                               color='#ff69b4', fontsize=10, fontweight='bold')
        
    except Exception as e:
        logger.error(f"Error drawing Elliott waves: {e}")

async def draw_chart_patterns(ax, data: Dict, dates, prices):
    """Dibuja patrones de gráfico"""
    try:
        patterns = data.get('patterns', [])
        
        for pattern in patterns[:3]:  # Limitar a 3 patrones
            pattern_type = pattern.get('type')
            points = pattern.get('points', [])
            confidence = pattern.get('confidence', 0)
            
            if len(points) >= 2 and confidence > 0.5:
                # Dibujar líneas del patrón
                pattern_times = [pd.to_datetime(point.get('time')) for point in points]
                pattern_prices = [point.get('price') for point in points]
                
                # Filtrar valores válidos
                valid_points = [(t, p) for t, p in zip(pattern_times, pattern_prices) if t and p]
                
                if len(valid_points) >= 2:
                    times, prices_pattern = zip(*valid_points)
                    ax.plot(times, prices_pattern, color='#9370db', linewidth=2,
                           linestyle='-.', alpha=0.7, label=f'Pattern: {pattern_type}')
        
    except Exception as e:
        logger.error(f"Error drawing chart patterns: {e}")

@router.get("/test")
async def test_chart_generation(
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint de prueba para generar un gráfico de ejemplo
    """
    try:
        logger.info("Testing chart generation...")
        
        # Datos de prueba
        test_signal_data = {
            "symbol": "EURUSD",
            "timeframe": "H1",
            "entry_price": 1.0850,
            "stop_loss": 1.0800,
            "take_profit": 1.0900,
            "technical_analyses": [
                {
                    "type": "support_resistance",
                    "confidence": 0.8,
                    "data": {
                        "levels": [
                            {"price": 1.0850, "type": "support", "touches": 45, "strength": 0.8},
                            {"price": 1.0900, "type": "resistance", "touches": 38, "strength": 0.7}
                        ]
                    }
                }
            ]
        }
        
        result = await generate_chart_image(test_signal_data, current_user)
        logger.info("Chart test completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error in chart test: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Chart test failed",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
