from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from models.customer import Customer
from models.enums import (
    Airline,
    CustomerType,
    TicketStatus,
    TransactionCategory,
    TransactionType,
    UserRole,
)
from models.ticket import Ticket
from models.transaction import Transaction
from models.user import User
from services.finance_service import get_customer_ledger


def test_customer_ledger_uses_transaction_occurred_at_for_sorting() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(
            username="ledger-user",
            hashed_password="hashed-password",
            role=UserRole.STAFF,
            is_active=True,
        )
        customer = Customer(name="Ledger Customer", type=CustomerType.INDIVIDUAL)
        session.add(user)
        session.add(customer)
        session.flush()

        ticket = Ticket(
            pnr="LED123",
            airline=Airline.VJ,
            passengers=["NGUYEN VAN A"],
            itinerary="HAN-SGN",
            flight_date=datetime(2026, 4, 5, 10, 0, tzinfo=timezone.utc),
            net_price=1_000_000,
            selling_price=1_200_000,
            status=TicketStatus.CONFIRMED,
            customer_id=customer.id,
        )
        session.add(ticket)
        session.flush()

        payment = Transaction(
            amount=200_000,
            type=TransactionType.PAYMENT,
            category=TransactionCategory.PAYMENT,
            method="Transfer",
            note="Bank transfer",
            customer_id=customer.id,
            created_by=user.id,
            occurred_at=datetime(2026, 4, 1, 9, 30, tzinfo=timezone.utc),
        )
        ticket_charge = Transaction(
            amount=1_200_000,
            type=TransactionType.CHARGE,
            category=TransactionCategory.TICKET_PURCHASE,
            method="Ticket",
            note="Auto-debt",
            customer_id=customer.id,
            linked_ticket_id=ticket.id,
            created_by=user.id,
            occurred_at=datetime(2026, 4, 2, 8, 45, tzinfo=timezone.utc),
        )
        session.add(payment)
        session.add(ticket_charge)
        session.commit()

        ledger = get_customer_ledger(customer_id=customer.id, session=session)

        assert [entry.entry_type for entry in ledger.entries] == ["payment", "ticket"]
        assert ledger.entries[0].created_at == datetime(2026, 4, 1, 9, 30)
        assert ledger.entries[1].created_at == datetime(2026, 4, 2, 8, 45)
