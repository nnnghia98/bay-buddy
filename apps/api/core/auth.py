"""
core/auth.py – Authentication dependency helpers for Bay Buddy API.

Shared cryptographic helpers live in `services/auth.py`. This module keeps the
FastAPI dependency layer used by route handlers.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import select

from database import SessionDep
from models import User
from services.auth import (  # noqa: F401 - re-exported for route and service imports
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: SessionDep,
) -> User:
    """
    FastAPI dependency that extracts and validates the JWT from the Authorization header,
    then fetches the corresponding User from the database.

    Args:
        token: The JWT extracted from the "Authorization: Bearer <token>" header.
        session: Database session (injected by FastAPI).

    Returns:
        The authenticated User instance.

    Raises:
        HTTPException 401: If the token is invalid, expired, or the user does not exist.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    username = decode_access_token(token)
    if username is None:
        raise credentials_exception

    # Fetch user from DB
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


# ---------------------------------------------------------------------------
# Type alias for route dependencies
# ---------------------------------------------------------------------------

CurrentUserDep = Annotated[User, Depends(get_current_user)]
