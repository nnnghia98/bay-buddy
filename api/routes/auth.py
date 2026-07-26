"""
routes/auth.py – Authentication endpoints for Bay Buddy API.

Endpoints:
    POST /api/v1/auth/login  – Exchange username & password for a JWT access token.
    POST /api/v1/auth/internal-login – Exchange a user passcode for a JWT.
    GET  /api/v1/auth/me     – Retrieve the currently authenticated user profile.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlmodel import select

from core.auth import CurrentUserDep, create_access_token, verify_password
from database import SessionDep
from models import User, UserRead
from services.passcode_auth_service import find_active_user_by_passcode

router = APIRouter()


class TokenResponse(BaseModel):
    """JSON response returned after a successful login."""

    access_token: str
    token_type: str = "bearer"


class InternalLoginRequest(BaseModel):
    """Passcode-only payload used to identify one active database user."""

    access_code: str = Field(min_length=1, max_length=64)


@router.post("/login", response_model=TokenResponse)
async def login(
    session: SessionDep,
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> TokenResponse:
    """Authenticate a user from OAuth2 form fields and return a JWT access token."""
    statement = select(User).where(User.username == form_data.username)
    user = session.exec(statement).first()

    if user is None or not verify_password(form_data.password, user.hashed_password):
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


@router.post("/internal-login", response_model=TokenResponse)
async def login_with_passcode(
    payload: InternalLoginRequest,
    session: SessionDep,
) -> TokenResponse:
    """Issue a JWT after matching the passcode to one active database user."""
    user = find_active_user_by_passcode(
        session=session,
        passcode=payload.access_code,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access code",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(current_user: CurrentUserDep) -> UserRead:
    """Return the authenticated user's public profile."""
    return UserRead.model_validate(current_user)
