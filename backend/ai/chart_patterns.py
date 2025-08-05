import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from scipy.signal import find_peaks, find_peaks_cwt

@dataclass
class PatternSignal:
    pattern_type: str
    confidence: float
    entry_price: float
    stop_loss: float
    take_profit: float
    direction: str  # 'BUY' or 'SELL'
    points: List[Tuple[int, float]]  # Puntos que forman el patrón
    timeframe_detected: str
    timestamp: str

class ChartPatternDetector:
    def __init__(self):
        self.min_pattern_bars = 10
        self.max_pattern_bars = 100
        self.tolerance = 0.02  # 2% tolerancia para líneas de tendencia
        
    def detect_patterns(self, df: pd.DataFrame, timeframe: str) -> List[PatternSignal]:
        """Detecta todos los patrones chartistas en los datos"""
        signals = []
        
        # Detectar diferentes tipos de patrones
        signals.extend(self._detect_triangles(df, timeframe))
        signals.extend(self._detect_head_shoulders(df, timeframe))
        signals.extend(self._detect_double_patterns(df, timeframe))
        signals.extend(self._detect_flag_pennant(df, timeframe))
        signals.extend(self._detect_wedges(df, timeframe))
        
        return signals
    
    def _detect_triangles(self, df: pd.DataFrame, timeframe: str) -> List[PatternSignal]:
        """Detecta triángulos (ascendente, descendente, simétrico)"""
        signals = []
        
        # Encontrar pivots (máximos y mínimos locales)
        highs = self._find_pivots(df['high'].values, 'high')
        lows = self._find_pivots(df['low'].values, 'low')
        
        # Analizar últimos 50 períodos
        recent_data = df.tail(50)
        if len(recent_data) < 20:
            return signals
            
        # Detectar triángulo simétrico
        triangle = self._analyze_symmetric_triangle(recent_data, highs, lows)
        if triangle and triangle['confidence'] > 0.7:
            signal = PatternSignal(
                pattern_type="SYMMETRIC_TRIANGLE",
                confidence=triangle['confidence'],
                entry_price=triangle['entry_price'],
                stop_loss=triangle['stop_loss'],
                take_profit=triangle['take_profit'],
                direction=triangle['direction'],
                points=triangle['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        # Detectar triángulo ascendente
        ascending = self._analyze_ascending_triangle(recent_data, highs, lows)
        if ascending and ascending['confidence'] > 0.7:
            signal = PatternSignal(
                pattern_type="ASCENDING_TRIANGLE",
                confidence=ascending['confidence'],
                entry_price=ascending['entry_price'],
                stop_loss=ascending['stop_loss'],
                take_profit=ascending['take_profit'],
                direction="BUY",
                points=ascending['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        return signals
    
    def _detect_head_shoulders(self, df: pd.DataFrame, timeframe: str) -> List[PatternSignal]:
        """Detecta patrones de cabeza y hombros"""
        signals = []
        
        # Buscar en los últimos 60 períodos
        recent_data = df.tail(60)
        if len(recent_data) < 30:
            return signals
            
        highs = self._find_pivots(recent_data['high'].values, 'high')
        
        # Necesitamos al menos 3 máximos para H&S
        if len(highs) < 3:
            return signals
            
        # Analizar los últimos 3 máximos
        last_three_highs = highs[-3:]
        
        # Verificar patrón H&S clásico
        hs_pattern = self._analyze_head_shoulders_pattern(recent_data, last_three_highs)
        if hs_pattern and hs_pattern['confidence'] > 0.75:
            signal = PatternSignal(
                pattern_type="HEAD_AND_SHOULDERS",
                confidence=hs_pattern['confidence'],
                entry_price=hs_pattern['entry_price'],
                stop_loss=hs_pattern['stop_loss'],
                take_profit=hs_pattern['take_profit'],
                direction="SELL",
                points=hs_pattern['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        return signals
    
    def _detect_double_patterns(self, df: pd.DataFrame, timeframe: str) -> List[PatternSignal]:
        """Detecta dobles techos y dobles suelos"""
        signals = []
        
        recent_data = df.tail(40)
        if len(recent_data) < 20:
            return signals
            
        # Detectar doble techo
        double_top = self._analyze_double_top(recent_data)
        if double_top and double_top['confidence'] > 0.8:
            signal = PatternSignal(
                pattern_type="DOUBLE_TOP",
                confidence=double_top['confidence'],
                entry_price=double_top['entry_price'],
                stop_loss=double_top['stop_loss'],
                take_profit=double_top['take_profit'],
                direction="SELL",
                points=double_top['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        # Detectar doble suelo
        double_bottom = self._analyze_double_bottom(recent_data)
        if double_bottom and double_bottom['confidence'] > 0.8:
            signal = PatternSignal(
                pattern_type="DOUBLE_BOTTOM",
                confidence=double_bottom['confidence'],
                entry_price=double_bottom['entry_price'],
                stop_loss=double_bottom['stop_loss'],
                take_profit=double_bottom['take_profit'],
                direction="BUY",
                points=double_bottom['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        return signals
    
    def _detect_flag_pennant(self, df: pd.DataFrame, timeframe: str) -> List[PatternSignal]:
        """Detecta banderas y banderines"""
        signals = []
        
        recent_data = df.tail(30)
        if len(recent_data) < 15:
            return signals
            
        # Detectar tendencia previa fuerte
        trend_strength = self._calculate_trend_strength(recent_data)
        
        if abs(trend_strength) > 0.6:  # Tendencia fuerte previa
            # Buscar consolidación (bandera/banderín)
            consolidation = self._analyze_flag_pattern(recent_data, trend_strength > 0)
            
            if consolidation and consolidation['confidence'] > 0.7:
                pattern_type = "BULL_FLAG" if trend_strength > 0 else "BEAR_FLAG"
                direction = "BUY" if trend_strength > 0 else "SELL"
                
                signal = PatternSignal(
                    pattern_type=pattern_type,
                    confidence=consolidation['confidence'],
                    entry_price=consolidation['entry_price'],
                    stop_loss=consolidation['stop_loss'],
                    take_profit=consolidation['take_profit'],
                    direction=direction,
                    points=consolidation['points'],
                    timeframe_detected=timeframe,
                    timestamp=str(df.index[-1])
                )
                signals.append(signal)
                
        return signals
    
    def _detect_wedges(self, df: pd.DataFrame, timeframe: str) -> List[PatternSignal]:
        """Detecta cuñas ascendentes y descendentes"""
        signals = []
        
        recent_data = df.tail(50)
        if len(recent_data) < 25:
            return signals
            
        # Detectar cuña ascendente (bearish)
        rising_wedge = self._analyze_rising_wedge(recent_data)
        if rising_wedge and rising_wedge['confidence'] > 0.75:
            signal = PatternSignal(
                pattern_type="RISING_WEDGE",
                confidence=rising_wedge['confidence'],
                entry_price=rising_wedge['entry_price'],
                stop_loss=rising_wedge['stop_loss'],
                take_profit=rising_wedge['take_profit'],
                direction="SELL",
                points=rising_wedge['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        # Detectar cuña descendente (bullish)
        falling_wedge = self._analyze_falling_wedge(recent_data)
        if falling_wedge and falling_wedge['confidence'] > 0.75:
            signal = PatternSignal(
                pattern_type="FALLING_WEDGE",
                confidence=falling_wedge['confidence'],
                entry_price=falling_wedge['entry_price'],
                stop_loss=falling_wedge['stop_loss'],
                take_profit=falling_wedge['take_profit'],
                direction="BUY",
                points=falling_wedge['points'],
                timeframe_detected=timeframe,
                timestamp=str(df.index[-1])
            )
            signals.append(signal)
            
        return signals
    
    def _find_pivots(self, data: np.array, pivot_type: str, window: int = 5) -> List[Tuple[int, float]]:
        """Encuentra pivots (máximos y mínimos locales)"""
        if pivot_type == 'high':
            peaks, _ = find_peaks(data, distance=window)
            return [(i, data[i]) for i in peaks]
        else:
            peaks, _ = find_peaks(-data, distance=window)
            return [(i, data[i]) for i in peaks]
    
    def _analyze_symmetric_triangle(self, df: pd.DataFrame, highs: List, lows: List) -> Optional[Dict]:
        """Analiza patrón de triángulo simétrico"""
        if len(highs) < 2 or len(lows) < 2:
            return None
            
        # Últimos máximos y mínimos
        recent_highs = highs[-2:]
        recent_lows = lows[-2:]
        
        # Verificar convergencia
        high_slope = (recent_highs[1][1] - recent_highs[0][1]) / (recent_highs[1][0] - recent_highs[0][0])
        low_slope = (recent_lows[1][1] - recent_lows[0][1]) / (recent_lows[1][0] - recent_lows[0][0])
        
        # Para triángulo simétrico: pendiente de máximos negativa, de mínimos positiva
        if high_slope < 0 and low_slope > 0:
            convergence_point = self._calculate_convergence_point(recent_highs, recent_lows)
            
            if convergence_point:
                current_price = df['close'].iloc[-1]
                confidence = self._calculate_triangle_confidence(df, recent_highs, recent_lows)
                
                # Dirección basada en momentum reciente
                recent_momentum = df['close'].diff(5).iloc[-1]
                direction = "BUY" if recent_momentum > 0 else "SELL"
                
                return {
                    'confidence': confidence,
                    'entry_price': current_price,
                    'stop_loss': current_price * (0.98 if direction == "BUY" else 1.02),
                    'take_profit': current_price * (1.04 if direction == "BUY" else 0.96),
                    'direction': direction,
                    'points': recent_highs + recent_lows
                }
        
        return None
    
    def _analyze_ascending_triangle(self, df: pd.DataFrame, highs: List, lows: List) -> Optional[Dict]:
        """Analiza patrón de triángulo ascendente"""
        if len(highs) < 2 or len(lows) < 2:
            return None
            
        recent_highs = highs[-2:]
        recent_lows = lows[-2:]
        
        # Verificar resistencia horizontal y soporte ascendente
        high_diff = abs(recent_highs[1][1] - recent_highs[0][1])
        low_slope = (recent_lows[1][1] - recent_lows[0][1]) / (recent_lows[1][0] - recent_lows[0][0])
        
        # Máximos similares (resistencia) y mínimos ascendentes
        if high_diff / recent_highs[0][1] < 0.01 and low_slope > 0:
            current_price = df['close'].iloc[-1]
            resistance_level = max(recent_highs[0][1], recent_highs[1][1])
            
            confidence = 0.8 if current_price >= resistance_level * 0.98 else 0.6
            
            return {
                'confidence': confidence,
                'entry_price': resistance_level * 1.001,  # Breakout level
                'stop_loss': recent_lows[-1][1],
                'take_profit': resistance_level + (resistance_level - recent_lows[-1][1]),
                'points': recent_highs + recent_lows
            }
        
        return None
    
    def _analyze_head_shoulders_pattern(self, df: pd.DataFrame, highs: List) -> Optional[Dict]:
        """Analiza patrón cabeza y hombros"""
        if len(highs) < 3:
            return None
            
        left_shoulder = highs[0]
        head = highs[1]
        right_shoulder = highs[2]
        
        # Verificar que la cabeza sea el punto más alto
        if head[1] > left_shoulder[1] and head[1] > right_shoulder[1]:
            # Verificar simetría de hombros
            shoulder_symmetry = abs(left_shoulder[1] - right_shoulder[1]) / head[1]
            
            if shoulder_symmetry < 0.02:  # Hombros similares
                neckline = (left_shoulder[1] + right_shoulder[1]) / 2
                current_price = df['close'].iloc[-1]
                
                confidence = 0.9 - shoulder_symmetry * 10
                
                return {
                    'confidence': confidence,
                    'entry_price': neckline * 0.999,  # Break below neckline
                    'stop_loss': right_shoulder[1],
                    'take_profit': neckline - (head[1] - neckline),
                    'points': [left_shoulder, head, right_shoulder]
                }
        
        return None
    
    def _analyze_double_top(self, df: pd.DataFrame) -> Optional[Dict]:
        """Analiza patrón de doble techo"""
        highs = self._find_pivots(df['high'].values, 'high')
        
        if len(highs) >= 2:
            last_two_highs = highs[-2:]
            
            # Verificar que los techos sean similares
            price_diff = abs(last_two_highs[1][1] - last_two_highs[0][1])
            avg_price = (last_two_highs[1][1] + last_two_highs[0][1]) / 2
            
            if price_diff / avg_price < 0.015:  # Diferencia menor al 1.5%
                # Encontrar el valle entre los techos
                valley_data = df.iloc[last_two_highs[0][0]:last_two_highs[1][0]]
                valley_price = valley_data['low'].min()
                
                current_price = df['close'].iloc[-1]
                
                return {
                    'confidence': 0.85,
                    'entry_price': valley_price * 0.999,
                    'stop_loss': avg_price,
                    'take_profit': valley_price - (avg_price - valley_price),
                    'points': last_two_highs
                }
        
        return None
    
    def _analyze_double_bottom(self, df: pd.DataFrame) -> Optional[Dict]:
        """Analiza patrón de doble suelo"""
        lows = self._find_pivots(df['low'].values, 'low')
        
        if len(lows) >= 2:
            last_two_lows = lows[-2:]
            
            # Verificar que los suelos sean similares
            price_diff = abs(last_two_lows[1][1] - last_two_lows[0][1])
            avg_price = (last_two_lows[1][1] + last_two_lows[0][1]) / 2
            
            if price_diff / avg_price < 0.015:
                # Encontrar el pico entre los suelos
                peak_data = df.iloc[last_two_lows[0][0]:last_two_lows[1][0]]
                peak_price = peak_data['high'].max()
                
                return {
                    'confidence': 0.85,
                    'entry_price': peak_price * 1.001,
                    'stop_loss': avg_price,
                    'take_profit': peak_price + (peak_price - avg_price),
                    'points': last_two_lows
                }
        
        return None
    
    def _calculate_trend_strength(self, df: pd.DataFrame) -> float:
        """Calcula la fuerza de la tendencia"""
        if len(df) < 10:
            return 0
            
        # Usar regresión lineal simple
        prices = df['close'].values
        x = np.arange(len(prices))
        slope = np.polyfit(x, prices, 1)[0]
        
        # Normalizar por el precio promedio
        return slope / np.mean(prices)
    
    def _analyze_flag_pattern(self, df: pd.DataFrame, is_bullish: bool) -> Optional[Dict]:
        """Analiza patrón de bandera"""
        # Buscar consolidación en canal
        recent_range = df['high'].max() - df['low'].min()
        avg_price = df['close'].mean()
        
        # La bandera debería ser una consolidación pequeña
        if recent_range / avg_price < 0.03:  # Rango menor al 3%
            current_price = df['close'].iloc[-1]
            
            if is_bullish:
                resistance = df['high'].max()
                support = df['low'].min()
                entry_price = resistance * 1.001
                stop_loss = support
                take_profit = entry_price + (entry_price - support)
            else:
                resistance = df['high'].max()
                support = df['low'].min()
                entry_price = support * 0.999
                stop_loss = resistance
                take_profit = entry_price - (resistance - entry_price)
            
            return {
                'confidence': 0.75,
                'entry_price': entry_price,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'points': [(0, resistance), (len(df)-1, support)]
            }
        
        return None
    
    def _analyze_rising_wedge(self, df: pd.DataFrame) -> Optional[Dict]:
        """Analiza cuña ascendente (bearish)"""
        highs = self._find_pivots(df['high'].values, 'high')
        lows = self._find_pivots(df['low'].values, 'low')
        
        if len(highs) >= 2 and len(lows) >= 2:
            # Verificar que ambas líneas sean ascendentes pero convergentes
            high_slope = (highs[-1][1] - highs[-2][1]) / (highs[-1][0] - highs[-2][0])
            low_slope = (lows[-1][1] - lows[-2][1]) / (lows[-1][0] - lows[-2][0])
            
            if high_slope > 0 and low_slope > 0 and low_slope > high_slope:
                current_price = df['close'].iloc[-1]
                support_line = lows[-1][1]
                
                return {
                    'confidence': 0.8,
                    'entry_price': support_line * 0.999,
                    'stop_loss': highs[-1][1],
                    'take_profit': support_line * 0.96,
                    'points': highs[-2:] + lows[-2:]
                }
        
        return None
    
    def _analyze_falling_wedge(self, df: pd.DataFrame) -> Optional[Dict]:
        """Analiza cuña descendente (bullish)"""
        highs = self._find_pivots(df['high'].values, 'high')
        lows = self._find_pivots(df['low'].values, 'low')
        
        if len(highs) >= 2 and len(lows) >= 2:
            # Verificar que ambas líneas sean descendentes pero convergentes
            high_slope = (highs[-1][1] - highs[-2][1]) / (highs[-1][0] - highs[-2][0])
            low_slope = (lows[-1][1] - lows[-2][1]) / (lows[-1][0] - lows[-2][0])
            
            if high_slope < 0 and low_slope < 0 and high_slope > low_slope:
                current_price = df['close'].iloc[-1]
                resistance_line = highs[-1][1]
                
                return {
                    'confidence': 0.8,
                    'entry_price': resistance_line * 1.001,
                    'stop_loss': lows[-1][1],
                    'take_profit': resistance_line * 1.04,
                    'points': highs[-2:] + lows[-2:]
                }
        
        return None
    
    def _calculate_convergence_point(self, highs: List, lows: List) -> Optional[Tuple[int, float]]:
        """Calcula el punto de convergencia de las líneas de tendencia"""
        if len(highs) < 2 or len(lows) < 2:
            return None
            
        # Calcular pendientes
        high_slope = (highs[1][1] - highs[0][1]) / (highs[1][0] - highs[0][0])
        low_slope = (lows[1][1] - lows[0][1]) / (lows[1][0] - lows[0][0])
        
        # Calcular intersección
        if abs(high_slope - low_slope) < 1e-6:  # Líneas paralelas
            return None
            
        x_intersect = (lows[0][1] - highs[0][1] + high_slope * highs[0][0] - low_slope * lows[0][0]) / (high_slope - low_slope)
        y_intersect = highs[0][1] + high_slope * (x_intersect - highs[0][0])
        
        return (int(x_intersect), y_intersect)
    
    def _calculate_triangle_confidence(self, df: pd.DataFrame, highs: List, lows: List) -> float:
        """Calcula la confianza del patrón triangular"""
        base_confidence = 0.7
        
        # Verificar volumen decreciente (típico en triángulos)
        if 'volume' in df.columns:
            recent_volume = df['volume'].tail(10).mean()
            older_volume = df['volume'].head(10).mean()
            if recent_volume < older_volume:
                base_confidence += 0.1
        
        # Verificar número de toques en las líneas de tendencia
        touches = len(highs) + len(lows)
        if touches >= 4:
            base_confidence += 0.1
            
        return min(base_confidence, 0.95)