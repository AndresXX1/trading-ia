from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import BaseModel, PyObjectId
from .enums import ExecutionType, TraderType, TradingStrategy


class ExtendedRiskConfig(BaseModel):
    max_daily_loss_percent: Optional[float] = None
    max_weekly_loss_percent: Optional[float] = None
    max_daily_profit_percent: Optional[float] = None
    max_open_trades: Optional[int] = None
    min_rrr: Optional[float] = None
    max_losing_streak: Optional[int] = None
    cool_down_hours: Optional[int] = None
    risk_by_strategy: Optional[Dict[str, float]] = None


class AnalysisConfig(BaseModel):
    """Configuración para el análisis de confluencias"""
    # Configuración básica
    confluence_threshold: float = 0.6
    risk_per_trade: float = 2.0
    lot_size: float = 0.1
    atr_multiplier_sl: float = 2.0
    risk_reward_ratio: float = 2.0
    
    # Análisis habilitados
    enable_elliott_wave: bool = True
    enable_fibonacci: bool = True
    enable_chart_patterns: bool = True
    enable_support_resistance: bool = True
    
    # Timeframe
    timeframe: str = "H1"
    
    # Tipo de trader y estrategia
    trader_type: Optional[TraderType] = None
    trader_timeframes: List[str] = ["H1"]
    trading_strategy: Optional[TradingStrategy] = None
    strategy_timeframes: List[str] = ["H1"]
    
    # Pesos personalizados
    elliott_wave_weight: float = 0.25
    fibonacci_weight: float = 0.25
    chart_patterns_weight: float = 0.30
    support_resistance_weight: float = 0.20
    
    # Configuración de ejecución
    execution_type: ExecutionType = ExecutionType.MARKET
    allowed_execution_types: List[ExecutionType] = [ExecutionType.MARKET]
    
    # Gestión de riesgo básica
    total_capital: Optional[float] = None
    risk_percentage: Optional[float] = None
    max_risk_amount: Optional[float] = None
    
    extended_risk_config: Optional[ExtendedRiskConfig] = None
    risk_management_locked: bool = False
    
    # Timeframes combinados
    combined_timeframes: List[str] = []
    
    # Pesos personalizados adicionales
    custom_weights: dict = {}


class AISettingsRequest(BaseModel):
    """Modelo para recibir la configuración de IA desde el frontend"""
    # Configuración básica
    timeframe: str = "H1"
    confluence_threshold: float = Field(default=0.6, ge=0, le=1)
    risk_per_trade: float = Field(default=2.0, gt=0, le=10)
    lot_size: float = Field(default=0.1, gt=0)
    atr_multiplier_sl: float = Field(default=2.0, gt=0)
    risk_reward_ratio: float = Field(default=2.0, gt=0)
    
    # Análisis habilitados
    enable_elliott_wave: bool = True
    enable_fibonacci: bool = True
    enable_chart_patterns: bool = True
    enable_support_resistance: bool = True
    
    # Pesos de análisis
    elliott_wave_weight: float = Field(default=0.25, ge=0, le=1)
    fibonacci_weight: float = Field(default=0.25, ge=0, le=1)
    chart_patterns_weight: float = Field(default=0.25, ge=0, le=1)
    support_resistance_weight: float = Field(default=0.25, ge=0, le=1)
    
    # Configuración de ejecución
    execution_type: str = "market"
    allowed_execution_types: List[str] = ["market"]
    
    # Tipos de trader y estrategias
    trader_type: Optional[str] = None
    trading_strategy: Optional[str] = None
    trader_timeframes: List[str] = ["H1"]
    strategy_timeframes: List[str] = ["H1"]
    
    # Configuración adicional del frontend
    analysisTimeframe: Optional[str] = None
    enabledAnalyses: List[str] = []
    selectedExecutionType: Optional[str] = None
    selectedStrategy: Optional[str] = None
    selectedTradingStrategy: Optional[str] = None
    
    # Configuración avanzada
    combined_timeframes: List[str] = []
    custom_weights: Dict[str, Any] = {}
    risk_management_locked: bool = False


class AISettings(BaseModel):
    """Modelo para almacenar en la base de datos"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    
    # Configuración básica
    timeframe: str = "H1"
    confluence_threshold: float = 0.6
    risk_per_trade: float = 2.0
    lot_size: float = 0.1
    atr_multiplier_sl: float = 2.0
    risk_reward_ratio: float = 2.0
    
    # Análisis habilitados
    enable_elliott_wave: bool = True
    enable_fibonacci: bool = True
    enable_chart_patterns: bool = True
    enable_support_resistance: bool = True
    
    # Pesos de análisis
    elliott_wave_weight: float = 0.25
    fibonacci_weight: float = 0.25
    chart_patterns_weight: float = 0.25
    support_resistance_weight: float = 0.25
    
    # Configuración de ejecución
    execution_type: str = "market"
    allowed_execution_types: List[str] = ["market"]
    
    # Tipos de trader y estrategias
    trader_type: Optional[str] = None
    trading_strategy: Optional[str] = None
    trader_timeframes: List[str] = ["H1"]
    strategy_timeframes: List[str] = ["H1"]
    
    # Configuración adicional
    combined_timeframes: List[str] = []
    custom_weights: Dict[str, Any] = {}
    risk_management_locked: bool = False
    
    # Datos adicionales del frontend (opcionales)
    frontend_config: Optional[Dict[str, Any]] = None
    
    # Metadatos
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AISettingsResponse(BaseModel):
    """Modelo de respuesta para el frontend"""
    success: bool
    ai_settings: Optional[Dict[str, Any]] = None
    message: str
    timestamp: str


class AISettingsValidation(BaseModel):
    """Modelo para validación de configuración"""
    is_valid: bool
    errors: List[str] = []
