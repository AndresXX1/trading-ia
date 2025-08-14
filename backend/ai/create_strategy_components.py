

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional

class TradingStrategyComponents:
    """Componentes específicos para cada estrategia de trading"""
    
    @staticmethod
    def apply_maleta_strategy(df: pd.DataFrame, config) -> Dict:
        """
        Estrategia Maleta de Jhonatan Nuñez
        - Enfoque en M15, M30, H1, H4
        - Usa Stochastic y niveles de soporte/resistencia
        """
        try:
            # Calcular Stochastic (componente clave de la estrategia Maleta)
            stoch_k, stoch_d = TradingStrategyComponents._calculate_stochastic(df)
            
            # Identificar zonas de sobrecompra/sobreventa
            current_k = stoch_k.iloc[-1]
            current_d = stoch_d.iloc[-1]
            
            # Condiciones específicas de la estrategia Maleta
            oversold_zone = current_k < 20 and current_d < 20
            overbought_zone = current_k > 80 and current_d > 80
            
            # Buscar divergencias
            divergence = TradingStrategyComponents._detect_stochastic_divergence(df, stoch_k, stoch_d)
            
            return {
                'strategy': 'maleta',
                'stochastic_k': float(current_k),
                'stochastic_d': float(current_d),
                'oversold': oversold_zone,
                'overbought': overbought_zone,
                'divergence': divergence,
                'confidence': 0.8 if (oversold_zone or overbought_zone) and divergence else 0.6,
                'description': f'Estrategia Maleta: Stochastic K={current_k:.1f}, D={current_d:.1f}'
            }
        except Exception as e:
            return {'strategy': 'maleta', 'error': str(e), 'confidence': 0.0}
    
    @staticmethod
    def apply_swing_trading_strategy(df: pd.DataFrame, config) -> Dict:
        """Estrategia Swing Trading - Enfoque en H4, D1, W1"""
        try:
            swing_highs = TradingStrategyComponents._find_swing_points(df['High'], order=10, mode='max')
            swing_lows = TradingStrategyComponents._find_swing_points(df['Low'], order=10, mode='min')
            trend = TradingStrategyComponents._calculate_trend(df, period=50)
            retracement = TradingStrategyComponents._detect_retracement(df, trend)
            
            return {
                'strategy': 'swing_trading',
                'trend': trend,
                'swing_highs': len(swing_highs),
                'swing_lows': len(swing_lows),
                'retracement': retracement,
                'confidence': 0.7 if retracement and abs(trend) > 0.3 else 0.5,
                'description': f'Swing Trading: Tendencia {trend:.2f}, Retroceso: {retracement}'
            }
        except Exception as e:
            return {'strategy': 'swing_trading', 'error': str(e), 'confidence': 0.0}
    
    @staticmethod
    def apply_scalping_strategy(df: pd.DataFrame, config) -> Dict:
        """Estrategia Scalping - Enfoque en M1, M5"""
        try:
            volatility = TradingStrategyComponents._calculate_volatility(df, period=20)
            momentum = TradingStrategyComponents._calculate_momentum(df, period=5)
            breakout = TradingStrategyComponents._detect_range_breakout(df, period=10)
            
            return {
                'strategy': 'scalping',
                'volatility': float(volatility),
                'momentum': float(momentum),
                'breakout': breakout,
                'confidence': 0.8 if breakout and volatility > 0.001 else 0.4,
                'description': f'Scalping: Volatilidad {volatility:.5f}, Momentum {momentum:.5f}'
            }
        except Exception as e:
            return {'strategy': 'scalping', 'error': str(e), 'confidence': 0.0}
    
    # Métodos auxiliares
    @staticmethod
    def _calculate_stochastic(df: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Tuple[pd.Series, pd.Series]:
        """Calcular indicador Stochastic"""
        low_min = df['Low'].rolling(window=k_period).min()
        high_max = df['High'].rolling(window=k_period).max()
        
        k_percent = 100 * ((df['Close'] - low_min) / (high_max - low_min))
        d_percent = k_percent.rolling(window=d_period).mean()
        
        return k_percent, d_percent
    
    @staticmethod
    def _detect_stochastic_divergence(df: pd.DataFrame, stoch_k: pd.Series, stoch_d: pd.Series) -> bool:
        """Detectar divergencias en Stochastic"""
        try:
            recent_price = df['Close'].tail(10)
            recent_stoch = stoch_k.tail(10)
            
            price_trend = recent_price.iloc[-1] - recent_price.iloc[0]
            stoch_trend = recent_stoch.iloc[-1] - recent_stoch.iloc[0]
            
            return (price_trend > 0 and stoch_trend < 0) or (price_trend < 0 and stoch_trend > 0)
        except:
            return False
    
    @staticmethod
    def _calculate_trend(df: pd.DataFrame, period: int = 50) -> float:
        """Calcular tendencia usando regresión lineal"""
        try:
            prices = df['Close'].tail(period).values
            x = np.arange(len(prices))
            slope = np.polyfit(x, prices, 1)[0]
            return slope / prices[-1]
        except:
            return 0.0
    
    @staticmethod
    def _detect_retracement(df: pd.DataFrame, trend: float) -> bool:
        """Detectar retrocesos en la tendencia"""
        try:
            recent_change = (df['Close'].iloc[-1] - df['Close'].iloc[-10]) / df['Close'].iloc[-10]
            return (trend > 0 and recent_change < -0.01) or (trend < 0 and recent_change > 0.01)
        except:
            return False
    
    @staticmethod
    def _calculate_volatility(df: pd.DataFrame, period: int = 20) -> float:
        """Calcular volatilidad"""
        try:
            returns = df['Close'].pct_change().tail(period)
            return returns.std()
        except:
            return 0.0
    
    @staticmethod
    def _calculate_momentum(df: pd.DataFrame, period: int = 5) -> float:
        """Calcular momentum"""
        try:
            return (df['Close'].iloc[-1] - df['Close'].iloc[-period]) / df['Close'].iloc[-period]
        except:
            return 0.0
    
    @staticmethod
    def _detect_range_breakout(df: pd.DataFrame, period: int = 10) -> bool:
        """Detectar breakout de rango"""
        try:
            recent_data = df.tail(period)
            range_high = recent_data['High'].max()
            range_low = recent_data['Low'].min()
            current_price = df['Close'].iloc[-1]
            
            return current_price > range_high or current_price < range_low
        except:
            return False
    
    @staticmethod
    def _find_swing_points(series: pd.Series, order: int = 5, mode: str = 'max') -> List[int]:
        """Encontrar puntos de swing"""
        try:
            from scipy.signal import argrelextrema
            if mode == 'max':
                return argrelextrema(series.values, np.greater, order=order)[0].tolist()
            else:
                return argrelextrema(series.values, np.less, order=order)[0].tolist()
        except:
            return []


print("✅ Componentes de estrategias de trading creados")
