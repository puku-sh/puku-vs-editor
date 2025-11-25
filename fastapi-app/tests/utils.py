"""
Utility functions for testing.
"""

from typing import Dict, Any, Optional
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.models import User


def create_user_via_api(
    client: TestClient,
    user_data: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Create a user via API and return response."""
    response = client.post(
        "/users/",
        json=user_data,
        headers=headers or {}
    )
    assert response.status_code == 201
    return response.json()





def create_test_user_in_db(
    db_session: Session,
    username: str = "testuser",
    email: str = "test@example.com",
    full_name: str = "Test User",
    is_active: bool = True
) -> User:
    """Create a test user directly in database."""
    user = User(
        username=username,
        email=email,
        full_name=full_name,
        is_active=is_active
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def get_auth_headers(token: str) -> Dict[str, str]:
    """Get authorization headers with the given token."""
    return {"Authorization": f"Bearer {token}"}