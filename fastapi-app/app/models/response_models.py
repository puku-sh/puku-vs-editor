"""
Response models for API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any


class MessageResponse(BaseModel):
    """Standard message response model."""
    message: str = Field(..., description="Response message")


class HelloResponse(BaseModel):
    """Hello endpoint response model."""
    message: str = Field(..., description="Personalized hello message")


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    version: str = Field(default="1.0.0", description="Service version")


class AboutResponse(BaseModel):
    """About endpoint response model."""
    name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    description: str = Field(..., description="Application description")
    endpoints: Dict[str, str] = Field(default_factory=dict, description="Available endpoints")