"""
User management endpoints router.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime

from app.models.request_models import UserCreateRequest
from app.models.response_models import UserResponse, MessageResponse

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

# Mock database for demonstration
users_db = {}
user_id_counter = 1


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(user_data: UserCreateRequest) -> Dict:
    """
    Create a new user.
    
    Args:
        user_data: User creation data with validation
        
    Returns:
        Created user information
    """
    global user_id_counter
    
    # Check if username already exists
    if any(user["username"] == user_data.username for user in users_db.values()):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    if any(user["email"] == user_data.email for user in users_db.values()):
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user
    user = {
        "id": user_id_counter,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "is_active": user_data.is_active,
        "created_at": datetime.utcnow()
    }
    
    users_db[user_id_counter] = user
    user_id_counter += 1
    
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int) -> Dict:
    """
    Get user by ID.
    
    Args:
        user_id: The user ID to retrieve
        
    Returns:
        User information
    """
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    return users_db[user_id]


@router.get("/", response_model=List[UserResponse])
def list_users() -> List[Dict]:
    """
    List all users.
    
    Returns:
        List of all users
    """
    return list(users_db.values())


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: UserCreateRequest) -> Dict:
    """
    Update user information.
    
    Args:
        user_id: The user ID to update
        user_data: Updated user data
        
    Returns:
        Updated user information
    """
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username is being changed and already exists
    existing_user = next((user for user in users_db.values() 
                        if user["username"] == user_data.username and user["id"] != user_id), None)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email is being changed and already exists
    existing_email = next((user for user in users_db.values() 
                         if user["email"] == user_data.email and user["id"] != user_id), None)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update user
    users_db[user_id].update({
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "is_active": user_data.is_active
    })
    
    return users_db[user_id]


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(user_id: int) -> Dict[str, str]:
    """
    Delete a user.
    
    Args:
        user_id: The user ID to delete
        
    Returns:
        Deletion confirmation message
    """
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    username = users_db[user_id]["username"]
    del users_db[user_id]
    
    return {"message": f"User '{username}' deleted successfully"}