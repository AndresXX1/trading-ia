import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import logging
from typing import Optional

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None # type: ignore
    database = None

# Instancia global
mongodb = MongoDB()

async def connect_to_mongo():
    """Conectar a MongoDB"""
    try:
        # Configuración desde variables de entorno
        MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        DATABASE_NAME = os.getenv("MONGODB_DATABASE", "trading_ia")

        # Crear cliente
        mongodb.client = AsyncIOMotorClient(
            MONGO_URL,
            maxPoolSize=10,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000
        )
        
        # Probar conexión
        await mongodb.client.admin.command('ping')
        
        # Configurar base de datos
        mongodb.database = mongodb.client[DATABASE_NAME]
        
        # Crear índices
        await create_indexes()
        
        logging.info(f"Conectado a MongoDB: {DATABASE_NAME}")
        
    except ConnectionFailure as e:
        logging.error(f"Error conectando a MongoDB: {e}")
        raise
    except Exception as e:
        logging.error(f"Error inesperado conectando a MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Cerrar conexión a MongoDB"""
    if mongodb.client:
        mongodb.client.close()
        logging.info("Conexión a MongoDB cerrada")

async def create_indexes():
    """Crear índices necesarios para optimizar consultas"""
    try:
        # Índices para usuarios
        await mongodb.database.users.create_index("username", unique=True)
        await mongodb.database.users.create_index("email", unique=True)
        await mongodb.database.users.create_index("created_at")
        
        # Índices para señales
        await mongodb.database.signals.create_index([
            ("symbol", 1),
            ("timeframe", 1),
            ("created_at", -1)
        ])
        await mongodb.database.signals.create_index("is_active")
        await mongodb.database.signals.create_index("signal_type")
        await mongodb.database.signals.create_index("confluence_score")
        await mongodb.database.signals.create_index("created_at")
        await mongodb.database.signals.create_index("expires_at")
        
        # Índices para datos de mercado
        await mongodb.database.market_data.create_index([
            ("symbol", 1),
            ("timeframe", 1)
        ], unique=True)
        await mongodb.database.market_data.create_index("last_updated")
        
        # Índices para alertas
        await mongodb.database.alerts.create_index("user_id")
        await mongodb.database.alerts.create_index("symbol")
        await mongodb.database.alerts.create_index("is_triggered")
        await mongodb.database.alerts.create_index("created_at")
        
        # Índices para performance
        await mongodb.database.performance_stats.create_index("user_id")
        await mongodb.database.performance_stats.create_index([
            ("period_start", 1),
            ("period_end", 1)
        ])
        
        logging.info("Índices de MongoDB creados exitosamente")
        
    except Exception as e:
        logging.error(f"Error creando índices: {e}")

# Funciones de utilidad para obtener colecciones
def get_users_collection():
    return mongodb.database.users

def get_signals_collection():
    return mongodb.database.signals

def get_market_data_collection():
    return mongodb.database.market_data

def get_alerts_collection():
    return mongodb.database.alerts

def get_performance_collection():
    return mongodb.database.performance_stats

def get_system_config_collection():
    return mongodb.database.system_config

def get_database():
    return mongodb.database

# Clase helper para operaciones comunes
class DatabaseManager:
    @staticmethod
    async def insert_one(collection_name: str, document: dict):
        """Insertar un documento"""
        collection = mongodb.database[collection_name]
        result = await collection.insert_one(document)
        return result.inserted_id
    
    @staticmethod
    async def find_one(collection_name: str, filter_dict: dict):
        """Encontrar un documento"""
        collection = mongodb.database[collection_name]
        return await collection.find_one(filter_dict)
    
    @staticmethod
    async def find_many(collection_name: str, filter_dict: dict = None, limit: int = None, sort: list = None):
        """Encontrar múltiples documentos"""
        collection = mongodb.database[collection_name]
        cursor = collection.find(filter_dict or {})
        
        if sort:
            cursor = cursor.sort(sort)
        if limit:
            cursor = cursor.limit(limit)
        
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def update_one(collection_name: str, filter_dict: dict, update_dict: dict):
        """Actualizar un documento"""
        collection = mongodb.database[collection_name]
        result = await collection.update_one(filter_dict, {"$set": update_dict})
        return result.modified_count
    
    @staticmethod
    async def delete_one(collection_name: str, filter_dict: dict):
        """Eliminar un documento"""
        collection = mongodb.database[collection_name]
        result = await collection.delete_one(filter_dict)
        return result.deleted_count
    
    @staticmethod
    async def count_documents(collection_name: str, filter_dict: dict = None):
        """Contar documentos"""
        collection = mongodb.database[collection_name]
        return await collection.count_documents(filter_dict or {})
    
    @staticmethod
    async def aggregate(collection_name: str, pipeline: list):
        """Ejecutar pipeline de agregación"""
        collection = mongodb.database[collection_name]
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

# Instancia global del manager
db_manager = DatabaseManager()