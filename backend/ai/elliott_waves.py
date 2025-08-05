import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from scipy.signal import argrelextrema
import logging

class ElliottWaveAnalyzer:
    """Analizador de Ondas de Elliott con IA"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Ratios de Fibonacci para validar ondas
        self.fib_ratios = {
            'wave_2': [0.382, 0.500, 0.618],
            'wave_3': [1.618, 2.618, 4.236],
            'wave_4': [0.236, 0.382, 0.500],
            'wave_5': [0.618, 1.000, 1.618]
        }
        
        # Parámetros para detección
        self.min_wave_length = 5  # Mínimo de velas por onda
        self.extrema_order = 3    # Orden para encontrar extremos
    
    async def analyze(self, df: pd.DataFrame) -> Optional[Dict]:
        """Análisis principal de ondas de Elliott"""
        try:
            if len(df) < 50:  # Necesitamos suficientes datos
                return None
            
            # Encontrar extremos locales
            highs, lows = self._find_extrema(df)
            
            if len(highs) < 3 or len(lows) < 3:
                return None
            
            # Crear secuencia de puntos pivot
            pivots = self._create_pivot_sequence(df, highs, lows)
            
            if len(pivots) < 5:  # Necesitamos al menos 5 puntos para una onda de 5
                return None
            
            # Detectar patrones de 5 ondas
            wave_patterns = self._detect_five_wave_patterns(pivots)
            
            if not wave_patterns:
                return None
            
            # Seleccionar el mejor patrón
            best_pattern = max(wave_patterns, key=lambda x: x['confidence'])
            
            # Generar proyecciones
            projections = self._generate_projections(best_pattern, df)
            
            # Determinar estado actual del mercado
            market_state = self._determine_market_state(best_pattern, df)
            
            return {
                'pattern': best_pattern,
                'projections': projections,
                'market_state': market_state,
                'confidence': best_pattern['confidence'],
                'targets': self._calculate_targets(best_pattern, projections),
                'description': self._generate_description(best_pattern, market_state)
            }
            
        except Exception as e:
            self.logger.error(f"Error en análisis Elliott Wave: {e}")
            return None
    
    def _find_extrema(self, df: pd.DataFrame) -> Tuple[List[int], List[int]]:
        """Encontrar máximos y mínimos locales"""
        highs = argrelextrema(df['High'].values, np.greater, order=self.extrema_order)[0]
        lows = argrelextrema(df['Low'].values, np.less, order=self.extrema_order)[0]
        
        # Filtrar extremos muy cercanos
        highs = self._filter_close_extrema(df, highs, 'High')
        lows = self._filter_close_extrema(df, lows, 'Low')
        
        return highs.tolist(), lows.tolist()
    
    def _filter_close_extrema(self, df: pd.DataFrame, extrema: np.ndarray, column: str) -> np.ndarray:
        """Filtrar extremos que están muy cerca en precio o tiempo"""
        if len(extrema) <= 1:
            return extrema
        
        filtered = [extrema[0]]
        
        for i in range(1, len(extrema)):
            current_idx = extrema[i]
            last_idx = filtered[-1]
            
            # Filtrar por distancia temporal (mínimo 5 velas)
            if current_idx - last_idx < self.min_wave_length:
                continue
            
            # Filtrar por diferencia de precio (mínimo 0.1%)
            current_price = df[column].iloc[current_idx]
            last_price = df[column].iloc[last_idx]
            price_diff = abs(current_price - last_price) / last_price
            
            if price_diff >= 0.001:  # 0.1% mínimo
                filtered.append(current_idx)
        
        return np.array(filtered)
    
    def _create_pivot_sequence(self, df: pd.DataFrame, highs: List[int], lows: List[int]) -> List[Dict]:
        """Crear secuencia ordenada de puntos pivot"""
        pivots = []
        
        # Agregar highs
        for idx in highs:
            pivots.append({
                'index': idx,
                'price': float(df['High'].iloc[idx]),
                'type': 'high',
                'timestamp': df.index[idx]
            })
        
        # Agregar lows
        for idx in lows:
            pivots.append({
                'index': idx,
                'price': float(df['Low'].iloc[idx]),
                'type': 'low',
                'timestamp': df.index[idx]
            })
        
        # Ordenar por índice temporal
        pivots.sort(key=lambda x: x['index'])
        
        return pivots
    
    def _detect_five_wave_patterns(self, pivots: List[Dict]) -> List[Dict]:
        """Detectar patrones de 5 ondas de Elliott"""
        patterns = []
        
        # Buscar secuencias de 5 ondas
        for i in range(len(pivots) - 4):
            wave_sequence = pivots[i:i+5]
            
            # Validar que alternen high-low o low-high
            if not self._is_valid_alternation(wave_sequence):
                continue
            
            # Validar proporciones de Fibonacci
            fib_score = self._validate_fibonacci_ratios(wave_sequence)
            
            if fib_score > 0.3:  # Umbral mínimo
                pattern = {
                    'waves': wave_sequence,
                    'start_index': wave_sequence[0]['index'],
                    'end_index': wave_sequence[-1]['index'],
                    'fibonacci_score': fib_score,
                    'confidence': self._calculate_pattern_confidence(wave_sequence, fib_score),
                    'direction': self._determine_wave_direction(wave_sequence)
                }
                patterns.append(pattern)
        
        return patterns
    
    def _is_valid_alternation(self, waves: List[Dict]) -> bool:
        """Validar que los pivots alternen correctamente"""
        if len(waves) != 5:
            return False
        
        types = [wave['type'] for wave in waves]
        
        # Patrón alcista: low-high-low-high-low
        bullish_pattern = ['low', 'high', 'low', 'high', 'low']
        # Patrón bajista: high-low-high-low-high
        bearish_pattern = ['high', 'low', 'high', 'low', 'high']
        
        return types == bullish_pattern or types == bearish_pattern
    
    def _validate_fibonacci_ratios(self, waves: List[Dict]) -> float:
        """Validar ratios de Fibonacci entre ondas"""
        if len(waves) != 5:
            return 0.0
        
        scores = []
        
        try:
            # Calcular longitudes de ondas
            wave1_length = abs(waves[1]['price'] - waves[0]['price'])
            wave2_length = abs(waves[2]['price'] - waves[1]['price'])
            wave3_length = abs(waves[3]['price'] - waves[2]['price'])
            wave4_length = abs(waves[4]['price'] - waves[3]['price'])
            
            # Validar Wave 2 (retroceso de Wave 1)
            if wave1_length > 0:
                wave2_ratio = wave2_length / wave1_length
                scores.append(self._score_fibonacci_ratio(wave2_ratio, self.fib_ratios['wave_2']))
            
            # Validar Wave 3 (extensión)
            if wave1_length > 0:
                wave3_ratio = wave3_length / wave1_length
                scores.append(self._score_fibonacci_ratio(wave3_ratio, self.fib_ratios['wave_3']))
            
            # Validar Wave 4 (retroceso de Wave 3)
            if wave3_length > 0:
                wave4_ratio = wave4_length / wave3_length
                scores.append(self._score_fibonacci_ratio(wave4_ratio, self.fib_ratios['wave_4']))
            
            return sum(scores) / len(scores) if scores else 0.0
            
        except (ZeroDivisionError, IndexError):
            return 0.0
    
    def _score_fibonacci_ratio(self, actual_ratio: float, target_ratios: List[float]) -> float:
        """Puntuar qué tan cerca está un ratio de los objetivos de Fibonacci"""
        min_distance = float('inf')
        
        for target in target_ratios:
            distance = abs(actual_ratio - target) / target
            min_distance = min(min_distance, distance)
        
        # Convertir distancia a score (más cerca = mejor score)
        if min_distance < 0.1:  # Dentro del 10%
            return 1.0 - (min_distance / 0.1)
        elif min_distance < 0.2:  # Dentro del 20%
            return 0.5 * (1.0 - (min_distance - 0.1) / 0.1)
        else:
            return 0.0
    
    def _calculate_pattern_confidence(self, waves: List[Dict], fib_score: float) -> float:
        """Calcular confianza general del patrón"""
        
        # Factores de confianza
        fib_factor = fib_score  # Ya normalizado 0-1
        
        # Factor de claridad (diferencia entre ondas)
        clarity_factor = self._calculate_clarity_factor(waves)
        
        # Factor de reglas de Elliott
        rules_factor = self._validate_elliott_rules(waves)
        
        # Combinar factores
        confidence = (fib_factor * 0.4 + clarity_factor * 0.3 + rules_factor * 0.3)
        
        return min(confidence, 1.0)
    
    def _calculate_clarity_factor(self, waves: List[Dict]) -> float:
        """Calcular factor de claridad del patrón"""
        if len(waves) != 5:
            return 0.0
        
        # Calcular variaciones de precio
        price_ranges = []
        for i in range(len(waves) - 1):
            price_diff = abs(waves[i+1]['price'] - waves[i]['price'])
            price_ranges.append(price_diff)
        
        if not price_ranges:
            return 0.0
        
        # Preferir ondas con movimientos significativos
        avg_range = sum(price_ranges) / len(price_ranges)
        min_range = min(price_ranges)
        
        # Factor basado en consistencia de movimientos
        consistency = min_range / avg_range if avg_range > 0 else 0.0
        
        return min(consistency * 2, 1.0)  # Normalizar a 0-1
    
    def _validate_elliott_rules(self, waves: List[Dict]) -> float:
        """Validar reglas básicas de Elliott Wave"""
        if len(waves) != 5:
            return 0.0
        
        rules_passed = 0
        total_rules = 3
        
        try:
            # Regla 1: Wave 3 no puede ser la más corta
            wave1_length = abs(waves[1]['price'] - waves[0]['price'])
            wave3_length = abs(waves[3]['price'] - waves[2]['price'])
            wave5_length = abs(waves[4]['price'] - waves[3]['price'])
            
            lengths = [wave1_length, wave3_length, wave5_length]
            if wave3_length != min(lengths):
                rules_passed += 1
            
            # Regla 2: Wave 4 no debe solaparse con Wave 1 (en precio)
            direction = self._determine_wave_direction(waves)
            if direction == 'bullish':
                if waves[4]['price'] > waves[1]['price']:  # Wave 4 low > Wave 1 high
                    rules_passed += 1
            else:
                if waves[4]['price'] < waves[1]['price']:  # Wave 4 high < Wave 1 low
                    rules_passed += 1
            
            # Regla 3: Wave 3 debe extenderse significativamente
            if wave3_length > wave1_length * 1.1:  # Al menos 10% más largo
                rules_passed += 1
            
        except (IndexError, ZeroDivisionError):
            pass
        
        return rules_passed / total_rules
    
    def _determine_wave_direction(self, waves: List[Dict]) -> str:
        """Determinar si el patrón es alcista o bajista"""
        if len(waves) < 2:
            return 'unknown'
        
        start_price = waves[0]['price']
        end_price = waves[-1]['price']
        
        return 'bullish' if end_price > start_price else 'bearish'
    
    def _generate_projections(self, pattern: Dict, df: pd.DataFrame) -> Dict:
        """Generar proyecciones futuras basadas en el patrón"""
        waves = pattern['waves']
        direction = pattern['direction']
        
        if len(waves) < 5:
            return {}
        
        # Obtener dimensiones de ondas anteriores
        wave1_length = abs(waves[1]['price'] - waves[0]['price'])
        wave3_length = abs(waves[3]['price'] - waves[2]['price'])
        
        # Precio actual (final de Wave 5)
        current_price = waves[-1]['price']
        
        projections = {}
        
        if direction == 'bullish':
            # Proyección de corrección ABC
            projections['abc_correction'] = {
                'wave_a_target': current_price - (wave1_length * 0.618),
                'wave_c_target': current_price - (wave3_length * 0.618),
                'probability': 0.7
            }
            
            # Proyección de extensión
            projections['extension'] = {
                'target_1': current_price + (wave1_length * 1.618),
                'target_2': current_price + (wave3_length * 1.000),
                'probability': 0.5
            }
        else:
            # Proyección de corrección ABC (bajista)
            projections['abc_correction'] = {
                'wave_a_target': current_price + (wave1_length * 0.618),
                'wave_c_target': current_price + (wave3_length * 0.618),
                'probability': 0.7
            }
            
            # Proyección de extensión
            projections['extension'] = {
                'target_1': current_price - (wave1_length * 1.618),
                'target_2': current_price - (wave3_length * 1.000),
                'probability': 0.5
            }
        
        return projections
    
    def _determine_market_state(self, pattern: Dict, df: pd.DataFrame) -> str:
        """Determinar el estado actual del mercado según Elliott Wave"""
        waves = pattern['waves']
        current_price = float(df['Close'].iloc[-1])
        last_wave_price = waves[-1]['price']
        
        # Determinar si estamos en una extensión o corrección
        price_diff_pct = abs(current_price - last_wave_price) / last_wave_price
        
        if price_diff_pct < 0.01:  # Dentro del 1% del final de Wave 5
            return "completion_wave_5"
        elif current_price > last_wave_price and pattern['direction'] == 'bullish':
            return "potential_extension"
        elif current_price < last_wave_price and pattern['direction'] == 'bearish':
            return "potential_extension"
        else:
            return "potential_correction"
    
    def _calculate_targets(self, pattern: Dict, projections: Dict) -> List[Dict]:
        """Calcular objetivos de precio específicos"""
        targets = []
        
        for proj_type, proj_data in projections.items():
            if 'target' in proj_data:
                targets.append({
                    'price': proj_data['target'],
                    'type': proj_type,
                    'probability': proj_data.get('probability', 0.5)
                })
            else:
                # Múltiples objetivos
                for key, value in proj_data.items():
                    if 'target' in key and isinstance(value, (int, float)):
                        targets.append({
                            'price': value,
                            'type': f"{proj_type}_{key}",
                            'probability': proj_data.get('probability', 0.5)
                        })
        
        return sorted(targets, key=lambda x: x['probability'], reverse=True)
    
    def _generate_description(self, pattern: Dict, market_state: str) -> str:
        """Generar descripción del análisis"""
        direction = pattern['direction']
        confidence = pattern['confidence']
        
        desc = f"Patrón Elliott Wave {direction} detectado con {confidence:.1%} de confianza. "