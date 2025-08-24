from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse  # AGREGAR ESTA LÍNEA
from typing import List, Dict, Optional
import asyncio
import json
from datetime import datetime, timedelta
import logging
import numpy as np
from datetime import datetime
import pandas as pd
from database.user import User
from database.enums import Signal
from database.ai_settings import User, AnalysisConfig
from database.connection import get_database
from mt5.data_provider import MT5DataProvider
from ai.confluence_detector import ConfluenceDetector
from api.auth import get_current_user
from database.enums import SignalType
from bson import ObjectId
from fastapi import Body

router = APIRouter()
logger = logging.getLogger(__name__)

# Manejador de conexiones WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket
        logger.info(f"Usuario {user_id} conectado via WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        logger.info(f"Usuario {user_id} desconectado")
    
    async def send_personal_message(self, message: str, user_id: str):
        websocket = self.user_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error enviando mensaje a {user_id}: {e}")
    
    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error en broadcast: {e}")
                disconnected.append(connection)
        
        # Limpiar conexiones muertas
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

# Inicializar componentes
mt5_provider = MT5DataProvider()
confluence_detector = ConfluenceDetector()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        # Iniciar el análisis en tiempo real para este usuario
        await start_realtime_analysis(user_id)
        
        while True:
            # Mantener la conexión activa
            data = await websocket.receive_text()
            
            # Procesar comandos del cliente
            try:
                command = json.loads(data)
                await handle_websocket_command(command, user_id)
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    json.dumps({"error": "Formato de comando inválido"}), 
                    user_id
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"Error en websocket_endpoint: {e}")

async def get_recent_signals(user_id: str, pair: str = None) -> List[Dict]:
    """Obtiene señales recientes para un usuario"""
    try:
        db = await get_database()
        
        filter_dict = {"user_id": user_id}
        if pair:
            filter_dict["pair"] = pair
            
        signals = await db.trading_signals.find(filter_dict).sort("timestamp", -1).limit(20).to_list(length=20)
        
        # Convertir ObjectId a string usando la función mejorada
        cleaned_signals = []
        for signal in signals:
            cleaned_signal = prepare_for_json(signal)
            cleaned_signals.append(cleaned_signal)
            
        return cleaned_signals
        
    except Exception as e:
        logger.error(f"Error obteniendo señales recientes: {e}")
        return []

async def handle_websocket_command(command: Dict, user_id: str):
    """Maneja comandos recibidos via WebSocket"""
    command_type = command.get("type")
    
    if command_type == "subscribe_pair":
        pair = command.get("pair")
        timeframe = command.get("timeframe", "H1")
        await subscribe_to_pair(user_id, pair, timeframe)
        
    elif command_type == "unsubscribe_pair":
        pair = command.get("pair")
        await unsubscribe_from_pair(user_id, pair)
        
    elif command_type == "get_signals":
        pair = command.get("pair")
        signals = await get_recent_signals(user_id, pair)
        await manager.send_personal_message(
            json.dumps({
                "type": "signals_update",
                "pair": pair,
                "signals": signals
            }), 
            user_id
        )

