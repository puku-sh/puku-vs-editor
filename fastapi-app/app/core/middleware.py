"""
Custom middleware for the FastAPI application.
"""

import logging
import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


def setup_middleware(app: FastAPI) -> None:
    """
    Setup custom middleware for the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    
    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next: Callable) -> Response:
        """
        Middleware to log requests and responses with timing.
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Store request ID in state for use in endpoints
        request.state.request_id = request_id
        
        # Log request
        start_time = time.time()
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"(ID: {request_id}, Client: {request.client.host if request.client else 'unknown'})"
        )
        
        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"Request completed: {request.method} {request.url.path} "
                f"(ID: {request_id}, Status: {response.status_code}, "
                f"Time: {process_time:.4f}s)"
            )
            
            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request failed: {request.method} {request.url.path} "
                f"(ID: {request_id}, Error: {str(e)}, Time: {process_time:.4f}s)"
            )
            raise
    
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next: Callable) -> Response:
        """
        Middleware to add security headers.
        """
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response


def setup_cors_middleware(app: FastAPI, allow_origins: list, allow_methods: list, allow_headers: list) -> None:
    """
    Setup CORS middleware.
    
    Args:
        app: FastAPI application instance
        allow_origins: List of allowed origins
        allow_methods: List of allowed methods
        allow_headers: List of allowed headers
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=allow_methods,
        allow_headers=allow_headers,
    )