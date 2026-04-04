"""
services/finance_service.py – Customer ledger and payment recording logic.

Business rules reference: docs/BUSINESS.md
  - Current Balance = Total Debt - Total Paid
  - PAYMENT transactions reduce customer.balance
  - Ledger must show tickets and transactions in chronological order
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from models.customer import Customer, CustomerRead
from models.enums import TicketStatus, TransactionType
from models.ticket import Ticket
from models.transaction import Transaction, TransactionRead


class LedgerEntry(BaseModel):
    """A table-ready customer ledger row."""

    id: uuid.UUID
    entry_type: Literal["ticket", "payment", "adjustment"]
    created_at: datetime
    content: str
    amount: float
    running_balance: float


class CustomerLedgerResponse(BaseModel):
    """Ledger payload returned by GET /customers/{id}/ledger."""

    customer: CustomerRead
    current_balance: float
    entries: list[LedgerEntry]


class RecordPaymentPayload(BaseModel):
    """Payload accepted by POST /customers/{id}/payments."""

    amount: float = Field(gt=0, description="Payment amount in VND.")
    note: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional free-text reference or bank transfer note.",
    )


class RecordPaymentResponse(BaseModel):
    """Response returned after recording a customer payment."""

    customer: CustomerRead
    transaction: TransactionRead
    customer_new_balance: float


def _get_customer_or_404(session: Session, customer_id: uuid.UUID) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


def get_customer_ledger(
    *,
    customer_id: uuid.UUID,
    session: Session,
) -> CustomerLedgerResponse:
    """Return the customer's tickets and transactions in chronological order."""
    customer = _get_customer_or_404(session, customer_id)

    tickets = session.exec(
        select(Ticket)
        .where(
            Ticket.customer_id == customer_id,
            Ticket.status == TicketStatus.CONFIRMED,
        )
        .order_by(Ticket.id)
    ).all()
    transactions = session.exec(
        select(Transaction)
        .where(Transaction.customer_id == customer_id)
        .order_by(Transaction.created_at, Transaction.id)
    ).all()

    entries: list[LedgerEntry] = []
    ticket_charge_by_ticket_id: dict[uuid.UUID, Transaction] = {}

    for transaction in transactions:
        if (
            transaction.type == TransactionType.CHARGE
            and transaction.ticket_id is not None
        ):
            ticket_charge_by_ticket_id[transaction.ticket_id] = transaction
            continue

        amount = transaction.amount
        entry_type: Literal["payment", "adjustment"] = "adjustment"
        if transaction.type in (TransactionType.PAYMENT, TransactionType.REFUND):
            amount = -transaction.amount
            entry_type = "payment"

        entries.append(
            LedgerEntry(
                id=transaction.id,
                entry_type=entry_type,
                created_at=transaction.created_at,
                content=(transaction.note or transaction.method).strip(),
                amount=amount,
                running_balance=0,
            )
        )

    for ticket in tickets:
        charge_transaction = ticket_charge_by_ticket_id.get(ticket.id)
        created_at = (
            charge_transaction.created_at if charge_transaction else ticket.flight_date
        )
        entries.append(
            LedgerEntry(
                id=ticket.id,
                entry_type="ticket",
                created_at=created_at,
                content=ticket.pnr,
                amount=ticket.selling_price,
                running_balance=0,
            )
        )

    entries.sort(
        key=lambda entry: (
            entry.created_at,
            0 if entry.entry_type == "ticket" else 1,
            str(entry.id),
        )
    )

    running_balance = 0.0
    for entry in entries:
        running_balance += entry.amount
        entry.running_balance = running_balance

    return CustomerLedgerResponse(
        customer=CustomerRead.model_validate(customer),
        current_balance=running_balance if entries else customer.balance,
        entries=entries,
    )


def record_payment(
    *,
    customer_id: uuid.UUID,
    amount: float,
    note: Optional[str],
    actor_user_id: uuid.UUID,
    session: Session,
) -> RecordPaymentResponse:
    """Create a PAYMENT transaction and reduce the customer's balance atomically."""
    customer = _get_customer_or_404(session, customer_id)

    audit_note = f"Recorded by user {actor_user_id}"
    cleaned_note = (note or "").strip()
    if cleaned_note:
        audit_note = f"{cleaned_note} | {audit_note}"

    payment = Transaction(
        amount=amount,
        type=TransactionType.PAYMENT,
        method="Manual Payment",
        note=audit_note,
        customer_id=customer_id,
    )

    try:
        session.add(payment)
        customer.balance -= amount
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(payment)
    session.refresh(customer)

    return RecordPaymentResponse(
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(payment),
        customer_new_balance=customer.balance,
    )
