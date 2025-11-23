"""
Hello endpoints router.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict

from app.models.response_models import MessageResponse, HelloResponse

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
    
    return {"message": f"Hello {name.strip()}!"}