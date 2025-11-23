"""
Health check endpoints router.
"""

from fastapi import APIRouter
from typing import Dict
from datetime import datetime, timedelta
import time

from app.models.response_models import HealthResponse

# Store application start time
start_time = time.time()

router = APIRouter(
    prefix="/health",
    tags=["health"],
    responses={404: {"description": "Not found"}},
)


def get_uptime() -> str:
    """Calculate application uptime."""
    uptime_seconds = int(time.time() - start_time)
    uptime_duration = timedelta(seconds=uptime_seconds)
    
    days = uptime_duration.days
    hours, remainder = divmod(uptime_duration.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m {seconds}s"
    elif hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    elif minutes > 0:
        return f"{minutes}m {seconds}s"
    else:
        return f"{seconds}s"


@router.get("/", response_model=HealthResponse)
def health_check() -> Dict[str, object]:
    """
    Health check endpoint.
    
    Returns the current health status of the service with uptime information.
    """
    return {
        "status": "healthy",
        "service": "FastAPI Hello App",
        "version": "1.0.0",
        "uptime": get_uptime()
    }