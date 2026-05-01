"""
services/finance_service.py – Customer ledger and payment recording logic.

Business rules reference: docs/BUSINESS.md
  - Current Balance = Total Debt - Total Paid
  - PAYMENT / DISCOUNT reduce customer.balance
  - TICKET_PURCHASE / ADDITIONAL_FEE / REFUND increase customer.balance
  - Ledger must show tickets and transactions in chronological order
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlmodel import Session, select

from models.customer import Customer, CustomerRead
from models.enums import (
    TransactionCategory,
    TicketStatus,
    TransactionType,
    get_transaction_balance_delta,
    is_cash_transaction_category,
)
from models.ticket import Ticket
from models.transaction import Transaction, TransactionRead


class LedgerEntry(BaseModel):
    """A table-ready customer ledger row ordered by business event time."""

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
    balance_state: Literal["debt", "settled", "credit"]
    entries: list[LedgerEntry]


class RecordPaymentPayload(BaseModel):
    """Payload accepted by POST /customers/{id}/payments."""

    amount: float = Field(gt=0, description="Payment amount in VND.")
    method: str = Field(
        min_length=1,
        max_length=100,
        description="Payment method label, e.g. Chuyển khoản or Tiền mặt.",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Required payment note or transfer reference.",
    )
    evidence_url: Optional[str] = Field(
        default=None,
        max_length=2048,
        description="Optional payment receipt / proof URL.",
    )
    linked_ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional ticket UUID for specific reconciliation (đích danh).",
    )

    @model_validator(mode="after")
    def validate_payment_note(self) -> "RecordPaymentPayload":
        if not (self.note or "").strip():
            raise ValueError("Payment note is required.")
        return self


class RecordPaymentResponse(BaseModel):
    """Response returned after recording a customer payment."""

    customer: CustomerRead
    transaction: TransactionRead
    customer_new_balance: float
    balance_state: Literal["debt", "settled", "credit"]


def _get_customer_or_404(session: Session, customer_id: uuid.UUID) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


def _validate_linked_ticket(
    *,
    session: Session,
    customer_id: uuid.UUID,
    linked_ticket_id: uuid.UUID,
) -> None:
    linked_ticket = session.get(Ticket, linked_ticket_id)
    if linked_ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked ticket not found",
        )

    if linked_ticket.customer_id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linked ticket does not belong to the customer",
        )


def get_balance_state(balance: float) -> Literal["debt", "settled", "credit"]:
    """Return a UI-friendly state for the current customer balance."""

    if balance > 0:
        return "debt"
    if balance < 0:
        return "credit"
    return "settled"


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
            transaction.category == TransactionCategory.TICKET_PURCHASE
            and transaction.linked_ticket_id is not None
        ):
            ticket_charge_by_ticket_id[transaction.linked_ticket_id] = transaction
            continue

        amount = get_transaction_balance_delta(
            amount=transaction.amount,
            transaction_category=transaction.category,
            transaction_type=transaction.type,
            linked_ticket_id=transaction.linked_ticket_id,
        )
        entry_type: Literal["payment", "adjustment"] = "adjustment"
        if is_cash_transaction_category(transaction.category):
            entry_type = "payment"

        entries.append(
            LedgerEntry(
                id=transaction.id,
                entry_type=entry_type,
                created_at=transaction.occurred_at,
                content=(transaction.note or transaction.method).strip(),
                amount=amount,
                running_balance=0,
            )
        )

    for ticket in tickets:
        charge_transaction = ticket_charge_by_ticket_id.get(ticket.id)
        created_at = (
            charge_transaction.occurred_at if charge_transaction else ticket.flight_date
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

    current_balance = running_balance if entries else customer.balance
    return CustomerLedgerResponse(
        customer=CustomerRead.model_validate(customer),
        current_balance=current_balance,
        balance_state=get_balance_state(current_balance),
        entries=entries,
    )


def record_payment(
    *,
    customer_id: uuid.UUID,
    amount: float,
    method: str,
    note: Optional[str],
    evidence_url: Optional[str],
    linked_ticket_id: Optional[uuid.UUID],
    actor_user_id: uuid.UUID,
    session: Session,
) -> RecordPaymentResponse:
    """Create a PAYMENT transaction and reduce the customer's balance atomically."""
    customer = _get_customer_or_404(session, customer_id)

    if linked_ticket_id is not None:
        _validate_linked_ticket(
            session=session,
            customer_id=customer_id,
            linked_ticket_id=linked_ticket_id,
        )

    cleaned_note = (note or "").strip() or None

    payment = Transaction(
        amount=amount,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method=method.strip(),
        note=cleaned_note,
        evidence_url=evidence_url,
        customer_id=customer_id,
        linked_ticket_id=linked_ticket_id,
        created_by=actor_user_id,
    )

    try:
        session.add(payment)
        customer.balance += get_transaction_balance_delta(
            amount=amount,
            transaction_category=payment.category,
        )
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
        balance_state=get_balance_state(customer.balance),
    )
