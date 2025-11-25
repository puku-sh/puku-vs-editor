"""
Pytest configuration and fixtures for FastAPI application.
"""

import pytest
from typing import Generator, Dict, Any, Optional
from unittest.mock import Mock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.connection import get_db, Base
from app.db.models import User
from app.services.user_service import UserService, InMemoryUserRepository
from main import app


# Test database setup with in-memory SQLite for faster tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False  # Disable SQL logging for tests
)
TestingSessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def db():
    """Create test database schema."""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db):
    """Create a fresh database session for each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    # Enable foreign key constraints for SQLite
    if engine.dialect.name == "sqlite":
        session.execute("PRAGMA foreign_keys=ON")
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session) -> Generator[TestClient, None, None]:
    """Create test client with database override."""
    # Override the database dependency
    app.dependency_overrides[get_db] = lambda: db_session
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up dependency override
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user(db_session: Session) -> User:
    """Create a sample user for testing."""
    user = User(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_users(db_session: Session) -> list[User]:
    """Create multiple sample users for testing."""
    users = [
        User(
            username="user1",
            email="user1@example.com",
            full_name="User One",
            is_active=True
        ),
        User(
            username="user2",
            email="user2@example.com",
            full_name="User Two",
            is_active=False
        ),
        User(
            username="user3",
            email="user3@example.com",
            full_name="User Three",
            is_active=True
        )
    ]
    
    db_session.add_all(users)
    db_session.commit()
    
    for user in users:
        db_session.refresh(user)
    
    return users


@pytest.fixture
def mock_user_service():
    """Create a mock UserService for unit tests."""
    mock_service = Mock(spec=UserService)
    
    # Setup common mock methods
    mock_service.create_user = Mock()
    mock_service.get_user = Mock()
    mock_service.list_users = Mock()
    mock_service.update_user = Mock()
    mock_service.delete_user = Mock()
    mock_service.get_user_stats = Mock()
    
    return mock_service


@pytest.fixture
def in_memory_user_service():
    """Create a UserService with in-memory repository for integration tests."""
    return UserService(repository=InMemoryUserRepository())


@pytest.fixture
def user_data_dict():
    """Sample user data as dictionary."""
    return {
        "username": "newuser",
        "email": "newuser@example.com",
        "full_name": "New User",
        "is_active": True
    }


@pytest.fixture
def user_data_update_dict():
    """Sample user update data as dictionary."""
    return {
        "username": "updateduser",
        "email": "updated@example.com",
        "full_name": "Updated User",
        "is_active": False
    }


@pytest.fixture
def auth_headers():
    """Sample authorization headers."""
    return {"Authorization": "Bearer test_token"}


@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Cleanup fixture that runs after each test."""
    yield
    # Add any cleanup logic here if needed


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )