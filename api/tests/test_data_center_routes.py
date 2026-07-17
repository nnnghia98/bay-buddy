from __future__ import annotations

import io
import zipfile
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from core.auth import get_current_user
from database import get_session
from main import app
from models.customer import Customer
from models.enums import (
    Airline,
    CustomerType,
    TicketStatus,
    TransactionCategory,
    TransactionType,
    TicketImportSource,
    UserRole,
)
from models.ticket import Ticket
from models.ticket_import import TicketImport
from models.transaction import Transaction
from models.user import User
from models.workbook import Workbook


def create_test_client(
    *,
    role: UserRole = UserRole.ADMIN,
) -> tuple[TestClient, Session, User]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    SQLModel.metadata.create_all(engine)
    session = Session(engine)
    current_user = User(
        username=f"{role.value.lower()}-user",
        hashed_password="not-used-in-tests",
        role=role,
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
    client = TestClient(app)
    return client, session, current_user


def clear_overrides() -> None:
    app.dependency_overrides.clear()


def seed_ticket(
    session: Session,
    *,
    customer: Customer,
    flight_date: datetime,
    created_at: datetime,
    pnr: str,
) -> Ticket:
    ticket = Ticket(
        pnr=pnr,
        airline=Airline.VNA,
        ticket_number=f"738-{pnr}",
        departure_place="Ha Noi",
        arrival_place="Ho Chi Minh City",
        departure_code="HAN",
        arrival_code="SGN",
        itinerary="HAN-SGN",
        flight_date=flight_date,
        created_at=created_at,
        updated_at=created_at,
        net_price=1_000_000,
        selling_price=1_200_000,
        true_income=200_000,
        status=TicketStatus.CONFIRMED,
        customer_id=customer.id,
        passengers=["NGUYEN VAN A"],
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def seed_data_center_rows(
    session: Session,
    *,
    current_user: User,
) -> tuple[Customer, Ticket, Ticket]:
    customer = Customer(
        name="Cong ty Bay Buddy",
        type=CustomerType.BUSINESS,
        balance=2_400_000,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)

    in_scope_ticket = seed_ticket(
        session,
        customer=customer,
        flight_date=datetime(2026, 5, 2, 8, 30),
        created_at=datetime(2026, 6, 2, 8, 30),
        pnr="ABC123",
    )
    out_of_scope_ticket = seed_ticket(
        session,
        customer=customer,
        flight_date=datetime(2026, 6, 2, 8, 30),
        created_at=datetime(2026, 5, 2, 8, 30),
        pnr="XYZ789",
    )
    transaction = Transaction(
        amount=1_200_000,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        occurred_at=datetime(2026, 5, 2, 8, 31),
        created_at=datetime(2026, 5, 2, 8, 31),
        customer_id=customer.id,
        linked_ticket_id=out_of_scope_ticket.id,
        created_by=current_user.id,
    )
    ticket_import = TicketImport(
        source=TicketImportSource.UPLOAD,
        created_by=current_user.id,
        linked_ticket_id=out_of_scope_ticket.id,
        original_filename="ticket.html",
        original_mime_type="text/html",
        redaction_summary={"strategy": "test"},
        original_content="<p>ticket</p>",
        redacted_content="<p>ticket</p>",
        created_at=datetime(2026, 5, 2, 8, 32),
        updated_at=datetime(2026, 5, 2, 8, 32),
    )
    session.add(transaction)
    session.add(ticket_import)
    session.commit()
    return customer, in_scope_ticket, out_of_scope_ticket


def test_staff_cannot_preview_data_center() -> None:
    client, _session, _current_user = create_test_client(role=UserRole.STAFF)

    response = client.get("/api/v1/data-center/preview")

    clear_overrides()

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_admin_can_preview_selected_date_range() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    seed_data_center_rows(session, current_user=current_user)

    response = client.get(
        "/api/v1/data-center/preview",
        params={
            "date_from": "2026-05-01T00:00:00",
            "date_to": "2026-05-31T23:59:59",
        },
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    tables = {item["key"]: item for item in payload["data"]["tables"]}
    assert tables["customers"]["count"] == 0
    assert tables["tickets"]["count"] == 1
    assert tables["transactions"]["count"] == 1


def test_admin_can_preview_selected_tables_only() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    seed_data_center_rows(session, current_user=current_user)

    response = client.get(
        "/api/v1/data-center/preview",
        params={
            "date_from": "2026-05-01T00:00:00",
            "date_to": "2026-05-31T23:59:59",
            "tables": "tickets,transactions",
        },
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert [item["key"] for item in payload["data"]["tables"]] == [
        "tickets",
        "transactions",
    ]


def test_admin_backup_returns_csv_zip_for_selected_range() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    seed_data_center_rows(session, current_user=current_user)

    response = client.get(
        "/api/v1/data-center/backup",
        params={
            "date_from": "2026-05-01T00:00:00",
            "date_to": "2026-05-31T23:59:59",
        },
    )

    clear_overrides()

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        tickets_csv = archive.read("tickets.csv").decode()
        customers_csv = archive.read("customers.csv").decode()
    assert "XYZ789" in tickets_csv
    assert "ABC123" not in tickets_csv
    assert customers_csv == ""


def test_admin_can_wipe_selected_date_range() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    customer, in_scope_ticket, out_of_scope_ticket = seed_data_center_rows(
        session,
        current_user=current_user,
    )

    response = client.request(
        "DELETE",
        "/api/v1/data-center/wipe",
        json={
            "confirmation": "WIPE DATABASE",
            "date_from": "2026-05-01T00:00:00",
            "date_to": "2026-05-31T23:59:59",
        },
    )
    session.refresh(customer)

    remaining_ticket_ids = {
        ticket.id for ticket in session.exec(select(Ticket)).all()
    }

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["deleted"]["tickets"] == 1
    assert payload["data"]["deleted"]["ticket_imports"] == 1
    assert payload["data"]["deleted"]["transactions"] == 1
    assert out_of_scope_ticket.id not in remaining_ticket_ids
    assert in_scope_ticket.id in remaining_ticket_ids
    assert customer.balance == 0


def test_admin_can_wipe_selected_tables_only() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    _customer, in_scope_ticket, out_of_scope_ticket = seed_data_center_rows(
        session,
        current_user=current_user,
    )

    response = client.request(
        "DELETE",
        "/api/v1/data-center/wipe",
        json={
            "confirmation": "WIPE DATABASE",
            "date_from": "2026-05-01T00:00:00",
            "date_to": "2026-05-31T23:59:59",
            "tables": ["tickets"],
        },
    )
    remaining_tickets = session.exec(select(Ticket)).all()
    remaining_transactions = session.exec(select(Transaction)).all()

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["deleted"]["tickets"] == 1
    assert payload["data"]["deleted"]["ticket_imports"] == 1
    assert payload["data"]["deleted"]["transactions"] == 0
    assert {ticket.id for ticket in remaining_tickets} == {in_scope_ticket.id}
    assert len(remaining_transactions) == 1
    assert remaining_transactions[0].linked_ticket_id is None
    assert out_of_scope_ticket.id not in {ticket.id for ticket in remaining_tickets}
    assert session.exec(select(TicketImport)).all() == []


def test_admin_user_only_wipe_preserves_transaction_audit_user() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    seed_data_center_rows(session, current_user=current_user)
    audit_user = User(
        username="audit-user",
        hashed_password="not-used-in-tests",
        role=UserRole.STAFF,
        is_active=True,
    )
    session.add(audit_user)
    session.commit()
    session.refresh(audit_user)
    customer = session.exec(select(Customer)).one()
    transaction = Transaction(
        amount=50_000,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method="Bank transfer",
        note="Audit user payment",
        occurred_at=datetime(2026, 5, 3, 8, 31),
        created_at=datetime(2026, 5, 3, 8, 31),
        customer_id=customer.id,
        created_by=audit_user.id,
    )
    session.add(transaction)
    session.commit()

    response = client.request(
        "DELETE",
        "/api/v1/data-center/wipe",
        json={
            "confirmation": "WIPE DATABASE",
            "tables": ["users"],
        },
    )
    remaining_user_ids = {user.id for user in session.exec(select(User)).all()}

    clear_overrides()

    assert response.status_code == 200
    assert audit_user.id in remaining_user_ids
    assert current_user.id in remaining_user_ids
    assert response.json()["data"]["deleted"]["users"] == 0


def test_admin_can_wipe_all_tables_all_time() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    _customer, _in_scope_ticket, _out_of_scope_ticket = seed_data_center_rows(
        session,
        current_user=current_user,
    )
    staff_user = User(
        username="staff-user",
        hashed_password="not-used-in-tests",
        role=UserRole.STAFF,
        is_active=True,
    )
    session.add(staff_user)
    session.commit()
    session.refresh(staff_user)
    unlinked_import = TicketImport(
        source=TicketImportSource.UPLOAD,
        created_by=staff_user.id,
        original_filename="unlinked.html",
        original_mime_type="text/html",
        redaction_summary={"strategy": "test"},
        original_content="<p>unlinked</p>",
        redacted_content="<p>unlinked</p>",
        created_at=datetime(2026, 5, 2, 8, 33),
        updated_at=datetime(2026, 5, 2, 8, 33),
    )
    session.add(unlinked_import)
    session.add(
        Workbook(
            original_filename="prices.xlsx",
            original_relative_path="originals/test/source.xlsx",
            original_checksum="a" * 64,
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            file_size=10,
            sheet_count=1,
            sheet_metadata=[],
            created_by=staff_user.id,
        )
    )
    session.commit()

    response = client.request(
        "DELETE",
        "/api/v1/data-center/wipe",
        json={
            "confirmation": "WIPE DATABASE",
            "date_from": None,
            "date_to": None,
            "tables": [
                "customers",
                "tickets",
                "transactions",
                "invoices",
                "quotes",
                "users",
            ],
        },
    )

    clear_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["deleted"]["customers"] == 1
    assert payload["data"]["deleted"]["tickets"] == 2
    assert payload["data"]["deleted"]["transactions"] == 1
    assert payload["data"]["deleted"]["ticket_imports"] == 2
    assert payload["data"]["deleted"]["workbooks"] == 1
    assert payload["data"]["deleted"]["users"] == 1


def test_admin_base_date_time_filters_active_app_queries() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    customer, _in_scope_ticket, out_of_scope_ticket = seed_data_center_rows(
        session,
        current_user=current_user,
    )
    after_base_transaction = Transaction(
        amount=900_000,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        occurred_at=datetime(2026, 6, 2, 8, 31),
        created_at=datetime(2026, 6, 2, 8, 31),
        customer_id=customer.id,
        linked_ticket_id=out_of_scope_ticket.id,
        created_by=current_user.id,
    )
    session.add(after_base_transaction)
    customer.balance = 2_100_000
    session.add(customer)
    session.commit()

    settings_response = client.patch(
        "/api/v1/settings/base-date-time",
        json={"base_datetime": "2026-05-15T00:00:00"},
    )
    tickets_response = client.get("/api/v1/tickets/", params={"limit": 500})
    transactions_response = client.get("/api/v1/transactions/", params={"limit": 500})
    customers_response = client.get("/api/v1/customers/", params={"limit": 500})

    clear_overrides()

    assert settings_response.status_code == 200
    tickets = tickets_response.json()["data"]
    transactions = transactions_response.json()["data"]
    customers = customers_response.json()["data"]
    assert [ticket["pnr"] for ticket in tickets] == ["ABC123"]
    assert len(transactions) == 1
    assert transactions[0]["id"] == str(after_base_transaction.id)
    assert customers[0]["current_balance"] == 900_000


def test_base_date_time_allows_historical_transaction_event_dates() -> None:
    client, session, current_user = create_test_client(role=UserRole.ADMIN)
    customer, _in_scope_ticket, _out_of_scope_ticket = seed_data_center_rows(
        session,
        current_user=current_user,
    )

    client.patch(
        "/api/v1/settings/base-date-time",
        json={"base_datetime": "2026-05-15T00:00:00"},
    )
    response = client.post(
        "/api/v1/transactions/",
        json={
            "amount": 100_000,
            "type": "PAYMENT",
            "category": "PAYMENT",
            "method": "Bank transfer",
            "note": "Before base date",
            "occurred_at": "2026-05-02T09:00:00",
            "customer_id": str(customer.id),
        },
    )

    clear_overrides()

    assert response.status_code == 201
    assert response.json()["success"] is True
