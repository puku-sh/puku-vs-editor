"""
Core application components.
"""

from .dependencies import get_settings, get_hello_service, get_user_service
from .exceptions import setup_exception_handlers
from .middleware import setup_middleware

__all__ = [
    "get_settings",
    "get_hello_service", 
    "get_user_service",
    "setup_exception_handlers",
    "setup_middleware"
]