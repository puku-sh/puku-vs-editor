"""
Request models for API endpoints.
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List
from datetime import datetime

class BaseRequest(BaseModel):
    """Base request model with common fields."""
    request_id: Optional[str] = Field(None, description="Unique request identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Request timestamp")
    
    class Config:
        allow_population_by_field_name = True

    @validator('request_id')
    def validate_request_id(cls, v):
        """Validate request ID format if provided."""
        if v and not re.match(r'^[a-zA-Z0-9\-_]+$', v):
            raise ValueError('Request ID can only contain letters, numbers, hyphens, and underscores')
        return v.lower() if v else v
    
    @validator('timestamp')
    def validate_timestamp(cls, v):
        """Ensure timestamp is in UTC."""
        if v.tzinfo is not None:
            v = v.astimezone(timezone.utc).replace(tzinfo=None)
        return v
    

class HelloRequest(BaseModel):
    """Request model for hello endpoint with extended features."""
    name: str = Field(..., min_length=1, max_length=100, description="Name to greet")
    title: Optional[str] = Field(None, max_length=50, description="Optional title")
    age: Optional[int] = Field(None, ge=0, le=150, description="Optional age")
    email: Optional[EmailStr] = Field(None, description="Optional email address")
    
    @validator('name')
    def validate_name(cls, v):
        """Validate that name contains only valid characters."""
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError('Name can only contain letters, spaces, hyphens, apostrophes, and periods')
        return v.strip()
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title if provided."""
        if v and not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError('Title can only contain letters, spaces, hyphens, apostrophes, and periods')
        return v.strip() if v else v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "John Doe",
                "title": "Dr.",
                "age": 30,
                "email": "john.doe@example.com"
            }
        }


class BulkHelloRequest(BaseModel):
    """Request model for bulk hello operations."""
    names: List[str] = Field(..., min_items=1, max_items=10, description="List of names to greet")
    message_template: Optional[str] = Field("Hello {name}!", description="Custom message template")
    
    @validator('names')
    def validate_names(cls, v):
        """Validate all names in the list."""
        for name in v:
            if not name or len(name.strip()) == 0:
                raise ValueError('All names must be non-empty')
            if len(name) > 100:
                raise ValueError('Each name must be 100 characters or less')
        return [name.strip() for name in v]
    
    @validator('message_template')
    def validate_template(cls, v):
        """Validate message template contains {name} placeholder."""
        if '{name}' not in v:
            raise ValueError('Message template must contain {name} placeholder')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "names": ["Alice", "Bob", "Charlie"],
                "message_template": "Greetings {name}!"
            }
        }


class UserCreateRequest(BaseModel):
    """User creation request model."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="Valid email address")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    is_active: bool = Field(True, description="Whether the user is active")
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username format."""
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v.lower()
    
    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john.doe@example.com",
                "full_name": "John Doe",
                "is_active": True
            }
        }