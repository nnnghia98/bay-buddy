from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from core.auth import get_current_user, hash_password
from database import get_session
from main import app
from models.enums import UserRole
from models.user import User


def create_test_client(*, role: UserRole = UserRole.ADMIN) -> tuple[TestClient, Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    session = Session(engine)

    def override_get_session():
        try:
            yield session
        finally:
            pass

    def override_get_current_user() -> User:
        return User(
            id=uuid.uuid4(),
            username=f"{role.value.lower()}-user",
            hashed_password="not-used-in-tests",
            role=role,
            is_active=True,
        )

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    client = TestClient(app)
    return client, session


def clear_overrides() -> None:
    app.dependency_overrides.clear()


def seed_user(
    session: Session,
    *,
    username: str,
    role: UserRole = UserRole.STAFF,
    is_active: bool = True,
) -> User:
    user = User(
        username=username,
        hashed_password=hash_password("correct-password"),
        role=role,
        is_active=is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_admin_can_update_user_role_and_status() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    user = seed_user(session, username="staff-member")

    response = client.patch(
        f"/api/v1/users/{user.id}",
        json={
            "role": "ADMIN",
            "is_active": False,
        },
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["id"] == str(user.id)
    assert payload["data"]["role"] == "ADMIN"
    assert payload["data"]["is_active"] is False


def test_staff_cannot_update_users() -> None:
    client, session = create_test_client(role=UserRole.STAFF)
    user = seed_user(session, username="staff-member")

    response = client.patch(
        f"/api/v1/users/{user.id}",
        json={
            "is_active": False,
        },
    )

    clear_overrides()

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_admin_cannot_update_user_to_duplicate_username() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    first_user = seed_user(session, username="first-user")
    seed_user(session, username="second-user")

    response = client.patch(
        f"/api/v1/users/{first_user.id}",
        json={
            "username": "second-user",
        },
    )

    clear_overrides()

    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"
