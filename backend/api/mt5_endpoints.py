from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Callable, Tuple
from datetime import datetime, timedelta
import logging
import json
import numpy as np
import pandas as pd
from bson import ObjectId
import asyncio
from database.models import AISettingsRequest, AISettings, AISettingsResponse, AISettingsValidation
# Intentar usar el paquete oficial de MetaTrader5 si está instalado
try:
    import MetaTrader5 as mt5  # type: ignore
except Exception:
    mt5 = None  # noqa: N816

# Modelos y dependencias del proyecto
from database.models import User, MT5Session, PyObjectId, MT5Profile
from database.connection import get_database
from api.auth import get_current_user

# Proveedor de datos MT5 (ajusta los métodos según tu wrapper)
from mt5.data_provider import MT5DataProvider

router = APIRouter()
logger = logging.getLogger(__name__)

# Inicializar MT5 provider
mt5_provider = MT5DataProvider()

# ------------------------
# Helpers comunes
# ------------------------
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
    elif hasattr(data, "__dict__"):
        try:
            return prepare_for_json(data.__dict__)
        except Exception:
            return str(data)
    else:
        try:
            json.dumps(data)
            return data
        except (TypeError, ValueError):
            return str(data)


def _normalize_account_type(value: Optional[str]) -> str:
    if not value:
        return "real"
    v = str(value).strip().lower()
    if v in {"real", "live"}:
        return "real"
    if v in {"demo", "paper", "practice"}:
        return "demo"
    return "real"


def _obj_to_account_dict(src: Any) -> Dict[str, Any]:
    """Convierte dict/objeto en un dict con claves normalizadas de cuenta."""
    def pick(obj: Any, key: str, default=None):
        if obj is None:
            return default
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    info: Dict[str, Any] = {
        "login": pick(src, "login") or pick(src, "Login"),
        "name": pick(src, "name") or pick(src, "Name"),
        "server": pick(src, "server") or pick(src, "Server"),
        "currency": pick(src, "currency") or pick(src, "Currency"),
        "leverage": pick(src, "leverage") or pick(src, "Leverage"),
        "balance": pick(src, "balance") or pick(src, "Balance"),
        "equity": pick(src, "equity") or pick(src, "Equity"),
        "margin": pick(src, "margin") or pick(src, "Margin"),
        "margin_free": pick(src, "margin_free") or pick(src, "MarginFree") or pick(src, "free_margin"),
        "margin_level": pick(src, "margin_level") or pick(src, "MarginLevel") or pick(src, "margin_level_perc"),
    }

    # Normalizaciones de tipo
    if info["login"] is not None:
        info["login"] = str(info["login"])
    if info["leverage"] is not None:
        try:
            info["leverage"] = int(info["leverage"])
        except Exception:
            pass
    for k in ["balance", "equity", "margin", "margin_free", "margin_level"]:
        if info.get(k) is not None:
            try:
                info[k] = float(info[k])
            except Exception:
                pass

    return info


def _symbol_info_to_dict(symbol_info: Any) -> Dict[str, Any]:
    if symbol_info is None:
        return {}
    if isinstance(symbol_info, dict):
        return symbol_info
    out = {}
    for key in ["digits", "point", "spread", "description", "trade_mode"]:
        out[key] = getattr(symbol_info, key, None)
    return out


async def _get_account_info_safe(retries: int = 0, delay_ms: int = 0) -> Dict[str, Any]:
    """
    Intenta obtener y normalizar la información de la cuenta probando distintas rutas.
    """
    def _first_truthy(d: Dict[str, Any], keys: List[str]) -> Optional[Any]:
        for k in keys:
            val = d.get(k)
            if val is not None:
                return val
        return None

    def _get_account_info_raw_with_logs():
        candidates: List[tuple[str, Callable[[], Any]]] = []
        # 1) Métodos comunes en wrappers
        if hasattr(mt5_provider, "get_account_info"):
            candidates.append(("mt5_provider.get_account_info()", lambda: mt5_provider.get_account_info()))
        if hasattr(mt5_provider, "account_info"):
            acc = getattr(mt5_provider, "account_info")
            if callable(acc):
                candidates.append(("mt5_provider.account_info()", lambda: acc()))
            else:
                candidates.append(("mt5_provider.account_info_property", lambda: acc))
        if hasattr(mt5_provider, "get_account_summary"):
            candidates.append(("mt5_provider.get_account_summary()", lambda: mt5_provider.get_account_summary()))
        if hasattr(mt5_provider, "account_summary"):
            accs = getattr(mt5_provider, "account_summary")
            if callable(accs):
                candidates.append(("mt5_provider.account_summary()", lambda: accs()))
            else:
                candidates.append(("mt5_provider.account_summary_property", lambda: accs))
        # 2) Paquete oficial MetaTrader5
        if mt5 is not None and hasattr(mt5, "account_info"):
            candidates.append(("MetaTrader5.account_info()", lambda: mt5.account_info()))

        for name, fn in candidates:
            try:
                obj = fn()
                if obj:
                    logger.info(f"[MT5 Account] Obtenido por ruta: {name}")
                    return obj, name
                else:
                    logger.debug(f"[MT5 Account] Ruta {name} devolvió vacío/None")
            except Exception as e:
                logger.warning(f"[MT5 Account] Falló {name}: {e}")

        return None, "none"

    attempt = 0
    last_route = "none"
    info: Dict[str, Any] = {}
    while True:
        raw, route = _get_account_info_raw_with_logs()
        last_route = route
        info = _obj_to_account_dict(raw)

        if any(info.get(k) is not None for k in ["balance", "equity", "currency", "login"]):
            if info.get("server") is None:
                try:
                    if hasattr(mt5_provider, "get_server") and callable(getattr(mt5_provider, "get_server")):
                        info["server"] = mt5_provider.get_server()
                except Exception:
                    pass
            logger.info(
                f"[MT5 Account] Info por '{last_route}': "
                f"{json.dumps({k: v for k, v in info.items() if k in ['login','currency','balance','equity','leverage']}, default=str)}"
            )
            return info

        # "tocar" el proveedor y reintentar
        try:
            if hasattr(mt5_provider, "get_symbol_info"):
                mt5_provider.get_symbol_info("EURUSD")
            elif hasattr(mt5_provider, "connect"):
                mt5_provider.connect()  # sin kwargs
        except Exception as e:
            logger.debug(f"[MT5 Account] Touch provider failed: {e}")

        attempt += 1
        if attempt > retries:
            logger.warning(f"[MT5 Account] Sin info de cuenta tras {attempt} intento(s). Última ruta: {last_route}")
            return info

        if delay_ms > 0:
            await asyncio.sleep(delay_ms / 1000.0)


