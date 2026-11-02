from app.schemas.health import HealthResponse

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ContinuityOS API", version="0.1.0")
