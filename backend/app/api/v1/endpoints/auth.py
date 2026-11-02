"""Authentication endpoints for ContinuityOS."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token, blacklist_token, is_token_blacklisted, get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency that returns the current authenticated user, or raises 401."""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    jti = payload.get("jti")
    if jti and is_token_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token has been revoked (logged out)")
    
    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = db.query(User).filter(User.id == subject).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
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
    user = db.query(User).filter(User.email == form_data.username).first()
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
    if payload is None or is_token_blacklisted(payload.get("jti", "")):
        raise HTTPException(status_code=400, detail="Invalid or already revoked token")
    jti = payload.get("jti")
    if jti:
        blacklist_token(jti)
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return current_user