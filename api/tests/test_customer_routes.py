from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from core.auth import get_current_user
from database import get_session
from main import app
from models.customer import Customer
from models.enums import CustomerType, UserRole
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


def seed_customer(
    session: Session,
    *,
    name: str = "Cong ty Bay Buddy",
    is_active: bool = True,
) -> Customer:
    customer = Customer(
        name=name,
        type=CustomerType.BUSINESS,
        balance=0,
        is_active=is_active,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def test_staff_cannot_archive_customer() -> None:
    client, session = create_test_client(role=UserRole.STAFF)
    customer = seed_customer(session)

    response = client.patch(
        f"/api/v1/customers/{customer.id}",
        json={"is_active": False},
    )

    clear_overrides()

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_staff_can_edit_customer_contact_fields() -> None:
    client, session = create_test_client(role=UserRole.STAFF)
    customer = seed_customer(session)

    response = client.patch(
        f"/api/v1/customers/{customer.id}",
        json={
            "name": "Cong ty Bay Buddy Updated",
            "phone": "0909123456",
        },
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["name"] == "Cong ty Bay Buddy Updated"
    assert payload["data"]["phone"] == "0909123456"
    assert payload["data"]["is_active"] is True


def test_admin_can_archive_customer() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)

    response = client.patch(
        f"/api/v1/customers/{customer.id}",
        json={"is_active": False},
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["id"] == str(customer.id)
    assert payload["data"]["is_active"] is False


def test_list_customers_includes_archive_status() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    seed_customer(session, name="Active Customer", is_active=True)
    archived_customer = seed_customer(session, name="Archived Customer", is_active=False)

    response = client.get("/api/v1/customers/")

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    archived_row = next(
        item for item in payload["data"] if item["id"] == str(archived_customer.id)
    )
    assert archived_row["is_active"] is False
