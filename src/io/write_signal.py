import json
import os
from datetime import datetime
import pandas as pd
import numpy as np

def write_signal(signal_data):
    # Crear directorio si no existe
    os.makedirs("signals", exist_ok=True)
    
    # Convertir objetos no serializables a JSON
    def convert_to_serializable(obj):
        if isinstance(obj, pd.Timestamp):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        return obj
    
    # Convertir todos los valores del diccionario
    serializable_signal = {}
    for key, value in signal_data.items():
        serializable_signal[key] = convert_to_serializable(value)
    
    # Agregar timestamp de cuando se generó la señal
    serializable_signal['generated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Nombre del archivo con timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"signals/signal_{timestamp}.json"
    
    # Escribir al archivo
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(serializable_signal, f, indent=4, ensure_ascii=False)
    
    print(f"📁 Señal guardada en: {filename}")