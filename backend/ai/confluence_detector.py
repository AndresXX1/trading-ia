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
        
        # Configuración de pesos para diferentes análisis (por defecto)
        self.analysis_weights = {
            AnalysisType.ELLIOTT_WAVE: 0.25,
            AnalysisType.CHART_PATTERN: 0.30,
            AnalysisType.FIBONACCI: 0.25,
            AnalysisType.SUPPORT_RESISTANCE: 0.20
        }
        
        # Umbral mínimo de confluencia para generar señal (por defecto)
        self.min_confluence_score = 0.6
    
    async def analyze_symbol(self, 
                           symbol: str, 
                           df: pd.DataFrame, 
                           timeframe: str,
                           config=None) -> Optional[Signal]:
        """
        Análisis completo de un símbolo para detectar señales con configuración personalizada
        """
        try:
            # ✅ NUEVO: Usar configuración personalizada si se proporciona
            if config:
                min_confluence_score = config.confluence_threshold
                # Actualizar pesos si están en la configuración
                analysis_weights = {
                    AnalysisType.ELLIOTT_WAVE: config.elliott_wave_weight,
                    AnalysisType.CHART_PATTERN: config.chart_patterns_weight,
                    AnalysisType.FIBONACCI: config.fibonacci_weight,
                    AnalysisType.SUPPORT_RESISTANCE: config.support_resistance_weight
                }
                self.logger.info(f"Usando configuración personalizada: confluencia={min_confluence_score}")
            else:
                min_confluence_score = self.min_confluence_score
                analysis_weights = self.analysis_weights
            
            self.logger.info(f"Analizando {symbol} en {timeframe}")
            
            # ✅ MODIFICADO: Realizar análisis filtrados según configuración
            analyses = await self._perform_filtered_analyses(df, symbol, timeframe, config)
            
            if not analyses:
                self.logger.info(f"No se encontraron análisis válidos para {symbol}")
                return None
            
            # Detectar confluencias con pesos personalizados
            confluences = await self._detect_confluence_signals_with_weights(analyses, df, analysis_weights)
            
            if not confluences:
                self.logger.info(f"No se detectaron confluencias para {symbol}")
                return None
            
            # Evaluar la mejor confluencia
            best_confluence = max(confluences, key=lambda x: x.strength)
            
            if best_confluence.strength < min_confluence_score:
                self.logger.info(f"Confluencia insuficiente para {symbol}: {best_confluence.strength:.2f} < {min_confluence_score}")
                return None
            
            # ✅ MODIFICADO: Generar señal con configuración
            signal = await self._generate_signal_with_config(
                symbol, timeframe, df, best_confluence, analyses, config
            )
            
            self.logger.info(f"Señal generada para {symbol}: {signal.signal_type} con confluencia {signal.confluence_score:.2f}")
            return signal
            
        except Exception as e:
            self.logger.error(f"Error analizando {symbol}: {e}")
            return None
    
    async def _perform_filtered_analyses(self, 
                                       df: pd.DataFrame, 
                                       symbol: str, 
                                       timeframe: str,
                                       config=None) -> List[TechnicalAnalysis]:
        """Realizar análisis técnicos filtrados según configuración"""
        analyses = []
        
        # ✅ NUEVO: Verificar qué análisis están habilitados
        enable_elliott = config.enable_elliott_wave if config else True
        enable_fibonacci = config.enable_fibonacci if config else True
        enable_patterns = config.enable_chart_patterns if config else True
        enable_sr = config.enable_support_resistance if config else True
        
        # Análisis de ondas de Elliott
        if enable_elliott:
            try:
                elliott_result = await self.elliott_analyzer.analyze(df)
                if elliott_result:
                    description = elliott_result.get('description', 'Análisis Elliott Wave')
                    if description is None:
                        description = 'Análisis Elliott Wave'
                        
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.ELLIOTT_WAVE,
                        confidence=elliott_result.get('confidence', 0.5),
                        data=elliott_result,
                        description=description
                    ))
            except Exception as e:
                self.logger.warning(f"Error en análisis Elliott Wave: {e}")
        
        # Análisis de patrones
        if enable_patterns:
            try:
                pattern_results = await self.pattern_detector.detect_patterns(df, timeframe)
                for pattern in pattern_results:
                    description = pattern.get('description', 'Patrón chartista detectado')
                    if description is None:
                        description = 'Patrón chartista detectado'
                        
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.CHART_PATTERN,
                        confidence=pattern.get('confidence', 0.5),
                        data=pattern,
                        description=description
                    ))
            except Exception as e:
                self.logger.warning(f"Error en análisis de patrones: {e}")
        
        # Análisis Fibonacci
        if enable_fibonacci:
            try:
                if hasattr(self.fibonacci_analyzer, 'analyze'):
                    fib_result = await self.fibonacci_analyzer.analyze(df)
                elif hasattr(self.fibonacci_analyzer, 'calculate_levels'):
                    fib_result = await self.fibonacci_analyzer.calculate_levels(df)
                else:
                    fib_result = await self._basic_fibonacci_analysis(df)
                    
                if fib_result:
                    description = fib_result.get('description', 'Análisis Fibonacci')
                    if description is None:
                        description = 'Análisis Fibonacci'
                        
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.FIBONACCI,
                        confidence=fib_result.get('confidence', 0.5),
                        data=fib_result,
                        description=description
                    ))
            except Exception as e:
                self.logger.warning(f"Error en análisis Fibonacci: {e}")
        
        # Análisis de soporte y resistencia
        if enable_sr:
            try:
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
    
    async def _basic_fibonacci_analysis(self, df: pd.DataFrame) -> Optional[Dict]:
        """Análisis básico de Fibonacci como fallback"""
        try:
            # Encontrar swing high y swing low recientes
            recent_data = df.tail(100)  # Últimas 100 velas
            
            swing_high = recent_data['High'].max()
            swing_low = recent_data['Low'].min()
            
            # Calcular niveles de Fibonacci
            diff = swing_high - swing_low
            levels = []
            
            fib_ratios = [0.236, 0.382, 0.5, 0.618, 0.786]
            
            for ratio in fib_ratios:
                # Retroceso desde el high
                retracement_level = swing_high - (diff * ratio)
                levels.append({
                    'price': retracement_level,
                    'ratio': ratio,
                    'strength': 0.7 if ratio in [0.382, 0.618] else 0.5  # Niveles más importantes
                })
            
            return {
                'levels': levels,
                'swing_high': swing_high,
                'swing_low': swing_low,
                'confidence': 0.6,
                'description': f'Niveles Fibonacci entre {swing_low:.5f} y {swing_high:.5f}'
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis básico Fibonacci: {e}")
            return None
    
    async def detect_confluence_signals(self, 
                                analyses: List[TechnicalAnalysis], 
                                df: pd.DataFrame) -> List[ConfluencePoint]:
        """Detectar puntos de confluencia entre análisis (método original mantenido para compatibilidad)"""
        return await self._detect_confluence_signals_with_weights(analyses, df, self.analysis_weights)
    
    async def _detect_confluence_signals_with_weights(self, 
                                                    analyses: List[TechnicalAnalysis], 
                                                    df: pd.DataFrame,
                                                    weights: Dict) -> List[ConfluencePoint]:
        """Detectar confluencias con pesos personalizados"""
        confluences = []
        current_price = float(df['Close'].iloc[-1])
        
        # Agrupar niveles de precio similares con pesos
        price_levels = []
        
        for analysis in analyses:
            levels = self._extract_price_levels(analysis, current_price)
            # ✅ NUEVO: Aplicar pesos a cada nivel
            weight = weights.get(analysis.type, 0.25)
            for level in levels:
                level['weighted_confidence'] = level['confidence'] * weight
            price_levels.extend(levels)
        
        if not price_levels:
            return confluences
        
        # Agrupar niveles cercanos
        tolerance = current_price * 0.001  # 0.1%
        grouped_levels = self._group_price_levels(price_levels, tolerance)
        
        # Evaluar cada grupo para confluencia
        for group in grouped_levels:
            if len(group['analyses']) >= 2:  # Al menos 2 análisis confluyen
                confluence = ConfluencePoint(
                    price_level=group['avg_price'],
                    strength=self._calculate_weighted_confluence_strength(group),
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
        
        try:
            if analysis.type == AnalysisType.ELLIOTT_WAVE:
                # Extraer objetivos de ondas de Elliott
                if isinstance(analysis.data, dict) and 'targets' in analysis.data:
                    for target in analysis.data['targets']:
                        if isinstance(target, dict) and 'price' in target:
                            levels.append({
                                'price': target['price'],
                                'type': f"elliott_{target.get('type', 'unknown')}",
                                'confidence': analysis.confidence,
                                'analysis': 'Elliott Wave'
                            })
            
            elif analysis.type == AnalysisType.CHART_PATTERN:
                # Extraer objetivos de patrones
                if isinstance(analysis.data, dict) and 'target' in analysis.data:
                    levels.append({
                        'price': analysis.data['target'],
                        'type': f"pattern_{analysis.data.get('pattern_type', 'unknown')}",
                        'confidence': analysis.confidence,
                        'analysis': 'Chart Pattern'
                    })
            
            elif analysis.type == AnalysisType.FIBONACCI:
                # Extraer niveles de Fibonacci
                if isinstance(analysis.data, dict) and 'levels' in analysis.data:
                    for level in analysis.data['levels']:
                        if isinstance(level, dict) and 'price' in level:
                            price = level['price']
                            if abs(price - current_price) / current_price < 0.05:  # Dentro del 5%
                                levels.append({
                                    'price': price,
                                    'type': f"fib_{level.get('ratio', 'unknown')}",
                                    'confidence': analysis.confidence * level.get('strength', 0.5),
                                    'analysis': 'Fibonacci'
                                })
            
            elif analysis.type == AnalysisType.SUPPORT_RESISTANCE:
                # Extraer niveles de S/R
                if isinstance(analysis.data, dict) and 'levels' in analysis.data:
                    for level in analysis.data['levels']:
                        if isinstance(level, dict) and 'price' in level:
                            levels.append({
                                'price': level['price'],
                                'type': f"sr_{level.get('type', 'unknown')}",
                                'confidence': analysis.confidence * level.get('strength', 0.5),
                                'analysis': 'Support/Resistance'
                            })
                            
        except Exception as e:
            self.logger.warning(f"Error extrayendo niveles de {analysis.type}: {e}")
        
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
        """Calcular la fuerza de confluencia de un grupo (método original)"""
        return self._calculate_weighted_confluence_strength(group)
    
    def _calculate_weighted_confluence_strength(self, group: Dict) -> float:
        """Calcular fuerza de confluencia con pesos"""
        analysis_diversity = len(set(group['analyses']))
        
        # ✅ NUEVO: Usar confianza ponderada si está disponible
        total_weighted_confidence = sum(level.get('weighted_confidence', level['confidence']) 
                                      for level in group['levels'])
        avg_weighted_confidence = total_weighted_confidence / len(group['levels'])
        
        # Puntuación base por diversidad
        diversity_score = min(analysis_diversity / 4.0, 1.0)
        
        # Bonificación por número de confluencias
        count_bonus = min(group['count'] / 5.0, 0.2)
        
        # Fuerza final con pesos
        strength = (diversity_score * 0.4 + avg_weighted_confidence * 0.6) + count_bonus
        
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
        """Generar señal de trading basada en confluencia (método original mantenido para compatibilidad)"""
        return await self._generate_signal_with_config(symbol, timeframe, df, confluence, analyses, None)
    
    async def _generate_signal_with_config(self, 
                                         symbol: str, 
                                         timeframe: str, 
                                         df: pd.DataFrame, 
                                         confluence: ConfluencePoint, 
                                         analyses: List[TechnicalAnalysis],
                                         config=None) -> Signal:
        """Generar señal con configuración personalizada"""
        
        current_price = float(df['Close'].iloc[-1])
        
        # Determinar tipo de señal basado en la posición del precio vs confluencia
        if confluence.price_level > current_price * 1.001:  # 0.1% arriba
            signal_type = SignalType.BUY
            entry_price = current_price
            take_profit = confluence.price_level
            stop_loss = self._calculate_stop_loss_with_config(df, signal_type, entry_price, config)
        elif confluence.price_level < current_price * 0.999:  # 0.1% abajo
            signal_type = SignalType.SELL
            entry_price = current_price
            take_profit = confluence.price_level
            stop_loss = self._calculate_stop_loss_with_config(df, signal_type, entry_price, config)
        else:
            signal_type = SignalType.HOLD
            entry_price = current_price
            take_profit = None
            stop_loss = None
        
        # ✅ NUEVO: Ajustar take profit con relación riesgo/beneficio de la configuración
        if config and signal_type != SignalType.HOLD and stop_loss:
            risk_distance = abs(entry_price - stop_loss)
            reward_distance = risk_distance * config.risk_reward_ratio
            
            if signal_type == SignalType.BUY:
                take_profit = entry_price + reward_distance
            else:
                take_profit = entry_price - reward_distance
        
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
        """Calcular stop loss basado en ATR y estructura del mercado (método original)"""
        return self._calculate_stop_loss_with_config(df, signal_type, entry_price, None)
    
    def _calculate_stop_loss_with_config(self, 
                                       df: pd.DataFrame, 
                                       signal_type: SignalType, 
                                       entry_price: float,
                                       config=None) -> float:
        """Calcular stop loss con configuración personalizada"""
        
        # ✅ NUEVO: Usar multiplicador ATR de la configuración
        atr = self._calculate_atr(df, period=14)
        atr_multiplier = config.atr_multiplier_sl if config else 2.0
        
        if signal_type == SignalType.BUY:
            # Para compra: stop loss debajo del precio de entrada
            recent_low = df['Low'].tail(20).min()
            atr_stop = entry_price - (atr * atr_multiplier)
            structure_stop = recent_low * 0.999  # 0.1% debajo del mínimo reciente
            
            # Usar el más conservador (más cercano al precio)
            stop_loss = max(atr_stop, structure_stop)
            
        else:  # SELL
            # Para venta: stop loss arriba del precio de entrada
            recent_high = df['High'].tail(20).max()
            atr_stop = entry_price + (atr * atr_multiplier)
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
        try:
            from scipy.signal import argrelextrema
            
            if mode == 'max':
                extrema = argrelextrema(series.values, np.greater, order=order)[0]
            else:
                extrema = argrelextrema(series.values, np.less, order=order)[0]
            
            return extrema.tolist()
        except ImportError:
            # Fallback sin scipy
            return self._find_extrema_simple(series, order, mode)
    
    def _find_extrema_simple(self, series: pd.Series, order: int = 5, mode: str = 'max') -> List[int]:
        """Encontrar extremos locales sin scipy (fallback)"""
        extrema = []
        values = series.values
        
        for i in range(order, len(values) - order):
            if mode == 'max':
                if all(values[i] >= values[i-j] for j in range(1, order+1)) and \
                   all(values[i] >= values[i+j] for j in range(1, order+1)):
                    extrema.append(i)
            else:
                if all(values[i] <= values[i-j] for j in range(1, order+1)) and \
                   all(values[i] <= values[i+j] for j in range(1, order+1)):
                    extrema.append(i)
        
        return extrema
    
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
        
        # Si no hay columna Volume, retornar 0
        if 'Volume' not in df.columns:
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