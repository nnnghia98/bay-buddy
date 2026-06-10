from datetime import datetime, timezone
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select

from core.auth import get_current_user
from database import get_session
from main import app
from models.customer import Customer
from models.enums import Airline, CustomerType, TicketStatus, TransactionCategory, TransactionType, UserRole
from models.ticket import Ticket
from models.transaction import Transaction
from models.user import User
import routes.tickets as ticket_routes


@pytest.fixture
def test_engine(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'tickets.db'}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def test_client(test_engine):
    fake_user = User(
        id=uuid.uuid4(),
        username="ticket-tester",
        role=UserRole.ADMIN,
        is_active=True,
        hashed_password="hashed-password",
    )

    def override_get_current_user() -> User:
        return fake_user

    def override_get_session():
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client

    app.dependency_overrides.clear()


def _confirm_payload() -> dict:
    return {
        "customer_name": "Nguyen Van A",
        "customer_type": "INDIVIDUAL",
        "pnr": "ABC123",
        "airline": "VJ",
        "ticket_number": "7382319992101",
        "passengers": ["NGUYEN VAN A"],
        "departure_place": "Ha Noi",
        "arrival_place": "Ho Chi Minh City",
        "departure_code": "HAN",
        "arrival_code": "SGN",
        "itinerary": "HAN-SGN",
        "flight_date": datetime(2026, 4, 22, 10, 30, tzinfo=timezone.utc).isoformat(),
        "net_price": 1000000,
        "service_fee": 200000,
        "selling_price": 1200000,
        "discount": 10000,
        "true_income": 210000,
        "fare_class": "B",
        "seat_code": "12A",
    }


def _seed_customer(test_engine, *, balance: float = 0.0) -> Customer:
    customer = Customer(
        name="Nguyen Van A",
        type=CustomerType.INDIVIDUAL,
        balance=balance,
    )
    with Session(test_engine) as session:
        session.add(customer)
        session.commit()
        session.refresh(customer)
    return customer


def _seed_confirmed_ticket(
    test_engine,
    *,
    customer: Customer,
    selling_price: float,
) -> Ticket:
    ticket = Ticket(
        pnr="XYZ789",
        airline=Airline.VJ,
        ticket_number="7382319992102",
        passengers=["NGUYEN VAN A"],
        departure_place="Ha Noi",
        arrival_place="Ho Chi Minh City",
        departure_code="HAN",
        arrival_code="SGN",
        itinerary="HAN-SGN",
        flight_date=datetime(2026, 4, 22, 10, 30, tzinfo=timezone.utc),
        net_price=1000000,
        selling_price=selling_price,
        status=TicketStatus.CONFIRMED,
        customer_id=customer.id,
    )
    with Session(test_engine) as session:
        session.add(ticket)
        session.commit()
        session.refresh(ticket)
    return ticket


def _seed_ticket_purchase_transaction(
    test_engine,
    *,
    customer: Customer,
    ticket: Ticket,
    amount: float,
) -> Transaction:
    transaction = Transaction(
        amount=amount,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        note=f"Auto-debt for PNR {ticket.pnr}",
        customer_id=customer.id,
        linked_ticket_id=ticket.id,
        created_by=uuid.uuid4(),
    )
    with Session(test_engine) as session:
        session.add(transaction)
        session.commit()
        session.refresh(transaction)
    return transaction


def test_confirm_ticket_surfaces_service_errors_as_non_2xx(test_client, monkeypatch):
    def boom(*args, **kwargs):
        raise HTTPException(status_code=400, detail="service error")

    monkeypatch.setattr(ticket_routes, "create_ticket_with_transaction", boom)

    response = test_client.post("/api/v1/tickets/confirm", json=_confirm_payload())

    assert response.status_code == 400
    assert response.json() == {"detail": "service error"}


