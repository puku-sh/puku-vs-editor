"""
Base test class with common functionality.
"""

import pytest
from typing import Generator, Optional
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import db_session, client
from tests.utils import create_test_user_in_db


class BaseTest:
    """Base class for all tests."""
    
    @pytest.fixture(autouse=True)
    def setup(self, db_session: Session, client: TestClient):
        """Setup method that runs before each test."""
        self.db = db_session
        self.client = client
        yield
        # Cleanup if needed
    
    def create_user(
        self,
        username: str = "testuser",
        email: str = "test@example.com",
        full_name: str = "Test User",
        is_active: bool = True
    ) -> User:
        """Create a test user."""
        return create_test_user_in_db(
            self.db, username, email, full_name, is_active
        )
    
    def assert_user_exists(self, user_id: int) -> None:
        """Assert that a user exists in database."""
        from tests.utils import assert_user_exists
        assert_user_exists(self.db, user_id)
    
    def assert_user_not_exists(self, user_id: int) -> None:
        """Assert that a user does not exist in database."""
        from tests.utils import assert_user_not_exists
        assert_user_not_exists(self.db, user_id)
    
    def get_user_from_db(self, user_id: int) -> Optional[User]:
        """Get a user from database."""
        from tests.utils import get_user_from_db
        return get_user_from_db(self.db, user_id)


class BaseAPITest(BaseTest):
    """Base class for API tests."""
    
    def create_user_via_api(self, user_data: dict, headers: Optional[dict] = None):
        """Create a user via API."""
        from tests.utils import create_user_via_api
        return create_user_via_api(self.client, user_data, headers)
    
    def get_user_via_api(self, user_id: int, headers: Optional[dict] = None):
        """Get a user via API."""
        return self.client.get(
            f"/users/{user_id}",
            headers=headers or {}
        )
    
    def update_user_via_api(
        self, 
        user_id: int, 
        user_data: dict, 
        headers: Optional[dict] = None
    ):
        """Update a user via API."""
        return self.client.put(
            f"/users/{user_id}",
            json=user_data,
            headers=headers or {}
        )
    
    def delete_user_via_api(self, user_id: int, headers: Optional[dict] = None):
        """Delete a user via API."""
        return self.client.delete(
            f"/users/{user_id}",
            headers=headers or {}
        )
    
    def list_users_via_api(
        self, 
        active_only: bool = True, 
        headers: Optional[dict] = None
    ):
        """List users via API."""
        return self.client.get(
            "/users/",
            params={"active_only": active_only},
            headers=headers or {}
        )


class BaseServiceTest(BaseTest):
    """Base class for service tests."""
    
    def setup_service(self):
        """Setup service for testing. Override in subclasses."""
        pass