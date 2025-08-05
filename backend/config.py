"""
Configuración de la aplicación Trading AI
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """Configuración principal de la aplicación"""
    
    # Configuración del ambiente
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # Configuración del servidor
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    debug: bool = Field(default=True, env="DEBUG")
    
    # Base de datos MongoDB
    mongodb_url: str = Field(env="MONGODB_URL")
    mongodb_database: str = Field(default="trading-ai", env="MONGODB_DATABASE")
    
    # Seguridad
    secret_key: str = Field(env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # CORS
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
        env="ALLOWED_ORIGINS"
    )
    
    # MetaTrader 5
    mt5_enabled: bool = Field(default=True, env="MT5_ENABLED")
    mt5_timeout: int = Field(default=60000, env="MT5_TIMEOUT")
    
    # Configuración de IA
    ai_confidence_threshold: float = Field(default=0.7, env="AI_CONFIDENCE_THRESHOLD")
    elliott_wave_enabled: bool = Field(default=True, env="ELLIOTT_WAVE_ENABLED")
    chart_patterns_enabled: bool = Field(default=True, env="CHART_PATTERNS_ENABLED")
    fibonacci_enabled: bool = Field(default=True, env="FIBONACCI_ENABLED")
    
    # Análisis en tiempo real
    realtime_analysis_interval: int = Field(default=60, env="REALTIME_ANALYSIS_INTERVAL")
    max_concurrent_analysis: int = Field(default=10, env="MAX_CONCURRENT_ANALYSIS")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="trading_ai.log", env="LOG_FILE")
    
    # WebSocket
    websocket_ping_interval: int = Field(default=20, env="WEBSOCKET_PING_INTERVAL")
    websocket_ping_timeout: int = Field(default=10, env="WEBSOCKET_PING_TIMEOUT")
    
    # Trading
    default_timeframes: List[str] = Field(
        default=["M1", "M5", "M15", "M30", "H1", "H4", "D1"],
        env="DEFAULT_TIMEFRAMES"
    )
    major_pairs: List[str] = Field(
        default=["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"],
        env="MAJOR_PAIRS"
    )
    
    # Gestión de riesgo
    max_risk_per_trade: float = Field(default=0.02, env="MAX_RISK_PER_TRADE")
    max_daily_drawdown: float = Field(default=0.05, env="MAX_DAILY_DRAWDOWN")
    
    # Notificaciones
    notifications_enabled: bool = Field(default=True, env="NOTIFICATIONS_ENABLED")
    email_notifications: bool = Field(default=False, env="EMAIL_NOTIFICATIONS")
    
    # Email (opcional)
    smtp_server: str = Field(default="smtp.gmail.com", env="SMTP_SERVER")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: str = Field(default="", env="SMTP_USERNAME")
    smtp_password: str = Field(default="", env="SMTP_PASSWORD")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Instancia global de configuración
settings = Settings()


def get_database_url() -> str:
    """Obtiene la URL de la base de datos"""
    return settings.mongodb_url


def get_settings() -> Settings:
    """Obtiene la configuración de la aplicación"""
    return settings


def is_development() -> bool:
    """Verifica si estamos en modo desarrollo"""
    return settings.environment.lower() == "development"


def is_production() -> bool:
    """Verifica si estamos en modo producción"""
    return settings.environment.lower() == "production"