from app.schemas.health import HealthResponse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database health check failed") from exc
    return HealthResponse(status="ok", service="ContinuityOS API", version="0.1.0")