def _disconnect_safe() -> bool:
    try:
        if hasattr(mt5_provider, "disconnect"):
            return bool(mt5_provider.disconnect())
        if hasattr(mt5_provider, "shutdown"):
            return bool(mt5_provider.shutdown())
    except Exception as e:
        logger.warning(f"MT5 disconnect failed: {e}")
    return False


def _is_connected_safe() -> bool:
    try:
        if hasattr(mt5_provider, "is_connected"):
            return bool(mt5_provider.is_connected())
        # fallback best-effort
        if hasattr(mt5_provider, "connect"):
            return bool(mt5_provider.connect())
    except Exception:
        return False
    return False


async def _get_or_create_mt5_session(user_id: str, db) -> Optional[Dict[str, Any]]:
    """Obtiene o crea una sesión MT5 para el usuario"""
    # Buscar sesión existente
    session_doc = await db.mt5_sessions.find_one({"user_id": user_id})
    
    if session_doc:
        # Verificar si la sesión no ha expirado
        if session_doc.get("expires_at") and session_doc["expires_at"] > datetime.utcnow():
            # Actualizar last_activity
            await db.mt5_sessions.update_one(
                {"_id": session_doc["_id"]},
                {"$set": {"last_activity": datetime.utcnow()}}
            )
            return session_doc
        else:
            # Sesión expirada, marcar como desconectada
            await db.mt5_sessions.update_one(
                {"_id": session_doc["_id"]},
                {"$set": {
                    "is_connected": False,
                    "updated_at": datetime.utcnow()
                }}
            )
    
    return None


