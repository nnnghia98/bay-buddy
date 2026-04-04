"""
core – Bay Buddy authentication and security utilities.

Exports:
    - Password hashing and verification (passlib + bcrypt)
    - JWT token operations (python-jose)
    - FastAPI dependencies for authentication
"""

from .auth import (
    CurrentUserDep,
    create_access_token,
    decode_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "CurrentUserDep",
]
