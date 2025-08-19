from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
import logging
import json
from contextlib import asynccontextmanager
from bson import ObjectId
from datetime import datetime
import numpy as np
import pandas as pd

# Importar routers
from api.auth import router as auth_router
from api.pairs import router as pairs_router
from api.signals import router as signals_router
# Nuevos routers importados
from api.charts_endpoints import router as charts_router  # Router de gráficos
from api.mt5_endpoints import router as mt5_router  # Router de integración MT5

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

# Clase para manejar la serialización personalizada - MEJORADA
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, (np.float32, np.float64, np.floating)):
            return float(obj)
        elif isinstance(obj, (np.int32, np.int64, np.integer)):
            return int(obj)
        elif isinstance(obj, (pd.Timestamp)):
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            return self.default(obj.__dict__)
        return super().default(obj)

# Función auxiliar para preparar datos para JSON - MEJORADA
def prepare_for_json_serialization(data):
    """
    Convierte recursivamente todos los tipos no serializables a JSON
    """
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Convertir _id a id para mejor manejo en frontend
            if key == "_id" and isinstance(value, ObjectId):
                result["id"] = str(value)
            else:
                result[key] = prepare_for_json_serialization(value)
        return result
    elif isinstance(data, (list, tuple)):
        return [prepare_for_json_serialization(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, (np.float32, np.float64, np.floating)):
        return float(data)
    elif isinstance(data, (np.int32, np.int64, np.integer)):
        return int(data)
    elif isinstance(data, pd.Timestamp):
        return data.isoformat()
    elif hasattr(data, '__dict__'):
        return prepare_for_json_serialization(data.__dict__)
    elif data is None:
        return None
    else:
        return data

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
            logger.warning("⚠️ No se pudo conectar a MetaTrader 5")
            
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

# 🚀 CONFIGURACIÓN CORS MEJORADA - SOLUCIONADO
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# 🔧 MIDDLEWARE PARA MANEJAR ERRORES CON CORS
@app.middleware("http")
async def cors_error_handler(request: Request, call_next):
    """
    Middleware que asegura que TODOS los errores incluyan headers CORS
    """
    try:
        response = await call_next(request)
        
        # Agregar headers CORS a TODAS las respuestas
        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
        
        for key, value in cors_headers.items():
            response.headers[key] = value
            
        return response
        
    except Exception as e:
        logger.error(f"Error en middleware CORS: {e}", exc_info=True)
        
        # Devolver error con headers CORS
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(e),
                "timestamp": datetime.utcnow().isoformat()
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
            }
        )

# MIDDLEWARE para manejar ObjectId serialization 
@app.middleware("http")
async def objectid_serialization_middleware(request: Request, call_next):
    """
    Middleware que intercepta todas las respuestas y convierte ObjectIds a strings
    """
    try:
        response = await call_next(request)
        
        # Solo procesar respuestas con contenido JSON
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response
            
        # Interceptar el contenido de la respuesta
        if hasattr(response, 'body'):
            try:
                # Leer el body de la respuesta
                body = b""
                async for chunk in response.body_iterator:
                    body += chunk
                
                # Decodificar JSON
                if body:
                    try:
                        data = json.loads(body.decode())
                        # Procesar los datos para eliminar ObjectIds
                        cleaned_data = prepare_for_json_serialization(data)
                        
                        # Crear nueva respuesta con datos limpios
                        return JSONResponse(
                            content=cleaned_data,
                            status_code=response.status_code,
                            headers=dict(response.headers)
                        )
                    except (json.JSONDecodeError, UnicodeDecodeError) as e:
                        logger.warning(f"Error decodificando respuesta JSON: {e}")
                        return response
                        
            except Exception as e:
                logger.warning(f"Error procesando respuesta en middleware: {e}")
                return response
                
        return response
        
    except ValueError as e:
        # Capturar errores específicos de ObjectId
        if "ObjectId" in str(e):
            logger.error(f"Error de serialización ObjectId interceptado: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Serialization Error",
                    "detail": "Data contains non-serializable ObjectId. Please contact support.",
                    "message": "Error interno de serialización"
                },
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        raise
        
    except Exception as e:
        logger.error(f"Error inesperado en middleware: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred",
                "message": "Error interno del servidor"
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", 
                "Access-Control-Allow-Headers": "*",
            }
        )

# 🎯 HANDLER PARA OPTIONS (PREFLIGHT)
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Maneja todas las requests OPTIONS (CORS preflight)"""
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# Incluir routers originales
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(pairs_router, prefix="/api/pairs", tags=["pairs"])
app.include_router(signals_router, prefix="/api/signals", tags=["signals"])

# Incluir nuevos routers
app.include_router(charts_router, prefix="/api/charts", tags=["charts", "visualization"])
app.include_router(mt5_router, prefix="/api/mt5", tags=["metatrader5", "trading"])

# Servir archivos estáticos del frontend
try:
    app.mount("/static", StaticFiles(directory="../../frontend/static"), name="static")
except Exception as e:
    logger.warning(f"No se pudo montar directorio estático: {e}")

@app.get("/")
async def root():
    """Endpoint principal"""
    return {
        "message": "Trading AI API v1.0.0",
        "status": "online",
        "mt5_connected": mt5_provider.connected if mt5_provider else False,
        "available_endpoints": {
            "authentication": "/api/auth",
            "pairs": "/api/pairs", 
            "signals": "/api/signals",
            "charts": "/api/charts",
            "mt5_integration": "/api/mt5"
        },
        "timestamp": datetime.utcnow().isoformat()
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
        "endpoints": {
            "total": 4,
            "active": ["auth", "pairs", "signals", "charts", "mt5"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# 🚨 MANEJO DE ERRORES GLOBAL CORREGIDO
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Maneja errores globales con CORS headers incluidos"""
    
    # Log detallado del error
    logger.error(f"Global exception on {request.method} {request.url}: {exc}", exc_info=True)
    
    # Headers CORS para TODOS los errores
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": "true",
    }
    
    # Manejo específico para errores de ObjectId
    if "ObjectId" in str(exc):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Data Serialization Error",
                "detail": "Database object could not be serialized to JSON",
                "message": "Error de serialización de datos",
                "url": str(request.url),
                "method": request.method
            },
            headers=cors_headers
        )
    
    # Error general
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "message": "Error interno del servidor",
            "url": str(request.url),
            "method": request.method
        },
        headers=cors_headers
    )

# 🧪 ENDPOINT DE TESTING CORS
@app.get("/api/test-cors")
async def test_cors():
    """Endpoint para probar CORS"""
    return JSONResponse(
        content={
            "message": "CORS test successful",
            "timestamp": datetime.utcnow().isoformat(),
            "headers_sent": "CORS headers included"
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

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