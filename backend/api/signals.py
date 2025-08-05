from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
import asyncio
import json
from datetime import datetime, timedelta
import logging

from database.models import User, Signal
from database.connection import get_database
from mt5.data_provider import MT5DataProvider
from ai.confluence_detector import ConfluenceDetector
from api.auth import get_current_user

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
        
        # Convertir ObjectId a string
        for signal in signals:
            signal["_id"] = str(signal["_id"])
            
        return signals
        
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
        
        return {
            "signals": signals,
            "count": len(signals)
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo señales: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/signals/analyze/{pair}")
async def analyze_pair(
    pair: str,
    timeframe: str = "H1",
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Analiza un par específico y genera señales"""
    try:
        # Verificar que MT5 esté conectado
        if not mt5_provider.connect():
            raise HTTPException(status_code=503, detail="Error conectando con MT5")
        
        # Obtener datos del par
        data = mt5_provider.get_realtime_data(pair, timeframe, 500)
        if data is None or data.empty:
            raise HTTPException(status_code=404, detail=f"No se pudieron obtener datos para {pair}")
        
        # Generar señales con IA
        signals = confluence_detector.detect_confluence_signals(data, timeframe)
        
        # Guardar señales en la base de datos
        saved_signals = []
        collection = db.trading_signals
        
        for signal in signals:
            signal_doc = {
                "user_id": current_user.id,
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
            signal_doc["_id"] = str(result.inserted_id)
            saved_signals.append(signal_doc)
        
        # Enviar actualización via WebSocket
        await manager.send_personal_message(
            json.dumps({
                "type": "new_signals",
                "pair": pair,
                "signals": saved_signals
            }),
            current_user.id
        )
        
        return {
            "pair": pair,
            "timeframe": timeframe,
            "signals": saved_signals,
            "analysis_time": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analizando par {pair}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/signals/pairs/")
async def get_available_pairs(current_user: User = Depends(get_current_user)):
    """Obtiene los pares disponibles en MT5"""
    try:
        if not mt5_provider.connect():
            raise HTTPException(status_code=503, detail="Error conectando con MT5")
        
        pairs = mt5_provider.get_available_pairs()
        return {"pairs": pairs}
        
    except Exception as e:
        logger.error(f"Error obteniendo pares: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        return {"message": "Configuración actualizada exitosamente"}
        
    except Exception as e:
        logger.error(f"Error actualizando configuración: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/signals/{signal_id}")
async def delete_signal(
    signal_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Elimina una señal específica"""
    try:
        from bson import ObjectId
        
        collection = db.trading_signals
        result = await collection.delete_one({
            "_id": ObjectId(signal_id),
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Señal no encontrada")
        
        return {"message": "Señal eliminada exitosamente"}
        
    except Exception as e:
        logger.error(f"Error eliminando señal: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        signal_doc["_id"] = str(result.inserted_id)
        saved_signals.append(signal_doc)
    
    await manager.send_personal_message(
        json.dumps({
            "type": "new_realtime_signals",
            "pair": pair,
            "signals": saved_signals
        }),
        user_id
    )

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
