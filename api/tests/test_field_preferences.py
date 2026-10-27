import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from core.auth import create_access_token
from database import get_session
from main import app
from models import User
from models.enums import UserRole


@pytest.fixture
def field_client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'fields.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        for username in ("first", "second"):
            session.add(User(
                id=uuid.uuid4(), username=username, role=UserRole.STAFF,
                is_active=True, hashed_password="unused-test-hash",
            ))
        session.commit()

    def session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = session_override
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def headers(username):
    return {"Authorization": f"Bearer {create_access_token(data={'sub': username})}"}


def test_preferences_are_authenticated_and_personal(field_client):
    url = "/api/v1/settings/fields"
    assert field_client.get(url).status_code == 401
    assert field_client.patch(url, json={}).status_code == 401
    payload = {"field": "ticket.pnr", "preference": {"label": "Booking", "visible": False}}
    assert field_client.patch(url, headers=headers("first"), json=payload).status_code == 200
    first = field_client.get(url, headers=headers("first")).json()["data"]
    second = field_client.get(url, headers=headers("second")).json()["data"]
    assert first["preferences"]["ticket.pnr"]["label"] == "Booking"
    assert second["preferences"] == {}
    assert all("password" not in field["key"] for field in first["catalog"])
    payload["preference"] = None
    assert field_client.patch(url, headers=headers("first"), json=payload).json()["data"]["preferences"] == {}


@pytest.mark.parametrize("field,preference", [
    ("user.hashed_password", {"label": "Secret"}),
    ("ticket.pnr", {"required": True, "visible": False}),
    ("ticket.pnr", {"min_length": 8, "max_length": 6}),
    ("ticket.pnr", {"max_length": 20}),
    ("ticket.pnr", {"minimum": 1}),
    ("ticket.net_price", {"min_length": 1}),
    ("ticket.net_price", {"minimum": -1}),
    ("ticket.net_price", {"minimum": 2, "maximum": 1}),
    ("ticket.pnr", {"unknown": "value"}),
])
def test_invalid_preferences_preserve_existing_settings(field_client, field, preference):
    response = field_client.patch(
        "/api/v1/settings/fields", headers=headers("first"),
        json={"field": field, "preference": preference},
    )
    assert response.status_code == 422
    assert field_client.get("/api/v1/settings/fields", headers=headers("first")).json()["data"]["preferences"] == {}


def test_catalog_contains_only_connected_public_fields(field_client):
    response = field_client.get("/api/v1/settings/fields", headers=headers("first"))
    fields = {field["key"] for field in response.json()["data"]["catalog"]}
    assert {"ticket.pnr", "customer.name", "user.username"} <= fields
    assert "ticket_import.raw_text" not in fields
    assert "user.hashed_password" not in fields
    assert "invoice_item.invoice_id" not in fields
