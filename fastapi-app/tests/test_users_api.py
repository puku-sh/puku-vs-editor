"""
Tests for user API endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from tests.base import BaseAPITest
from tests.constants import SAMPLE_USER, USER_NOT_FOUND, USERNAME_EXISTS
from tests.utils import (
    assert_user_response,
    assert_error_response,
    assert_user_count
)


class TestUsersAPI(BaseAPITest):
    """Test user API endpoints."""
    
    def test_create_user_success(self):
        """Test successful user creation."""
        response = self.create_user_via_api(SAMPLE_USER)
        
        assert response.status_code == 201
        data = response.json()
        assert_user_response(data, SAMPLE_USER)
        assert "id" in data
        assert "created_at" in data
    
    def test_create_user_duplicate_username(self):
        """Test user creation with duplicate username."""
        # Create first user
        self.create_user_via_api(SAMPLE_USER)
        
        # Try to create user with same username
        duplicate_user = SAMPLE_USER.copy()
        duplicate_user["email"] = "different@example.com"
        
        response = self.create_user_via_api(duplicate_user)
        
        assert response.status_code == 409
        assert_error_response(response.json(), 409, USERNAME_EXISTS)
    
    def test_get_user_success(self):
        """Test successful user retrieval."""
        # Create user first
        create_response = self.create_user_via_api(SAMPLE_USER)
        user_id = create_response.json()["id"]
        
        # Get user
        response = self.get_user_via_api(user_id)
        
        assert response.status_code == 200
        data = response.json()
        assert_user_response(data, SAMPLE_USER)
    
    def test_get_user_not_found(self):
        """Test getting non-existent user."""
        response = self.get_user_via_api(99999)
        
        assert response.status_code == 404
        assert_error_response(response.json(), 404, USER_NOT_FOUND)
    
    def test_list_users_empty(self):
        """Test listing users when database is empty."""
        response = self.list_users_via_api()
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_list_users_with_data(self):
        """Test listing users with data."""
        # Create multiple users
        user1 = SAMPLE_USER.copy()
        user1["username"] = "user1"
        user1["email"] = "user1@example.com"
        
        user2 = SAMPLE_USER.copy()
        user2["username"] = "user2"
        user2["email"] = "user2@example.com"
        
        self.create_user_via_api(user1)
        self.create_user_via_api(user2)
        
        # List users
        response = self.list_users_via_api()
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
    
    def test_update_user_success(self):
        """Test successful user update."""
        # Create user first
        create_response = self.create_user_via_api(SAMPLE_USER)
        user_id = create_response.json()["id"]
        
        # Update user
        updated_data = {
            "username": "updateduser",
            "email": "updated@example.com",
            "full_name": "Updated User",
            "is_active": False
        }
        
        response = self.update_user_via_api(user_id, updated_data)
        
        assert response.status_code == 200
        data = response.json()
        assert_user_response(data, updated_data)
    
    def test_update_user_not_found(self):
        """Test updating non-existent user."""
        response = self.update_user_via_api(99999, SAMPLE_USER)
        
        assert response.status_code == 404
        assert_error_response(response.json(), 404, USER_NOT_FOUND)
    
    def test_delete_user_success(self):
        """Test successful user deletion."""
        # Create user first
        create_response = self.create_user_via_api(SAMPLE_USER)
        user_id = create_response.json()["id"]
        
        # Delete user
        response = self.delete_user_via_api(user_id)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify user is deleted
        self.assert_user_not_exists(user_id)
    
    def test_delete_user_not_found(self):
        """Test deleting non-existent user."""
        response = self.delete_user_via_api(99999)
        
        assert response.status_code == 404
        assert_error_response(response.json(), 404, USER_NOT_FOUND)


@pytest.mark.integration
class TestUsersAPIIntegration(BaseAPITest):
    """Integration tests for user API endpoints."""
    
    def test_user_lifecycle(self):
        """Test complete user lifecycle."""
        # Create user
        response = self.create_user_via_api(SAMPLE_USER)
        assert response.status_code == 201
        user_data = response.json()
        user_id = user_data["id"]
        
        # Get user
        response = self.get_user_via_api(user_id)
        assert response.status_code == 200
        
        # Update user
        updated_data = SAMPLE_USER.copy()
        updated_data["full_name"] = "Updated Name"
        response = self.update_user_via_api(user_id, updated_data)
        assert response.status_code == 200
        
        # Verify update
        response = self.get_user_via_api(user_id)
        assert response.status_code == 200
        assert response.json()["full_name"] == "Updated Name"
        
        # Delete user
        response = self.delete_user_via_api(user_id)
        assert response.status_code == 200
        
        # Verify deletion
        response = self.get_user_via_api(user_id)
        assert response.status_code == 404