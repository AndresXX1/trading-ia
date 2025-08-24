from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
import logging

# Modelos
from database.user import User
from database.ai_settings import AISettingsRequest, AISettings, AISettingsResponse, AISettingsValidation
from database.connection import get_database
from api.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ai-settings/save", response_model=AISettingsResponse)
async def save_ai_settings(
    ai_settings_data: AISettingsRequest,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Guarda la configuración de IA específica del usuario
    """
    try:
        user_id = str(current_user.id)
        
        # Validar la configuración antes de guardar
        validation = validate_ai_settings(ai_settings_data)
        if not validation.is_valid:
            return JSONResponse(
                status_code=400,
                content=AISettingsResponse(
                    success=False,
                    message=f"Error de validación: {', '.join(validation.errors)}",
                    timestamp=datetime.utcnow().isoformat()
                ).model_dump()
            )
        
        # Lógica para guardar configuración
        
    except Exception as e:
        logger.error(f"Error saving AI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai-settings/get")
async def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Obtiene la configuración de IA del usuario
    """
    # Lógica para obtener configuración
    pass


@router.post("/ai-settings/validate")
async def validate_ai_settings_endpoint(
    ai_settings_data: AISettingsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Valida la configuración de IA sin guardarla
    """
    # Lógica de validación
    pass


def validate_ai_settings(settings: AISettingsRequest) -> AISettingsValidation:
    """
    Función auxiliar para validar configuración de IA
    """
    errors = []
    
    # Validaciones específicas
    if settings.confluence_threshold < 0 or settings.confluence_threshold > 1:
        errors.append("confluence_threshold debe estar entre 0 y 1")
    
    if settings.risk_per_trade <= 0 or settings.risk_per_trade > 10:
        errors.append("risk_per_trade debe estar entre 0 y 10")
    
    # Más validaciones...
    
    return AISettingsValidation(
        is_valid=len(errors) == 0,
        errors=errors
    )
