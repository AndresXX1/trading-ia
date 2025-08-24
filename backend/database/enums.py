from enum import Enum


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
    

class ExecutionType(str, Enum):
    MARKET = "market"
    LIMIT = "limit" 
    STOP = "stop"


class TraderType(str, Enum):
    SCALPING = "scalping"
    DAY_TRADING = "day_trading"
    SWING_TRADING = "swing_trading"
    POSITION_TRADING = "position_trading"


class TradingStrategy(str, Enum):
    MALETA = "maleta"
    SWING_TRADING = "swing_trading"
    POSITION_TRADING = "position_trading"
    ALGORITHMIC = "algorithmic"
    ALGORITHMIC_TRADING = "algorithmic_trading"
    PAIRS_TRADING = "pairs_trading"
    MEAN_REVERSION = "mean_reversion"
    SOCIAL_TRADING = "social_trading"
    CARRY_TRADE = "carry_trade"
    HEDGING = "hedging"
    PYRAMIDING = "pyramiding"
