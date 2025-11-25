"""
User service for business logic.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.request_models import UserCreateRequest
from app.models.response_models import UserResponse
from app.core.exceptions import ValidationException, NotFoundException, ConflictException

logger = logging.getLogger(__name__)


class UserService:
    """Service for handling user-related business logic."""
    
    def __init__(self):
        """Initialize the user service with in-memory storage."""
        self._users_db: Dict[int, Dict[str, Any]] = {}
        self._user_id_counter = 1
        self._created_at = datetime.utcnow()
    
    def create_user(self, user_data: UserCreateRequest) -> Dict[str, Any]:
        """
        Create a new user.
        
        Args:
            user_data: User creation data
            
        Returns:
            Created user information
            
        Raises:
            ConflictException: If username or email already exists
        """
        # Check if username already exists
        if any(user["username"] == user_data.username for user in self._users_db.values()):
            raise ConflictException(f"Username '{user_data.username}' already exists")
        
        # Check if email already exists
        if any(user["email"] == user_data.email for user in self._users_db.values()):
            raise ConflictException(f"Email '{user_data.email}' already exists")
        
        # Create new user
        user = {
            "id": self._user_id_counter,
            "username": user_data.username,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "is_active": user_data.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self._users_db[self._user_id_counter] = user
        self._user_id_counter += 1
        
        logger.info(f"Created user: {user['username']} (ID: {user['id']})")
        
        return user
    
    def get_user(self, user_id: int) -> Dict[str, Any]:
        """
        Get user by ID.
        
        Args:
            user_id: The user ID to retrieve
            
        Returns:
            User information
            
        Raises:
            NotFoundException: If user not found
        """
        if user_id not in self._users_db:
            raise NotFoundException(f"User with ID {user_id} not found")
        
        user = self._users_db[user_id]
        logger.debug(f"Retrieved user: {user['username']} (ID: {user_id})")
        
        return user
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Get user by username.
        
        Args:
            username: The username to search for
            
        Returns:
            User information or None if not found
        """
        user = next((user for user in self._users_db.values() 
                    if user["username"] == username), None)
        
        if user:
            logger.debug(f"Retrieved user by username: {username}")
        
        return user
    
    def list_users(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """
        List all users.
        
        Args:
            active_only: Whether to return only active users
            
        Returns:
            List of users
        """
        users = list(self._users_db.values())
        
        if active_only:
            users = [user for user in users if user["is_active"]]
        
        logger.debug(f"Listed {len(users)} users (active_only={active_only})")
        
        return users
    
    def update_user(self, user_id: int, user_data: UserCreateRequest) -> Dict[str, Any]:
        """
        Update user information.
        
        Args:
            user_id: The user ID to update
            user_data: Updated user data
            
        Returns:
            Updated user information
            
        Raises:
            NotFoundException: If user not found
            ConflictException: If username or email already exists
        """
        if user_id not in self._users_db:
            raise NotFoundException(f"User with ID {user_id} not found")
        
        # Check if username is being changed and already exists
        existing_user = next((user for user in self._users_db.values() 
                            if user["username"] == user_data.username and user["id"] != user_id), None)
        if existing_user:
            raise ConflictException(f"Username '{user_data.username}' already exists")
        
        # Check if email is being changed and already exists
        existing_email = next((user for user in self._users_db.values() 
                             if user["email"] == user_data.email and user["id"] != user_id), None)
        if existing_email:
            raise ConflictException(f"Email '{user_data.email}' already exists")
        
        # Update user
        self._users_db[user_id].update({
            "username": user_data.username,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "is_active": user_data.is_active,
            "updated_at": datetime.utcnow()
        })
        
        logger.info(f"Updated user: {user_data.username} (ID: {user_id})")
        
        return self._users_db[user_id]
    
    def delete_user(self, user_id: int) -> Dict[str, str]:
        """
        Delete a user.
        
        Args:
            user_id: The user ID to delete
            
        Returns:
            Deletion confirmation message
            
        Raises:
            NotFoundException: If user not found
        """
        if user_id not in self._users_db:
            raise NotFoundException(f"User with ID {user_id} not found")
        
        username = self._users_db[user_id]["username"]
        del self._users_db[user_id]
        
        logger.info(f"Deleted user: {username} (ID: {user_id})")
        
        return {"message": f"User '{username}' deleted successfully"}
    
    def get_user_stats(self) -> Dict[str, Any]:
        """
        Get user statistics.
        
        Returns:
            User statistics
        """
        total_users = len(self._users_db)
        active_users = len([user for user in self._users_db.values() if user["is_active"]])
        inactive_users = total_users - active_users
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "service_uptime": datetime.utcnow() - self._created_at,
            "timestamp": datetime.utcnow()
        }