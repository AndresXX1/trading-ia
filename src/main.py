import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt
from src.strategy.simple_strategy import generate_signal
from src.io.write_signal import write_signal

def get_data(symbol="EURUSD=X", interval="1h", period="7d"):
    print("🔄 Descargando datos de", symbol)
    data = yf.download(symbol, interval=interval, period=period, auto_adjust=True)
    
    # Verificar si los datos tienen múltiples niveles en las columnas
    if isinstance(data.columns, pd.MultiIndex):
        # Aplanar las columnas multi-índice
        data.columns = data.columns.droplevel(1)
    
    return data

def main():
    df = get_data()
    signal, entry_index = generate_signal(df)
    
    if signal:
        write_signal(signal)
        print("🚀 Señal generada:", signal)
        
        # Plot con señal marcada
        plt.figure(figsize=(12, 6))
        plt.plot(df['Close'], label="Precio")
        plt.scatter(entry_index, df.loc[entry_index, 'Close'], color="green", marker="^", label="Entrada", s=100)
        plt.title("EURUSD con señal marcada")
        plt.xlabel("Tiempo")
        plt.ylabel("Precio")
        plt.grid(True)
        plt.legend()
        plt.tight_layout()
        plt.show()
    else:
        print("⚠️ No se generó ninguna señal")

if __name__ == "__main__":
    main()