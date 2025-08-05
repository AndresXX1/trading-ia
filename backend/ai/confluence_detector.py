import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

from .elliott_waves import ElliottWaveAnalyzer
from .chart_patterns import ChartPatternDetector
from .fibonacci import FibonacciAnalyzer
from database.models import TechnicalAnalysis, Signal, SignalType, AnalysisType

@dataclass
class ConfluencePoint:
    """Punto de confluencia entre diferentes análisis"""
    price_level: float
    strength: float  # 0-1
    analyses: List[str]  # Tipos de análisis que confluyen
    description: str

class ConfluenceDetector:
    """Detector principal de confluencias para señales de trading"""
    
    def __init__(self):
        self.elliott_analyzer = ElliottWaveAnalyzer()
        self.pattern_detector = ChartPatternDetector()
        self.fibonacci_analyzer = FibonacciAnalyzer()
        self.logger = logging.getLogger(__name__)
        
        # Configuración de pesos para diferentes análisis
        self.analysis_weights = {
            AnalysisType.ELLIOTT_WAVE: 0.25,
            AnalysisType.CHART_PATTERN: 0.30,
            AnalysisType.FIBONACCI: 0.25,
            AnalysisType.SUPPORT_RESISTANCE: 0.20
        }
        
        # Umbral mínimo de confluencia para generar señal
        self.min_confluence_score = 0.6
    
    async def analyze_symbol(self, 
                           symbol: str, 
                           df: pd.DataFrame, 
                           timeframe: str) -> Optional[Signal]:
        """
        Análisis completo de un símbolo para detectar señales
        """
        try:
            self.logger.info(f"Analizando {symbol} en {timeframe}")
            
            # Realizar todos los análisis técnicos
            analyses = await self._perform_all_analyses(df, symbol, timeframe)
            
            if not analyses:
                self.logger.info(f"No se encontraron análisis válidos para {symbol}")
                return None
            
            # Detectar confluencias
            confluences = await self._detect_confluences(analyses, df)
            
            if not confluences:
                self.logger.info(f"No se detectaron confluencias para {symbol}")
                return None
            
            # Evaluar la mejor confluencia
            best_confluence = max(confluences, key=lambda x: x.strength)
            
            if best_confluence.strength < self.min_confluence_score:
                self.logger.info(f"Confluencia insuficiente para {symbol}: {best_confluence.strength:.2f}")
                return None
            
            # Generar señal
            signal = await self._generate_signal(
                symbol, timeframe, df, best_confluence, analyses
            )
            
            self.logger.info(f"Señal generada para {symbol}: {signal.signal_type} con confluencia {signal.confluence_score:.2f}")
            return signal
            
        except Exception as e:
            self.logger.error(f"Error analizando {symbol}: {e}")
            return None
    
    async def _perform_all_analyses(self, 
                                  df: pd.DataFrame, 
                                  symbol: str, 
                                  timeframe: str) -> List[TechnicalAnalysis]:
        """Realizar todos los análisis técnicos"""
        analyses = []
        
        try:
            # Análisis de ondas de Elliott
            elliott_result = await self.elliott_analyzer.analyze(df)
            if elliott_result:
                analyses.append(TechnicalAnalysis(
                    type=AnalysisType.ELLIOTT_WAVE,
                    confidence=elliott_result['confidence'],
                    data=elliott_result,
                    description=elliott_result['description']
                ))
        except Exception as e:
            self.logger.warning(f"Error en análisis Elliott Wave: {e}")
        
        try:
            # Análisis de patrones chartistas
            pattern_results = await self.pattern_detector.detect_patterns(df)
            for pattern in pattern_results:
                analyses.append(TechnicalAnalysis(
                    type=AnalysisType.CHART_PATTERN,
                    confidence=pattern['confidence'],
                    data=pattern,
                    description=pattern['description']
                ))
        except Exception as e:
            self.logger.warning(f"Error en análisis de patrones: {e}")
        
        try:
            # Análisis de Fibonacci
            fib_result = await self.fibonacci_analyzer.analyze(df)
            if fib_result:
                analyses.append(TechnicalAnalysis(
                    type=AnalysisType.FIBONACCI,
                    confidence=fib_result['confidence'],
                    data=fib_result,
                    description=fib_result['description']
                ))
        except Exception as e:
            self.logger.warning(f"Error en análisis Fibonacci: {e}")
        
        try:
            # Análisis de soporte y resistencia
            sr_result = await self._analyze_support_resistance(df)
            if sr_result:
                analyses.append(TechnicalAnalysis(
                    type=AnalysisType.SUPPORT_RESISTANCE,
                    confidence=sr_result['confidence'],
                    data=sr_result,
                    description=sr_result['description']
                ))
        except Exception as e:
            self.logger.warning(f"Error en análisis S/R: {e}")
        
        return analyses
    
    async def _detect_confluences(self, 
                                analyses: List[TechnicalAnalysis], 
                                df: pd.DataFrame) -> List[ConfluencePoint]:
        """Detectar puntos de confluencia entre análisis"""
        confluences = []
        current_price = float(df['Close'].iloc[-1])
        
        # Agrupar niveles de precio similares
        price_levels = []
        
        for analysis in analyses:
            levels = self._extract_price_levels(analysis, current_price)
            price_levels.extend(levels)
        
        if not price_levels:
            return confluences
        
        # Agrupar niveles cercanos (dentro del 0.1% del precio)
        tolerance = current_price * 0.001  # 0.1%
        grouped_levels = self._group_price_levels(price_levels, tolerance)
        
        # Evaluar cada grupo para confluencia
        for group in grouped_levels:
            if len(group['analyses']) >= 2:  # Al menos 2 análisis confluyen
                confluence = ConfluencePoint(
                    price_level=group['avg_price'],
                    strength=self._calculate_confluence_strength(group),
                    analyses=group['analyses'],
                    description=self._generate_confluence_description(group)
                )
                confluences.append(confluence)
        
        return sorted(confluences, key=lambda x: x.strength, reverse=True)
    
    def _extract_price_levels(self, 
                            analysis: TechnicalAnalysis, 
                            current_price: float) -> List[Dict]:
        """Extraer niveles de precio importantes de un análisis"""
        levels = []
        
        if analysis.type == AnalysisType.ELLIOTT_WAVE:
            # Extraer objetivos de ondas de Elliott
            if 'targets' in analysis.data:
                for target in analysis.data['targets']:
                    levels.append({
                        'price': target['price'],
                        'type': f"elliott_{target['type']}",
                        'confidence': analysis.confidence,
                        'analysis': 'Elliott Wave'
                    })
        
        elif analysis.type == AnalysisType.CHART_PATTERN:
            # Extraer objetivos de patrones
            if 'target' in analysis.data:
                levels.append({
                    'price': analysis.data['target'],
                    'type': f"pattern_{analysis.data['pattern_type']}",
                    'confidence': analysis.confidence,
                    'analysis': 'Chart Pattern'
                })
        
        elif analysis.type == AnalysisType.FIBONACCI:
            # Extraer niveles de Fibonacci
            if 'levels' in analysis.data:
                for level in analysis.data['levels']:
                    if abs(level['price'] - current_price) / current_price < 0.05:  # Dentro del 5%
                        levels.append({
                            'price': level['price'],
                            'type': f"fib_{level['ratio']}",
                            'confidence': analysis.confidence * level['strength'],
                            'analysis': 'Fibonacci'
                        })
        
        elif analysis.type == AnalysisType.SUPPORT_RESISTANCE:
            # Extraer niveles de S/R
            if 'levels' in analysis.data:
                for level in analysis.data['levels']:
                    levels.append({
                        'price': level['price'],
                        'type': f"sr_{level['type']}",
                        'confidence': analysis.confidence * level['strength'],
                        'analysis': 'Support/Resistance'
                    })
        
        return levels
    
    def _group_price_levels(self, 
                          price_levels: List[Dict], 
                          tolerance: float) -> List[Dict]:
        """Agrupar niveles de precio cercanos"""
        if not price_levels:
            return []
        
        # Ordenar por precio
        sorted_levels = sorted(price_levels, key=lambda x: x['price'])
        groups = []
        current_group = [sorted_levels[0]]
        
        for level in sorted_levels[1:]:
            if abs(level['price'] - current_group[-1]['price']) <= tolerance:
                current_group.append(level)
            else:
                if len(current_group) > 0:
                    groups.append(self._create_group_summary(current_group))
                current_group = [level]
        
        # Agregar último grupo
        if len(current_group) > 0:
            groups.append(self._create_group_summary(current_group))
        
        return groups
    
    def _create_group_summary(self, levels: List[Dict]) -> Dict:
        """Crear resumen de un grupo de niveles"""
        avg_price = sum(level['price'] for level in levels) / len(levels)
        total_confidence = sum(level['confidence'] for level in levels)
        analyses = list(set(level['analysis'] for level in levels))
        
        return {
            'avg_price': avg_price,
            'total_confidence': total_confidence,
            'analyses': analyses,
            'levels': levels,
            'count': len(levels)
        }
    
    def _calculate_confluence_strength(self, group: Dict) -> float:
        """Calcular la fuerza de confluencia de un grupo"""
        # Factores que aumentan la fuerza:
        # 1. Número de análisis diferentes que confluyen
        # 2. Confianza total de los análisis
        # 3. Diversidad de tipos de análisis
        
        analysis_diversity = len(set(group['analyses']))
        max_confidence = max(level['confidence'] for level in group['levels'])
        avg_confidence = group['total_confidence'] / len(group['levels'])
        
        # Puntuación base por diversidad
        diversity_score = min(analysis_diversity / 4.0, 1.0)  # Máximo 4 tipos de análisis
        
        # Puntuación por confianza
        confidence_score = (max_confidence + avg_confidence) / 2.0
        
        # Bonificación por número de confluencias
        count_bonus = min(group['count'] / 5.0, 0.2)  # Máximo 20% de bonificación
        
        # Fuerza final
        strength = (diversity_score * 0.4 + confidence_score * 0.6) + count_bonus
        
        return min(strength, 1.0)
    
    def _generate_confluence_description(self, group: Dict) -> str:
        """Generar descripción de la confluencia"""
        analyses = group['analyses']
        price = group['avg_price']
        
        if len(analyses) == 2:
            desc = f"Confluencia entre {analyses[0]} y {analyses[1]} en {price:.5f}"
        else:
            desc = f"Confluencia múltiple ({', '.join(analyses[:2])}"
            if len(analyses) > 2:
                desc += f" y {len(analyses)-2} más"
            desc += f") en {price:.5f}"
        
        return desc
    
    async def _generate_signal(self, 
                             symbol: str, 
                             timeframe: str, 
                             df: pd.DataFrame, 
                             confluence: ConfluencePoint, 
                             analyses: List[TechnicalAnalysis]) -> Signal:
        """Generar señal de trading basada en confluencia"""
        
        current_price = float(df['Close'].iloc[-1])
        
        # Determinar tipo de señal basado en la posición del precio vs confluencia
        if confluence.price_level > current_price * 1.001:  # 0.1% arriba
            signal_type = SignalType.BUY
            entry_price = current_price
            take_profit = confluence.price_level
            stop_loss = self._calculate_stop_loss(df, signal_type, entry_price)
        elif confluence.price_level < current_price * 0.999:  # 0.1% abajo
            signal_type = SignalType.SELL
            entry_price = current_price
            take_profit = confluence.price_level
            stop_loss = self._calculate_stop_loss(df, signal_type, entry_price)
        else:
            signal_type = SignalType.HOLD
            entry_price = current_price
            take_profit = None
            stop_loss = None
        
        # Crear señal
        signal = Signal(
            symbol=symbol,
            timeframe=timeframe,
            signal_type=signal_type,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            current_price=current_price,
            technical_analyses=analyses,
            confluence_score=confluence.strength,
            created_by="ai_system"
        )
        
        return signal
    
    def _calculate_stop_loss(self, 
                           df: pd.DataFrame, 
                           signal_type: SignalType, 
                           entry_price: float) -> float:
        """Calcular stop loss basado en ATR y estructura del mercado"""
        
        # Calcular ATR (Average True Range)
        atr = self._calculate_atr(df, period=14)
        
        if signal_type == SignalType.BUY:
            # Para compra: stop loss debajo del precio de entrada
            recent_low = df['Low'].tail(20).min()
            atr_stop = entry_price - (atr * 2)
            structure_stop = recent_low * 0.999  # 0.1% debajo del mínimo reciente
            
            # Usar el más conservador (más cercano al precio)
            stop_loss = max(atr_stop, structure_stop)
            
        else:  # SELL
            # Para venta: stop loss arriba del precio de entrada
            recent_high = df['High'].tail(20).max()
            atr_stop = entry_price + (atr * 2)
            structure_stop = recent_high * 1.001  # 0.1% arriba del máximo reciente
            
            # Usar el más conservador (más cercano al precio)
            stop_loss = min(atr_stop, structure_stop)
        
        return stop_loss
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """Calcular Average True Range"""
        high = df['High']
        low = df['Low']
        close = df['Close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean().iloc[-1]
        
        return float(atr) if not pd.isna(atr) else 0.001
    
    async def _analyze_support_resistance(self, df: pd.DataFrame) -> Optional[Dict]:
        """Análisis básico de soporte y resistencia"""
        try:
            levels = []
            
            # Encontrar máximos y mínimos locales
            highs = self._find_local_extrema(df['High'], order=5, mode='max')
            lows = self._find_local_extrema(df['Low'], order=5, mode='min')
            
            # Procesar resistencias (máximos)
            for idx in highs:
                price = float(df['High'].iloc[idx])
                strength = self._calculate_level_strength(df, price, 'resistance')
                if strength > 0.3:  # Mínimo de fuerza
                    levels.append({
                        'price': price,
                        'type': 'resistance',
                        'strength': strength,
                        'touches': self._count_touches(df, price, tolerance=0.001)
                    })
            
            # Procesar soportes (mínimos)
            for idx in lows:
                price = float(df['Low'].iloc[idx])
                strength = self._calculate_level_strength(df, price, 'support')
                if strength > 0.3:  # Mínimo de fuerza
                    levels.append({
                        'price': price,
                        'type': 'support',
                        'strength': strength,
                        'touches': self._count_touches(df, price, tolerance=0.001)
                    })
            
            if not levels:
                return None
            
            # Calcular confianza general
            avg_strength = sum(level['strength'] for level in levels) / len(levels)
            
            return {
                'levels': levels,
                'confidence': min(avg_strength * 1.2, 1.0),
                'description': f"Identificados {len(levels)} niveles de S/R"
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis S/R: {e}")
            return None
    
    def _find_local_extrema(self, series: pd.Series, order: int = 5, mode: str = 'max') -> List[int]:
        """Encontrar extremos locales en una serie"""
        from scipy.signal import argrelextrema
        
        if mode == 'max':
            extrema = argrelextrema(series.values, np.greater, order=order)[0]
        else:
            extrema = argrelextrema(series.values, np.less, order=order)[0]
        
        return extrema.tolist()
    
    def _calculate_level_strength(self, df: pd.DataFrame, price: float, level_type: str) -> float:
        """Calcular la fuerza de un nivel de S/R"""
        touches = self._count_touches(df, price, tolerance=0.001)
        volume_strength = self._calculate_volume_strength(df, price)
        age_factor = self._calculate_age_factor(df, price)
        
        # Combinar factores
        base_strength = min(touches / 3.0, 1.0)  # Normalizar por 3 toques
        volume_factor = min(volume_strength, 0.3)  # Máximo 30% de bonificación
        age_bonus = min(age_factor, 0.2)  # Máximo 20% de bonificación
        
        total_strength = base_strength + volume_factor + age_bonus
        return min(total_strength, 1.0)
    
    def _count_touches(self, df: pd.DataFrame, price: float, tolerance: float = 0.001) -> int:
        """Contar cuántas veces el precio tocó un nivel"""
        price_range = (price * (1 - tolerance), price * (1 + tolerance))
        
        high_touches = ((df['High'] >= price_range[0]) & (df['High'] <= price_range[1])).sum()
        low_touches = ((df['Low'] >= price_range[0]) & (df['Low'] <= price_range[1])).sum()
        
        return int(max(high_touches, low_touches))
    
    def _calculate_volume_strength(self, df: pd.DataFrame, price: float) -> float:
        """Calcular fuerza basada en volumen cerca del nivel"""
        tolerance = 0.002  # 0.2%
        price_range = (price * (1 - tolerance), price * (1 + tolerance))
        
        # Encontrar velas que tocaron el nivel
        touches_mask = (
            ((df['High'] >= price_range[0]) & (df['High'] <= price_range[1])) |
            ((df['Low'] >= price_range[0]) & (df['Low'] <= price_range[1]))
        )
        
        if not touches_mask.any():
            return 0.0
        
        # Volumen promedio en toques vs volumen general
        touch_volume = df.loc[touches_mask, 'Volume'].mean()
        avg_volume = df['Volume'].mean()
        
        if avg_volume > 0:
            volume_ratio = touch_volume / avg_volume
            return min(volume_ratio - 1.0, 1.0) if volume_ratio > 1.0 else 0.0
        
        return 0.0
    
    def _calculate_age_factor(self, df: pd.DataFrame, price: float) -> float:
        """Calcular factor de antigüedad del nivel"""
        tolerance = 0.001
        price_range = (price * (1 - tolerance), price * (1 + tolerance))
        
        # Encontrar primera y última vez que se tocó el nivel
        touches_mask = (
            ((df['High'] >= price_range[0]) & (df['High'] <= price_range[1])) |
            ((df['Low'] >= price_range[0]) & (df['Low'] <= price_range[1]))
        )
        
        if not touches_mask.any():
            return 0.0
        
        touch_indices = df.index[touches_mask]
        first_touch = touch_indices[0]
        last_touch = touch_indices[-1]
        
        # Calcular antigüedad (períodos entre primer y último toque)
        age_periods = df.index.get_loc(last_touch) - df.index.get_loc(first_touch)
        max_age = len(df) * 0.5  # 50% del dataset como máximo
        
        return min(age_periods / max_age, 1.0) if max_age > 0 else 0.0