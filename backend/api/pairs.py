from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import pandas as pd

from database.user import User
from database.mt5 import  TradingPair, OHLCV
from mt5.data_provider import MT5DataProvider
from api.auth import get_current_active_user
from database.connection import db_manager

router = APIRouter(prefix="/pairs", tags=["trading-pairs"])

# Instancia global del proveedor de datos MT5
mt5_provider = MT5DataProvider()

@router.on_event("startup")
async def startup_mt5():
    """Conectar a MT5 al iniciar la aplicación"""
    if not mt5_provider.connect():
        print("Warning: No se pudo conectar a MetaTrader 5")

@router.on_event("shutdown") 
async def shutdown_mt5():
    """Desconectar MT5 al cerrar la aplicación"""
    mt5_provider.disconnect()

@router.get("/available", response_model=List[TradingPair])
async def get_available_pairs(
    category: Optional[str] = Query(None, description="Filtrar por categoría: Major, Minor, Exotic"),
    current_user: User = Depends(get_current_active_user)
):
    """Obtener pares disponibles para trading"""
    if not mt5_provider.connected:
        raise HTTPException(status_code=503, detail="MT5 no está conectado")
    
    pairs_data = mt5_provider.get_available_pairs()
    
    if category:
        pairs_data = [pair for pair in pairs_data if pair.get('category', '').lower() == category.lower()]
    
    # Convertir a modelo TradingPair
    trading_pairs = []
    for pair_data in pairs_data:
        trading_pair = TradingPair(
            symbol=pair_data['symbol'],
            description=pair_data['description'],
            currency_base=pair_data['currency_base'],
            currency_profit=pair_data['currency_profit'],
            point=pair_data['point'],
            digits=pair_data['digits'],
            category=pair_data.get('category', 'Unknown')
        )
        trading_pairs.append(trading_pair)
    
    return trading_pairs

@router.get("/categories")
async def get_pair_categories(current_user: User = Depends(get_current_active_user)):
    """Obtener categorías de pares disponibles"""
    return {
        "categories": [
            {
                "name": "Major",
                "description": "Pares principales (USD como base o cotización)",
                "examples": ["EURUSD", "GBPUSD", "USDJPY", "USDCHF"]
            },
            {
                "name": "Minor", 
                "description": "Pares menores (cruces sin USD)",
                "examples": ["EURJPY", "GBPJPY", "EURGBP", "EURAUD"]
            },
            {
                "name": "Exotic",
                "description": "Pares exóticos (monedas de mercados emergentes)",
                "examples": ["USDTRY", "USDZAR", "USDMXN"]
            }
        ]
    }

@router.get("/{symbol}/info")
async def get_pair_info(
    symbol: str,
    current_user: User = Depends(get_current_active_user)
):
    """Obtener información detallada de un par específico"""
    if not mt5_provider.connected:
        raise HTTPException(status_code=503, detail="MT5 no está conectado")
    
    symbol_info = mt5_provider.get_symbol_info(symbol.upper())
    if not symbol_info:
        raise HTTPException(status_code=404, detail=f"Par {symbol} no encontrado")
    
    # Obtener precio actual
    current_price = mt5_provider.get_current_price(symbol.upper())
    
    return {
        "symbol_info": symbol_info,
        "current_price": current_price,
        "trading_hours": await get_trading_hours(symbol.upper()),
        "market_status": await get_market_status(symbol.upper())
    }

@router.get("/{symbol}/data")
async def get_pair_data(
    symbol: str,
    timeframe: str = Query("H1", description="Timeframe: M1, M5, M15, M30, H1, H4, D1, W1, MN1"),
    count: int = Query(500, description="Número de velas", ge=1, le=5000),
    current_user: User = Depends(get_current_active_user)
):
    """Obtener datos históricos de un par"""
    if not mt5_provider.connected:
        raise HTTPException(status_code=503, detail="MT5 no está conectado")
    
    # Validar timeframe
    valid_timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"]
    if timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=400, 
            detail=f"Timeframe inválido. Usar: {', '.join(valid_timeframes)}"
        )
    
    df = mt5_provider.get_realtime_data(symbol.upper(), timeframe, count)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No se pudieron obtener datos para {symbol}")
    
    # Convertir DataFrame a formato JSON
    data = []
    for idx, row in df.iterrows():
        ohlcv = OHLCV(
            timestamp=idx,
            open=float(row['Open']),
            high=float(row['High']),
            low=float(row['Low']),
            close=float(row['Close']),
            volume=float(row['Volume'])
        )
        data.append(ohlcv.dict())
    
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "count": len(data),
        "data": data,
        "last_updated": datetime.utcnow()
    }

@router.get("/{symbol}/price")
async def get_current_price(
    symbol: str,
    current_user: User = Depends(get_current_active_user)
):
    """Obtener precio actual de un par"""
    if not mt5_provider.connected:
        raise HTTPException(status_code=503, detail="MT5 no está conectado")
    
    price_data = mt5_provider.get_current_price(symbol.upper())
    if not price_data:
        raise HTTPException(status_code=404, detail=f"No se pudo obtener precio para {symbol}")
    
    return price_data

@router.get("/multiple/prices")
async def get_multiple_prices(
    symbols: str = Query(..., description="Símbolos separados por coma, ej: EURUSD,GBPUSD,USDJPY"),
    current_user: User = Depends(get_current_active_user)
):
    """Obtener precios actuales de múltiples pares"""
    if not mt5_provider.connected:
        raise HTTPException(status_code=503, detail="MT5 no está conectado")
    
    symbol_list = [s.strip().upper() for s in symbols.split(',')]
    if len(symbol_list) > 20:  # Limitar a 20 símbolos
        raise HTTPException(status_code=400, detail="Máximo 20 símbolos permitidos")
    
    prices = {}
    for symbol in symbol_list:
        price_data = mt5_provider.get_current_price(symbol)
        if price_data:
            prices[symbol] = price_data
    
    return {
        "prices": prices,
        "timestamp": datetime.utcnow(),
        "count": len(prices)
    }

@router.get("/user/favorites")
async def get_user_favorite_pairs(current_user: User = Depends(get_current_active_user)):
    """Obtener pares favoritos del usuario"""
    return {
        "favorite_pairs": current_user.preferred_pairs,
        "count": len(current_user.preferred_pairs)
    }

@router.post("/user/favorites/{symbol}")
async def add_favorite_pair(
    symbol: str,
    current_user: User = Depends(get_current_active_user)
):
    """Agregar par a favoritos del usuario"""
    from bson import ObjectId
    
    symbol = symbol.upper()
    
    # Verificar que el par existe
    if not mt5_provider.connected:
        raise HTTPException(status_code=503, detail="MT5 no está conectado")
    
    symbol_info = mt5_provider.get_symbol_info(symbol)
    if not symbol_info:
        raise HTTPException(status_code=404, detail=f"Par {symbol} no encontrado")
    
    # Agregar a favoritos si no existe
    if symbol not in current_user.preferred_pairs:
        updated_pairs = current_user.preferred_pairs + [symbol]
        await db_manager.update_one(
            "users",
            {"_id": ObjectId(current_user.id)},
            {"preferred_pairs": updated_pairs, "updated_at": datetime.utcnow()}
        )
        
        return {"message": f"Par {symbol} agregado a favoritos", "favorite_pairs": updated_pairs}
    else:
        return {"message": f"Par {symbol} ya está en favoritos", "favorite_pairs": current_user.preferred_pairs}

@router.delete("/user/favorites/{symbol}")
async def remove_favorite_pair(
    symbol: str,
    current_user: User = Depends(get_current_active_user)
):
    """Remover par de favoritos del usuario"""
    from bson import ObjectId
    
    symbol = symbol.upper()
    
    if symbol in current_user.preferred_pairs:
        updated_pairs = [pair for pair in current_user.preferred_pairs if pair != symbol]
        await db_manager.update_one(
            "users",
            {"_id": ObjectId(current_user.id)},
            {"preferred_pairs": updated_pairs, "updated_at": datetime.utcnow()}
        )
        
        return {"message": f"Par {symbol} removido de favoritos", "favorite_pairs": updated_pairs}
    else:
        return {"message": f"Par {symbol} no estaba en favoritos", "favorite_pairs": current_user.preferred_pairs}

# Funciones auxiliares
async def get_trading_hours(symbol: str) -> Dict:
    """Obtener horarios de trading del símbolo"""
    # Esta función se puede expandir para obtener horarios reales del broker
    return {
        "monday": {"open": "00:00", "close": "24:00"},
        "tuesday": {"open": "00:00", "close": "24:00"},
        "wednesday": {"open": "00:00", "close": "24:00"},
        "thursday": {"open": "00:00", "close": "24:00"},
        "friday": {"open": "00:00", "close": "22:00"},
        "saturday": {"open": None, "close": None},
        "sunday": {"open": "22:00", "close": "24:00"}
    }

async def get_market_status(symbol: str) -> Dict:
    """Obtener estado actual del mercado"""
    now = datetime.utcnow()
    weekday = now.weekday()  # 0=Monday, 6=Sunday
    hour = now.hour
    
    # Lógica simplificada para estado del mercado
    if weekday == 5 and hour >= 22:  # Sábado después de 22:00
        status = "closed"
    elif weekday == 6 and hour < 22:  # Domingo antes de 22:00
        status = "closed"
    elif weekday == 4 and hour >= 22:  # Viernes después de 22:00
        status = "closed"
    else:
        status = "open"
    
    return {
        "status": status,
        "next_open": None if status == "open" else "Próxima apertura calculada aquí",
        "next_close": None if status == "closed" else "Próximo cierre calculado aquí"
    }