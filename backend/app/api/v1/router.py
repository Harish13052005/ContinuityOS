"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.sources import router as sources_router
from app.api.v1.endpoints.extraction import router as extraction_router
from app.api.v1.endpoints.reconstruction import router as reconstruction_router
from app.api.v1.endpoints.extracted_items import router as extracted_items_router
from app.api.v1.endpoints.handover import router as handover_router
from app.api.v1.endpoints.dashboard import router as dashboard_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(sources_router)
api_router.include_router(extraction_router)
api_router.include_router(reconstruction_router)
api_router.include_router(extracted_items_router)
api_router.include_router(handover_router)
api_router.include_router(dashboard_router)
