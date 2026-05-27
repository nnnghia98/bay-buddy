"""
services/finance_service.py – Customer ledger and payment recording logic.

Business rules reference: docs/BUSINESS.md
  - Current Balance = Total Debt + Fees - Payments - Discounts
  - PAYMENT / DISCOUNT reduce customer.balance
  - TICKET_PURCHASE / ADDITIONAL_FEE / REFUND increase customer.balance
  - Ledger history uses audit timestamps, not scheduled flight datetime
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlmodel import Session, select

from models.customer import Customer, CustomerRead
from models.enums import (
    TransactionCategory,
    TicketStatus,
    TransactionType,
    get_expected_transaction_type,
    get_transaction_balance_delta,
    is_cash_transaction_category,
)
from models.ticket import Ticket, TicketRead
from models.transaction import Transaction, TransactionRead, TransactionUpdate
from services.system_settings_service import (
    apply_app_base_datetime,
    ensure_datetime_is_active,
    get_app_base_datetime,
)


class LedgerEntry(BaseModel):
    """A table-ready customer ledger row ordered by business event time."""

    id: uuid.UUID
    entry_type: Literal["ticket", "payment", "adjustment"]
    created_at: datetime
    content: str
    amount: float
    running_balance: float
    ticket: Optional["TicketRead"] = None
    transaction: Optional[TransactionRead] = None


class CustomerLedgerResponse(BaseModel):
    """Ledger payload returned by GET /customers/{id}/ledger."""

    customer: CustomerRead
    current_balance: float
    balance_state: Literal["debt", "settled", "credit"]
    entries: list[LedgerEntry]


def _normalize_ledger_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


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


def _ensure_transaction_is_mutable(transaction: Transaction) -> None:
    if transaction.is_invoiced or transaction.invoice_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transaction is locked by an issued invoice.",
        )
    if (
        transaction.category == TransactionCategory.TICKET_PURCHASE
        and transaction.linked_ticket_id is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Use the ticket correction endpoint for ticket purchase rows.",
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

    ticket_statement = select(Ticket).where(
        Ticket.customer_id == customer_id,
        Ticket.status == TicketStatus.CONFIRMED,
    )
    ticket_statement = apply_app_base_datetime(
        session=session,
        statement=ticket_statement,
        column=Ticket.updated_at,
    )
    tickets = session.exec(ticket_statement.order_by(Ticket.id)).all()

    transaction_statement = select(Transaction).where(
        Transaction.customer_id == customer_id,
    )
    transaction_statement = apply_app_base_datetime(
        session=session,
        statement=transaction_statement,
        column=Transaction.created_at,
    )
    transactions = session.exec(
        transaction_statement.order_by(Transaction.created_at, Transaction.id)
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
                created_at=_normalize_ledger_datetime(transaction.created_at),
                content=(transaction.note or transaction.method).strip(),
                amount=amount,
                running_balance=0,
                transaction=TransactionRead.model_validate(transaction),
            )
        )

    for ticket in tickets:
        charge_transaction = ticket_charge_by_ticket_id.get(ticket.id)
        entries.append(
            LedgerEntry(
                id=ticket.id,
                entry_type="ticket",
                created_at=_normalize_ledger_datetime(ticket.updated_at),
                content=ticket.pnr,
                amount=ticket.selling_price,
                running_balance=0,
                ticket=TicketRead.model_validate(ticket),
                transaction=(
                    TransactionRead.model_validate(charge_transaction)
                    if charge_transaction
                    else None
                ),
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

    current_balance = (
        running_balance
        if entries or get_app_base_datetime(session=session) is not None
        else customer.balance
    )
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
    ensure_datetime_is_active(
        session=session,
        value=payment.created_at,
        detail="Payment record was created before the app base date time.",
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


def update_transaction_for_admin(
    *,
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    session: Session,
) -> RecordPaymentResponse:
    """Correct a mutable transaction and rebalance the owning customer."""
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    _ensure_transaction_is_mutable(transaction)
    customer = _get_customer_or_404(session, transaction.customer_id)

    old_delta = get_transaction_balance_delta(
        amount=transaction.amount,
        transaction_category=transaction.category,
        transaction_type=transaction.type,
        linked_ticket_id=transaction.linked_ticket_id,
    )
    update_data = payload.model_dump(exclude_unset=True)

    if "linked_ticket_id" in update_data and update_data["linked_ticket_id"] is not None:
        _validate_linked_ticket(
            session=session,
            customer_id=transaction.customer_id,
            linked_ticket_id=update_data["linked_ticket_id"],
        )
    if "category" in update_data and "type" not in update_data:
        update_data["type"] = get_expected_transaction_type(update_data["category"])

    for field_name, value in update_data.items():
        setattr(transaction, field_name, value)

    ensure_datetime_is_active(
        session=session,
        value=transaction.created_at,
        detail="Transaction record was created before the app base date time.",
    )

    new_delta = get_transaction_balance_delta(
        amount=transaction.amount,
        transaction_category=transaction.category,
        transaction_type=transaction.type,
        linked_ticket_id=transaction.linked_ticket_id,
    )

    try:
        customer.balance += new_delta - old_delta
        session.add(transaction)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(transaction)
    session.refresh(customer)

    return RecordPaymentResponse(
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(transaction),
        customer_new_balance=customer.balance,
        balance_state=get_balance_state(customer.balance),
    )


def delete_transaction_for_admin(
    *,
    transaction_id: uuid.UUID,
    session: Session,
) -> RecordPaymentResponse:
    """Remove a mutable transaction and reverse its customer balance impact."""
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    _ensure_transaction_is_mutable(transaction)
    customer = _get_customer_or_404(session, transaction.customer_id)
    delta = get_transaction_balance_delta(
        amount=transaction.amount,
        transaction_category=transaction.category,
        transaction_type=transaction.type,
        linked_ticket_id=transaction.linked_ticket_id,
    )
    response_transaction = TransactionRead.model_validate(transaction)

    try:
        customer.balance -= delta
        session.delete(transaction)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(customer)

    return RecordPaymentResponse(
        customer=CustomerRead.model_validate(customer),
        transaction=response_transaction,
        customer_new_balance=customer.balance,
        balance_state=get_balance_state(customer.balance),
    )
