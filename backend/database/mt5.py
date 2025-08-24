from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import Field
from .base import BaseModel, PyObjectId


class MT5Session(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    is_connected: bool = False
    connected_at: Optional[datetime] = None
    account_type: Optional[str] = None
    server: Optional[str] = None
    login: Optional[str] = None
    account_info: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None


class MT5Profile(BaseModel):
    """Modelo para perfiles guardados de MT5 (sin contraseña)"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str = Field(..., description="ID del usuario propietario del perfil")
    
    # Datos del perfil
    login: Optional[str] = None
    server: Optional[str] = None
    account_type: str = "real"
    profile_name: Optional[str] = None
    
    # Configuración
    is_default: bool = False
    auto_connect: bool = False
    ai_settings: Optional[Dict[str, Any]] = None
    
    # Metadatos
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TradingPair(BaseModel):
    symbol: str
    description: str
    currency_base: str
    currency_profit: str
    point: float
    digits: int
    category: str  # "Major", "Minor", "Exotic"
    is_active: bool = True
