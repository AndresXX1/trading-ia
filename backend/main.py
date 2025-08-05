from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from contextlib import asynccontextmanager

# Importar routers
from api.auth import router as auth_router
from api.pairs import router as pairs_router
from api.signals import router as signals_router

# Importar componentes
from database.connection import connect_to_mongo, close_mongo_connection
from mt5.data_provider import MT5DataProvider

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('trading_ai.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Variables globales
mt5_provider = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Maneja el ciclo de vida de la aplicación"""
    # Startup
    logger.info("Iniciando aplicación Trading AI...")
    
    try:
        # Conectar a MongoDB
        await connect_to_mongo()
        logger.info("✅ Conexión a MongoDB establecida")
        
        # Inicializar MT5
        global mt5_provider
        mt5_provider = MT5DataProvider()
        if mt5_provider.connect():
            logger.info("✅ Conexión a MetaTrader 5 establecida")
        else:
            logger.warning("⚠️  No se pudo conectar a MetaTrader 5")
            
    except Exception as e:
        logger.error(f"❌ Error durante el inicio: {e}")
        
    yield
    
    # Shutdown
    logger.info("Cerrando aplicación Trading AI...")
    try:
        await close_mongo_connection()
        if mt5_provider:
            mt5_provider.disconnect()
        logger.info("✅ Aplicación cerrada correctamente")
    except Exception as e:
        logger.error(f"❌ Error durante el cierre: {e}")

# Crear aplicación FastAPI
app = FastAPI(
    title="Trading AI API",
    description="Sistema de Trading con Inteligencia Artificial",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(pairs_router, prefix="/api/pairs", tags=["pairs"])
app.include_router(signals_router, prefix="/api/signals", tags=["signals"])

# Servir archivos estáticos del frontend
app.mount("/static", StaticFiles(directory="../../frontend/static"), name="static")

@app.get("/")
async def root():
    """Endpoint principal"""
    return {
        "message": "Trading AI API v1.0.0",
        "status": "online",
        "mt5_connected": mt5_provider.connected if mt5_provider else False
    }

@app.get("/health")
async def health_check():
    """Verificación de salud del sistema"""
    try:
        # Verificar conexión a MongoDB
        from database.connection import get_database
        db = await get_database()
        await db.command("ping")
        mongo_status = "connected"
    except Exception as e:
        mongo_status = f"error: {str(e)}"
        logger.error(f"MongoDB health check failed: {e}")
    
    # Verificar conexión a MT5
    mt5_status = "connected" if (mt5_provider and mt5_provider.connected) else "disconnected"
    
    return {
        "status": "healthy",
        "services": {
            "mongodb": mongo_status,
            "metatrader5": mt5_status
        },
        "timestamp": "2024-01-26T10:00:00Z"
    }

@app.get("/api/status")
async def api_status():
    """Estado detallado de la API"""
    try:
        status_info = {
            "api_version": "1.0.0",
            "python_version": "3.11+",
            "services": {
                "mongodb": "✅ Connected",
                "metatrader5": "✅ Connected" if (mt5_provider and mt5_provider.connected) else "❌ Disconnected",
                "ai_engine": "✅ Ready"
            },
            "features": {
                "real_time_data": True,
                "elliott_waves": True,
                "chart_patterns": True,
                "fibonacci_analysis": True,
                "confluence_detection": True,
                "websocket_support": True
            }
        }
        
        return status_info
        
    except Exception as e:
        logger.error(f"Error getting API status: {e}")
        raise HTTPException(status_code=500, detail="Error getting system status")

@app.get("/api/pairs/test")
async def test_mt5_connection():
    """Prueba la conexión con MT5 y obtiene datos de prueba"""
    try:
        if not mt5_provider or not mt5_provider.connected:
            if not mt5_provider.connect():
                raise HTTPException(status_code=503, detail="Cannot connect to MetaTrader 5")
        
        # Obtener datos de prueba
        test_data = mt5_provider.get_realtime_data("EURUSD", "H1", 10)
        
        if test_data is None or test_data.empty:
            raise HTTPException(status_code=404, detail="No data available for EURUSD")
        
        return {
            "status": "success",
            "pair": "EURUSD",
            "timeframe": "H1",
            "data_points": len(test_data),
            "latest_price": float(test_data['close'].iloc[-1]),
            "sample_data": test_data.tail(3).to_dict('records')
        }
        
    except Exception as e:
        logger.error(f"MT5 test failed: {e}")
        raise HTTPException(status_code=500, detail=f"MT5 test failed: {str(e)}")

# Endpoint para reiniciar conexión MT5
@app.post("/api/admin/reconnect-mt5")
async def reconnect_mt5():
    """Reinicia la conexión con MetaTrader 5"""
    try:
        global mt5_provider
        
        if mt5_provider:
            mt5_provider.disconnect()
        
        mt5_provider = MT5DataProvider()
        success = mt5_provider.connect()
        
        return {
            "status": "success" if success else "failed",
            "message": "MT5 reconnection attempted",
            "connected": success
        }
        
    except Exception as e:
        logger.error(f"Error reconnecting MT5: {e}")
        raise HTTPException(status_code=500, detail=f"Reconnection failed: {str(e)}")

# Manejo de errores global
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    return {
        "error": "Internal server error",
        "detail": str(exc) if app.debug else "An unexpected error occurred"
    }

# Configuración para desarrollo
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

    # claves de la cuenta demo mt5 investor:LnAo_6Vk password: Q@Lr6zAo user: 95234648