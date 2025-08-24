from datetime import datetime
from typing import List, Dict, Optional
from pydantic import Field, EmailStr, field_validator
from .base import BaseModel, PyObjectId
from .enums import UserRole, TradingStrategy, TraderType


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
    
    # Configuraciones de trading adicionales
    trading_strategy: Optional[TradingStrategy] = None
    trader_type: Optional[TraderType] = None
    risk_tolerance: Optional[str] = "medium"  # low, medium, high


class UserCreate(BaseModel):
    """Modelo para crear un nuevo usuario"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[UserRole] = UserRole.USER
    preferred_pairs: Optional[List[str]] = []
    preferred_timeframes: Optional[List[str]] = ["H1", "H4", "D1"]
    notification_settings: Optional[Dict[str, bool]] = {
        "email_signals": True,
        "push_notifications": True,
        "sms_alerts": False
    }
    trading_strategy: Optional[TradingStrategy] = None
    trader_type: Optional[TraderType] = None
    risk_tolerance: Optional[str] = "medium"
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (underscores and hyphens allowed)')
        return v.lower()
    
    @field_validator('preferred_pairs')
    @classmethod
    def validate_pairs(cls, v: List[str]) -> List[str]:
        if v:
            valid_pairs = [
                'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
                'USDCHF', 'NZDUSD', 'EURJPY', 'GBPJPY', 'EURGBP',
                'AUDNZD', 'AUDCAD', 'AUDCHF', 'AUDJPY', 'CADCHF',
                'CADJPY', 'CHFJPY', 'EURNZD', 'EURCAD', 'EURAUD'
            ]
            for pair in v:
                if pair.upper() not in valid_pairs:
                    raise ValueError(f'Invalid currency pair: {pair}')
        return [pair.upper() for pair in v] if v else []
    
    @field_validator('preferred_timeframes')
    @classmethod
    def validate_timeframes(cls, v: List[str]) -> List[str]:
        if v:
            valid_timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1']
            for tf in v:
                if tf not in valid_timeframes:
                    raise ValueError(f'Invalid timeframe: {tf}')
        return v or ["H1", "H4", "D1"]


class UserUpdate(BaseModel):
    """Modelo para actualizar un usuario existente"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    preferred_pairs: Optional[List[str]] = None
    preferred_timeframes: Optional[List[str]] = None
    notification_settings: Optional[Dict[str, bool]] = None
    trading_strategy: Optional[TradingStrategy] = None
    trader_type: Optional[TraderType] = None
    risk_tolerance: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (underscores and hyphens allowed)')
        return v.lower() if v else v
    
    @field_validator('preferred_pairs')
    @classmethod
    def validate_pairs(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            valid_pairs = [
                'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
                'USDCHF', 'NZDUSD', 'EURJPY', 'GBPJPY', 'EURGBP',
                'AUDNZD', 'AUDCAD', 'AUDCHF', 'AUDJPY', 'CADCHF',
                'CADJPY', 'CHFJPY', 'EURNZD', 'EURCAD', 'EURAUD'
            ]
            for pair in v:
                if pair.upper() not in valid_pairs:
                    raise ValueError(f'Invalid currency pair: {pair}')
            return [pair.upper() for pair in v]
        return v
    
    @field_validator('preferred_timeframes')
    @classmethod
    def validate_timeframes(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            valid_timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1']
            for tf in v:
                if tf not in valid_timeframes:
                    raise ValueError(f'Invalid timeframe: {tf}')
        return v
    
    @field_validator('risk_tolerance')
    @classmethod
    def validate_risk_tolerance(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ['low', 'medium', 'high']:
            raise ValueError('Risk tolerance must be: low, medium, or high')
        return v


class UserLogin(BaseModel):
    """Modelo para login de usuario"""
    email: str
    password: str


class UserRegister(BaseModel):
    """Modelo para registro de usuario"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (underscores and hyphens allowed)')
        return v.lower()


class UserResponse(BaseModel):
    """Modelo para respuestas de API (sin datos sensibles)"""
    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    preferred_pairs: List[str]
    preferred_timeframes: List[str]
    notification_settings: Dict[str, bool]
    trading_strategy: Optional[TradingStrategy] = None
    trader_type: Optional[TraderType] = None
    risk_tolerance: Optional[str] = None


class UserProfile(BaseModel):
    """Modelo para el perfil detallado del usuario"""
    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    preferred_pairs: List[str]
    preferred_timeframes: List[str]
    notification_settings: Dict[str, bool]
    trading_strategy: Optional[TradingStrategy] = None
    trader_type: Optional[TraderType] = None
    risk_tolerance: Optional[str] = None
    
    # Estadísticas adicionales
    total_signals: Optional[int] = 0
    successful_trades: Optional[int] = 0
    total_trades: Optional[int] = 0
    win_rate: Optional[float] = 0.0
    last_login: Optional[datetime] = None


class PasswordChange(BaseModel):
    """Modelo para cambiar contraseña"""
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str
    
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UserPreferences(BaseModel):
    """Modelo para actualizar solo las preferencias del usuario"""
    preferred_pairs: Optional[List[str]] = None
    preferred_timeframes: Optional[List[str]] = None
    notification_settings: Optional[Dict[str, bool]] = None
    trading_strategy: Optional[TradingStrategy] = None
    trader_type: Optional[TraderType] = None
    risk_tolerance: Optional[str] = None
    
    @field_validator('preferred_pairs')
    @classmethod
    def validate_pairs(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            valid_pairs = [
                'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 
                'USDCHF', 'NZDUSD', 'EURJPY', 'GBPJPY', 'EURGBP',
                'AUDNZD', 'AUDCAD', 'AUDCHF', 'AUDJPY', 'CADCHF',
                'CADJPY', 'CHFJPY', 'EURNZD', 'EURCAD', 'EURAUD'
            ]
            for pair in v:
                if pair.upper() not in valid_pairs:
                    raise ValueError(f'Invalid currency pair: {pair}')
            return [pair.upper() for pair in v]
        return v
    
    @field_validator('preferred_timeframes')
    @classmethod
    def validate_timeframes(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            valid_timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1']
            for tf in v:
                if tf not in valid_timeframes:
                    raise ValueError(f'Invalid timeframe: {tf}')
        return v
    
    @field_validator('risk_tolerance')
    @classmethod
    def validate_risk_tolerance(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ['low', 'medium', 'high']:
            raise ValueError('Risk tolerance must be: low, medium, or high')
        return v


class UserStats(BaseModel):
    """Modelo para estadísticas del usuario"""
    user_id: str
    total_signals_received: int = 0
    signals_followed: int = 0
    successful_trades: int = 0
    failed_trades: int = 0
    total_profit_loss: float = 0.0
    win_rate: float = 0.0
    average_trade_duration: Optional[int] = None  # en minutos
    favorite_pairs: List[str] = []
    most_active_timeframe: Optional[str] = None
    last_activity: Optional[datetime] = None
    account_balance: Optional[float] = None
    risk_score: Optional[float] = None