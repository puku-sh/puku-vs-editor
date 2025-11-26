"""
Dependency injection for the FastAPI application.
"""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config.settings import Settings, get_settings
from app.services.hello_service import HelloService
from app.services.user_service import UserService


@lru_cache()
def get_hello_service() -> HelloService:
    """
    Get HelloService instance.
    
    Returns:
        HelloService: Cached hello service instance
    """
    return HelloService()


@lru_cache()
def get_user_service() -> UserService:
    """
    Get UserService instance.
    
    Returns:
        UserService: Cached user service instance
    """
    return UserService()


# Type aliases for cleaner dependency injection
SettingsDep = Annotated[Settings, Depends(get_settings)]
HelloServiceDep = Annotated[HelloService, Depends(get_hello_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]