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
from models.enums import Airline, CustomerType, TicketStatus, UserRole
from models.enums import TransactionCategory, TransactionType
from models.ticket import Ticket
from models.transaction import Transaction
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


def test_staff_cannot_edit_customer_contact_fields() -> None:
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

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


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


def test_staff_cannot_create_customer() -> None:
    client, session = create_test_client(role=UserRole.STAFF)
    del session

    response = client.post(
        "/api/v1/customers/",
        json={
            "name": "Staff Attempt",
            "type": "INDIVIDUAL",
        },
    )

    clear_overrides()

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_admin_can_delete_customer_without_related_records() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)

    response = client.delete(f"/api/v1/customers/{customer.id}")

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["id"] == str(customer.id)
    assert payload["data"]["deleted"] is True


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


def test_list_customers_supports_search_pagination() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    seed_customer(session, name="Active Customer")
    seed_customer(session, name="Another Customer")

    response = client.get(
        "/api/v1/customers/",
        params={"page": 1, "page_size": 1, "q": "Active"},
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()["data"]
    assert len(payload["items"]) == 1
    assert payload["items"][0]["full_name"] == "Active Customer"
    assert payload["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total": 1,
        "total_pages": 1,
        "has_next": False,
    }


def test_admin_can_correct_transaction_and_rebalance_customer() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)
    transaction = Transaction(
        amount=500000,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method="Bank transfer",
        note="Initial payment",
        customer_id=customer.id,
        created_by=uuid.uuid4(),
    )
    customer.balance = -500000
    session.add(transaction)
    session.add(customer)
    session.commit()
    session.refresh(transaction)

    response = client.patch(
        f"/api/v1/transactions/{transaction.id}",
        json={
            "amount": 300000,
            "method": "Cash",
            "note": "Corrected payment",
        },
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["transaction"]["amount"] == 300000
    assert payload["customer_new_balance"] == -300000


def test_admin_can_correct_ticket_payment_method_without_rebalancing() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)
    ticket = Ticket(
        pnr="ABC123",
        airline=Airline.VJ,
        passengers=["NGUYEN VAN A"],
        itinerary="HAN-SGN",
        flight_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        net_price=1_000_000,
        selling_price=1_200_000,
        status=TicketStatus.CONFIRMED,
        customer_id=customer.id,
    )
    transaction = Transaction(
        amount=1_200_000,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        note="Auto-debt for ticket ABC123",
        customer_id=customer.id,
        linked_ticket_id=ticket.id,
        created_by=uuid.uuid4(),
    )
    customer.balance = 1_200_000
    session.add(ticket)
    session.add(transaction)
    session.add(customer)
    session.commit()
    session.refresh(transaction)

    response = client.patch(
        f"/api/v1/transactions/{transaction.id}",
        json={"method": "AST"},
    )

    clear_overrides()

    assert response.status_code == 200
    assert response.json()["data"]["transaction"]["method"] == "AST"
    session.refresh(transaction)
    assert transaction.method == "AST"


def test_admin_can_correct_ticket_note_without_rebalancing() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)
    ticket = Ticket(
        pnr="ABC123",
        airline=Airline.VJ,
        passengers=["NGUYEN VAN A"],
        itinerary="HAN-SGN",
        flight_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        net_price=1_000_000,
        selling_price=1_200_000,
        status=TicketStatus.CONFIRMED,
        customer_id=customer.id,
    )
    transaction = Transaction(
        amount=1_200_000,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        note="Auto-debt for ticket ABC123",
        customer_id=customer.id,
        linked_ticket_id=ticket.id,
        created_by=uuid.uuid4(),
    )
    customer.balance = 1_200_000
    session.add(ticket)
    session.add(transaction)
    session.add(customer)
    session.commit()
    session.refresh(transaction)

    response = client.patch(
        f"/api/v1/transactions/{transaction.id}",
        json={"note": "Customer requested an invoice copy"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["transaction"]["note"] == (
        "Customer requested an invoice copy"
    )
    assert response.json()["data"]["customer_new_balance"] == 1_200_000
    session.refresh(transaction)
    assert transaction.note == "Customer requested an invoice copy"

    clear_response = client.patch(
        f"/api/v1/transactions/{transaction.id}",
        json={"note": None},
    )

    clear_overrides()

    assert clear_response.status_code == 200
    session.refresh(transaction)
    assert transaction.note is None
    assert session.get(Customer, customer.id).balance == 1_200_000


def test_admin_can_delete_transaction_and_rebalance_customer() -> None:
    client, session = create_test_client(role=UserRole.ADMIN)
    customer = seed_customer(session)
    transaction = Transaction(
        amount=500000,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method="Bank transfer",
        note="Initial payment",
        customer_id=customer.id,
        created_by=uuid.uuid4(),
    )
    customer.balance = -500000
    session.add(transaction)
    session.add(customer)
    session.commit()
    session.refresh(transaction)

    response = client.delete(f"/api/v1/transactions/{transaction.id}")

    clear_overrides()

    assert response.status_code == 200
    assert response.json()["data"]["customer_new_balance"] == 0
    assert session.get(Transaction, transaction.id) is None
