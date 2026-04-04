from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep, hash_password
from database import SessionDep
from models.user import User, UserCreate, UserRead
from core.responses import success_response

router = APIRouter()

@router.get("/me", response_model=dict)
async def get_current_user_profile(current_user: CurrentUserDep):
    """Get the currently authenticated user's profile."""
    # Convert User model to UserRead to strip hashed_password
    user_read = UserRead.model_validate(current_user)
    return success_response(user_read.model_dump())


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    *, session: SessionDep, current_user: CurrentUserDep, user_in: UserCreate
):
    """
    Create a new user. Only ADMIN can create other users (or staff).
    """
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
        
    # Check if username exists
    statement = select(User).where(User.username == user_in.username)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered"
        )

    # Hash password and create User
    hashed_pw = hash_password(user_in.password)
    db_user = User(
        username=user_in.username,
        role=user_in.role,
        is_active=user_in.is_active,
        hashed_password=hashed_pw,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    user_read = UserRead.model_validate(db_user)
    return success_response(user_read.model_dump())


@router.get("/", response_model=dict)
async def list_users(session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100):
    """List all users (ADMIN only)."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
        
    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()
    users_read = [UserRead.model_validate(u).model_dump() for u in users]
    return success_response(users_read)
