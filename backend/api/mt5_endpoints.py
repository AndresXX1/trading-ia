from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional, Any
import asyncio
import json
from datetime import datetime, timedelta
import logging
import numpy as np
import pandas as pd
from database.models import User
from database.connection import get_database
from mt5.data_provider import MT5DataProvider
from api.auth import get_current_user
from bson import ObjectId
import io
import base64
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
import seaborn as sns # type: ignore

router = APIRouter()
logger = logging.getLogger(__name__)

# Inicializar MT5 provider
mt5_provider = MT5DataProvider()

def prepare_for_json(data):
    """Prepara datos para serialización JSON"""
    if data is None:
        return None
    elif isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == "_id":
                if isinstance(value, ObjectId):
                    result["id"] = str(value)
                else:
                    result["id"] = str(value)
            else:
                result[key] = prepare_for_json(value)
        return result
    elif isinstance(data, (list, tuple)):
        return [prepare_for_json(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, pd.Timestamp):
        return data.isoformat()
    elif isinstance(data, (np.float32, np.float64, np.floating)):
        return float(data)
    elif isinstance(data, (np.int32, np.int64, np.integer)):
        return int(data)
    elif isinstance(data, (np.bool_)):
        return bool(data)
    elif hasattr(data, '__dict__'):
        try:
            return prepare_for_json(data.__dict__)
        except:
            return str(data)
    else:
        try:
            json.dumps(data)
            return data
        except (TypeError, ValueError):
            return str(data)

@router.post("/data")
async def get_mt5_data(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene datos históricos reales de MT5
    """
    try:
        symbol = request_data.get("symbol")
        timeframe = request_data.get("timeframe", "H1")
        count = request_data.get("count", 100)
        
        if not symbol:
            return JSONResponse(
                status_code=400,
                content={"error": "Symbol is required"}
            )
        
        # Conectar a MT5 si no está conectado
        if not mt5_provider.connect():
            logger.error("Failed to connect to MT5")
            return JSONResponse(
                status_code=503,
                content={"error": "Cannot connect to MetaTrader 5"}
            )
        
        # Obtener datos históricos
        data = mt5_provider.get_realtime_data(symbol, timeframe, count)
        
        if data is None or data.empty:
            return JSONResponse(
                status_code=404,
                content={"error": f"No data available for {symbol}"}
            )
        
        # Debug: Verificar estructura de datos
        logger.info(f"Data columns: {list(data.columns)}")
        logger.info(f"Data shape: {data.shape}")
        logger.info(f"Sample row: {data.iloc[0] if not data.empty else 'No data'}")
        
        # Mapear nombres de columnas comunes de MT5
        column_mapping = {
            # Nombres estándar MT5
            'open': 'open',
            'high': 'high', 
            'low': 'low',
            'close': 'close',
            'tick_volume': 'volume',
            'real_volume': 'volume',
            'spread': 'spread',
            # Variantes comunes
            'Open': 'open',
            'High': 'high',
            'Low': 'low', 
            'Close': 'close',
            'Volume': 'volume',
            'TickVolume': 'volume',
            'RealVolume': 'volume',
            # Otros formatos posibles
            'o': 'open',
            'h': 'high',
            'l': 'low',
            'c': 'close',
            'v': 'volume'
        }
        
        # Identificar las columnas disponibles
        available_columns = list(data.columns)
        mapped_columns = {}
        
        for col in available_columns:
            if col in column_mapping:
                mapped_columns[column_mapping[col]] = col
            elif col.lower() in [k.lower() for k in column_mapping.keys()]:
                # Buscar coincidencia insensible a mayúsculas
                for key, value in column_mapping.items():
                    if col.lower() == key.lower():
                        mapped_columns[value] = col
                        break
        
        logger.info(f"Mapped columns: {mapped_columns}")
        
        # Verificar que tenemos las columnas mínimas requeridas
        required_columns = ['open', 'high', 'low', 'close']
        missing_columns = []
        
        for req_col in required_columns:
            if req_col not in mapped_columns:
                missing_columns.append(req_col)
        
        if missing_columns:
            return JSONResponse(
                status_code=422,
                content={
                    "error": "Missing required columns in MT5 data",
                    "missing_columns": missing_columns,
                    "available_columns": available_columns,
                    "mapped_columns": mapped_columns,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        # Convertir DataFrame a formato de velas usando las columnas mapeadas
        candles = []
        for index, row in data.iterrows():
            try:
                candle = {
                    "time": row.name.isoformat() if hasattr(row.name, 'isoformat') else str(row.name),
                    "open": float(row[mapped_columns['open']]),
                    "high": float(row[mapped_columns['high']]),
                    "low": float(row[mapped_columns['low']]),
                    "close": float(row[mapped_columns['close']]),
                    "volume": float(row[mapped_columns.get('volume', mapped_columns.get('tick_volume', available_columns[0]))]) if 'volume' in mapped_columns or 'tick_volume' in mapped_columns else 0.0
                }
                candles.append(candle)
            except Exception as row_error:
                logger.error(f"Error processing row {index}: {row_error}")
                logger.error(f"Row data: {row}")
                continue
        
        if not candles:
            return JSONResponse(
                status_code=422,
                content={
                    "error": "Could not process any data rows",
                    "available_columns": available_columns,
                    "sample_data": data.head(2).to_dict() if not data.empty else {},
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        response_data = {
            "symbol": symbol,
            "timeframe": timeframe,
            "count": len(candles),
            "data": {
                "candles": candles
            },
            "debug_info": {
                "original_columns": available_columns,
                "mapped_columns": mapped_columns,
                "processed_rows": len(candles)
            },
            "timestamp": datetime.utcnow().isoformat(),
            "source": "MT5_Real"
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error getting MT5 data: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting MT5 data",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/price/{symbol}")
async def get_current_price(
    symbol: str,
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el precio actual en tiempo real de MT5
    """
    try:
        # Conectar a MT5 si no está conectado
        if not mt5_provider.connect():
            logger.error("Failed to connect to MT5")
            return JSONResponse(
                status_code=503,
                content={"error": "Cannot connect to MetaTrader 5"}
            )
        
        # Obtener precio actual
        current_price = mt5_provider.get_current_price(symbol)
        
        if current_price is None:
            return JSONResponse(
                status_code=404,
                content={"error": f"No price data available for {symbol}"}
            )
        
        # Obtener información adicional del símbolo
        symbol_info = mt5_provider.get_symbol_info(symbol)
        
        response_data = {
            "symbol": symbol,
            "price": float(current_price),
            "timestamp": datetime.utcnow().isoformat(),
            "source": "MT5_Real",
            "symbol_info": {
                "digits": symbol_info.get('digits', 5) if symbol_info else 5,
                "point": symbol_info.get('point', 0.00001) if symbol_info else 0.00001,
                "spread": symbol_info.get('spread', 0) if symbol_info else 0
            }
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error getting current price for {symbol}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting current price",
                "detail": str(e),
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.post("/execute")
async def execute_order(
    order_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Ejecuta una orden en MT5
    """
    try:
        symbol = order_data.get("symbol")
        signal_type = order_data.get("signal_type")  # "buy" or "sell"
        entry_price = order_data.get("entry_price")
        stop_loss = order_data.get("stop_loss")
        take_profit = order_data.get("take_profit")
        lot_size = order_data.get("lot_size", 0.1)
        
        if not all([symbol, signal_type, entry_price]):
            return JSONResponse(
                status_code=400,
                content={"error": "Symbol, signal_type, and entry_price are required"}
            )
        
        # Conectar a MT5 si no está conectado
        if not mt5_provider.connect():
            logger.error("Failed to connect to MT5")
            return JSONResponse(
                status_code=503,
                content={"error": "Cannot connect to MetaTrader 5"}
            )
        
        # Ejecutar la orden
        result = mt5_provider.place_order(
            symbol=symbol,
            order_type=signal_type.upper(),
            volume=lot_size,
            price=entry_price,
            sl=stop_loss,
            tp=take_profit,
            comment=f"AI_Signal_{current_user.id}"
        )
        
        if result and result.get("success"):
            # Guardar la orden en la base de datos
            db = await get_database()
            order_doc = {
                "user_id": current_user.id,
                "symbol": symbol,
                "order_type": signal_type.upper(),
                "volume": lot_size,
                "entry_price": entry_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "ticket": result.get("ticket"),
                "status": "EXECUTED",
                "executed_at": datetime.utcnow(),
                "mt5_result": prepare_for_json(result)
            }
            
            await db.executed_orders.insert_one(order_doc)
            
            response_data = {
                "success": True,
                "ticket": result.get("ticket"),
                "symbol": symbol,
                "order_type": signal_type.upper(),
                "volume": lot_size,
                "entry_price": entry_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "message": "Order executed successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            return JSONResponse(content=response_data)
        else:
            error_msg = result.get("error", "Unknown error") if result else "Failed to execute order"
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Order execution failed",
                    "detail": error_msg,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
    except Exception as e:
        logger.error(f"Error executing order: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Error executing order",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/orders")
async def get_user_orders(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Obtiene las órdenes ejecutadas del usuario
    """
    try:
        orders = await db.executed_orders.find(
            {"user_id": current_user.id}
        ).sort("executed_at", -1).limit(50).to_list(length=50)
        
        cleaned_orders = [prepare_for_json(order) for order in orders]
        
        response_data = {
            "orders": cleaned_orders,
            "count": len(cleaned_orders),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error getting user orders: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting orders",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/positions")
async def get_open_positions(
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene las posiciones abiertas en MT5
    """
    try:
        # Conectar a MT5 si no está conectado
        if not mt5_provider.connect():
            logger.error("Failed to connect to MT5")
            return JSONResponse(
                status_code=503,
                content={"error": "Cannot connect to MetaTrader 5"}
            )
        
        # Obtener posiciones abiertas
        positions = mt5_provider.get_positions()
        
        if positions is None:
            positions = []
        
        # Filtrar posiciones del usuario (por comentario)
        user_positions = []
        for pos in positions:
            if f"AI_Signal_{current_user.id}" in pos.get("comment", ""):
                user_positions.append(prepare_for_json(pos))
        
        response_data = {
            "positions": user_positions,
            "count": len(user_positions),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error getting positions: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting positions",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
