from datetime import datetime
from fastapi import APIRouter, Depends
from bson import ObjectId

from database.connection import db_manager
from database.user import User
from api.auth import get_current_active_user

from database.risk_management import (
    ExtendedRiskConfig,
    RiskLockRequest,
    RiskLockResponse,
)

router = APIRouter(prefix="/risk", tags=["risk-management"])


@router.get("/status", response_model=RiskLockResponse)
async def get_risk_lock_status(current_user: User = Depends(get_current_active_user)):
    """Devuelve el estado del lock de gestión de riesgo del usuario."""
    doc = await db_manager.find_one("users", {"_id": ObjectId(str(current_user.id))})
    risk_lock = (doc or {}).get("risk_lock", None)

    if not risk_lock or not risk_lock.get("locked"):
        return RiskLockResponse(
            locked=False,
            locked_at="",
            total_capital=float((doc or {}).get("risk_management", {}).get("total_capital", 0)) if doc else 0.0,
            risk_percentage=float((doc or {}).get("risk_management", {}).get("risk_percentage", 1)) if doc else 1.0,
            source=str((doc or {}).get("risk_lock", {}).get("source", "unknown")) if doc else "unknown",
            mt5_snapshot=(doc or {}).get("risk_lock", {}).get("mt5_snapshot"),
            extended_risk_config=None
        )

    extended_config = risk_lock.get("extended_risk_config")
    extended_risk_config = ExtendedRiskConfig(**extended_config) if extended_config else None

    return RiskLockResponse(
        locked=True,
        locked_at=risk_lock.get("locked_at"),
        total_capital=float(risk_lock.get("total_capital", 0.0)),
        risk_percentage=float(risk_lock.get("risk_percentage", 0.0)),
        source=risk_lock.get("source", "unknown"),
        mt5_snapshot=risk_lock.get("mt5_snapshot"),
        extended_risk_config=extended_risk_config
    )


@router.post("/lock", response_model=RiskLockResponse, status_code=201)
async def lock_risk_configuration(
    payload: RiskLockRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Bloquea la configuración de riesgo del usuario y la persiste en el documento de usuario."""
    now_iso = datetime.utcnow().isoformat()

    risk_lock_data = {
        "locked": True,
        "locked_at": now_iso,
        "total_capital": float(payload.total_capital),
        "risk_percentage": float(payload.risk_percentage),
        "source": payload.source,
        "mt5_snapshot": payload.mt5_snapshot or {},
    }
    
    if payload.extended_risk_config:
        risk_lock_data["extended_risk_config"] = payload.extended_risk_config.dict()

    update_data = {
        "risk_lock": risk_lock_data,
        "risk_management": {
            "total_capital": float(payload.total_capital),
            "risk_percentage": float(payload.risk_percentage),
            "locked": True,
            "locked_at": now_iso,
            "source": payload.source,
            "extended_risk_config": payload.extended_risk_config.dict() if payload.extended_risk_config else None
        },
        "updated_at": datetime.utcnow(),
    }

    await db_manager.update_one(
        "users",
        {"_id": ObjectId(str(current_user.id))},
        update_data,
    )

    return RiskLockResponse(
        locked=True,
        locked_at=now_iso,
        total_capital=float(payload.total_capital),
        risk_percentage=float(payload.risk_percentage),
        source=payload.source,
        mt5_snapshot=payload.mt5_snapshot or {},
        extended_risk_config=payload.extended_risk_config
    )
