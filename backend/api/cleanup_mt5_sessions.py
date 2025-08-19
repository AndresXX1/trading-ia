"""
Endpoint temporal para limpiar sesiones MT5 - USAR SOLO UNA VEZ
"""
from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_database
from database.models import User
from api.auth import get_current_user
from datetime import datetime

cleanup_router = APIRouter()

@cleanup_router.post("/admin/cleanup-mt5-sessions")
async def cleanup_mt5_sessions(
    current_user: User = Depends(get_current_user), 
    db=Depends(get_database)
):
    """
    ENDPOINT TEMPORAL: Limpia todas las sesiones MT5 existentes
    Solo para administradores - EJECUTAR UNA SOLA VEZ
    """
    if current_user.role != "user":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Marcar todas las sesiones como desconectadas
        result = await db.mt5_sessions.update_many(
            {},
            {
                "$set": {
                    "is_connected": False,
                    "updated_at": datetime.utcnow(),
                    "cleanup_applied": True
                }
            }
        )
        
        # Crear índice único por user_id
        try:
            await db.mt5_sessions.create_index("user_id", unique=True)
        except Exception:
            pass  # Índice ya existe
        
        return {
            "success": True,
            "sessions_cleaned": result.modified_count,
            "message": "All MT5 sessions cleaned successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")
