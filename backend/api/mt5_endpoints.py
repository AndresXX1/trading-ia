from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Callable, Tuple
from datetime import datetime
import logging
import json
import numpy as np
import pandas as pd
from bson import ObjectId
import asyncio

# Intentar usar el paquete oficial de MetaTrader5 si está instalado
try:
    import MetaTrader5 as mt5  # type: ignore
except Exception:
    mt5 = None  # noqa: N816

# Modelos y dependencias del proyecto
from database.models import User
from database.connection import get_database
from api.auth import get_current_user

# Proveedor de datos MT5 (ajusta los métodos según tu wrapper)
from mt5.data_provider import MT5DataProvider

router = APIRouter()
logger = logging.getLogger(__name__)

# Inicializar MT5 provider
mt5_provider = MT5DataProvider()

# Estado simple en memoria por usuario para recordar detalles de la sesión MT5
SESSION_STATE: Dict[str, Dict[str, Any]] = {}


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

        # “tocar” el proveedor y reintentar
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


# ------------------------
# Modelos Pydantic
# ------------------------
class ConnectRequest(BaseModel):
    login: Optional[str] = Field(None, description="Número de cuenta MT5 (string o int)")
    password: Optional[str] = Field(None, description="Password de la cuenta MT5")
    server: Optional[str] = Field(None, description="Nombre del servidor (ej: 'Broker-Demo')")
    account_type: Optional[str] = Field("real", description="Tipo de cuenta: 'real' o 'demo'")
    remember: Optional[bool] = Field(False, description="Guardar perfil (sin contraseña) en DB")


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


class ProfileResponse(BaseModel):
    exists: bool
    profile: Optional[Profile] = None
    timestamp: str


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

    # Guardar estado in-memory
    SESSION_STATE[user_id] = {
        "connected_at": datetime.utcnow().isoformat(),
        "account_type": account_type,
        "server": body.server,
        "login": str(body.login) if body.login else None,
    }

    # Guardar perfil en DB si remember
    if body.remember:
        profile_doc = {
            "user_id": user_id,
            "login": str(body.login) if body.login else None,
            "server": body.server,
            "account_type": account_type,
            "updated_at": datetime.utcnow(),
        }
        await db.mt5_profiles.update_one({"user_id": user_id}, {"$set": profile_doc}, upsert=True)

    # Intentar leer info
    info = await _get_account_info_safe(retries=5, delay_ms=200)

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
    profile = await db.mt5_profiles.find_one({"user_id": user_id})  # no incluye password

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
        # posterga leer account; solo informa estado
        state = SESSION_STATE.get(user_id, {})
        if profile:
            state.update({
                "account_type": profile.get("account_type") or "real",
                "server": profile.get("server"),
                "login": str(profile.get("login")) if profile.get("login") else None,
            })
            SESSION_STATE[user_id] = state

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
    """
    Devuelve el estado de conexión y la información de la cuenta MT5.
    Si no está conectado e intenta reconectar automáticamente (best-effort).
    """
    user_id = str(current_user.id)
    connected = _is_connected_safe()

    profile = await db.mt5_profiles.find_one({"user_id": user_id})
    state = SESSION_STATE.get(user_id, {})
    account_type = state.get("account_type") or (profile.get("account_type") if profile else "real")
    login = state.get("login") or (str(profile.get("login")) if profile and profile.get("login") else None)
    server = state.get("server") or (profile.get("server") if profile else None)

    if not connected:
        # best-effort autoconnect
        try:
            if hasattr(mt5_provider, "connect"):
                connected = bool(mt5_provider.connect())
            elif hasattr(mt5_provider, "initialize"):
                connected = bool(mt5_provider.initialize())
        except Exception:
            connected = False

    if not connected:
        return JSONResponse(
            content=ConnectResponse(
                connected=False,
                account_type=account_type,
                login=login,
                server=server,
                timestamp=datetime.utcnow().isoformat(),
                message="Not connected to MT5",
            ).model_dump()
        )

    info = await _get_account_info_safe(retries=2, delay_ms=150)

    resp = ConnectResponse(
        connected=True,
        account_type=account_type,
        login=info.get("login") or login,
        server=info.get("server") or server,
        account_id=info.get("login") or login,
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
async def disconnect_mt5(current_user: User = Depends(get_current_user)):
    """
    Cierra la conexión con MT5 y limpia el estado de sesión en memoria.
    """
    user_id = str(current_user.id)

    ok = _disconnect_safe()
    SESSION_STATE.pop(user_id, None)

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
            message="Disconnected from MT5 successfully",
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
    profile = await db.mt5_profiles.find_one({"user_id": user_id})

    return JSONResponse(
        content=StatusResponse(
            connected=connected,
            account_type=(profile.get("account_type") if profile else None),
            server=(profile.get("server") if profile else None),
            login=(str(profile.get("login")) if profile and profile.get("login") else None),
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump()
    )


# Perfil: guardar/obtener/eliminar (sin contraseña)
@router.post("/profile/save", response_model=ProfileResponse)
async def save_profile(body: Profile, current_user: User = Depends(get_current_user), db=Depends(get_database)):
    user_id = str(current_user.id)
    doc = {
        "user_id": user_id,
        "login": body.login,
        "server": body.server,
        "account_type": _normalize_account_type(body.account_type or "real"),
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
        return JSONResponse(
            content=ProfileResponse(exists=False, profile=None, timestamp=datetime.utcnow().isoformat()).model_dump()
        )
    profile = Profile(
        login=str(doc.get("login")) if doc.get("login") else None,
        server=doc.get("server"),
        account_type=doc.get("account_type") or "real",
        updated_at=(doc.get("updated_at").isoformat() if doc.get("updated_at") else None),
    )
    return JSONResponse(
        content=ProfileResponse(exists=True, profile=profile, timestamp=datetime.utcnow().isoformat()).model_dump()
    )


@router.delete("/profile", response_model=ProfileResponse)
async def delete_profile(current_user: User = Depends(get_current_user), db=Depends(get_database)):
    user_id = str(current_user.id)
    await db.mt5_profiles.delete_one({"user_id": user_id})
    return JSONResponse(
        content=ProfileResponse(exists=False, profile=None, timestamp=datetime.utcnow().isoformat()).model_dump()
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
                content={"error": "Symbol, signal_type, and entry_price are required"},
            )

        # Conectar a MT5 si no está conectado
        if not _is_connected_safe():
            if not hasattr(mt5_provider, "connect") or not mt5_provider.connect():
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
            comment=f"AI_Signal_{current_user.id}",
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
                "mt5_result": prepare_for_json(result),
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
                "timestamp": datetime.utcnow().isoformat(),
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
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
    except Exception as e:
        logger.error(f"Error executing order: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Error executing order",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


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
