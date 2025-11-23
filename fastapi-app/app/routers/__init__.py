"""
Router modules for the FastAPI Hello Application.
"""

from .hello import router as hello_router
from .health import router as health_router
from .info import router as info_router

__all__ = ["hello_router", "health_router", "info_router"]