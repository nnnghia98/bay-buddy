"""
routes/auth.py – Authentication endpoints for Bay Buddy API.

Endpoints:
    POST /api/v1/auth/login  – Exchange username & password for a JWT access token.
    GET  /api/v1/auth/me     – Retrieve the currently authenticated user profile.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep, create_access_token, verify_password
from database import SessionDep
from models import User, UserRead

router = APIRouter()


class LoginRequest(BaseModel):
    """Payload accepted by POST /login."""

    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    """JSON response returned after a successful login."""

    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: SessionDep) -> TokenResponse:
    """Authenticate a user and return a JWT access token."""
    statement = select(User).where(User.username == payload.username)
    user = session.exec(statement).first()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(current_user: CurrentUserDep) -> UserRead:
    """Return the authenticated user's public profile."""
    return UserRead.model_validate(current_user)

