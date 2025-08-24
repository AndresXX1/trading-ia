from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, Field, EmailStr
import os

from database.user import User, UserLogin, UserRegister, UserResponse
from database.connection import db_manager

# Configuración
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Contexto de encriptación
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
router = APIRouter(prefix="/auth", tags=["authentication"])


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    username: Optional[str] = None
    email: Optional[str] = None



class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None


# Utilidades de autenticación
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Obtener hash de contraseña"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crear token de acceso"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Crear token de actualización"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_user_by_email(email: str) -> Optional[User]:
    user_data = await db_manager.find_one("users", {"email": email})
    if user_data:
        user_data["_id"] = str(user_data["_id"])
        return User(**user_data)
    return None


async def get_user_by_id(user_id: str) -> Optional[User]:
    from bson import ObjectId
    try:
        user_data = await db_manager.find_one("users", {"_id": ObjectId(user_id)})
        if user_data:
            user_data["_id"] = str(user_data["_id"])
            return User(**user_data)
    except Exception:
        pass
    return None


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Autenticar usuario"""
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Obtener usuario actual desde el token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        user_id: Optional[str] = payload.get("user_id")
        token_type: Optional[str] = payload.get("type")

        if email is None or user_id is None or token_type != "access":
            raise credentials_exception

        _ = TokenData(username=email, user_id=user_id)
    except JWTError:
        raise credentials_exception

    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Obtener usuario activo actual"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Endpoints existentes de auth
@router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister):
    """Registrar nuevo usuario"""
    # Verificar si el username ya existe (usado como email por error previo, lo corregimos)
    existing_user = await db_manager.find_one("users", {"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Verificar si el email ya existe
    existing_email = await db_manager.find_one("users", {"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Crear nuevo usuario
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password
    )

    # Insertar en base de datos
    user_dict = new_user.dict(by_alias=True)
    await db_manager.insert_one("users", user_dict)

    # Retornar respuesta sin contraseña
    return UserResponse(
        id=str(new_user.id),
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        preferred_pairs=new_user.preferred_pairs,
        preferred_timeframes=new_user.preferred_timeframes
    )


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """Iniciar sesión"""
    user = await authenticate_user(user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Crear tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.email, "user_id": str(user.id)}
    )

    return Token(
    access_token=access_token,
    refresh_token=refresh_token,
    expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    user_id=str(user.id),
    username=user.username,
    email=user.email
)

@router.post("/refresh", response_model=Token)
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Renovar token de acceso"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        user_id: Optional[str] = payload.get("user_id")
        token_type: Optional[str] = payload.get("type")

        if username is None or user_id is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Verificar que el usuario existe y está activo
    user = await get_user_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_exception

    # Crear nuevos tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": str(user.id)},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.username, "user_id": str(user.id)}
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Obtener información del usuario actual"""
    return UserResponse(
        id=str(current_user.id),
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        preferred_pairs=current_user.preferred_pairs,
        preferred_timeframes=current_user.preferred_timeframes
    )


@router.put("/me", response_model=UserResponse)
async def update_user_preferences(
        preferences: dict,
        current_user: User = Depends(get_current_active_user)
    ):
    """Actualizar preferencias del usuario"""
    from bson import ObjectId

    # Campos permitidos para actualizar
    allowed_fields = {
        "preferred_pairs",
        "preferred_timeframes",
        "notification_settings",
    }

    update_data = {k: v for k, v in preferences.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.utcnow()

    if update_data:
        await db_manager.update_one(
            "users",
            {"_id": ObjectId(current_user.id)},
            update_data
        )

    # Obtener usuario actualizado
    updated_user = await get_user_by_id(str(current_user.id))

    return UserResponse(
        id=str(updated_user.id),
        username=updated_user.username,
        email=updated_user.email,
        role=updated_user.role,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at,
        preferred_pairs=updated_user.preferred_pairs,
        preferred_timeframes=updated_user.preferred_timeframes
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """Cerrar sesión (en una implementación real, aquí invalidarías el token)"""
    return {"message": "Successfully logged out"}


# ---------------------------
# Nuevos endpoints: Lock de Gestión de Riesgo
# ---------------------------

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
    extended_risk_config: Optional[ExtendedRiskConfig] = None  # Configuración extendida


@router.get("/risk/status", response_model=RiskLockResponse)
async def get_risk_lock_status(current_user: User = Depends(get_current_active_user)):
    """Devuelve el estado del lock de gestión de riesgo del usuario."""
    from bson import ObjectId

    doc = await db_manager.find_one("users", {"_id": ObjectId(str(current_user.id))})
    risk_lock = (doc or {}).get("risk_lock", None)

    if not risk_lock or not risk_lock.get("locked"):
        # por consistencia retornamos un estado "no locked" con valores base
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


@router.post("/risk/lock", response_model=RiskLockResponse, status_code=201)
async def lock_risk_configuration(
    payload: RiskLockRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Bloquea la configuración de riesgo del usuario y la persiste en el documento de usuario."""
    from bson import ObjectId

    now_iso = datetime.utcnow().isoformat()

    risk_lock_data = {
        "locked": True,
        "locked_at": now_iso,
        "total_capital": float(payload.total_capital),
        "risk_percentage": float(payload.risk_percentage),
        "source": payload.source,
        "mt5_snapshot": payload.mt5_snapshot or {},
    }
    
    # Agregar configuración extendida si existe
    if payload.extended_risk_config:
        risk_lock_data["extended_risk_config"] = payload.extended_risk_config.dict()

    # Grabar un registro inmutable del lock en el documento del usuario
    update_data = {
        "risk_lock": risk_lock_data,
        # opcional: duplicar en un subdocumento visible
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
