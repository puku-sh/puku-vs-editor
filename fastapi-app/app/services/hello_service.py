"""
Hello service for business logic.
"""

import logging
from typing import List, Dict, Any
from datetime import datetime

from app.models.request_models import HelloRequest, BulkHelloRequest
from app.models.response_models import HelloResponse, BulkHelloResponse
from app.core.exceptions import ValidationException

logger = logging.getLogger(__name__)


class HelloService:
    """Service for handling hello-related business logic."""
    
    def __init__(self):
        """Initialize the hello service."""
        self._greeting_count = 0
    
    def get_basic_greeting(self) -> Dict[str, Any]:
        """
        Get a basic greeting.
        
        Returns:
            Dict containing basic greeting
        """
        self._greeting_count += 1
        logger.info(f"Generated basic greeting (count: {self._greeting_count})")
        
        return {
            "message": "Hello World!",
            "timestamp": datetime.utcnow()
        }
    
    def get_personalized_greeting(self, name: str) -> Dict[str, Any]:
        """
        Get a personalized greeting.
        
        Args:
            name: Name to greet
            
        Returns:
            Dict containing personalized greeting
            
        Raises:
            ValidationException: If name is invalid
        """
        if not name or len(name.strip()) == 0:
            raise ValidationException("Name cannot be empty")
        
        if len(name) > 100:
            raise ValidationException("Name must be 100 characters or less")
        
        self._greeting_count += 1
        clean_name = name.strip()
        
        logger.info(f"Generated personalized greeting for '{clean_name}' (count: {self._greeting_count})")
        
        return {
            "message": f"Hello {clean_name}!",
            "name": clean_name,
            "timestamp": datetime.utcnow()
        }
    
    def get_advanced_greeting(self, request: HelloRequest) -> Dict[str, Any]:
        """
        Get an advanced greeting with detailed information.
        
        Args:
            request: Hello request with detailed information
            
        Returns:
            Dict containing advanced greeting
        """
        self._greeting_count += 1
        
        # Build greeting based on available information
        name_parts = []
        if request.title:
            name_parts.append(request.title)
        name_parts.append(request.name)
        
        full_name = " ".join(name_parts)
        message = f"Hello {full_name}!"
        
        # Add contextual information
        if request.age is not None:
            if request.age < 18:
                message += " You're quite young!"
            elif request.age >= 65:
                message += " Great to see you!"
            else:
                message += " Nice to meet you!"
        
        # Add email acknowledgment if provided
        if request.email:
            message += f" We've noted your email: {request.email}"
        
        logger.info(f"Generated advanced greeting for '{request.name}' (count: {self._greeting_count})")
        
        return {
            "message": message,
            "name": request.name,
            "title": request.title,
            "timestamp": datetime.utcnow()
        }
    
    def get_bulk_greetings(self, request: BulkHelloRequest) -> Dict[str, Any]:
        """
        Get bulk greetings for multiple names.
        
        Args:
            request: Bulk hello request
            
        Returns:
            Dict containing bulk greetings
            
        Raises:
            ValidationException: If request is invalid
        """
        if not request.names:
            raise ValidationException("Names list cannot be empty")
        
        if len(request.names) > 10:
            raise ValidationException("Cannot process more than 10 names at once")
        
        greetings = []
        for name in request.names:
            greeting = request.message_template.format(name=name)
            greetings.append(greeting)
        
        self._greeting_count += len(request.names)
        
        logger.info(f"Generated {len(greetings)} bulk greetings (total count: {self._greeting_count})")
        
        return {
            "greetings": greetings,
            "count": len(greetings),
            "template": request.message_template,
            "timestamp": datetime.utcnow()
        }
    
    def get_greeting_stats(self) -> Dict[str, Any]:
        """
        Get greeting statistics.
        
        Returns:
            Dict containing greeting statistics
        """
        return {
            "total_greetings": self._greeting_count,
            "service": "HelloService",
            "timestamp": datetime.utcnow()
        }