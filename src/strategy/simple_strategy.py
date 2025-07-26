import pandas as pd
from ta.trend import SMAIndicator

def generate_signal(data):
    """
    Genera señales de trading basadas en cruce de medias móviles
    """
    # Asegurar que los datos son unidimensionales
    close_prices = data['Close']
    if hasattr(close_prices, 'values'):
        if len(close_prices.values.shape) > 1:
            close_prices = close_prices.squeeze()
    
    # Calcular medias móviles
    sma_fast = SMAIndicator(close=close_prices, window=10).sma_indicator()
    sma_slow = SMAIndicator(close=close_prices, window=20).sma_indicator()
    
    # Agregar las medias móviles al dataframe
    data['sma_fast'] = sma_fast
    data['sma_slow'] = sma_slow
    
    # Buscar cruce alcista (señal de compra)
    for i in range(1, len(data)):
        if (pd.notna(data['sma_fast'].iloc[i]) and 
            pd.notna(data['sma_slow'].iloc[i]) and
            pd.notna(data['sma_fast'].iloc[i-1]) and 
            pd.notna(data['sma_slow'].iloc[i-1])):
            
            # Cruce alcista: SMA rápida cruza por encima de SMA lenta
            if (data['sma_fast'].iloc[i-1] <= data['sma_slow'].iloc[i-1] and 
                data['sma_fast'].iloc[i] > data['sma_slow'].iloc[i]):
                
                signal = {
                    'type': 'BUY',
                    'price': float(data['Close'].iloc[i]),
                    'timestamp': data.index[i],
                    'sma_fast': float(data['sma_fast'].iloc[i]),
                    'sma_slow': float(data['sma_slow'].iloc[i])
                }
                return signal, data.index[i]
    
    return None, None