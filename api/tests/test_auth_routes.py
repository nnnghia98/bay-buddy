import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from database import get_session
from main import app
from models.enums import UserRole
from models.user import User
from services.auth import decode_access_token, hash_password


def _seed_user(
    engine,
    *,
    username: str,
    password_hash: str,
    is_active: bool = True,
) -> uuid.UUID:
    with Session(engine) as session:
        user = User(
            id=uuid.uuid4(),
            username=username,
            role=UserRole.STAFF,
            is_active=is_active,
            hashed_password=password_hash,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        return user.id

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


def test_internal_login_returns_token_for_matching_active_user(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(
        engine,
        username="internal-staff",
        password_hash=hash_password("shared-test-code"),
    )

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
    assert (
        decode_access_token(response.json()["access_token"])
        == "internal-staff"
    )


def test_internal_login_rejects_wrong_access_code(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login-rejected.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(
        engine,
        username="internal-staff",
        password_hash=hash_password("shared-test-code"),
    )

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


def test_internal_login_rejects_when_no_active_user_matches(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login-disabled.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)

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

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid access code"


def test_internal_login_rejects_inactive_user_passcode(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login-inactive.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    _seed_user(
        engine,
        username="inactive-internal-user",
        password_hash=hash_password("inactive-passcode"),
        is_active=False,
    )

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/auth/internal-login",
                json={"access_code": "inactive-passcode"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid access code"


def test_internal_login_rejects_ambiguous_duplicate_passcode(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'internal-login-duplicate.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    duplicate_hash = hash_password("duplicate-passcode")
    _seed_user(
        engine,
        username="first-internal-user",
        password_hash=duplicate_hash,
    )
    _seed_user(
        engine,
        username="second-internal-user",
        password_hash=duplicate_hash,
    )

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post(
                "/api/v1/auth/internal-login",
                json={"access_code": "duplicate-passcode"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid access code"
