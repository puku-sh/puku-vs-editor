"""
Information endpoints router.
"""

from fastapi import APIRouter
from typing import Dict

from app.models.response_models import MessageResponse, AboutResponse

router = APIRouter(
    tags=["info"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=MessageResponse)
def read_root() -> Dict[str, str]:
    """
    Root endpoint.
    
    Returns a welcome message.
    """
    return {"message": "Hello World from FastAPI!"}


@router.get("/about", response_model=AboutResponse)
def about() -> Dict[str, str]:
    """
    About endpoint.
    
    Returns information about the API including available endpoints.
    """
    return {
        "name": "FastAPI Hello App",
        "version": "1.0.0",
        "description": "A simple FastAPI application with hello endpoints",
        "endpoints": {
            "GET /": "Root endpoint - welcome message",
            "GET /hello/": "Basic hello endpoint",
            "GET /hello/{name}": "Personalized hello endpoint",
            "GET /health/": "Health check endpoint",
            "GET /about": "About endpoint with API information"
        }
    }