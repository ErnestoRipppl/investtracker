from datetime import datetime, timedelta
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
def login(data: LoginRequest):
    """
    Login endpoint. Checks password against hashed password in configuration.
    Returns signed JWT token if correct.
    """
    if not settings.AUTH_PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AUTH_PASSWORD_HASH no está configurado en el servidor.",
        )
    
    try:
        # Verify using bcrypt
        password_bytes = data.password.encode("utf-8")
        hash_bytes = settings.AUTH_PASSWORD_HASH.encode("utf-8")
        is_valid = bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        is_valid = False
        
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        )
        
    # Generate token
    # Expiration: 30 days
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode = {"exp": expire, "sub": "user"}
    token = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return {"token": token}


def require_auth(request: Request) -> dict:
    """
    Dependency to validate JWT Bearer token in request headers.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta la cabecera de autorización",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de cabecera de autorización inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = parts[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
