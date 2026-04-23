from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from models.customer import Customer
from models.enums import Airline, CustomerType, TicketStatus, TransactionCategory, TransactionType, UserRole
from models.ticket import Ticket
from models.transaction import Transaction
from services.ticket_service import (
    TicketRefundPayload,
    TicketReassignPayload,
    refund_confirmed_ticket,
    reassign_confirmed_ticket,
    void_confirmed_ticket,
)


@pytest.fixture
def test_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def _seed_customer(session: Session, *, name: str, balance: float) -> Customer:
    customer = Customer(name=name, type=CustomerType.INDIVIDUAL, balance=balance)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def _seed_confirmed_ticket(
    session: Session,
    *,
    customer: Customer,
    pnr: str,
    selling_price: float,
) -> Ticket:
    ticket = Ticket(
        pnr=pnr,
        airline=Airline.VJ,
        passengers=["NGUYEN VAN A"],
        itinerary="HAN-SGN",
        flight_date=datetime(2026, 4, 22, 10, 30, tzinfo=timezone.utc),
        net_price=1_000_000,
        selling_price=selling_price,
        status=TicketStatus.CONFIRMED,
        customer_id=customer.id,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def _seed_ticket_charge(
    session: Session,
    *,
    customer: Customer,
    ticket: Ticket,
    actor_user_id: uuid.UUID,
) -> Transaction:
    transaction = Transaction(
        amount=ticket.selling_price,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        note=f"Auto-debt for PNR {ticket.pnr}",
        customer_id=customer.id,
        linked_ticket_id=ticket.id,
        created_by=actor_user_id,
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


def test_void_confirmed_ticket_creates_a_reversal_and_releases_debt(
    test_session: Session,
) -> None:
    actor_user_id = uuid.uuid4()
    customer = _seed_customer(test_session, name="Nguyen Van A", balance=1_200_000)
    ticket = _seed_confirmed_ticket(
        test_session,
        customer=customer,
        pnr="ABC123",
        selling_price=1_200_000,
    )
    original_transaction = _seed_ticket_charge(
        test_session,
        customer=customer,
        ticket=ticket,
        actor_user_id=actor_user_id,
    )

    response = void_confirmed_ticket(
        session=test_session,
        ticket_id=ticket.id,
        actor_user_id=actor_user_id,
    )

    assert response.ticket.status == TicketStatus.VOID
    assert response.customer_new_balance == pytest.approx(0.0)

    refreshed_ticket = test_session.get(Ticket, ticket.id)
    refreshed_customer = test_session.get(Customer, customer.id)
    assert refreshed_ticket is not None
    assert refreshed_ticket.status == TicketStatus.VOID
    assert refreshed_customer is not None
    assert refreshed_customer.balance == pytest.approx(0.0)

    refreshed_original = test_session.get(Transaction, original_transaction.id)
    assert refreshed_original is not None
    assert refreshed_original.linked_ticket_id is None

    reversal = test_session.exec(
        select(Transaction).where(
            Transaction.customer_id == customer.id,
            Transaction.category == TransactionCategory.DISCOUNT,
            Transaction.linked_ticket_id == ticket.id,
        )
    ).first()
    assert reversal is not None
    assert reversal.amount == pytest.approx(1_200_000)
    assert reversal.created_by == actor_user_id


def test_refund_confirmed_ticket_records_a_partial_credit_adjustment(
    test_session: Session,
) -> None:
    actor_user_id = uuid.uuid4()
    customer = _seed_customer(test_session, name="Nguyen Van B", balance=1_200_000)
    ticket = _seed_confirmed_ticket(
        test_session,
        customer=customer,
        pnr="DEF456",
        selling_price=1_200_000,
    )
    original_transaction = _seed_ticket_charge(
        test_session,
        customer=customer,
        ticket=ticket,
        actor_user_id=actor_user_id,
    )

    response = refund_confirmed_ticket(
        session=test_session,
        ticket_id=ticket.id,
        payload=TicketRefundPayload(amount=300_000),
        actor_user_id=actor_user_id,
    )

    assert response.ticket.status == TicketStatus.REFUNDED
    assert response.customer_new_balance == pytest.approx(900_000.0)

    refreshed_customer = test_session.get(Customer, customer.id)
    assert refreshed_customer is not None
    assert refreshed_customer.balance == pytest.approx(900_000.0)

    refreshed_original = test_session.get(Transaction, original_transaction.id)
    assert refreshed_original is not None
    assert refreshed_original.linked_ticket_id is None

    refund_adjustment = test_session.exec(
        select(Transaction).where(
            Transaction.customer_id == customer.id,
            Transaction.category == TransactionCategory.DISCOUNT,
            Transaction.linked_ticket_id == ticket.id,
        )
    ).first()
    assert refund_adjustment is not None
    assert refund_adjustment.amount == pytest.approx(300_000.0)
    assert refund_adjustment.created_by == actor_user_id


def test_reassign_confirmed_ticket_transfers_the_balance_to_a_new_customer(
    test_session: Session,
) -> None:
    actor_user_id = uuid.uuid4()
    old_customer = _seed_customer(test_session, name="Old Customer", balance=1_200_000)
    new_customer = _seed_customer(test_session, name="New Customer", balance=0.0)
    ticket = _seed_confirmed_ticket(
        test_session,
        customer=old_customer,
        pnr="GHI789",
        selling_price=1_200_000,
    )
    original_transaction = _seed_ticket_charge(
        test_session,
        customer=old_customer,
        ticket=ticket,
        actor_user_id=actor_user_id,
    )

    response = reassign_confirmed_ticket(
        session=test_session,
        ticket_id=ticket.id,
        payload=TicketReassignPayload(new_customer_id=new_customer.id),
        actor_user_id=actor_user_id,
    )

    assert response.ticket.customer_id == new_customer.id
    assert response.old_customer_new_balance == pytest.approx(0.0)
    assert response.new_customer_new_balance == pytest.approx(1_200_000.0)

    refreshed_ticket = test_session.get(Ticket, ticket.id)
    refreshed_old_customer = test_session.get(Customer, old_customer.id)
    refreshed_new_customer = test_session.get(Customer, new_customer.id)
    assert refreshed_ticket is not None
    assert refreshed_ticket.customer_id == new_customer.id
    assert refreshed_old_customer is not None
    assert refreshed_old_customer.balance == pytest.approx(0.0)
    assert refreshed_new_customer is not None
    assert refreshed_new_customer.balance == pytest.approx(1_200_000.0)

    refreshed_original = test_session.get(Transaction, original_transaction.id)
    assert refreshed_original is not None
    assert refreshed_original.linked_ticket_id is None

    transfer_out = test_session.exec(
        select(Transaction).where(
            Transaction.customer_id == old_customer.id,
            Transaction.category == TransactionCategory.DISCOUNT,
            Transaction.linked_ticket_id == ticket.id,
        )
    ).first()
    assert transfer_out is not None
    assert transfer_out.amount == pytest.approx(1_200_000.0)

    transfer_in = test_session.exec(
        select(Transaction).where(
            Transaction.customer_id == new_customer.id,
            Transaction.category == TransactionCategory.TICKET_PURCHASE,
            Transaction.linked_ticket_id == ticket.id,
        )
    ).first()
    assert transfer_in is not None
    assert transfer_in.amount == pytest.approx(1_200_000.0)


def test_locked_ticket_purchase_transaction_blocks_lifecycle_changes(
    test_session: Session,
) -> None:
    actor_user_id = uuid.uuid4()
    customer = _seed_customer(test_session, name="Locked Customer", balance=1_200_000)
    ticket = _seed_confirmed_ticket(
        test_session,
        customer=customer,
        pnr="JKL012",
        selling_price=1_200_000,
    )
    locked_transaction = _seed_ticket_charge(
        test_session,
        customer=customer,
        ticket=ticket,
        actor_user_id=actor_user_id,
    )
    locked_transaction.is_invoiced = True
    locked_transaction.invoice_id = uuid.uuid4()
    test_session.add(locked_transaction)
    test_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        void_confirmed_ticket(
            session=test_session,
            ticket_id=ticket.id,
            actor_user_id=actor_user_id,
        )

    assert exc_info.value.status_code == 409
    refreshed_ticket = test_session.get(Ticket, ticket.id)
    refreshed_customer = test_session.get(Customer, customer.id)
    assert refreshed_ticket is not None
    assert refreshed_ticket.status == TicketStatus.CONFIRMED
    assert refreshed_customer is not None
    assert refreshed_customer.balance == pytest.approx(1_200_000.0)
