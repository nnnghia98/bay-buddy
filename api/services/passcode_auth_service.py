"""Database-backed passcode lookup for active Bay Buddy users."""

from __future__ import annotations

import uuid

from sqlmodel import Session, select

from models.user import User
from services.auth import verify_password


def find_active_user_by_passcode(
    *,
    session: Session,
    passcode: str,
) -> User | None:
    """Return the only active user whose stored bcrypt hash matches."""
    statement = select(User).where(User.is_active.is_(True))
    active_users = session.exec(statement).all()
    matching_users = [
        user
        for user in active_users
        if verify_password(passcode, user.hashed_password)
    ]

    if len(matching_users) != 1:
        return None

    return matching_users[0]


def passcode_is_registered(
    *,
    session: Session,
    passcode: str,
    exclude_user_id: uuid.UUID | None = None,
) -> bool:
    """Reject duplicate passcodes because login has no username discriminator."""
    statement = select(User)
    if exclude_user_id is not None:
        statement = statement.where(User.id != exclude_user_id)

    users = session.exec(statement).all()
    return any(
        verify_password(passcode, user.hashed_password)
        for user in users
    )
