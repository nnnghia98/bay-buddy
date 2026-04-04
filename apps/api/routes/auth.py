"""
routes/auth.py – Authentication endpoints for Bay Buddy API.

Endpoints:
    POST /auth/login  – Exchange username & password for a JWT access token.
    GET  /auth/me     – Retrieve the currently authenticated user's profile.

Security reference: docs/ARCHITECT.md § Model: User
Dictionary reference: docs/DICTIONARY.md (all responses use English naming)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select

from core.auth import (
    CurrentUserDep,
    create_access_token,
    verify_password,
)
from database import SessionDep
from models import User, UserRead

router = APIRouter()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TokenResponse:
    """Response schema for /login endpoint."""

    def __init__(self, access_token: str, token_type: str = "bearer"):
        self.access_token = access_token
        self.token_type = token_type

    def dict(self):
        return {"access_token": self.access_token, "token_type": self.token_type}


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=dict)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
) -> dict:
    """
    Authenticate a user and return a JWT access token.

    Args:
        form_data: OAuth2 form with username and password fields.
        session: Database session (injected by FastAPI).

    Returns:
        {
            "access_token": "eyJ...",
            "token_type": "bearer"
        }

    Raises:
        HTTPException 401: If the username does not exist or the password is incorrect.
        HTTPException 403: If the user account is inactive (is_active=False).
    """
    # Fetch user by username
    statement = select(User).where(User.username == form_data.username)
    user = session.exec(statement).first()

    # Validate credentials
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Create JWT token with username as subject
    access_token = create_access_token(data={"sub": user.username})

    return TokenResponse(access_token=access_token).dict()


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserRead)
async def get_current_user_profile(current_user: CurrentUserDep) -> UserRead:
    """
    Retrieve the profile of the currently authenticated user.

    Requires a valid JWT token in the Authorization header:
        Authorization: Bearer <token>

    Args:
        current_user: The authenticated User instance (injected by get_current_user dependency).

    Returns:
        UserRead schema with id, username, role, and is_active fields.
        The hashed_password field is intentionally excluded for security.

    Raises:
        HTTPException 401: If the token is invalid or expired.
        HTTPException 403: If the user account is inactive.
    """
    return UserRead.model_validate(current_user)
