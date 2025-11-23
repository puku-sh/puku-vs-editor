"""
Health check endpoints router.
"""

from fastapi import APIRouter
from typing import Dict

from app.models.response_models import HealthResponse

router = APIRouter(
    prefix="/health",
    tags=["health"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=HealthResponse)
def health_check() -> Dict[str, str]:
    """
    Health check endpoint.
    
    Returns the current health status of the service.
    """
    return {
        "status": "healthy",
        "service": "FastAPI Hello App",
        "version": "1.0.0"
    }