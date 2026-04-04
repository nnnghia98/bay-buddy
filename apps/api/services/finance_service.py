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
    """A single customer ledger row representing either a ticket or a transaction."""

    id: uuid.UUID
    entry_type: Literal["ticket", "transaction"]
    occurred_at: datetime
    title: str
    display_amount: float
    balance_delta: float
    balance_after: float
    pnr: Optional[str] = None
    itinerary: Optional[str] = None
    ticket_status: Optional[TicketStatus] = None
    transaction_type: Optional[TransactionType] = None
    method: Optional[str] = None
    note: Optional[str] = None


class CustomerLedgerResponse(BaseModel):
    """Ledger payload returned by GET /customers/{id}/ledger."""

    customer: CustomerRead
    total_debt: float = Field(ge=0)
    total_paid: float = Field(ge=0)
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
        .where(Ticket.customer_id == customer_id)
        .order_by(Ticket.flight_date, Ticket.id)
    ).all()
    transactions = session.exec(
        select(Transaction)
        .where(Transaction.customer_id == customer_id)
        .order_by(Transaction.created_at, Transaction.id)
    ).all()

    total_debt = sum(
        ticket.selling_price
        for ticket in tickets
        if ticket.status == TicketStatus.CONFIRMED
    )
    total_paid = sum(
        transaction.amount
        for transaction in transactions
        if transaction.type == TransactionType.PAYMENT
    )

    entries: list[LedgerEntry] = []

    for ticket in tickets:
        balance_delta = (
            ticket.selling_price
            if ticket.status == TicketStatus.CONFIRMED
            else 0.0
        )

        entries.append(
            LedgerEntry(
                id=ticket.id,
                entry_type="ticket",
                occurred_at=ticket.flight_date,
                title=f"Ticket {ticket.pnr}",
                display_amount=ticket.selling_price,
                balance_delta=balance_delta,
                balance_after=0,
                pnr=ticket.pnr,
                itinerary=ticket.itinerary,
                ticket_status=ticket.status,
                note=", ".join(ticket.passengers),
            )
        )

    for transaction in transactions:
        balance_delta = transaction.amount
        if transaction.type in (TransactionType.PAYMENT, TransactionType.REFUND):
            balance_delta = -transaction.amount

        entries.append(
            LedgerEntry(
                id=transaction.id,
                entry_type="transaction",
                occurred_at=transaction.created_at,
                title=f"{transaction.type.title()} transaction",
                display_amount=transaction.amount,
                balance_delta=balance_delta,
                balance_after=0,
                transaction_type=transaction.type,
                method=transaction.method,
                note=transaction.note,
            )
        )

    entries.sort(
        key=lambda entry: (
            entry.occurred_at,
            0 if entry.entry_type == "ticket" else 1,
            str(entry.id),
        )
    )

    running_balance = 0.0
    for entry in entries:
        running_balance += entry.balance_delta
        entry.balance_after = running_balance

    return CustomerLedgerResponse(
        customer=CustomerRead.model_validate(customer),
        total_debt=total_debt,
        total_paid=total_paid,
        current_balance=customer.balance,
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
