"""
SQLAlchemy database models.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """Base class for all database models."""
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def to_dict(self, exclude: Optional[set[str]] = None) -> dict:
        """Convert model to dictionary with optional field exclusion.
        
        Args:
            exclude: Set of field names to exclude from the output
            
        Returns:
            Dictionary representation of the model
        """
        exclude = exclude or set()
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
            if column.name not in exclude
        }



class User(Base):
    """User model for the database."""
    
    __tablename__ = "users"
    
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"