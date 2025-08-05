from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Reemplaza con tu cadena de conexión actual de MongoDB Atlas
uri = "mongodb+srv://trading-ia:512364@trading-ia.qns3sgo.mongodb.net/?retryWrites=true&w=majority&appName=trading-ia"

# Crear cliente Mongo con compatibilidad con Server API v1
client = MongoClient(uri, server_api=ServerApi('1'))

try:
    # Comando 'ping' para confirmar que hay conexión con el clúster
    client.admin.command('ping')
    print("✅ Conexión exitosa a MongoDB Atlas")
except Exception as e:
    print("❌ Error al conectar a MongoDB Atlas:")
    print(e)