def test_confirm_ticket_allows_shared_pnr_for_group_passengers(
    test_client,
    test_engine,
):
    first_response = test_client.post("/api/v1/tickets/confirm", json=_confirm_payload())

    second_payload = _confirm_payload() | {
        "ticket_number": "7382319992102",
        "passengers": ["TRAN THI B"],
        "seat_code": "12B",
    }
    second_response = test_client.post("/api/v1/tickets/confirm", json=second_payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 201

    with Session(test_engine) as session:
        tickets = session.exec(select(Ticket).where(Ticket.pnr == "ABC123")).all()
        transactions = session.exec(
            select(Transaction).where(
                Transaction.linked_ticket_id.in_([ticket.id for ticket in tickets])
            )
        ).all()
        customer = session.exec(select(Customer).where(Customer.name == "Nguyen Van A")).one()

        assert len(tickets) == 2
        assert {ticket.ticket_number for ticket in tickets} == {
            "7382319992101",
            "7382319992102",
        }
        assert {tuple(ticket.passengers) for ticket in tickets} == {
            ("NGUYEN VAN A",),
            ("TRAN THI B",),
        }
        assert len(transactions) == 2
        assert customer.balance == pytest.approx(2400000)


def test_confirm_ticket_allows_shared_ticket_numbers_for_return_flights(
    test_client,
    test_engine,
):
    outbound_response = test_client.post("/api/v1/tickets/confirm", json=_confirm_payload())

    return_payload = _confirm_payload() | {
        "pnr": "DEF456",
        "departure_place": "Ho Chi Minh City",
        "arrival_place": "Ha Noi",
        "departure_code": "SGN",
        "arrival_code": "HAN",
        "itinerary": "SGN-HAN",
        "flight_date": datetime(2026, 4, 28, 8, 0, tzinfo=timezone.utc).isoformat(),
    }
    return_response = test_client.post("/api/v1/tickets/confirm", json=return_payload)

    assert outbound_response.status_code == 201
    assert return_response.status_code == 201

    with Session(test_engine) as session:
        tickets = session.exec(
            select(Ticket).where(Ticket.ticket_number == "7382319992101")
        ).all()

        assert len(tickets) == 2
        assert {ticket.pnr for ticket in tickets} == {"ABC123", "DEF456"}
        assert {ticket.itinerary for ticket in tickets} == {"HAN-SGN", "SGN-HAN"}


def test_confirm_ticket_persists_pricing_fields_and_records_customer_debt(
    test_client,
    test_engine,
):
    response = test_client.post("/api/v1/tickets/confirm", json=_confirm_payload())

    assert response.status_code == 201
    payload = response.json()["data"]

    assert payload["ticket"]["net_price"] == pytest.approx(1000000)
    assert payload["ticket"]["selling_price"] == pytest.approx(1200000)
    assert payload["ticket"]["discount"] == pytest.approx(10000)
    assert payload["ticket"]["true_income"] == pytest.approx(210000)
    assert payload["ticket"]["fare_class"] == "B"
    assert payload["ticket"]["seat_code"] == "12A"

    with Session(test_engine) as session:
        ticket = session.exec(select(Ticket).where(Ticket.pnr == "ABC123")).one()
        transaction = session.exec(
            select(Transaction).where(Transaction.linked_ticket_id == ticket.id)
        ).one()
        customer = session.get(Customer, ticket.customer_id)

        assert ticket.net_price == pytest.approx(1000000)
        assert ticket.selling_price == pytest.approx(1200000)
        assert ticket.discount == pytest.approx(10000)
        assert ticket.true_income == pytest.approx(210000)
        assert ticket.fare_class == "B"
        assert ticket.seat_code == "12A"
        assert transaction.amount == pytest.approx(1200000)
        assert customer is not None
        assert customer.balance == pytest.approx(1200000)


def test_legacy_ticket_create_endpoint_is_retired(
    test_client,
    test_engine,
):
    customer = _seed_customer(test_engine, balance=125000.0)

    response = test_client.post(
        "/api/v1/tickets/",
        json={
            "pnr": "LEG123",
            "airline": "VJ",
            "ticket_number": "7382319992103",
            "passengers": ["NGUYEN VAN A"],
            "departure_place": "Ha Noi",
            "arrival_place": "Ho Chi Minh City",
            "departure_code": "HAN",
            "arrival_code": "SGN",
            "itinerary": "HAN-SGN",
            "flight_date": datetime(2026, 4, 22, 10, 30, tzinfo=timezone.utc).isoformat(),
            "net_price": 1000000,
            "selling_price": 1200000,
            "status": "DRAFT",
            "customer_id": str(customer.id),
        },
    )

    assert response.status_code == 410
    with Session(test_engine) as session:
        persisted_customer = session.get(Customer, customer.id)
        assert persisted_customer is not None
        assert persisted_customer.balance == pytest.approx(125000.0)
        assert session.exec(select(Ticket).where(Ticket.customer_id == customer.id)).first() is None


def test_legacy_ticket_patch_endpoint_is_retired(
    test_client,
    test_engine,
):
    customer = _seed_customer(test_engine, balance=1200000.0)
    ticket = _seed_confirmed_ticket(
        test_engine,
        customer=customer,
        selling_price=1200000.0,
    )

    response = test_client.patch(
        f"/api/v1/tickets/{ticket.id}",
        json={
            "selling_price": 999000,
            "net_price": 900000,
        },
    )

    assert response.status_code == 410
    with Session(test_engine) as session:
        persisted_ticket = session.get(Ticket, ticket.id)
        persisted_customer = session.get(Customer, customer.id)

        assert persisted_ticket is not None
        assert persisted_ticket.selling_price == pytest.approx(1200000.0)
        assert persisted_ticket.net_price == pytest.approx(1000000.0)
        assert persisted_customer is not None
        assert persisted_customer.balance == pytest.approx(1200000.0)


def test_ticket_void_endpoint_is_explicit_and_updates_balance(
    test_client,
    test_engine,
):
    customer = _seed_customer(test_engine, balance=1200000.0)
    ticket = _seed_confirmed_ticket(
        test_engine,
        customer=customer,
        selling_price=1200000.0,
    )
    _seed_ticket_purchase_transaction(
        test_engine,
        customer=customer,
        ticket=ticket,
        amount=1200000.0,
    )

    response = test_client.post(f"/api/v1/tickets/{ticket.id}/void")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["ticket"]["status"] == "VOID"
    assert payload["customer"]["balance"] == pytest.approx(0.0)


def test_ticket_refund_endpoint_is_explicit_and_supports_partial_refunds(
    test_client,
    test_engine,
):
    customer = _seed_customer(test_engine, balance=1200000.0)
    ticket = _seed_confirmed_ticket(
        test_engine,
        customer=customer,
        selling_price=1200000.0,
    )
    _seed_ticket_purchase_transaction(
        test_engine,
        customer=customer,
        ticket=ticket,
        amount=1200000.0,
    )

    response = test_client.post(
        f"/api/v1/tickets/{ticket.id}/refund",
        json={"amount": 300000},
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["ticket"]["status"] == "REFUNDED"
    assert payload["customer"]["balance"] == pytest.approx(900000.0)


def test_ticket_reassign_endpoint_moves_the_ticket_to_a_new_customer(
    test_client,
    test_engine,
):
    old_customer = _seed_customer(test_engine, balance=1200000.0)
    new_customer = _seed_customer(test_engine, balance=0.0)
    ticket = _seed_confirmed_ticket(
        test_engine,
        customer=old_customer,
        selling_price=1200000.0,
    )
    _seed_ticket_purchase_transaction(
        test_engine,
        customer=old_customer,
        ticket=ticket,
        amount=1200000.0,
    )

    response = test_client.post(
        f"/api/v1/tickets/{ticket.id}/reassign",
        json={"new_customer_id": str(new_customer.id)},
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["ticket"]["customer_id"] == str(new_customer.id)
    assert payload["old_customer"]["balance"] == pytest.approx(0.0)
    assert payload["new_customer"]["balance"] == pytest.approx(1200000.0)


def test_admin_ticket_correction_updates_debt_transaction_and_balance(
    test_client,
    test_engine,
):
    customer = _seed_customer(test_engine, balance=1200000.0)
    ticket = _seed_confirmed_ticket(
        test_engine,
        customer=customer,
        selling_price=1200000.0,
    )
    transaction = _seed_ticket_purchase_transaction(
        test_engine,
        customer=customer,
        ticket=ticket,
        amount=1200000.0,
    )

    response = test_client.patch(
        f"/api/v1/tickets/{ticket.id}/correction",
        json={
            "pnr": "FIX123",
            "departure_code": "DAD",
            "arrival_code": "SGN",
            "net_price": 1500000,
            "selling_price": 1800000,
            "discount": 50000,
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["ticket"]["pnr"] == "FIX123"
    assert payload["ticket"]["itinerary"] == "DAD-SGN"
    assert payload["ticket"]["true_income"] == pytest.approx(350000.0)
    assert payload["customer_new_balance"] == pytest.approx(1800000.0)

    with Session(test_engine) as session:
        persisted_transaction = session.get(Transaction, transaction.id)
        persisted_customer = session.get(Customer, customer.id)

        assert persisted_transaction is not None
        assert persisted_transaction.amount == pytest.approx(1800000.0)
        assert persisted_customer is not None
        assert persisted_customer.balance == pytest.approx(1800000.0)


def test_admin_ticket_removal_deletes_ticket_purchase_and_reverses_balance(
    test_client,
    test_engine,
):
    customer = _seed_customer(test_engine, balance=1200000.0)
    ticket = _seed_confirmed_ticket(
        test_engine,
        customer=customer,
        selling_price=1200000.0,
    )
    transaction = _seed_ticket_purchase_transaction(
        test_engine,
        customer=customer,
        ticket=ticket,
        amount=1200000.0,
    )

    response = test_client.delete(f"/api/v1/tickets/{ticket.id}/correction")

    assert response.status_code == 200
    assert response.json()["data"]["deleted"] is True

    with Session(test_engine) as session:
        assert session.get(Ticket, ticket.id) is None
        assert session.get(Transaction, transaction.id) is None
        persisted_customer = session.get(Customer, customer.id)
        assert persisted_customer is not None
        assert persisted_customer.balance == pytest.approx(0.0)
