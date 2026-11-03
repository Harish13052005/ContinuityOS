"""Authentication endpoints for ContinuityOS."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.models.token_revocation import TokenRevocation
from datetime import timedelta
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency that returns the current authenticated user, or raises 401."""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    jti = payload.get("jti")
    if jti and db.get(TokenRevocation, jti) is not None:
        raise HTTPException(status_code=401, detail="Token has been revoked (logged out)")
    
    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.id == subject).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=str(payload.email).lower(),
        full_name=payload.full_name,
        role="member",
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db.execute(delete(TokenRevocation).where(TokenRevocation.expires_at < datetime.now(timezone.utc) - timedelta(days=1)))
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    # Include JTI (JWT ID) for token invalidation/logout
    jti = str(uuid.uuid4())
    token_jwt = create_access_token(subject={"sub": user.id, "jti": jti})
    return Token(access_token=token_jwt)


@router.post("/logout", response_model=dict)
def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Blacklist the current token to invalidate it."""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=400, detail="Invalid or already revoked token")
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=400, detail="Token cannot be revoked")
    if db.get(TokenRevocation, jti) is not None:
        raise HTTPException(status_code=400, detail="Invalid or already revoked token")
    expiry = payload.get("exp")
    expires_at = datetime.fromtimestamp(expiry, tz=timezone.utc) if expiry else datetime.now(timezone.utc)
    db.add(TokenRevocation(jti=jti, expires_at=expires_at))
    db.commit()
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserRead)
def update_current_user(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Full name cannot be empty")
    current_user.full_name = full_name
    db.commit()
    db.refresh(current_user)
    return current_user
