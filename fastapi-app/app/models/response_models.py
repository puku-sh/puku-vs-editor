"""
Response models for API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class MessageResponse(BaseModel):
    """Standard message response model."""
    message: str = Field(..., description="Response message")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HelloResponse(BaseModel):
    """Hello endpoint response model."""
    message: str = Field(..., description="Personalized hello message")
    name: str = Field(..., description="The name that was greeted")
    title: Optional[str] = Field(None, description="Title used in greeting")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Greeting timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BulkHelloResponse(BaseModel):
    """Bulk hello response model."""
    greetings: List[str] = Field(..., description="List of personalized greetings")
    count: int = Field(..., description="Number of greetings generated")
    template: str = Field(..., description="Template used for greetings")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    version: str = Field(default="1.0.0", description="Service version")
    uptime: Optional[str] = Field(None, description="Service uptime")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AboutResponse(BaseModel):
    """About endpoint response model."""
    name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    description: str = Field(..., description="Application description")
    endpoints: Dict[str, str] = Field(default_factory=dict, description="Available endpoints")
    features: List[str] = Field(default_factory=list, description="Application features")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserResponse(BaseModel):
    """User response model."""
    id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    full_name: Optional[str] = Field(None, description="Full name")
    is_active: bool = Field(..., description="Whether the user is active")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }