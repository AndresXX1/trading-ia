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

class TradingStrategyComponent:
    """Componente base para estrategias de trading"""
    
    def __init__(self, name: str, timeframes: List[str], description: str):
        self.name = name
        self.timeframes = timeframes
        self.description = description
        self.logger = logging.getLogger(__name__)
    
    async def analyze(self, df: pd.DataFrame, config=None) -> Optional[Dict]:
        """Método base para análisis de estrategia"""
        raise NotImplementedError("Subclasses must implement analyze method")
    
    def get_weight_multiplier(self, timeframe: str) -> float:
        """Obtener multiplicador de peso según temporalidad"""
        if timeframe in self.timeframes:
            return 1.0
        return 0.5  # Peso reducido para temporalidades no óptimas

class MaletaStrategy(TradingStrategyComponent):
    """Estrategia Maleta de Jhonatan Nuñez"""
    
    def __init__(self):
        super().__init__(
            name="Maleta",
            timeframes=["M15", "M30", "H1", "H4"],
            description="Estrategia Maleta con indicador Stochastic JR"
        )
    
    async def analyze(self, df: pd.DataFrame, config=None) -> Optional[Dict]:
        """Análisis específico de la estrategia Maleta"""
        try:
            # Calcular Stochastic personalizado para Maleta
            stoch_k, stoch_d = self._calculate_maleta_stochastic(df)
            
            # Detectar señales de la estrategia Maleta
            signals = []
            current_k = stoch_k.iloc[-1]
            current_d = stoch_d.iloc[-1]
            prev_k = stoch_k.iloc[-2]
            prev_d = stoch_d.iloc[-2]
            
            # Señal de compra: Stochastic sale de sobreventa
            if current_k > 20 and prev_k <= 20 and current_k > current_d:
                signals.append({
                    'type': 'buy',
                    'strength': 0.8,
                    'price': float(df['Close'].iloc[-1]),
                    'reason': 'Stochastic Maleta salida de sobreventa'
                })
            
            # Señal de venta: Stochastic sale de sobrecompra
            if current_k < 80 and prev_k >= 80 and current_k < current_d:
                signals.append({
                    'type': 'sell',
                    'strength': 0.8,
                    'price': float(df['Close'].iloc[-1]),
                    'reason': 'Stochastic Maleta salida de sobrecompra'
                })
            
            if not signals:
                return None
            
            return {
                'strategy': 'Maleta',
                'signals': signals,
                'stochastic_k': float(current_k),
                'stochastic_d': float(current_d),
                'confidence': max(signal['strength'] for signal in signals),
                'description': f"Estrategia Maleta: {len(signals)} señales detectadas"
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis Maleta: {e}")
            return None
    
    def _calculate_maleta_stochastic(self, df: pd.DataFrame, k_period=14, d_period=3) -> Tuple[pd.Series, pd.Series]:
        """Calcular Stochastic personalizado para estrategia Maleta"""
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        # Calcular %K
        lowest_low = low.rolling(window=k_period).min()
        highest_high = high.rolling(window=k_period).max()
        k_percent = 100 * ((close - lowest_low) / (highest_high - lowest_low))
        
        # Calcular %D (media móvil de %K)
        d_percent = k_percent.rolling(window=d_period).mean()
        
        return k_percent, d_percent

class SwingTradingStrategy(TradingStrategyComponent):
    """Estrategia de Swing Trading"""
    
    def __init__(self):
        super().__init__(
            name="Swing Trading",
            timeframes=["H4", "D1", "W1"],
            description="Estrategia de swing trading con análisis de tendencia"
        )
    
    async def analyze(self, df: pd.DataFrame, config=None) -> Optional[Dict]:
        """Análisis específico de swing trading"""
        try:
            # Calcular medias móviles para tendencia
            ma_20 = df['Close'].rolling(window=20).mean()
            ma_50 = df['Close'].rolling(window=50).mean()
            
            # Calcular RSI
            rsi = self._calculate_rsi(df['Close'])
            
            signals = []
            current_price = float(df['Close'].iloc[-1])
            current_ma20 = ma_20.iloc[-1]
            current_ma50 = ma_50.iloc[-1]
            current_rsi = rsi.iloc[-1]
            
            # Señal de compra swing
            if (current_ma20 > current_ma50 and 
                current_price > current_ma20 and 
                30 < current_rsi < 70):
                signals.append({
                    'type': 'buy',
                    'strength': 0.75,
                    'price': current_price,
                    'reason': 'Swing trading: tendencia alcista confirmada'
                })
            
            # Señal de venta swing
            if (current_ma20 < current_ma50 and 
                current_price < current_ma20 and 
                30 < current_rsi < 70):
                signals.append({
                    'type': 'sell',
                    'strength': 0.75,
                    'price': current_price,
                    'reason': 'Swing trading: tendencia bajista confirmada'
                })
            
            if not signals:
                return None
            
            return {
                'strategy': 'Swing Trading',
                'signals': signals,
                'ma_20': float(current_ma20),
                'ma_50': float(current_ma50),
                'rsi': float(current_rsi),
                'confidence': max(signal['strength'] for signal in signals),
                'description': f"Swing Trading: {len(signals)} señales detectadas"
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis Swing Trading: {e}")
            return None
    
    def _calculate_rsi(self, prices: pd.Series, period=14) -> pd.Series:
        """Calcular RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

class ScalpingStrategy(TradingStrategyComponent):
    """Estrategia de Scalping"""
    
    def __init__(self):
        super().__init__(
            name="Scalping",
            timeframes=["M1", "M5"],
            description="Estrategia de scalping con análisis de momentum"
        )
    
    async def analyze(self, df: pd.DataFrame, config=None) -> Optional[Dict]:
        """Análisis específico de scalping"""
        try:
            # Calcular EMA rápidas para scalping
            ema_5 = df['Close'].ewm(span=5).mean()
            ema_10 = df['Close'].ewm(span=10).mean()
            
            # Calcular MACD para momentum
            macd_line, macd_signal, macd_histogram = self._calculate_macd(df['Close'])
            
            signals = []
            current_price = float(df['Close'].iloc[-1])
            current_ema5 = ema_5.iloc[-1]
            current_ema10 = ema_10.iloc[-1]
            current_macd = macd_line.iloc[-1]
            current_signal = macd_signal.iloc[-1]
            
            # Señal de compra scalping
            if (current_ema5 > current_ema10 and 
                current_macd > current_signal and
                current_macd > 0):
                signals.append({
                    'type': 'buy',
                    'strength': 0.85,
                    'price': current_price,
                    'reason': 'Scalping: momentum alcista confirmado'
                })
            
            # Señal de venta scalping
            if (current_ema5 < current_ema10 and 
                current_macd < current_signal and
                current_macd < 0):
                signals.append({
                    'type': 'sell',
                    'strength': 0.85,
                    'price': current_price,
                    'reason': 'Scalping: momentum bajista confirmado'
                })
            
            if not signals:
                return None
            
            return {
                'strategy': 'Scalping',
                'signals': signals,
                'ema_5': float(current_ema5),
                'ema_10': float(current_ema10),
                'macd': float(current_macd),
                'confidence': max(signal['strength'] for signal in signals),
                'description': f"Scalping: {len(signals)} señales detectadas"
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis Scalping: {e}")
            return None
    
    def _calculate_macd(self, prices: pd.Series, fast=12, slow=26, signal=9):
        """Calcular MACD"""
        ema_fast = prices.ewm(span=fast).mean()
        ema_slow = prices.ewm(span=slow).mean()
        macd_line = ema_fast - ema_slow
        macd_signal = macd_line.ewm(span=signal).mean()
        macd_histogram = macd_line - macd_signal
        return macd_line, macd_signal, macd_histogram

class PositionTradingStrategy(TradingStrategyComponent):
    """Estrategia de Position Trading"""
    
    def __init__(self):
        super().__init__(
            name="Position Trading",
            timeframes=["D1", "W1", "MN1"],
            description="Estrategia de position trading con análisis de tendencia a largo plazo"
        )
    
    async def analyze(self, df: pd.DataFrame, config=None) -> Optional[Dict]:
        """Análisis específico de position trading"""
        try:
            # Calcular medias móviles de largo plazo
            ma_50 = df['Close'].rolling(window=50).mean()
            ma_200 = df['Close'].rolling(window=200).mean()
            
            # Calcular ADX para fuerza de tendencia
            adx = self._calculate_adx(df)
            
            signals = []
            current_price = float(df['Close'].iloc[-1])
            current_ma50 = ma_50.iloc[-1]
            current_ma200 = ma_200.iloc[-1]
            current_adx = adx.iloc[-1]
            
            # Señal de compra position trading
            if (current_ma50 > current_ma200 and 
                current_price > current_ma50 and 
                current_adx > 25):
                signals.append({
                    'type': 'buy',
                    'strength': 0.7,
                    'price': current_price,
                    'reason': 'Position Trading: tendencia alcista fuerte a largo plazo'
                })
            
            # Señal de venta position trading
            if (current_ma50 < current_ma200 and 
                current_price < current_ma50 and 
                current_adx > 25):
                signals.append({
                    'type': 'sell',
                    'strength': 0.7,
                    'price': current_price,
                    'reason': 'Position Trading: tendencia bajista fuerte a largo plazo'
                })
            
            if not signals:
                return None
            
            return {
                'strategy': 'Position Trading',
                'signals': signals,
                'ma_50': float(current_ma50),
                'ma_200': float(current_ma200),
                'adx': float(current_adx),
                'confidence': max(signal['strength'] for signal in signals),
                'description': f"Position Trading: {len(signals)} señales detectadas"
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis Position Trading: {e}")
            return None
    
    def _calculate_adx(self, df: pd.DataFrame, period=14) -> pd.Series:
        """Calcular ADX (Average Directional Index)"""
        high = df['High']
        low = df['Low']
        close = df['Close']
        
        # Calcular True Range
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        # Calcular Directional Movement
        dm_plus = high.diff()
        dm_minus = low.diff() * -1
        
        dm_plus[dm_plus < 0] = 0
        dm_minus[dm_minus < 0] = 0
        
        # Suavizar con media móvil
        tr_smooth = tr.rolling(window=period).mean()
        dm_plus_smooth = dm_plus.rolling(window=period).mean()
        dm_minus_smooth = dm_minus.rolling(window=period).mean()
        
        # Calcular DI+ y DI-
        di_plus = 100 * (dm_plus_smooth / tr_smooth)
        di_minus = 100 * (dm_minus_smooth / tr_smooth)
        
        # Calcular ADX
        dx = 100 * abs(di_plus - di_minus) / (di_plus + di_minus)
        adx = dx.rolling(window=period).mean()
        
        return adx

class ConfluenceDetector:
    """Detector principal de confluencias para señales de trading con estrategias personalizadas"""
    
    def __init__(self):
        self.elliott_analyzer = ElliottWaveAnalyzer()
        self.pattern_detector = ChartPatternDetector()
        self.fibonacci_analyzer = FibonacciAnalyzer()
        self.logger = logging.getLogger(__name__)
        
        # ✅ NUEVO: Inicializar componentes de estrategias
        self.strategy_components = {
            'maleta': MaletaStrategy(),
            'swing_trading': SwingTradingStrategy(),
            'scalping': ScalpingStrategy(),
            'position_trading': PositionTradingStrategy()
        }
        
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
                
                # ✅ NUEVO: Log de tipo de trader y estrategia
                if hasattr(config, 'trader_type') and config.trader_type:
                    self.logger.info(f"Tipo de trader: {config.trader_type}")
                if hasattr(config, 'trading_strategy') and config.trading_strategy:
                    self.logger.info(f"Estrategia de trading: {config.trading_strategy}")
            else:
                min_confluence_score = self.min_confluence_score
                analysis_weights = self.analysis_weights
            
            self.logger.info(f"Analizando {symbol} en {timeframe}")
            
            # ✅ MODIFICADO: Realizar análisis filtrados según configuración
            analyses = await self._perform_filtered_analyses(df, symbol, timeframe, config)
            
            # ✅ NUEVO: Agregar análisis de estrategia específica
            if config and hasattr(config, 'trading_strategy') and config.trading_strategy:
                strategy_analysis = await self._perform_strategy_analysis(
                    df, config.trading_strategy, timeframe, config
                )
                if strategy_analysis:
                    analyses.append(strategy_analysis)
            
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
    
    async def _perform_strategy_analysis(self, 
                                       df: pd.DataFrame, 
                                       strategy_name: str, 
                                       timeframe: str,
                                       config=None) -> Optional[TechnicalAnalysis]:
        """✅ NUEVO: Realizar análisis específico de estrategia"""
        try:
            strategy_key = strategy_name.lower().replace(' ', '_')
            
            if strategy_key not in self.strategy_components:
                self.logger.warning(f"Estrategia no encontrada: {strategy_name}")
                return None
            
            strategy_component = self.strategy_components[strategy_key]
            
            # Obtener multiplicador de peso según temporalidad
            weight_multiplier = strategy_component.get_weight_multiplier(timeframe)
            
            # Realizar análisis de la estrategia
            strategy_result = await strategy_component.analyze(df, config)
            
            if not strategy_result:
                return None
            
            # Ajustar confianza según temporalidad óptima
            adjusted_confidence = strategy_result['confidence'] * weight_multiplier
            
            return TechnicalAnalysis(
                type=AnalysisType.CHART_PATTERN,  # Usar tipo existente
                confidence=adjusted_confidence,
                data=strategy_result,
                description=f"Estrategia {strategy_name}: {strategy_result['description']}"
            )
            
        except Exception as e:
            self.logger.error(f"Error en análisis de estrategia {strategy_name}: {e}")
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
        
        # ✅ NUEVO: Aplicar multiplicadores según tipo de trader
        trader_multiplier = self._get_trader_type_multiplier(timeframe, config)
        
        # Análisis de ondas de Elliott
        if enable_elliott:
            try:
                elliott_result = await self.elliott_analyzer.analyze(df)
                if elliott_result:
                    description = elliott_result.get('description', 'Análisis Elliott Wave')
                    if description is None:
                        description = 'Análisis Elliott Wave'
                    
                    # Aplicar multiplicador de tipo de trader
                    adjusted_confidence = elliott_result.get('confidence', 0.5) * trader_multiplier
                        
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.ELLIOTT_WAVE,
                        confidence=min(adjusted_confidence, 1.0),
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
                    
                    # Aplicar multiplicador de tipo de trader
                    adjusted_confidence = pattern.get('confidence', 0.5) * trader_multiplier
                        
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.CHART_PATTERN,
                        confidence=min(adjusted_confidence, 1.0),
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
                    
                    # Aplicar multiplicador de tipo de trader
                    adjusted_confidence = fib_result.get('confidence', 0.5) * trader_multiplier
                        
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.FIBONACCI,
                        confidence=min(adjusted_confidence, 1.0),
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
                    # Aplicar multiplicador de tipo de trader
                    adjusted_confidence = sr_result['confidence'] * trader_multiplier
                    
                    analyses.append(TechnicalAnalysis(
                        type=AnalysisType.SUPPORT_RESISTANCE,
                        confidence=min(adjusted_confidence, 1.0),
                        data=sr_result,
                        description=sr_result['description']
                    ))
            except Exception as e:
                self.logger.warning(f"Error en análisis S/R: {e}")
        
        return analyses
    
    def _get_trader_type_multiplier(self, timeframe: str, config=None) -> float:
        """✅ NUEVO: Obtener multiplicador según tipo de trader y temporalidad"""
        if not config or not hasattr(config, 'trader_type') or not config.trader_type:
            return 1.0
        
        # Mapeo de tipos de trader y sus temporalidades óptimas
        trader_timeframes = {
            'scalping': ['M1', 'M5'],
            'day_trading': ['M5', 'M15', 'M30', 'H1'],
            'swing_trading': ['H1', 'H4', 'D1'],
            'position_trading': ['D1', 'W1', 'MN1']
        }
        
        trader_type = config.trader_type.lower()
        optimal_timeframes = trader_timeframes.get(trader_type, [])
        
        # Si la temporalidad es óptima para el tipo de trader, multiplicador completo
        if timeframe in optimal_timeframes:
            return 1.0
        
        # Si no es óptima, reducir el multiplicador
        return 0.7
    
    # ... [Resto de métodos del archivo original se mantienen igual] ...
    
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
                # ✅ NUEVO: Manejar análisis de estrategias específicas
                if isinstance(analysis.data, dict) and 'strategy' in analysis.data:
                    # Es un análisis de estrategia específica
                    strategy_data = analysis.data
                    if 'signals' in strategy_data:
                        for signal in strategy_data['signals']:
                            if isinstance(signal, dict) and 'price' in signal:
                                levels.append({
                                    'price': signal['price'],
                                    'type': f"strategy_{strategy_data['strategy'].lower()}",
                                    'confidence': analysis.confidence,
                                    'analysis': f"Estrategia {strategy_data['strategy']}"
                                })
                
                # Extraer objetivos de patrones tradicionales
                elif isinstance(analysis.data, dict) and 'target' in analysis.data:
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
