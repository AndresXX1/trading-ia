# database/__init__.py
from .connection import get_database, connect_to_mongo, close_mongo_connection
from .user import (
    User, 
    UserCreate, 
    UserUpdate, 
    UserLogin, 
    UserRegister, 
    UserResponse, 
    UserProfile,
    PasswordChange,
    UserPreferences
)

__all__ = [
    # Connection
    "get_database", 
    "connect_to_mongo", 
    "close_mongo_connection",
    
    # User models
    "User",
    "UserCreate", 
    "UserUpdate",
    "UserLogin",
    "UserRegister", 
    "UserResponse",
    "UserProfile",
    "PasswordChange",
    "UserPreferences"
]