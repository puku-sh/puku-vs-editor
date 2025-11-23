"""
FastAPI Hello Application - Main Entry Point

A modular FastAPI application demonstrating best practices.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import hello_router, health_router, info_router, users_router

# Get application settings
settings = get_settings()

# Create FastAPI instance with configuration
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A simple FastAPI application with hello endpoints",
    debug=settings.debug,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.openapi_url,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=settings.allow_methods,
    allow_headers=settings.allow_headers,
)

# Include routers
app.include_router(info_router)
app.include_router(hello_router)
app.include_router(health_router)
app.include_router(users_router)


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    print(f"🚀 {settings.app_name} v{settings.app_version} is starting up...")
    print(f"📚 API Documentation: http://{settings.host}:{settings.port}{settings.docs_url}")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    print(f"🛑 {settings.app_name} is shutting down...")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug"
    )