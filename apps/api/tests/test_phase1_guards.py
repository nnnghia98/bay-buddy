from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from core.auth import get_current_user
from database import get_session
from main import app
from models.customer import Customer
from models.enums import Airline, TicketStatus, UserRole
from models.ticket import Ticket
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


def seed_customer(session: Session) -> Customer:
    customer = Customer(name="Cong ty Bay Buddy", balance=0)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def seed_ticket(session: Session, customer_id: uuid.UUID) -> Ticket:
    ticket = Ticket(
        pnr="ABC123",
        airline=Airline.VJ,
        passengers=["NGUYEN VAN A"],
        itinerary="SGN-HAN",
        flight_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        net_price=1_000_000,
        selling_price=1_200_000,
        status=TicketStatus.CONFIRMED,
        customer_id=customer_id,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def test_record_payment_rejects_blank_note_with_422() -> None:
    client, session = create_test_client(role=UserRole.STAFF)
    customer = seed_customer(session)

    response = client.post(
        f"/api/v1/customers/{customer.id}/payments",
        json={
            "amount": 500_000,
            "method": "Chuyen khoan",
            "note": "   ",
        },
    )

    clear_overrides()

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Value error, Payment note is required."


def test_staff_cannot_create_invoice() -> None:
    client, session = create_test_client(role=UserRole.STAFF)
    customer = seed_customer(session)
    ticket = seed_ticket(session, customer.id)

    response = client.post(
        "/api/v1/finance/invoices",
        json={
            "customer_id": str(customer.id),
            "ticket_ids": [str(ticket.id)],
            "tax_amount": 0,
            "discount_amount": 0,
            "note": "Invoice draft",
        },
    )

    clear_overrides()

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_admin_can_create_invoice() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)
    ticket = seed_ticket(session, customer.id)

    response = client.post(
        "/api/v1/finance/invoices",
        json={
            "customer_id": str(customer.id),
            "ticket_ids": [str(ticket.id)],
            "tax_amount": 0,
            "discount_amount": 0,
            "note": "Invoice draft",
        },
    )

    clear_overrides()

    assert response.status_code == 201
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["customer_id"] == str(customer.id)
