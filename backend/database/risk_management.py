from typing import Optional, Dict, Any
from pydantic import BaseModel


class ExtendedRiskConfig(BaseModel):
    max_daily_loss_percent: Optional[float] = None
    max_weekly_loss_percent: Optional[float] = None
    max_daily_profit_percent: Optional[float] = None
    max_open_trades: Optional[int] = None
    min_rrr: Optional[float] = None
    max_losing_streak: Optional[int] = None
    cool_down_hours: Optional[int] = None
    risk_by_strategy: Optional[Dict[str, float]] = None


class RiskLockRequest(BaseModel):
    total_capital: float
    risk_percentage: float
    source: str = "mt5"
    mt5_snapshot: Optional[Dict[str, Any]] = None
    extended_risk_config: Optional[ExtendedRiskConfig] = None


class RiskLockResponse(BaseModel):
    locked: bool
    locked_at: str
    total_capital: float
    risk_percentage: float
    source: str
    mt5_snapshot: Optional[Dict[str, Any]] = None
    extended_risk_config: Optional[ExtendedRiskConfig] = None
