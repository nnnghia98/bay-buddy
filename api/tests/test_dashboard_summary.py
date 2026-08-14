from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from core.auth import get_current_user
from database import get_session
from main import app
from models.customer import Customer
from models.enums import (
    CustomerType,
    TicketStatus,
    TransactionCategory,
    TransactionType,
    UserRole,
)
from models.system_setting import SystemSetting
from models.ticket import Ticket
from models.transaction import Transaction
from models.user import User


def create_test_client() -> tuple[TestClient, Session, User]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    session = Session(engine)
    current_user = User(
        username="dashboard-user",
        hashed_password="not-used-in-tests",
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    def override_get_session():
        try:
            yield session
        finally:
            pass

    def override_get_current_user() -> User:
        return current_user

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    return TestClient(app), session, current_user


def clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_dashboard_summary_uses_one_event_per_confirmed_ticket() -> None:
    client, session, current_user = create_test_client()
    debtor = Customer(
        name="Debtor",
        type=CustomerType.INDIVIDUAL,
        balance=1_100_000,
    )
    creditor = Customer(
        name="Creditor",
        type=CustomerType.INDIVIDUAL,
        balance=-200_000,
    )
    session.add(debtor)
    session.add(creditor)
    session.flush()

    ticket = Ticket(
        pnr="ABC123",
        passengers=["NGUYEN VAN A"],
        departure_code="HAN",
        arrival_code="SGN",
        itinerary="HAN-SGN",
        flight_date=datetime(2026, 6, 20, 9, 0),
        created_at=datetime(2026, 6, 2, 8, 0),
        updated_at=datetime(2026, 6, 2, 8, 0),
        net_price=1_000_000,
        selling_price=1_200_000,
        true_income=200_000,
        status=TicketStatus.CONFIRMED,
        customer_id=debtor.id,
    )
    draft_ticket = Ticket(
        pnr="DRA123",
        passengers=["TRAN VAN B"],
        flight_date=datetime(2026, 6, 21, 9, 0),
        created_at=datetime(2026, 6, 2, 7, 0),
        updated_at=datetime(2026, 6, 2, 7, 0),
        net_price=450_000,
        selling_price=500_000,
        true_income=50_000,
        status=TicketStatus.DRAFT,
        customer_id=debtor.id,
    )
    session.add(ticket)
    session.add(draft_ticket)
    session.flush()

    ticket_charge = Transaction(
        amount=1_200_000,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        note="Auto-debt for ticket ABC123",
        customer_id=debtor.id,
        linked_ticket_id=ticket.id,
        created_by=current_user.id,
        occurred_at=datetime(2026, 6, 2, 8, 0),
        created_at=datetime(2026, 6, 2, 8, 0),
    )
    payment = Transaction(
        amount=100_000,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method="Bank transfer",
        note="Customer payment",
        customer_id=debtor.id,
        created_by=current_user.id,
        occurred_at=datetime(2026, 6, 2, 9, 0),
        created_at=datetime(2026, 6, 2, 9, 0),
    )
    session.add(ticket_charge)
    session.add(payment)
    session.commit()

    response = client.get("/api/v1/finance/dashboard-summary")

    clear_overrides()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["financial"] == {
        "total_ticket_sales": 1_200_000,
        "total_true_income": 200_000,
        "total_receivables": 1_100_000,
        "total_held_credit": 200_000,
        "confirmed_tickets": 1,
        "customers_with_debt": 1,
        "customers_with_credit": 1,
        "income_rate_percent": 200_000 / 1_200_000 * 100,
    }
    assert data["action_queues"][2] == {
        "key": "draftTickets",
        "count": 1,
        "amount": 500_000,
    }
    assert [activity["type"] for activity in data["recent_activity"]] == [
        "payment",
        "ticket",
    ]
    assert all(
        activity.get("category") != "TICKET_PURCHASE"
        for activity in data["recent_activity"]
    )
    assert data["recent_activity"][1]["title"] == "ABC123 · HAN-SGN"


def test_dashboard_balance_scope_uses_audit_timestamp() -> None:
    client, session, current_user = create_test_client()
    customer = Customer(
        name="Scoped customer",
        type=CustomerType.INDIVIDUAL,
        balance=999_000,
    )
    session.add(customer)
    session.add(
        SystemSetting(
            id="global",
            base_datetime=datetime(2026, 6, 1, 0, 0),
        )
    )
    session.flush()

    included_payment = Transaction(
        amount=100_000,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method="Bank transfer",
        note="Recorded after the base date",
        customer_id=customer.id,
        created_by=current_user.id,
        occurred_at=datetime(2026, 5, 20, 9, 0),
        created_at=datetime(2026, 6, 2, 9, 0),
    )
    excluded_charge = Transaction(
        amount=500_000,
        type=TransactionType.CHARGE,
        category=TransactionCategory.ADDITIONAL_FEE,
        method="Manual",
        note="Recorded before the base date",
        customer_id=customer.id,
        created_by=current_user.id,
        occurred_at=datetime(2026, 6, 2, 9, 0),
        created_at=datetime(2026, 5, 31, 9, 0),
    )
    session.add(included_payment)
    session.add(excluded_charge)
    session.commit()

    response = client.get("/api/v1/finance/dashboard-summary")

    clear_overrides()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["scope_started_at"] == "2026-06-01T00:00:00"
    assert data["financial"]["total_receivables"] == 0
    assert data["financial"]["total_held_credit"] == 100_000
    assert data["financial"]["customers_with_credit"] == 1
