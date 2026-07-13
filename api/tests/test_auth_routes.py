import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from database import get_session
from main import app
from models.enums import UserRole
from models.user import User
from services.auth import hash_password


def _seed_user(
    engine,
    *,
    username: str,
    password_hash: str,
    is_active: bool = True,
) -> None:
    with Session(engine) as session:
        session.add(
            User(
                id=uuid.uuid4(),
                username=username,
                role=UserRole.STAFF,
                is_active=is_active,
                hashed_password=password_hash,
            )
        )
        session.commit()


def test_login_rejects_malformed_hash_with_401(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'auth-malformed.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(engine, username="legacy-user", password_hash="not-a-bcrypt-hash")

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/auth/login",
                data={
                    "username": "legacy-user",
                    "password": "any-password",
                    "grant_type": "password",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"


def test_login_returns_token_for_valid_credentials(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'auth-valid.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(
        engine,
        username="staff-user",
        password_hash=hash_password("correct-password"),
    )

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/auth/login",
                data={
                    "username": "staff-user",
                    "password": "correct-password",
                    "grant_type": "password",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_internal_login_returns_token_for_configured_active_user(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(
        engine,
        username="internal-staff",
        password_hash=hash_password("unused-password"),
    )
    monkeypatch.setenv("INTERNAL_ACCESS_CODE", "shared-test-code")
    monkeypatch.setenv("INTERNAL_ACCESS_USERNAME", "internal-staff")

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/auth/internal-login",
                json={"access_code": "shared-test-code"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_internal_login_rejects_wrong_access_code(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login-rejected.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(
        engine,
        username="internal-staff",
        password_hash=hash_password("unused-password"),
    )
    monkeypatch.setenv("INTERNAL_ACCESS_CODE", "shared-test-code")
    monkeypatch.setenv("INTERNAL_ACCESS_USERNAME", "internal-staff")

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            wrong_code_response = client.post(
                "/api/v1/auth/internal-login",
                json={"access_code": "wrong-code"},
            )
    finally:
        app.dependency_overrides.clear()

    assert wrong_code_response.status_code == 401
    assert wrong_code_response.json()["detail"] == "Invalid access code"


def test_internal_login_is_disabled_without_configuration(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login-disabled.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    monkeypatch.delenv("INTERNAL_ACCESS_CODE", raising=False)
    monkeypatch.delenv("INTERNAL_ACCESS_USERNAME", raising=False)

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/auth/internal-login",
                json={"access_code": "any-code"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Internal access login is not enabled"
