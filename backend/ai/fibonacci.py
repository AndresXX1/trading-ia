import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class FibonacciLevel:
    level: float
    price: float
    level_type: str  # 'retracement' or 'extension'
    strength: float  # Fuerza del nivel (0-1)
    
@dataclass
class FibonacciSignal:
    signal_type: str  # 'FIBONACCI_SUPPORT', 'FIBONACCI_RESISTANCE', 'FIBONACCI_BREAKOUT'
    confidence: float
    entry_price: float
    stop_loss: float
    take_profit: float
    direction: str
    fibonacci_levels: List[FibonacciLevel]
    swing_high: float
    swing_low: float
    timeframe_detected: str
    timestamp: str


def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


class FibonacciAnalyzer:
    def __init__(self):
        # Niveles de retroceso de Fibonacci
        self.retracement_levels = [0.236, 0.382, 0.5, 0.618, 0.786]
        # Niveles de extensión de Fibonacci
        self.extension_levels = [1.272, 1.414, 1.618, 2.0, 2.618]
        # Tolerancia para considerar que el precio está en un nivel
        self.level_tolerance = 0.001  # 0.1%
        
    def analyze_fibonacci(self, df: pd.DataFrame, timeframe: str) -> List[FibonacciSignal]:
        """Analiza todos los niveles de Fibonacci en los datos"""
        signals = []
        
        # Encontrar swings significativos
        swings = self._find_significant_swings(df)
        
        for swing in swings:
            # Analizar retrocesos de Fibonacci
            retracement_signals = self._analyze_fibonacci_retracements(
                df, swing['high'], swing['low'], swing['direction'], timeframe
            )
            signals.extend(retracement_signals)
            
            # Analizar extensiones de Fibonacci
            extension_signals = self._analyze_fibonacci_extensions(
                df, swing['high'], swing['low'], swing['direction'], timeframe
            )
            signals.extend(extension_signals)
        
        return signals
    
    def _find_significant_swings(self, df: pd.DataFrame, min_swing_size: float = 0.02) -> List[Dict]:
        """Encuentra swings significativos para análisis de Fibonacci"""
        swings = []
        
        # Buscar en diferentes períodos
        for period in [20, 30, 50]:
            if len(df) < period:
                continue
                
            recent_data = df.tail(period)
            high_price = recent_data['high'].max()
            low_price = recent_data['low'].min()
            
            # Verificar que el swing sea significativo
            swing_size = (high_price - low_price) / low_price
            
            if swing_size >= min_swing_size:
                # Determinar dirección del swing
                high_idx = recent_data['high'].idxmax()
                low_idx = recent_data['low'].idxmin()
                
                direction = 'bullish' if high_idx > low_idx else 'bearish'
                
                swings.append({
                    'high': high_price,
                    'low': low_price,
                    'high_idx': high_idx,
                    'low_idx': low_idx,
                    'direction': direction,
                    'size': swing_size,
                    'period': period
                })
        
        # Eliminar duplicados y ordenar por tamaño
        unique_swings = []
        for swing in swings:
            is_duplicate = False
            for existing in unique_swings:
                if (abs(swing['high'] - existing['high']) / swing['high'] < 0.005 and
                    abs(swing['low'] - existing['low']) / swing['low'] < 0.005):
                    is_duplicate = True
                    break
            if not is_duplicate:
                unique_swings.append(swing)
        
        return sorted(unique_swings, key=lambda x: x['size'], reverse=True)[:3]
    
    def _analyze_fibonacci_retracements(self, df: pd.DataFrame, swing_high: float, 
                                      swing_low: float, direction: str, timeframe: str) -> List[FibonacciSignal]:
        """Analiza niveles de retroceso de Fibonacci"""
        signals = []
        current_price = df['close'].iloc[-1]
        
        # Calcular niveles de retroceso
        fib_levels = self._calculate_fibonacci_levels(swing_high, swing_low, 'retracement')
        
        # Encontrar el nivel más relevante
        relevant_levels = self._find_relevant_levels(current_price, fib_levels)
        
        for level_info in relevant_levels:
            level = level_info['level']
            price = level_info['price']
            
            # Verificar si el precio está cerca del nivel
            distance_to_level = abs(current_price - price) / current_price
            
            if distance_to_level <= self.level_tolerance:
                # Determinar tipo de señal
                signal_type, trade_direction = self._determine_fibonacci_signal_type(
                    current_price, price, direction, level
                )
                
                if signal_type:
                    confidence = self._calculate_fibonacci_confidence(
                        df, price, level, direction
                    )
                    
                    if confidence > 0.6:
                        # Calcular stop loss y take profit
                        stop_loss, take_profit = self._calculate_fibonacci_targets(
                            current_price, price, trade_direction, fib_levels
                        )
                        
                        signal = FibonacciSignal(
                            signal_type=signal_type,
                            confidence=confidence,
                            entry_price=current_price,
                            stop_loss=stop_loss,
                            take_profit=take_profit,
                            direction=trade_direction,
                            fibonacci_levels=fib_levels,
                            swing_high=swing_high,
                            swing_low=swing_low,
                            timeframe_detected=timeframe,
                            timestamp=str(df.index[-1])
                        )
                        signals.append(signal)
        
        return signals
    
    def _analyze_fibonacci_extensions(self, df: pd.DataFrame, swing_high: float,
                                    swing_low: float, direction: str, timeframe: str) -> List[FibonacciSignal]:
        """Analiza niveles de extensión de Fibonacci"""
        signals = []
        current_price = df['close'].iloc[-1]
        
        # Calcular niveles de extensión
        fib_levels = self._calculate_fibonacci_levels(swing_high, swing_low, 'extension')
        
        # Verificar si el precio está cerca de algún nivel de extensión
        for fib_level in fib_levels:
            distance_to_level = abs(current_price - fib_level.price) / current_price
            
            if distance_to_level <= self.level_tolerance:
                # Las extensiones suelen actuar como resistencia/soporte
                if direction == 'bullish' and current_price >= fib_level.price:
                    signal_type = "FIBONACCI_RESISTANCE"
                    trade_direction = "SELL"
                elif direction == 'bearish' and current_price <= fib_level.price:
                    signal_type = "FIBONACCI_SUPPORT"
                    trade_direction = "BUY"
                else:
                    continue
                
                confidence = self._calculate_fibonacci_confidence(
                    df, fib_level.price, fib_level.level, direction
                )
                
                if confidence > 0.65:
                    stop_loss, take_profit = self._calculate_extension_targets(
                        current_price, fib_level.price, trade_direction, fib_levels
                    )
                    
                    signal = FibonacciSignal(
                        signal_type=signal_type,
                        confidence=confidence,
                        entry_price=current_price,
                        stop_loss=stop_loss,
                        take_profit=take_profit,
                        direction=trade_direction,
                        fibonacci_levels=fib_levels,
                        swing_high=swing_high,
                        swing_low=swing_low,
                        timeframe_detected=timeframe,
                        timestamp=str(df.index[-1])
                    )
                    signals.append(signal)
        
        return signals
    
    def _calculate_fibonacci_levels(self, swing_high: float, swing_low: float, 
                                  level_type: str) -> List[FibonacciLevel]:
        """Calcula los niveles de Fibonacci"""
        levels = []
        swing_range = swing_high - swing_low
        
        if level_type == 'retracement':
            for level in self.retracement_levels:
                price = swing_high - (swing_range * level)
                strength = self._calculate_level_strength(level)
                
                levels.append(FibonacciLevel(
                    level=level,
                    price=price,
                    level_type=level_type,
                    strength=strength
                ))
        
        elif level_type == 'extension':
            for level in self.extension_levels:
                # Extensiones desde el swing low
                price = swing_high + (swing_range * (level - 1))
                strength = self._calculate_level_strength(level)
                
                levels.append(FibonacciLevel(
                    level=level,
                    price=price,
                    level_type=level_type,
                    strength=strength
                ))
        
        return levels
    
    def _calculate_level_strength(self, level: float) -> float:
        """Calcula la fuerza de un nivel de Fibonacci"""
        # Niveles más importantes tienen mayor fuerza
        important_levels = {
            0.382: 0.8,
            0.5: 0.9,
            0.618: 1.0,  # Nivel más importante
            0.786: 0.7,
            1.272: 0.8,
            1.618: 1.0,  # Golden ratio
            2.0: 0.7
        }
        
        return important_levels.get(level, 0.5)
    
    def _find_relevant_levels(self, current_price: float, 
                            fib_levels: List[FibonacciLevel]) -> List[Dict]:
        """Encuentra los niveles más relevantes cerca del precio actual"""
        relevant = []
        
        for fib_level in fib_levels:
            distance = abs(current_price - fib_level.price) / current_price
            
            if distance <= 0.02:  # Dentro del 2%
                relevant.append({
                    'level': fib_level.level,
                    'price': fib_level.price,
                    'strength': fib_level.strength,
                    'distance': distance
                })
        
        # Ordenar por distancia y fuerza
        return sorted(relevant, key=lambda x: (x['distance'], -x['strength']))[:3]
    
    def _determine_fibonacci_signal_type(self, current_price: float, fib_price: float,
                                       swing_direction: str, fib_level: float) -> Tuple[Optional[str], Optional[str]]:
        """Determina el tipo de señal de Fibonacci"""
        
        # Niveles fuertes de retroceso para rebotes
        strong_retracement_levels = [0.382, 0.5, 0.618]
        
        if fib_level in strong_retracement_levels:
            if swing_direction == 'bullish':
                # En tendencia alcista, retrocesos actúan como soporte
                if current_price <= fib_price * 1.002:  # Cerca del nivel
                    return "FIBONACCI_SUPPORT", "BUY"
            else:
                # En tendencia bajista, retrocesos actúan como resistencia
                if current_price >= fib_price * 0.998:  # Cerca del nivel
                    return "FIBONACCI_RESISTANCE", "SELL"
        
        return None, None
    
    def _calculate_fibonacci_confidence(self, df: pd.DataFrame, fib_price: float,
                                      fib_level: float, direction: str) -> float:
        """Calcula la confianza de la señal de Fibonacci"""
        base_confidence = 0.6
        
        # Mayor confianza en niveles importantes
        if fib_level in [0.5, 0.618, 1.618]:
            base_confidence += 0.2
        elif fib_level in [0.382, 0.786]:
            base_confidence += 0.1
        
        # Verificar volumen reciente
        recent_volume = df['volume'].iloc[-5:].mean()
        avg_volume = df['volume'].mean()
        
        if recent_volume > avg_volume:
            base_confidence += 0.1
        
        # Verificar si RSI confirma la señal sin usar talib
        if len(df) >= 14:
            rsi_series = calculate_rsi(df['close'], period=14)
            rsi = rsi_series.iloc[-1]
            if direction == 'bullish' and rsi < 40:  # Oversold con soporte Fib
                base_confidence += 0.1
            elif direction == 'bearish' and rsi > 60:  # Overbought con resistencia Fib
                base_confidence += 0.1
        
        # Limitar confianza a 1.0
        return min(base_confidence, 1.0)
    
    def _calculate_fibonacci_targets(self, current_price: float, fib_price: float,
                                   trade_direction: str, fib_levels: List[FibonacciLevel]) -> Tuple[float, float]:
        """Calcula stop loss y take profit para señales de retroceso"""
        stop_loss = 0.0
        take_profit = 0.0
        
        if trade_direction == "BUY":
            stop_loss = fib_price * 0.995
            take_profit = current_price + (current_price - stop_loss) * 2
        else:
            stop_loss = fib_price * 1.005
            take_profit = current_price - (stop_loss - current_price) * 2
        
        return stop_loss, take_profit
    
    def _calculate_extension_targets(self, current_price: float, fib_price: float,
                                   trade_direction: str, fib_levels: List[FibonacciLevel]) -> Tuple[float, float]:
        """Calcula stop loss y take profit para señales de extensión"""
        stop_loss = 0.0
        take_profit = 0.0
        
        if trade_direction == "BUY":
            stop_loss = current_price - (fib_price - current_price) * 0.5
            take_profit = fib_price + (fib_price - current_price) * 1.5
        else:
            stop_loss = current_price + (current_price - fib_price) * 0.5
            take_profit = fib_price - (current_price - fib_price) * 1.5
        
        return stop_loss, take_profit
