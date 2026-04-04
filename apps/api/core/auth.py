"""
core/auth.py – Authentication utilities for Bay Buddy API.

Provides:
- Password hashing and verification (passlib + bcrypt)
- JWT token creation and validation (python-jose)
- FastAPI dependency for extracting the current authenticated user

Security flow reference: docs/ARCHITECT.md § 2. Agentic Flow
Auth configuration: CLAUDE.md § Auth (JWT + bcrypt)
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from database import SessionDep
from models import User

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# Warn if running with the default SECRET_KEY in production
if SECRET_KEY == "dev-secret-change-in-production":
    import warnings

    warnings.warn(
        "Using default SECRET_KEY. Set a random SECRET_KEY environment variable in production.",
        UserWarning,
        stacklevel=2,
    )

# ---------------------------------------------------------------------------
# Password hashing context (bcrypt)
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.

    Args:
        plain_password: The raw password string from user input.

    Returns:
        A bcrypt-hashed string safe for storage in User.hashed_password.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.

    Args:
        plain_password: The password the user is submitting (e.g., at login).
        hashed_password: The stored hash from the database (User.hashed_password).

    Returns:
        True if the password matches the hash, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT token creation and validation
# ---------------------------------------------------------------------------

def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a signed JWT access token.

    Args:
        data: Payload dictionary. Must include {"sub": username}.
        expires_delta: Optional custom expiration time. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and validate a JWT token.

    Args:
        token: The JWT string to decode.

    Returns:
        The "sub" (subject / username) claim if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        return username
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# OAuth2 scheme and FastAPI dependency
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


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