async def _update_mt5_session(user_id: str, db, session_data: Dict[str, Any]) -> None:
    """Actualiza o crea la sesión MT5 del usuario"""
    now = datetime.utcnow()
    
    # Datos de la sesión
    session_doc = {
        "user_id": user_id,
        "is_connected": session_data.get("is_connected", False),
        "connected_at": session_data.get("connected_at", now),
        "account_type": session_data.get("account_type"),
        "server": session_data.get("server"),
        "login": session_data.get("login"),
        "account_info": session_data.get("account_info"),
        "expires_at": now + timedelta(hours=24),  # Sesión válida por 24 horas
        "updated_at": now,
        "last_activity": now
    }
    
    # Actualizar o insertar
    await db.mt5_sessions.update_one(
        {"user_id": user_id},
        {
            "$set": session_doc,
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )

class ProfileResponse(BaseModel):
    exists: bool
    profile: Optional[Dict[str, Any]] = None
    timestamp: str

# ------------------------
# Modelos Pydantic
# ------------------------
class ConnectRequest(BaseModel):
    login: Optional[str] = Field(None, description="Número de cuenta MT5 (string o int)")
    password: Optional[str] = Field(None, description="Password de la cuenta MT5")
    server: Optional[str] = Field(None, description="Nombre del servidor (ej: 'Broker-Demo')")
    account_type: Optional[str] = Field("real", description="Tipo de cuenta: 'real' o 'demo'")
    remember: Optional[bool] = Field(False, description="Guardar perfil (sin contraseña) en DB")
    ai_settings: Optional[Dict[str, Any]] = None

class ConnectResponse(BaseModel):
    connected: bool
    account_type: Optional[str] = None
    login: Optional[str] = None
    server: Optional[str] = None
    account_id: Optional[str] = None
    name: Optional[str] = None
    currency: Optional[str] = None
    leverage: Optional[int] = None
    balance: Optional[float] = None
    equity: Optional[float] = None
    margin: Optional[float] = None
    margin_free: Optional[float] = None
    margin_level: Optional[float] = None
    timestamp: str
    message: Optional[str] = None


class DisconnectResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    timestamp: str


class StatusResponse(BaseModel):
    connected: bool
    account_type: Optional[str] = None
    server: Optional[str] = None
    login: Optional[str] = None
    timestamp: str


class Profile(BaseModel):
    login: Optional[str] = None
    server: Optional[str] = None
    account_type: Optional[str] = "real"
    updated_at: Optional[str] = None
    ai_settings: Optional[Dict[str, Any]] = None

class ProfileResponse(BaseModel):
    exists: bool
    profile: Optional[Profile] = None
    timestamp: str

# ENDPOINTS DE CONFIGURACIÓN DE IA
# ------------------------

@router.post("/ai-settings/save", response_model=AISettingsResponse)
async def save_ai_settings(
    ai_settings_data: AISettingsRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Guarda la configuración de IA específica del usuario
    """
    try:
        user_id = str(current_user.id)
        
        # Validar la configuración antes de guardar
        validation = validate_ai_settings(ai_settings_data)
        if not validation.is_valid:
            return JSONResponse(
                status_code=400,
                content=AISettingsResponse(
                    success=False,
                    message=f"Error de validación: {', '.join(validation.errors)}",
                    timestamp=datetime.utcnow().isoformat()
                ).model_dump()
            )
        
        # Preparar datos adicionales del frontend
        frontend_config = {
            "analysisTimeframe": ai_settings_data.analysisTimeframe,
            "enabledAnalyses": ai_settings_data.enabledAnalyses,
            "selectedExecutionType": ai_settings_data.selectedExecutionType,
            "selectedStrategy": ai_settings_data.selectedStrategy,
            "selectedTradingStrategy": ai_settings_data.selectedTradingStrategy,
        }
        
        # Crear documento de configuración
        now = datetime.utcnow()
        ai_settings_doc = {
            "user_id": user_id,
            "timeframe": ai_settings_data.timeframe,
            "confluence_threshold": ai_settings_data.confluence_threshold,
            "risk_per_trade": ai_settings_data.risk_per_trade,
            "lot_size": ai_settings_data.lot_size,
            "atr_multiplier_sl": ai_settings_data.atr_multiplier_sl,
            "risk_reward_ratio": ai_settings_data.risk_reward_ratio,
            
            # Análisis habilitados
            "enable_elliott_wave": ai_settings_data.enable_elliott_wave,
            "enable_fibonacci": ai_settings_data.enable_fibonacci,
            "enable_chart_patterns": ai_settings_data.enable_chart_patterns,
            "enable_support_resistance": ai_settings_data.enable_support_resistance,
            
            # Pesos de análisis
            "elliott_wave_weight": ai_settings_data.elliott_wave_weight,
            "fibonacci_weight": ai_settings_data.fibonacci_weight,
            "chart_patterns_weight": ai_settings_data.chart_patterns_weight,
            "support_resistance_weight": ai_settings_data.support_resistance_weight,
            
            # Configuración de ejecución
            "execution_type": ai_settings_data.execution_type,
            "allowed_execution_types": ai_settings_data.allowed_execution_types,
            
            # Tipos de trader y estrategias
            "trader_type": ai_settings_data.trader_type,
            "trading_strategy": ai_settings_data.trading_strategy,
            "trader_timeframes": ai_settings_data.trader_timeframes,
            "strategy_timeframes": ai_settings_data.strategy_timeframes,
            
            # Configuración avanzada
            "combined_timeframes": ai_settings_data.combined_timeframes,
            "custom_weights": ai_settings_data.custom_weights,
            "risk_management_locked": ai_settings_data.risk_management_locked,
            
            # Configuración del frontend
            "frontend_config": frontend_config,
            
            # Metadatos
            "updated_at": now
        }
        
        # Actualizar o crear configuración
        result = await db.ai_settings.update_one(
            {"user_id": user_id},
            {
                "$set": ai_settings_doc,
                "$setOnInsert": {"created_at": now}
            },
            upsert=True
        )
        
        # Preparar respuesta
        response_data = prepare_for_json(ai_settings_doc)
        
        logger.info(f"✅ AI settings saved for user {user_id}")
        
        return JSONResponse(
            content=AISettingsResponse(
                success=True,
                ai_settings=response_data,
                message="Configuración de IA guardada correctamente",
                timestamp=now.isoformat()
            ).model_dump()
        )
        
    except Exception as e:
        logger.error(f"❌ Error saving AI settings for user {current_user.id}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content=AISettingsResponse(
                success=False,
                message=f"Error interno del servidor: {str(e)}",
                timestamp=datetime.utcnow().isoformat()
            ).model_dump()
        )


@router.get("/ai-settings/load", response_model=AISettingsResponse)
async def load_ai_settings(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Carga la configuración de IA específica del usuario
    """
    try:
        user_id = str(current_user.id)
        
        # Buscar configuración existente
        ai_settings_doc = await db.ai_settings.find_one({"user_id": user_id})
        
        if not ai_settings_doc:
            # Si no existe, devolver configuración por defecto
            default_settings = get_default_ai_settings()
            
            return JSONResponse(
                content=AISettingsResponse(
                    success=True,
                    ai_settings=default_settings,
                    message="Configuración por defecto cargada (no se encontró configuración guardada)",
                    timestamp=datetime.utcnow().isoformat()
                ).model_dump()
            )
        
        # Preparar datos para respuesta
        response_data = prepare_for_json(ai_settings_doc)
        
        logger.info(f"✅ AI settings loaded for user {user_id}")
        
        return JSONResponse(
            content=AISettingsResponse(
                success=True,
                ai_settings=response_data,
                message="Configuración de IA cargada correctamente",
                timestamp=datetime.utcnow().isoformat()
            ).model_dump()
        )
        
    except Exception as e:
        logger.error(f"❌ Error loading AI settings for user {current_user.id}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content=AISettingsResponse(
                success=False,
                message=f"Error interno del servidor: {str(e)}",
                timestamp=datetime.utcnow().isoformat()
            ).model_dump()
        )


@router.delete("/ai-settings/reset", response_model=AISettingsResponse)
async def reset_ai_settings(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Resetea la configuración de IA a valores por defecto
    """
    try:
        user_id = str(current_user.id)
        
        # Eliminar configuración existente
        await db.ai_settings.delete_one({"user_id": user_id})
        
        # Obtener configuración por defecto
        default_settings = get_default_ai_settings()
        
        logger.info(f"✅ AI settings reset for user {user_id}")
        
        return JSONResponse(
            content=AISettingsResponse(
                success=True,
                ai_settings=default_settings,
                message="Configuración de IA reseteada a valores por defecto",
                timestamp=datetime.utcnow().isoformat()
            ).model_dump()
        )
        
    except Exception as e:
        logger.error(f"❌ Error resetting AI settings for user {current_user.id}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content=AISettingsResponse(
                success=False,
                message=f"Error interno del servidor: {str(e)}",
                timestamp=datetime.utcnow().isoformat()
            ).model_dump()
        )


# ------------------------
# FUNCIONES AUXILIARES
# ------------------------

def validate_ai_settings(ai_settings: AISettingsRequest) -> AISettingsValidation:
    """
    Valida la configuración de IA antes de guardar
    """
    errors = []
    
    try:
        # Validar confluence_threshold
        if not 0 <= ai_settings.confluence_threshold <= 1:
            errors.append("El umbral de confluencia debe estar entre 0 y 1")
        
        # Validar risk_per_trade
        if not 0.1 <= ai_settings.risk_per_trade <= 10:
            errors.append("El riesgo por operación debe estar entre 0.1% y 10%")
        
        # Validar lot_size
        if ai_settings.lot_size <= 0:
            errors.append("El tamaño del lote debe ser mayor a 0")
        
        # Validar ATR multiplier
        if ai_settings.atr_multiplier_sl <= 0:
            errors.append("El multiplicador ATR debe ser mayor a 0")
        
        # Validar risk reward ratio
        if ai_settings.risk_reward_ratio <= 0:
            errors.append("La relación riesgo/beneficio debe ser mayor a 0")
        
        # Validar pesos (deben sumar aproximadamente 1.0)
        total_weight = (
            ai_settings.elliott_wave_weight +
            ai_settings.fibonacci_weight +
            ai_settings.chart_patterns_weight +
            ai_settings.support_resistance_weight
        )
        
        if abs(total_weight - 1.0) > 0.01:
            errors.append("Los pesos de análisis deben sumar 1.0 (100%)")
        
        # Validar que cada peso esté entre 0 y 1
        weights = [
            ai_settings.elliott_wave_weight,
            ai_settings.fibonacci_weight,
            ai_settings.chart_patterns_weight,
            ai_settings.support_resistance_weight
        ]
        
        for i, weight in enumerate(weights):
            if not 0 <= weight <= 1:
                weight_names = ["Elliott Wave", "Fibonacci", "Chart Patterns", "Support/Resistance"]
                errors.append(f"El peso de {weight_names[i]} debe estar entre 0 y 1")
        
        # Validar timeframes
        valid_timeframes = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"]
        if ai_settings.timeframe not in valid_timeframes:
            errors.append(f"Timeframe inválido. Debe ser uno de: {', '.join(valid_timeframes)}")
        
        # Validar execution_type
        valid_execution_types = ["market", "limit", "stop"]
        if ai_settings.execution_type not in valid_execution_types:
            errors.append(f"Tipo de ejecución inválido. Debe ser uno de: {', '.join(valid_execution_types)}")
        
    except Exception as e:
        errors.append(f"Error durante la validación: {str(e)}")
    
    return AISettingsValidation(
        is_valid=len(errors) == 0,
        errors=errors
    )


def get_default_ai_settings() -> Dict[str, Any]:
    """
    Obtiene la configuración por defecto de IA
    """
    return {
        # Configuración básica
        "timeframe": "H1",
        "confluence_threshold": 0.6,
        "risk_per_trade": 2.0,
        "lot_size": 0.1,
        "atr_multiplier_sl": 2.0,
        "risk_reward_ratio": 2.0,
        
        # Análisis habilitados
        "enable_elliott_wave": True,
        "enable_fibonacci": True,
        "enable_chart_patterns": True,
        "enable_support_resistance": True,
        
        # Pesos de análisis
        "elliott_wave_weight": 0.25,
        "fibonacci_weight": 0.25,
        "chart_patterns_weight": 0.25,
        "support_resistance_weight": 0.25,
        
        # Configuración de ejecución
        "execution_type": "market",
        "allowed_execution_types": ["market"],
        
        # Tipos de trader y estrategias
        "trader_type": None,
        "trading_strategy": None,
        "trader_timeframes": ["H1"],
        "strategy_timeframes": ["H1"],
        
        # Configuración avanzada
        "combined_timeframes": [],
        "custom_weights": {},
        "risk_management_locked": False,
        
        # Configuración del frontend
        "frontend_config": {
            "analysisTimeframe": "H1",
            "enabledAnalyses": ["elliott_wave", "fibonacci", "chart_patterns", "support_resistance"],
            "selectedExecutionType": "market",
            "selectedStrategy": None,
            "selectedTradingStrategy": None,
        }
    }
# ------------------------
# Endpoints NUEVOS de Perfil y Conexión
# ------------------------
@router.post("/connect", response_model=ConnectResponse)
async def connect_mt5(body: ConnectRequest, current_user: User = Depends(get_current_user), db=Depends(get_database)):
    """
    Conecta/inicia sesión a una cuenta MT5 (demo o real) y devuelve info de cuenta.
    Si remember=True, guarda el perfil (sin contraseña) en DB para auto reconectar luego.
    """
    user_id = str(current_user.id)
    account_type = _normalize_account_type(body.account_type)

    ok = False
    try:
        if hasattr(mt5_provider, "login") and body.login and body.password and body.server:
            ok = bool(mt5_provider.login(login=str(body.login), password=body.password, server=body.server))
        elif hasattr(mt5_provider, "initialize"):
            ok = bool(mt5_provider.initialize())
        elif hasattr(mt5_provider, "connect"):
            ok = bool(mt5_provider.connect())
    except Exception as e:
        logger.warning(f"[MT5 Connect] Error conectando: {e}")
        ok = False

    if not ok and hasattr(mt5_provider, "connect"):
        try:
            ok = bool(mt5_provider.connect())
        except Exception as e:
            logger.warning(f"[MT5 Connect] Retry connect failed: {e}")
            ok = False

    if not ok:
        return JSONResponse(
            status_code=503,
            content=ConnectResponse(
                connected=False,
                account_type=account_type,
                login=str(body.login) if body.login else None,
                server=body.server,
                timestamp=datetime.utcnow().isoformat(),
                message="Cannot connect/login to MetaTrader 5",
            ).model_dump()
        )

    # Obtener información de la cuenta
    info = await _get_account_info_safe(retries=5, delay_ms=200)

    # Guardar sesión en la base de datos
    session_data = {
        "is_connected": True,
        "connected_at": datetime.utcnow(),
        "account_type": account_type,
        "server": info.get("server") or body.server,
        "login": info.get("login") or (str(body.login) if body.login else None),
        "account_info": info
    }
    
    await _update_mt5_session(user_id, db, session_data)

    # Guardar perfil en DB si remember
    if body.remember:
        profile_doc = {
            "user_id": user_id,
            "login": str(body.login) if body.login else None,
            "server": body.server,
            "account_type": account_type,
            "ai_settings": body.ai_settings or {}, 
            "updated_at": datetime.utcnow(),
        }
        await db.mt5_profiles.update_one({"user_id": user_id}, {"$set": profile_doc}, upsert=True)

    resp = ConnectResponse(
        connected=True,
        account_type=account_type,
        login=info.get("login") or (str(body.login) if body.login else None),
        server=info.get("server") or body.server,
        account_id=info.get("login") or (str(body.login) if body.login else None),
        name=info.get("name"),
        currency=info.get("currency"),
        leverage=info.get("leverage"),
        balance=info.get("balance"),
        equity=info.get("equity"),
        margin=info.get("margin"),
        margin_free=info.get("margin_free"),
        margin_level=info.get("margin_level"),
        timestamp=datetime.utcnow().isoformat(),
        message="Connected to MT5 successfully",
    )
    return JSONResponse(content=resp.model_dump())


@router.post("/autoconnect", response_model=StatusResponse)
async def autoconnect_mt5(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    """
    Intenta reconectar usando el terminal sin pedir contraseña (connect() sin kwargs).
    Útil en arranque o cuando el usuario habilita auto-reconexión.
    """
    user_id = str(current_user.id)
    profile = await db.mt5_profiles.find_one({"user_id": user_id})

    ok = False
    try:
        if hasattr(mt5_provider, "connect"):
            ok = bool(mt5_provider.connect())
        elif hasattr(mt5_provider, "initialize"):
            ok = bool(mt5_provider.initialize())
    except Exception as e:
        logger.warning(f"[MT5 AutoConnect] Error: {e}")
        ok = False

    if ok:
        # Actualizar sesión en la base de datos
        session_data = {
            "is_connected": True,
            "connected_at": datetime.utcnow(),
            "account_type": profile.get("account_type", "real") if profile else "real",
            "server": profile.get("server") if profile else None,
            "login": str(profile.get("login")) if profile and profile.get("login") else None,
            "account_info": {}
        }
        await _update_mt5_session(user_id, db, session_data)

    return JSONResponse(
        content=StatusResponse(
            connected=ok,
            account_type=(profile.get("account_type") if profile else None),
            server=(profile.get("server") if profile else None),
            login=(str(profile.get("login")) if profile and profile.get("login") else None),
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump()
    )


@router.get("/account", response_model=ConnectResponse)
async def get_account(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    user_id = str(current_user.id)
    session = await _get_or_create_mt5_session(user_id, db)
    profile = await db.mt5_profiles.find_one({"user_id": user_id})

    # 🚨 Si no hay sesión -> devolver conectado=false
    if not session:
        return JSONResponse(
            content=ConnectResponse(
                connected=False,
                account_type=profile.get("account_type") if profile else None,
                login=str(profile.get("login")) if profile and profile.get("login") else None,
                server=profile.get("server") if profile else None,
                timestamp=datetime.utcnow().isoformat(),
                message="Not connected to MT5",
            ).model_dump()
        )

    connected = _is_connected_safe()
    if not connected:
        await db.mt5_sessions.update_one(
            {"user_id": user_id},
            {"$set": {"is_connected": False, "updated_at": datetime.utcnow()}}
        )
        return JSONResponse(
            content=ConnectResponse(
                connected=False,
                account_type=session.get("account_type"),
                login=session.get("login"),
                server=session.get("server"),
                timestamp=datetime.utcnow().isoformat(),
                message="Session found but not connected",
            ).model_dump()
        )

    # 🚀 Si conectado, obtener info
    info = await _get_account_info_safe(retries=2, delay_ms=150)

    resp = ConnectResponse(
        connected=True,
        account_type=session.get("account_type"),
        login=info.get("login") or session.get("login"),
        server=info.get("server") or session.get("server"),
        account_id=info.get("login") or session.get("login"),
        name=info.get("name"),
        currency=info.get("currency"),
        leverage=info.get("leverage"),
        balance=info.get("balance"),
        equity=info.get("equity"),
        margin=info.get("margin"),
        margin_free=info.get("margin_free"),
        margin_level=info.get("margin_level"),
        timestamp=datetime.utcnow().isoformat(),
        message="Account info retrieved",
    )
    return JSONResponse(content=resp.model_dump())



@router.post("/disconnect", response_model=DisconnectResponse)
async def disconnect_mt5(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    """
    Cierra la conexión con MT5 y ELIMINA la sesión del usuario.
    """
    user_id = str(current_user.id)

    ok = _disconnect_safe()
    
    # 🚨 Eliminar por completo la sesión de este usuario
    await db.mt5_sessions.delete_one({"user_id": user_id})

    if not ok:
        return JSONResponse(
            status_code=200,
            content=DisconnectResponse(
                success=False,
                message="Already disconnected or could not disconnect cleanly",
                timestamp=datetime.utcnow().isoformat(),
            ).model_dump()
        )

    return JSONResponse(
        content=DisconnectResponse(
            success=True,
            message="Disconnected from MT5 successfully and session removed",
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump()
    )


@router.get("/status", response_model=StatusResponse)
async def mt5_status(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    """
    Devuelve si hay conexión activa a MT5 para el usuario.
    """
    user_id = str(current_user.id)
    connected = _is_connected_safe()
    
    # Obtener datos de sesión y perfil
    session = await db.mt5_sessions.find_one({"user_id": user_id})
    profile = await db.mt5_profiles.find_one({"user_id": user_id})
    
    # Actualizar estado de conexión en sesión si existe
    if session:
        await db.mt5_sessions.update_one(
            {"_id": session["_id"]},
            {"$set": {
                "is_connected": connected,
                "last_activity": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )

    return JSONResponse(
        content=StatusResponse(
            connected=connected,
            account_type=(session.get("account_type") if session else profile.get("account_type") if profile else None),
            server=(session.get("server") if session else profile.get("server") if profile else None),
            login=(session.get("login") if session else str(profile.get("login")) if profile and profile.get("login") else None),
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump()
    )


# Perfil: guardar/obtener/eliminar (sin contraseña)
@router.post("/profile/save", response_model=ProfileResponse)
async def save_profile(body: Profile, current_user: User = Depends(get_current_user), db=Depends(get_database)):
    user_id = str(current_user.id)  # 🔹 viene del token, no del body
    doc = {
        "user_id": user_id,
        "login": body.login,
        "server": body.server,
        "account_type": _normalize_account_type(body.account_type or "real"),
        "ai_settings": body.ai_settings or {},
        "updated_at": datetime.utcnow(),
    }
    await db.mt5_profiles.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return JSONResponse(
        content=ProfileResponse(
            exists=True,
            profile=Profile(**{**doc, "updated_at": doc["updated_at"].isoformat()}),
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump()
    )


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    user_id = str(current_user.id)
    doc = await db.mt5_profiles.find_one({"user_id": user_id})

    if not doc:
        return ProfileResponse(exists=False, profile=None, timestamp=datetime.utcnow().isoformat())

    profile = MT5Profile(
        login=str(doc.get("login")) if doc.get("login") else None,
        server=doc.get("server"),
        account_type=doc.get("account_type") or "real",
        risk_config=doc.get("risk_config") or {},
        ai_config=doc.get("ai_config") or {},
        updated_at=doc.get("updated_at"),
        user_id=user_id,
    )

    return ProfileResponse(
        exists=True,
        profile=profile,
        timestamp=datetime.utcnow().isoformat(),
    )


@router.delete("/profile", response_model=ProfileResponse)
async def delete_profile(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    """
    Elimina el perfil guardado y también cualquier sesión MT5 activa del usuario.
    """
    user_id = str(current_user.id)

    # 🚨 Eliminar perfil
    await db.mt5_profiles.delete_one({"user_id": user_id})

    # 🚨 Eliminar sesión activa si existe
    await db.mt5_sessions.delete_one({"user_id": user_id})

    return JSONResponse(
        content=ProfileResponse(
            exists=False,
            profile=None,
            timestamp=datetime.utcnow().isoformat()
        ).model_dump()
    )

# ------------------------
# Endpoints EXISTENTES (data, price, execute, orders, positions)
# ------------------------
@router.post("/data")
async def get_mt5_data(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene datos históricos reales de MT5
    """
    try:
        symbol = request_data.get("symbol")
        timeframe = request_data.get("timeframe", "H1")
        count = int(request_data.get("count", 100))

        if not symbol:
            return JSONResponse(
                status_code=400,
                content={"error": "Symbol is required"}
            )

        # Conectar a MT5 si no está conectado
        if not _is_connected_safe():
            if not hasattr(mt5_provider, "connect") or not mt5_provider.connect():
                logger.error("Failed to connect to MT5")
                return JSONResponse(
                    status_code=503,
                    content={"error": "Cannot connect to MetaTrader 5"}
                )

        # Obtener datos históricos
        data = mt5_provider.get_realtime_data(symbol, timeframe, count)

        if data is None or getattr(data, "empty", True):
            return JSONResponse(
                status_code=404,
                content={"error": f"No data available for {symbol}"}
            )

        # Mapear nombres de columnas comunes de MT5
        column_mapping = {
            # Estándar MT5
            "open": "open",
            "high": "high",
            "low": "low",
            "close": "close",
            "tick_volume": "volume",
            "real_volume": "volume",
            "spread": "spread",
            # Variantes comunes
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
            "TickVolume": "volume",
            "RealVolume": "volume",
            # Otros formatos
            "o": "open",
            "h": "high",
            "l": "low",
            "c": "close",
            "v": "volume",
        }

        available_columns = list(data.columns)
        mapped_columns: Dict[str, str] = {}

        # Identificar columnas disponibles (case-insensitive)
        lowered = {c.lower(): c for c in available_columns}
        for k, v in column_mapping.items():
            if k in available_columns:
                mapped_columns[v] = k
            elif k.lower() in lowered:
                mapped_columns[v] = lowered[k.lower()]

        # Verificar columnas mínimas
        required_columns = ["open", "high", "low", "close"]
        missing_columns = [req for req in required_columns if req not in mapped_columns]
        if missing_columns:
            return JSONResponse(
                status_code=422,
                content={
                    "error": "Missing required columns in MT5 data",
                    "missing_columns": missing_columns,
                    "available_columns": available_columns,
                    "mapped_columns": mapped_columns,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        # Convertir DataFrame a velas
        candles: List[Dict[str, Any]] = []
        for index, row in data.iterrows():
            try:
                candle = {
                    "time": row.name.isoformat() if hasattr(row.name, "isoformat") else str(row.name),
                    "open": float(row[mapped_columns["open"]]),
                    "high": float(row[mapped_columns["high"]]),
                    "low": float(row[mapped_columns["low"]]),
                    "close": float(row[mapped_columns["close"]]),
                    "volume": float(
                        row[mapped_columns.get("volume", mapped_columns.get("tick_volume", available_columns[0]))]
                    )
                    if ("volume" in mapped_columns or "tick_volume" in mapped_columns)
                    else 0.0,
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
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        response_data = {
            "symbol": symbol,
            "timeframe": timeframe,
            "count": len(candles),
            "data": {"candles": candles},
            "debug_info": {
                "original_columns": available_columns,
                "mapped_columns": mapped_columns,
                "processed_rows": len(candles),
            },
            "timestamp": datetime.utcnow().isoformat(),
            "source": "MT5_Real",
        }

        return JSONResponse(content=response_data)

    except Exception as e:
        logger.error(f"Error getting MT5 data: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting MT5 data",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@router.get("/price/{symbol}")
async def get_current_price(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene el precio actual en tiempo real de MT5
    """
    try:
        # Conectar a MT5 si no está conectado
        if not _is_connected_safe():
            if not hasattr(mt5_provider, "connect") or not mt5_provider.connect():
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
        symbol_info_raw = mt5_provider.get_symbol_info(symbol) if hasattr(mt5_provider, "get_symbol_info") else None
        symbol_info = _symbol_info_to_dict(symbol_info_raw)

        response_data = {
            "symbol": symbol,
            "price": float(current_price),
            "timestamp": datetime.utcnow().isoformat(),
            "source": "MT5_Real",
            "symbol_info": {
                "digits": symbol_info.get("digits", 5),
                "point": symbol_info.get("point", 0.00001),
                "spread": symbol_info.get("spread", 0),
            },
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
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@router.post("/execute")
async def execute_order(
    order_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Ejecuta una orden en MT5
    """
    logger.info(f"🔵 [ORDER] Received order request from user {current_user.id}")
    logger.info(f"📦 Order data: {order_data}")
    
    try:
        symbol = order_data.get("symbol")
        signal_type = order_data.get("signal_type")  # "buy" or "sell"
        entry_price = order_data.get("entry_price")
        stop_loss = order_data.get("stop_loss")
        take_profit = order_data.get("take_profit")
        lot_size = order_data.get("lot_size", 0.1)

        logger.info(f"📊 Parsed parameters - Symbol: {symbol}, Type: {signal_type}, Price: {entry_price}, Lot: {lot_size}")

        if not all([symbol, signal_type]):
            missing = []
            if not symbol: missing.append("symbol")
            if not signal_type: missing.append("signal_type")
            
            logger.warning(f"❌ Missing required parameters: {missing}")
            return JSONResponse(
                status_code=400,
                content={"error": "Symbol and signal_type are required"},
            )

        # Conectar a MT5 si no está conectado
        logger.info("🔌 Checking MT5 connection...")
        if not _is_connected_safe():
            logger.warning("MT5 not connected, attempting to connect...")
            if not hasattr(mt5_provider, "connect"):
                logger.error("❌ mt5_provider does not have 'connect' method")
                return JSONResponse(
                    status_code=503,
                    content={"error": "MT5 provider configuration error"}
                )
            
            connection_result = mt5_provider.connect()
            logger.info(f"🔌 MT5 connection attempt result: {connection_result}")
            
            if not connection_result:
                logger.error("❌ Failed to connect to MT5")
                return JSONResponse(
                    status_code=503,
                    content={"error": "Cannot connect to MetaTrader 5"}
                )
        else:
            logger.info("✅ MT5 is already connected")

        # DEBUG: Verificar métodos disponibles
        logger.info("🔍 Checking available methods in mt5_provider...")
        available_methods = [method for method in dir(mt5_provider) if not method.startswith('_')]
        logger.info(f"📋 Available methods: {available_methods}")

        # Verificar que existe el método execute_order
        if not hasattr(mt5_provider, 'execute_order'):
            logger.error("❌ mt5_provider does not have 'execute_order' method")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "MT5 provider configuration error",
                    "detail": "execute_order method not available",
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        # Ejecutar la orden - USAR execute_order en lugar de place_order
        logger.info(f"🚀 Executing order with MT5...")
        logger.info(f"   Symbol: {symbol}, Type: {signal_type.upper()}, Volume: {lot_size}")
        logger.info(f"   Price: {entry_price}, SL: {stop_loss}, TP: {take_profit}")

        # USAR execute_order EN LUGAR DE place_order
        result = mt5_provider.execute_order(
            symbol=symbol,
            order_type=signal_type.upper(),
            volume=lot_size,
            price=entry_price,
            sl=stop_loss,
            tp=take_profit,
            comment=f"AI_{str(current_user.id)[-8:]}",
        )

        logger.info(f"📨 MT5 provider response: {result}")

        if result and result.get("success"):
            logger.info(f"✅ Order executed successfully. Ticket: {result.get('ticket')}")
            
            # Guardar la orden en la base de datos
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
                "mt5_result": prepare_for_json(result),
            }

            try:
                logger.info("💾 Saving order to database...")
                insert_result = await db.executed_orders.insert_one(order_doc)
                logger.info(f"✅ Order saved to database with ID: {insert_result.inserted_id}")
            except Exception as db_error:
                logger.error(f"❌ Database error: {db_error}")
                # Continuamos aunque falle la DB, la orden ya se ejecutó en MT5

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
                "timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(f"📤 Sending success response: {response_data}")
            return JSONResponse(content=response_data)
        else:
            error_msg = result.get("error", "Unknown error") if result else "Failed to execute order"
            logger.error(f"❌ Order execution failed: {error_msg}")
            
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Order execution failed",
                    "detail": error_msg,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

    except Exception as e:
        logger.error(f"💥 Unhandled exception in execute_order: {e}", exc_info=True)
        logger.error(f"🔍 Exception type: {type(e).__name__}")
        logger.error(f"📝 Exception args: {e.args}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error executing order",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


def _is_connected_safe():
    """
    Safe method to check MT5 connection with error handling
    """
    try:
        logger.info("🔍 Checking MT5 connection status...")
        
        # Primero verificar si mt5_provider tiene el atributo connected
        if hasattr(mt5_provider, 'connected'):
            connected = mt5_provider.connected
            logger.info(f"📡 MT5 connection status (direct): {connected}")
            return connected
        
        # Si no, buscar otros métodos
        if hasattr(mt5_provider, 'is_connected'):
            connected = mt5_provider.is_connected()
            logger.info(f"📡 MT5 connection status (is_connected): {connected}")
            return connected
        elif hasattr(mt5_provider, 'check_connection'):
            connected = mt5_provider.check_connection()
            logger.info(f"📡 MT5 connection status (check_connection): {connected}")
            return connected
        else:
            logger.warning("⚠️ No method available to check MT5 connection")
            # Fallback: intentar verificar con MetaTrader5 directamente
            try:
                # Intenta obtener información de la cuenta
                account_info = mt5.account_info()
                connected = account_info is not None
                logger.info(f"📡 MT5 connection status (fallback): {connected}")
                return connected
            except:
                logger.error("❌ Fallback connection check also failed")
                return False
                
    except Exception as e:
        logger.error(f"💥 Error checking MT5 connection: {e}")
        return False

@router.get("/orders")
async def get_user_orders(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Obtiene las órdenes ejecutadas del usuario
    """
    try:
        orders = (
            await db.executed_orders.find({"user_id": current_user.id})
            .sort("executed_at", -1)
            .limit(50)
            .to_list(length=50)
        )

        cleaned_orders = [prepare_for_json(order) for order in orders]

        response_data = {
            "orders": cleaned_orders,
            "count": len(cleaned_orders),
            "timestamp": datetime.utcnow().isoformat(),
        }

        return JSONResponse(content=response_data)
    except Exception as e:
        logger.error(f"Error getting user orders: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting orders",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

@router.post("/admin/cleanup-mt5-sessions")
async def cleanup_mt5_sessions(
    current_user: User = Depends(get_current_user), 
    db=Depends(get_database)
):
    """
    ENDPOINT TEMPORAL: Limpia todas las sesiones MT5 existentes
    Solo para administradores - EJECUTAR UNA SOLA VEZ
    """
    if current_user.role != "user":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Marcar todas las sesiones como desconectadas
        result = await db.mt5_sessions.update_many(
            {},
            {
                "$set": {
                    "is_connected": False,
                    "updated_at": datetime.utcnow(),
                    "cleanup_applied": True
                }
            }
        )
        
        # Crear índice único por user_id
        try:
            await db.mt5_sessions.create_index("user_id", unique=True)
        except Exception:
            pass  # Índice ya existe
        
        return {
            "success": True,
            "sessions_cleaned": result.modified_count,
            "message": "All MT5 sessions cleaned successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")
    
@router.get("/positions")
async def get_open_positions(
    current_user: User = Depends(get_current_user),
):
    """
    Obtiene las posiciones abiertas en MT5
    """
    try:
        # Conectar a MT5 si no está conectado
        if not _is_connected_safe():
            if not hasattr(mt5_provider, "connect") or not mt5_provider.connect():
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
        user_positions: List[Dict[str, Any]] = []
        for pos in positions:
            comment = pos.get("comment") if isinstance(pos, dict) else getattr(pos, "comment", "")
            if f"AI_Signal_{current_user.id}" in (comment or ""):
                user_positions.append(prepare_for_json(pos))

        response_data = {
            "positions": user_positions,
            "count": len(user_positions),
            "timestamp": datetime.utcnow().isoformat(),
        }

        return JSONResponse(content=response_data)
    except Exception as e:
        logger.error(f"Error getting positions: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error getting positions",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
