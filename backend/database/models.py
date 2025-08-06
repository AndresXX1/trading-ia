from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
from enum import Enum
from bson import ObjectId
from pydantic_core import core_schema
from pydantic import GetCoreSchemaHandler

class PyObjectId(ObjectId):

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler: GetCoreSchemaHandler):
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def validate(cls, value):
        if not ObjectId.is_valid(value):
            raise ValueError("Invalid ObjectId")
        return ObjectId(value)

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    PREMIUM = "premium"

class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class AnalysisType(str, Enum):
    ELLIOTT_WAVE = "elliott_wave"
    CHART_PATTERN = "chart_pattern"
    FIBONACCI = "fibonacci"
    SUPPORT_RESISTANCE = "support_resistance"

# Modelos de Usuario
class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password_hash: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Configuración del usuario
    preferred_pairs: List[str] = []
    preferred_timeframes: List[str] = ["H1", "H4", "D1"]
    notification_settings: Dict[str, bool] = {
        "email_signals": True,
        "push_notifications": True,
        "sms_alerts": False
    }
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    preferred_pairs: List[str]
    preferred_timeframes: List[str]

# Modelos de Señales
class TechnicalAnalysis(BaseModel):
    type: AnalysisType
    confidence: float = Field(..., ge=0, le=1)  # 0-1 confidence level
    data: Dict[str, Any]  # Datos específicos del análisis
    description: str

class Signal(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    symbol: str
    timeframe: str
    signal_type: SignalType
    
    # Precios y niveles
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    current_price: float
    
    # Análisis técnico
    technical_analyses: List[TechnicalAnalysis] = []
    confluence_score: float = Field(..., ge=0, le=1)  # Puntuación de confluencia
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    is_active: bool = True
    
    # Performance tracking
    max_profit: float = 0.0
    max_loss: float = 0.0
    result: Optional[str] = None  # "profit", "loss", "breakeven"
    pips_result: Optional[float] = None
    
    # User tracking
    created_by: str = "system"  # user_id or "system"
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class SignalResponse(BaseModel):
    id: str
    symbol: str
    timeframe: str
    signal_type: SignalType
    entry_price: float
    stop_loss: Optional[float]
    take_profit: Optional[float]
    current_price: float
    confluence_score: float
    technical_analyses: List[TechnicalAnalysis]
    created_at: datetime
    is_active: bool

# Modelos de Datos de Mercado
class OHLCV(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

class MarketData(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    symbol: str
    timeframe: str
    data: List[OHLCV]
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Modelos de Configuración
class TradingPair(BaseModel):
    symbol: str
    description: str
    currency_base: str
    currency_profit: str
    point: float
    digits: int
    category: str  # "Major", "Minor", "Exotic"
    is_active: bool = True

class SystemConfig(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    mt5_connected: bool = False
    active_pairs: List[str] = []
    default_timeframes: List[str] = ["M15", "H1", "H4", "D1"]
    ai_models_status: Dict[str, bool] = {
        "elliott_waves": True,
        "chart_patterns": True,
        "fibonacci": True,
        "support_resistance": True
    }
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Modelos de Alertas
class Alert(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    symbol: str
    alert_type: str  # "price", "signal", "pattern"
    condition: Dict[str, Any]  # Condición de la alerta
    message: str
    is_triggered: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    triggered_at: Optional[datetime] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Modelos de Performance
class PerformanceStats(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: Optional[str] = None  # None para stats del sistema
    period_start: datetime
    period_end: datetime
    
    # Estadísticas generales
    total_signals: int = 0
    profitable_signals: int = 0
    losing_signals: int = 0
    win_rate: float = 0.0
    
    # Performance financiera
    total_pips: float = 0.0
    average_pips_per_trade: float = 0.0
    max_consecutive_wins: int = 0
    max_consecutive_losses: int = 0
    
    # Por símbolo
    symbol_performance: Dict[str, Dict[str, float]] = {}
    
    # Por timeframe
    timeframe_performance: Dict[str, Dict[str, float]] = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}