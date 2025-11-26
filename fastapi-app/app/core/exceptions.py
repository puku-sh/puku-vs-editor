"""
Global exception handlers for the FastAPI application.
"""

import logging
from typing import Union

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.models.response_models import MessageResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception."""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationException(AppException):
    """Validation exception."""
    
    def __init__(self, message: str):
        super().__init__(message, 400)


class NotFoundException(AppException):
    """Not found exception."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, 404)


class ConflictException(AppException):
    """Conflict exception."""
    
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, 409)


def create_error_response(message: str, status_code: int, path: str = None) -> JSONResponse:
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        status_code: HTTP status code
        path: Request path (optional)
        
    Returns:
        JSONResponse: Standardized error response
    """
    content = {
        "error": True,
        "message": message,
        "status_code": status_code
    }
    
    if path:
        content["path"] = path
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    logger.error(f"App exception: {exc.message} (Status: {exc.status_code})")
    return create_error_response(exc.message, exc.status_code, str(request.url))


async def http_exception_handler(request: Request, exc: Union[HTTPException, StarletteHTTPException]) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP exception: {exc.detail} (Status: {exc.status_code})")
    return create_error_response(exc.detail, exc.status_code, str(request.url))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle validation exceptions."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append(f"{field}: {error['msg']}")
    
    message = "Validation failed: " + "; ".join(errors)
    logger.warning(f"Validation exception: {message}")
    return create_error_response(message, 422, str(request.url))


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return create_error_response(
        "Internal server error", 
        500, 
        str(request.url)
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Setup exception handlers for the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)