# ENDPOINT CORREGIDO - Usa JSONResponse directamente
@router.get("/signals/")
async def get_signals(
    pair: Optional[str] = None,
    timeframe: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Obtiene las señales de trading"""
    try:
        collection = db.trading_signals
        
        # Construir filtro
        filter_dict = {"user_id": current_user.id}
        if pair:
            filter_dict["pair"] = pair
        if timeframe:
            filter_dict["timeframe"] = timeframe
            
        # Obtener señales
        signals = await collection.find(filter_dict).sort("timestamp", -1).limit(limit).to_list(length=limit)
        
        # Limpiar los datos ANTES de intentar serializarlos
        cleaned_signals = []
        for signal in signals:
            try:
                cleaned_signal = prepare_for_json(signal)
                cleaned_signals.append(cleaned_signal)
            except Exception as e:
                logger.warning(f"Error limpiando señal individual: {e}")
                continue
        
        # Crear respuesta limpia
        response_data = {
            "signals": cleaned_signals,
            "count": len(cleaned_signals),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Devolver JSONResponse directamente (esto evita que FastAPI intente serializar)
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Error obteniendo señales: {e}", exc_info=True)
        # También devolver error como JSONResponse
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error interno del servidor",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# FUNCIÓN PREPARE_FOR_JSON MEJORADA
def prepare_for_json(data):
    """
    Prepara datos para serialización JSON convirtiendo tipos especiales.
    VERSIÓN MEJORADA que maneja todos los casos edge.
    """
    if data is None:
        return None
    elif isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Convertir _id a id
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
        # Para objetos personalizados, convertir su __dict__
        try:
            return prepare_for_json(data.__dict__)
        except:
            return str(data)
    else:
        # Para cualquier otro tipo, intentar convertir a string como fallback
        try:
            # Verificar si es JSON serializable
            json.dumps(data)
            return data
        except (TypeError, ValueError):
            return str(data)

# Modificar solo el endpoint analyze_pair en signals.py
ALLOWED_TIMEFRAMES = {"M1","M5","M15","M30","H1","H4","D1","W1"}
ALIASES = {
    "1m":"M1","5m":"M5","15m":"M15","30m":"M30",
    "1h":"H1","h1":"H1","60m":"H1",
    "4h":"H4","h4":"H4",
    "1d":"D1","d1":"D1",
    "1w":"W1","w1":"W1",
}

def normalize_timeframe(tf: str) -> str:
    if not tf:
        return "H1"
    tf_clean = str(tf).strip()
    return ALIASES.get(tf_clean.lower(), tf_clean.upper())

def validate_timeframe(tf: str) -> str:
    tf_norm = normalize_timeframe(tf)
    if tf_norm not in ALLOWED_TIMEFRAMES:
        raise HTTPException(
            status_code=422,
            detail=f"Timeframe inválido: {tf}. Permitidos: {sorted(list(ALLOWED_TIMEFRAMES))}"
        )
    return tf_norm

def ensure_risk_fields(config):
    # Compatibilidad: si sólo llega risk_percentage desde el front, úsalo como risk_per_trade
    if getattr(config, "risk_per_trade", None) is None and getattr(config, "risk_percentage", None) is not None:
        config.risk_per_trade = config.risk_percentage
    return config
    class Config:
        json_encoders = {ObjectId: str}

@router.post("/signals/analyze/{pair}")
async def analyze_pair(
    pair: str,
    timeframe: str = "H1",
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    config: Optional[AnalysisConfig] = Body(default=None),  # viene en el body
):
    """
    Analiza un par usando el timeframe enviado en el body (config.timeframe).
    Si no se envía, usa 'H1' por defecto. Se valida y normaliza la temporalidad.
    """
    try:
        # Config por defecto si no llega
        if config is None:
            config = AnalysisConfig()
        # Compatibilidad de campos de riesgo
        config = ensure_risk_fields(config)

        # 1) Prioriza timeframe del body; 2) si no viene, usa el parámetro de la URL; 3) default H1
        effective_timeframe = validate_timeframe(getattr(config, "timeframe", None) or timeframe or "H1")

        logger.info(
            f"Analizando {pair} | timeframe={effective_timeframe} | confluencia={config.confluence_threshold}"
        )

        # Conectar con MT5
        if not mt5_provider.connect():
            raise HTTPException(status_code=503, detail="Error conectando con MT5")

        # Cargar datos con el timeframe efectivo
        data = mt5_provider.get_realtime_data(pair, effective_timeframe, 500)
        if data is None or data.empty:
            raise HTTPException(status_code=404, detail=f"No se pudieron obtener datos para {pair}")

        # Analizar con ConfluenceDetector usando el timeframe efectivo
        signal = await confluence_detector.analyze_symbol(pair, data, effective_timeframe, config)

        saved_signals = []
        collection = db.trading_signals

        # Config a devolver/guardar (siempre con TF normalizado)
        config_out = config.dict()
        config_out["timeframe"] = effective_timeframe

        if signal:
            # Convertir señal a diccionario
            signal_dict = {
                "symbol": signal.symbol,
                "timeframe": effective_timeframe,
                "signal_type": getattr(signal.signal_type, "value", str(signal.signal_type)),
                "entry_price": signal.entry_price,
                "stop_loss": signal.stop_loss,
                "take_profit": signal.take_profit,
                "confluence_score": signal.confluence_score,
                # Compatibilidad con gestión de riesgo usada
                "lot_size": getattr(config, "lot_size", None),
                "risk_per_trade": getattr(config, "risk_per_trade", None),
                "technical_analyses": [
                    {
                        "type": ta.type.value if hasattr(ta.type, "value") else str(ta.type),
                        "confidence": ta.confidence,
                        "data": prepare_for_json(ta.data),
                        "description": ta.description,
                    }
                    for ta in (signal.technical_analyses or [])
                ] if getattr(signal, "technical_analyses", None) else [],
            }

            # Documento para MongoDB
            signal_doc = {
                "user_id": current_user.id,
                **signal_dict,
                "timestamp": datetime.utcnow(),
                "status": "ACTIVE",
                "config_used": config_out,
            }

            # Insertar
            result = await collection.insert_one(signal_doc)
            signal_doc["_id"] = result.inserted_id

            # Preparar respuesta limpia
            cleaned_signal = prepare_for_json(signal_doc)
            saved_signals.append(cleaned_signal)

            # Notificar por WebSocket (best effort)
            try:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "new_signals",
                        "pair": pair,
                        "signals": saved_signals,
                        "config_used": config_out,
                    }),
                    current_user.id,
                )
            except Exception as ws_error:
                logger.warning(f"Error enviando WebSocket: {ws_error}")

        # Respuesta final (si no hubo señal, signals = [])
        response_data = {
            "pair": pair,
            "timeframe": effective_timeframe,  # ← SIEMPRE el TF efectivo
            "signals": saved_signals,
            "analysis_time": datetime.utcnow().isoformat(),
            "config_used": config_out,
        }

        return JSONResponse(content=response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analizando par {pair}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error analizando par",
                "detail": str(e),
                "pair": pair,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
@router.get("/signals/pairs/")
async def get_available_pairs(current_user: User = Depends(get_current_user)):
    """Obtiene los pares disponibles en MT5"""
    try:
        if not mt5_provider.connect():
            raise HTTPException(status_code=503, detail="Error conectando con MT5")
        
        pairs = mt5_provider.get_available_pairs()
        
        # Usar JSONResponse para consistencia
        return JSONResponse(content={"pairs": pairs})
        
    except Exception as e:
        logger.error(f"Error obteniendo pares: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error obteniendo pares",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.post("/signals/settings/")
async def update_signal_settings(
    settings: Dict,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Actualiza la configuración de señales del usuario"""
    try:
        collection = db.user_settings
        
        settings_doc = {
            "user_id": current_user.id,
            "signal_settings": settings,
            "updated_at": datetime.utcnow()
        }
        
        await collection.replace_one(
            {"user_id": current_user.id},
            settings_doc,
            upsert=True
        )
        
        return JSONResponse(content={"message": "Configuración actualizada exitosamente"})
        
    except Exception as e:
        logger.error(f"Error actualizando configuración: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error actualizando configuración",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.delete("/signals/{signal_id}")
async def delete_signal(
    signal_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Elimina una señal específica"""
    try:
        collection = db.trading_signals
        
        # Validar que signal_id es un ObjectId válido
        try:
            obj_id = ObjectId(signal_id)
        except Exception:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "ID de señal inválido",
                    "detail": f"'{signal_id}' no es un ObjectId válido"
                }
            )
        
        result = await collection.delete_one({
            "_id": obj_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Señal no encontrada",
                    "detail": f"No se encontró señal con ID {signal_id}"
                }
            )
        
        return JSONResponse(content={"message": "Señal eliminada exitosamente"})
        
    except Exception as e:
        logger.error(f"Error eliminando señal: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error eliminando señal",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# Funciones auxiliares para análisis en tiempo real
async def start_realtime_analysis(user_id: str):
    """Inicia el análisis en tiempo real para un usuario"""
    asyncio.create_task(realtime_analysis_loop(user_id))

async def realtime_analysis_loop(user_id: str):
    """Loop principal de análisis en tiempo real"""
    try:
        db = await get_database()
        
        while user_id in manager.user_connections:
            # Obtener configuración del usuario
            user_settings = await get_user_settings(user_id, db)
            
            if user_settings and user_settings.get("pairs_to_monitor"):
                for pair_config in user_settings["pairs_to_monitor"]:
                    pair = pair_config.get("pair")
                    timeframe = pair_config.get("timeframe", "H1")
                    
                    try:
                        await analyze_pair_realtime(user_id, pair, timeframe, db)
                    except Exception as e:
                        logger.error(f"Error analizando par en tiempo real {pair}: {e}")
            
            await asyncio.sleep(30)  # Espera antes de siguiente análisis
            
    except Exception as e:
        logger.error(f"Error en realtime_analysis_loop: {e}")

async def analyze_pair_realtime(user_id: str, pair: str, timeframe: str, db):
    """Analiza un par en tiempo real y envía señales por WebSocket"""
    if not mt5_provider.connect():
        logger.error("MT5 no conectado para análisis en tiempo real")
        return
    
    data = mt5_provider.get_realtime_data(pair, timeframe, 200)
    if data is None or data.empty:
        logger.warning(f"No se pudieron obtener datos para {pair} en tiempo real")
        return
    
    signals = confluence_detector.detect_confluence_signals(data, timeframe)
    
    if not signals:
        return
    
    collection = db.trading_signals
    
    saved_signals = []
    for signal in signals:
        signal_doc = {
            "user_id": user_id,
            "pair": pair,
            "timeframe": timeframe,
            "signal_type": signal.signal_type,
            "direction": signal.direction,
            "confidence": signal.confidence,
            "entry_price": signal.entry_price,
            "stop_loss": signal.stop_loss,
            "take_profit": signal.take_profit,
            "confluences": [conf.to_dict() for conf in signal.confluences],
            "timestamp": datetime.utcnow(),
            "status": "ACTIVE"
        }
        result = await collection.insert_one(signal_doc)
        signal_doc["_id"] = result.inserted_id
        
        # Limpiar ObjectId antes de enviar por WebSocket
        cleaned_signal = prepare_for_json(signal_doc)
        saved_signals.append(cleaned_signal)
    
    # Enviar por WebSocket
    try:
        await manager.send_personal_message(
            json.dumps({
                "type": "new_realtime_signals",
                "pair": pair,
                "signals": saved_signals
            }),
            user_id
        )
    except Exception as ws_error:
        logger.warning(f"Error enviando WebSocket en tiempo real: {ws_error}")

async def get_user_settings(user_id: str, db):
    """Obtiene la configuración del usuario"""
    try:
        collection = db.user_settings
        settings = await collection.find_one({"user_id": user_id})
        return settings.get("signal_settings") if settings else None
    except Exception as e:
        logger.error(f"Error obteniendo configuración de usuario {user_id}: {e}")
        return None

async def subscribe_to_pair(user_id: str, pair: str, timeframe: str):
    """Suscribe al usuario a un par y timeframe"""
    # Aquí podrías guardar la suscripción en la DB o en memoria
    logger.info(f"Usuario {user_id} suscrito a {pair} {timeframe}")

async def unsubscribe_from_pair(user_id: str, pair: str):
    """Desuscribe al usuario de un par"""
    logger.info(f"Usuario {user_id} desuscrito de {pair}")