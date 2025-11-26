"""
Constants used in testing.
"""

# Sample user data
SAMPLE_USER = {
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "Test User",
    "is_active": True
}

SAMPLE_USER_INACTIVE = {
    "username": "inactiveuser",
    "email": "inactive@example.com",
    "full_name": "Inactive User",
    "is_active": False
}

# API endpoints
USERS_ENDPOINT = "/users/"
USER_STATS_ENDPOINT = "/users/stats/"

# Error messages
USER_NOT_FOUND = "User with ID"
USERNAME_EXISTS = "Username"
EMAIL_EXISTS = "Email"
VALIDATION_ERROR = "validation error"

# Test tokens
VALID_TOKEN = "valid_test_token"
INVALID_TOKEN = "invalid_token"
ADMIN_TOKEN = "admin_test_token"

# Pagination
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

# Timeouts
DEFAULT_TIMEOUT = 5.0
LONG_TIMEOUT = 30.0