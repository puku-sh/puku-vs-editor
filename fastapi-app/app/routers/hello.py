"""
Hello endpoints router.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from app.models.request_models import HelloRequest, BulkHelloRequest
from app.models.response_models import MessageResponse, HelloResponse, BulkHelloResponse

router = APIRouter(
    prefix="/hello",
    tags=["hello"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=MessageResponse)
def hello_world() -> Dict[str, str]:
    """
    Basic hello endpoint.
    
    Returns a simple hello message.
    """
    return {"message": "Hello World!"}


@router.get("/{name}", response_model=HelloResponse)
def hello_name(name: str) -> Dict[str, str]:
    """
    Personalized hello endpoint.
    
    Args:
        name: The name to include in the greeting
        
    Returns:
        A personalized hello message
    """
    if not name or len(name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    return {
        "message": f"Hello {name.strip()}!",
        "name": name.strip()
    }


@router.post("/", response_model=HelloResponse)
def hello_with_details(hello_request: HelloRequest) -> Dict[str, str]:
    """
    Advanced hello endpoint with detailed request validation.
    
    Args:
        hello_request: Detailed hello request with validation
        
    Returns:
        A personalized hello message with details
    """
    # Build greeting based on available information
    name_parts = []
    if hello_request.title:
        name_parts.append(hello_request.title)
    name_parts.append(hello_request.name)
    
    full_name = " ".join(name_parts)
    message = f"Hello {full_name}!"
    
    # Add age information if provided
    if hello_request.age is not None:
        if hello_request.age < 18:
            message += " You're quite young!"
        elif hello_request.age >= 65:
            message += " Great to see you!"
        else:
            message += " Nice to meet you!"
    
    return {
        "message": message,
        "name": hello_request.name,
        "title": hello_request.title
    }


@router.post("/bulk", response_model=BulkHelloResponse)
def bulk_hello(bulk_request: BulkHelloRequest) -> Dict[str, object]:
    """
    Bulk hello endpoint for multiple names.
    
    Args:
        bulk_request: Request containing multiple names and template
        
    Returns:
        Multiple personalized greetings
    """
    greetings = []
    for name in bulk_request.names:
        greeting = bulk_request.message_template.format(name=name)
        greetings.append(greeting)
    
    return {
        "greetings": greetings,
        "count": len(greetings),
        "template": bulk_request.message_template
    }