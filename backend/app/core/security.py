from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Set

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import User  # Add this import

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Token blacklist for logout/invalidation (in-memory; use Redis in production)
BLACKLISTED_TOKENS: Set[str] = set()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: Any, expires_delta: timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def is_token_blacklisted(jti: str) -> bool:
    """Check if a token's JTI (JWT ID) is blacklisted (logged out/invalidated)."""
    return jti in BLACKLISTED_TOKENS


def blacklist_token(jti: str) -> None:
    """Add a token JTI to the blacklist to invalidate it."""
    BLACKLISTED_TOKENS.add(jti)


def get_current_user(token: str = ...) -> User:
    """Dependency that returns the current authenticated user, or raises 401."""
    # This is a placeholder; the actual dependency is defined in endpoints
    pass
