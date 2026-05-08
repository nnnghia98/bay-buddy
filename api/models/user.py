"""
User model – internal system users (ADMIN / STAFF).

Schema reference: docs/ARCHITECT.md § Model: User
Auth reference:   CLAUDE.md § Auth (JWT + bcrypt)
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlmodel import Field, SQLModel

from .enums import UserRole


# ---------------------------------------------------------------------------
# Shared / base properties
# ---------------------------------------------------------------------------

class UserBase(SQLModel):
    """Fields shared between create/read schemas and the DB table."""

    username: str = Field(
        unique=True,
        index=True,
        min_length=3,
        max_length=50,
        description="Unique login identifier for the system user.",
    )
    role: UserRole = Field(
        default=UserRole.STAFF,
        description="Access level: ADMIN has full privileges; STAFF has limited access.",
    )
    is_active: bool = Field(
        default=True,
        description="Soft-delete / deactivation flag. Inactive users cannot log in.",
    )


# ---------------------------------------------------------------------------
# DB Table
# ---------------------------------------------------------------------------

class User(UserBase, table=True):
    """Persisted user entity stored in the `user` table."""

    __tablename__ = "user"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    hashed_password: str = Field(
        description="bcrypt-hashed password. Never store or return plain-text passwords.",
    )


# ---------------------------------------------------------------------------
# Request / Response schemas (Pydantic models that are NOT DB tables)
# ---------------------------------------------------------------------------

class UserCreate(UserBase):
    """Payload accepted by POST /users. The plain-text password is hashed before storage."""

    password: str = Field(min_length=1, description="Plain-text password (hashed before storage).")


class UserRead(UserBase):
    """Safe public representation – hashed_password is intentionally excluded."""

    id: uuid.UUID


class UserUpdate(SQLModel):
    """All fields optional so clients can send partial PATCH payloads."""

    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=1)
