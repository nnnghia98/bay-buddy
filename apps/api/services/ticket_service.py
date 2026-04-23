"""
services/ticket_service.py – Business logic for ticket creation with automatic debt tracking.

Business rules reference: docs/BUSINESS.md
  - Selling Price = Net Price + Service Fee          (§2 Pricing Architecture)
  - CONFIRMED ticket → increases Customer Balance    (§1 Ticket Lifecycle)
  - Every confirmation auto-creates a CHARGE txn     (§3 Debt Management)
  - Customer Balance = Total Debt – Total Paid       (§3 Balance Calculation)

Flow of create_ticket_with_transaction:
  1. Look up customer by name (case-insensitive). Create if not found.
  2. Validate selling_price ≥ net_price (formula compliance).
  3. Persist Ticket with status = CONFIRMED inside a DB transaction.
  4. Create a CHARGE Transaction linked to the customer AND the ticket.
  5. Increment customer.balance by selling_price.
  All three mutations are committed atomically; any failure triggers a full rollback.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlmodel import Session, select

from models.customer import Customer, CustomerRead
from models.enums import (
    Airline,
    CustomerType,
    TicketStatus,
    TransactionCategory,
    TransactionType,
    get_transaction_balance_delta,
)
from models.ticket import Ticket, TicketRead
from models.transaction import Transaction, TransactionRead

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request schema – what the frontend POSTs after AI parsing + user review
# ---------------------------------------------------------------------------

class TicketConfirmPayload(BaseModel):
    """
    Payload sent by the frontend when the user confirms an AI-parsed ticket.

    Customer identification:
        The user can identify the customer by name (and optionally `customer_type`).
        The service will look up an existing customer by name (case-insensitive) or
        create a new one if no match is found.

    Pricing (docs/BUSINESS.md §2):
        selling_price = net_price + service_fee
        If `selling_price` is omitted, the service derives it automatically.
        If both `service_fee` and `selling_price` are supplied they must be consistent.
    """

    # ── Customer fields ──────────────────────────────────────────────────────
    customer_name: str = Field(
        min_length=1,
        max_length=255,
        description="Full name of the customer. Used to look up or create the customer record.",
    )
    customer_type: CustomerType = Field(
        default=CustomerType.INDIVIDUAL,
        description="INDIVIDUAL or BUSINESS. Only used when creating a new customer.",
    )

    # ── Ticket fields ────────────────────────────────────────────────────────
    pnr: str = Field(
        min_length=6,
        max_length=6,
        description="6-character PNR booking reference code.",
    )
    airline: Airline = Field(description="Carrier code: VNA | VJ | QH | VU.")
    passengers: List[str] = Field(
        min_length=1,
        description="List of passenger full names (UPPERCASE). At least one required.",
    )
    itinerary: str = Field(
        max_length=100,
        description='Flight route string, e.g. "HAN-SGN".',
    )
    flight_date: datetime = Field(description="Scheduled departure datetime (ISO-8601 / UTC).")

    # ── Pricing fields ───────────────────────────────────────────────────────
    net_price: float = Field(ge=0, description="Net cost from airline/supplier (giá gốc). ≥ 0.")
    service_fee: float = Field(
        default=0.0,
        ge=0,
        description=(
            "Agent profit margin (phí dịch vụ). "
            "selling_price = net_price + service_fee. Defaults to 0."
        ),
    )
    selling_price: Optional[float] = Field(
        default=None,
        ge=0,
        description=(
            "Final price charged to the customer (giá bán). "
            "If omitted, computed as net_price + service_fee. "
            "If provided, must equal net_price + service_fee."
        ),
    )

    @model_validator(mode="after")
    def validate_and_compute_selling_price(self) -> "TicketConfirmPayload":
        """
        Enforce the formula: selling_price = net_price + service_fee (BUSINESS.md §2).
        """
        computed = self.net_price + self.service_fee
        if self.selling_price is None:
            # Auto-derive selling_price from the formula.
            self.selling_price = computed
        else:
            # Tolerance for floating-point rounding (1 VND).
            if abs(self.selling_price - computed) > 1.0:
                raise ValueError(
                    f"selling_price ({self.selling_price}) must equal "
                    f"net_price + service_fee ({self.net_price} + {self.service_fee} = {computed}). "
                    "Please correct the pricing fields."
                )
        return self


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class TicketConfirmResponse(BaseModel):
    """Composite response returned after a successful ticket confirmation."""

    ticket: TicketRead
    transaction_id: uuid.UUID
    customer_id: uuid.UUID
    customer_name: str
    customer_new_balance: float
    is_new_customer: bool


class TicketVoidResponse(BaseModel):
    """Composite response returned after voiding a confirmed ticket."""

    ticket: TicketRead
    customer: CustomerRead
    transaction: TransactionRead
    customer_new_balance: float


class TicketRefundPayload(BaseModel):
    """Payload for partial or full ticket refunds."""

    amount: float = Field(gt=0, description="Refund amount in VND.")


class TicketRefundResponse(BaseModel):
    """Composite response returned after refunding a confirmed ticket."""

    ticket: TicketRead
    customer: CustomerRead
    transaction: TransactionRead
    customer_new_balance: float


class TicketReassignPayload(BaseModel):
    """Payload for moving a confirmed ticket to another customer."""

    new_customer_id: uuid.UUID = Field(description="UUID of the target customer.")


class TicketReassignResponse(BaseModel):
    """Composite response returned after reassigning a confirmed ticket."""

    ticket: TicketRead
    old_customer: CustomerRead
    new_customer: CustomerRead
    reversal_transaction: TransactionRead
    transfer_transaction: TransactionRead
    old_customer_new_balance: float
    new_customer_new_balance: float


def _get_ticket_or_404(*, session: Session, ticket_id: uuid.UUID) -> Ticket:
    ticket = session.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )
    return ticket


def _get_customer_or_404(*, session: Session, customer_id: uuid.UUID) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


def _get_confirmed_ticket_charge(*, session: Session, ticket: Ticket) -> Transaction:
    statement = select(Transaction).where(
        Transaction.customer_id == ticket.customer_id,
        Transaction.linked_ticket_id == ticket.id,
        Transaction.category == TransactionCategory.TICKET_PURCHASE,
    )
    transaction = session.exec(statement).first()
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmed ticket is missing its linked purchase transaction.",
        )
    if transaction.is_invoiced or transaction.invoice_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmed ticket is locked by an issued invoice.",
        )
    return transaction


def _prepare_ticket_for_lifecycle_change(
    *,
    session: Session,
    ticket: Ticket,
) -> Transaction:
    if ticket.status != TicketStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only confirmed tickets can use lifecycle actions.",
        )

    purchase_transaction = _get_confirmed_ticket_charge(session=session, ticket=ticket)
    purchase_transaction.linked_ticket_id = None
    session.add(purchase_transaction)
    return purchase_transaction


def _build_lifecycle_note(
    *,
    action: str,
    ticket: Ticket,
    actor_user_id: uuid.UUID,
    suffix: str | None = None,
) -> str:
    base = f"{action} ticket {ticket.pnr} ({ticket.itinerary}) by user {actor_user_id}"
    if suffix:
        return f"{base} - {suffix}"
    return base


def create_ticket_with_transaction(
    payload: TicketConfirmPayload,
    session: Session,
    actor_user_id: uuid.UUID,
) -> TicketConfirmResponse:
    """
    Atomically confirm a ticket, record a CHARGE transaction, and update the customer balance.

    Steps
    -----
    1. Resolve customer – look up by name (case-insensitive) or create a new record.
    2. Guard – reject duplicate PNRs to prevent double-booking.
    3. Persist the Ticket with status = CONFIRMED.
    4. Flush so ticket.id is populated, then persist a CHARGE Transaction linked to
       both the customer and the ticket.
    5. Increment customer.balance by selling_price.
    6. Single atomic commit; refresh and return a structured response.
    """

    customer_name_normalised = payload.customer_name.strip()

    statement = select(Customer).where(
        Customer.name.ilike(customer_name_normalised)  # type: ignore[attr-defined]
    )
    customer = session.exec(statement).first()
    is_new_customer = customer is None

    if customer is None:
        logger.info("New customer '%s' – creating record.", customer_name_normalised)
        customer = Customer(
            name=customer_name_normalised,
            type=payload.customer_type,
            balance=0.0,
        )
        session.add(customer)
        session.flush()
        logger.info("Customer created with id=%s", customer.id)
    else:
        logger.info("Found existing customer '%s' id=%s", customer.name, customer.id)

    existing_ticket = session.exec(
        select(Ticket).where(Ticket.pnr == payload.pnr)
    ).first()

    if existing_ticket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A ticket with PNR '{payload.pnr}' already exists in the system.",
        )

    selling_price = payload.selling_price

    ticket = Ticket(
        pnr=payload.pnr,
        airline=payload.airline,
        passengers=payload.passengers,
        itinerary=payload.itinerary,
        flight_date=payload.flight_date,
        net_price=payload.net_price,
        selling_price=selling_price,
        status=TicketStatus.CONFIRMED,
        customer_id=customer.id,
    )
    session.add(ticket)
    session.flush()

    new_transaction = Transaction(
        amount=selling_price,
        type=TransactionType.CHARGE,
        category=TransactionCategory.TICKET_PURCHASE,
        method="Ticket",
        note=(
            f"Auto-debt for PNR {payload.pnr} – {payload.itinerary} "
            f"on {payload.flight_date.date()} by user {actor_user_id}"
        ),
        customer_id=customer.id,
        linked_ticket_id=ticket.id,
        created_by=actor_user_id,
    )
    session.add(new_transaction)

    customer.balance += get_transaction_balance_delta(
        amount=selling_price,
        transaction_category=new_transaction.category,
    )
    session.add(customer)

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(ticket)
    session.refresh(new_transaction)
    session.refresh(customer)

    return TicketConfirmResponse(
        ticket=TicketRead.model_validate(ticket),
        transaction_id=new_transaction.id,
        customer_id=customer.id,
        customer_name=customer.name,
        customer_new_balance=customer.balance,
        is_new_customer=is_new_customer,
    )


def void_confirmed_ticket(
    *,
    session: Session,
    ticket_id: uuid.UUID,
    actor_user_id: uuid.UUID,
) -> TicketVoidResponse:
    """Void a confirmed ticket and reverse its debt in the same transaction."""

    ticket = _get_ticket_or_404(session=session, ticket_id=ticket_id)
    customer = _get_customer_or_404(session=session, customer_id=ticket.customer_id)

    try:
        _prepare_ticket_for_lifecycle_change(session=session, ticket=ticket)

        reversal = Transaction(
            amount=ticket.selling_price,
            type=TransactionType.PAYMENT,
            category=TransactionCategory.DISCOUNT,
            method="Ticket lifecycle",
            note=_build_lifecycle_note(
                action="VOID",
                ticket=ticket,
                actor_user_id=actor_user_id,
            ),
            customer_id=customer.id,
            linked_ticket_id=ticket.id,
            created_by=actor_user_id,
        )
        session.add(reversal)

        customer.balance += get_transaction_balance_delta(
            amount=ticket.selling_price,
            transaction_category=reversal.category,
        )
        ticket.status = TicketStatus.VOID
        session.add(ticket)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(ticket)
    session.refresh(customer)
    session.refresh(reversal)

    return TicketVoidResponse(
        ticket=TicketRead.model_validate(ticket),
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(reversal),
        customer_new_balance=customer.balance,
    )


def refund_confirmed_ticket(
    *,
    session: Session,
    ticket_id: uuid.UUID,
    payload: TicketRefundPayload,
    actor_user_id: uuid.UUID,
) -> TicketRefundResponse:
    """Record a credit-style adjustment for a partial or full refund."""

    ticket = _get_ticket_or_404(session=session, ticket_id=ticket_id)
    customer = _get_customer_or_404(session=session, customer_id=ticket.customer_id)

    if payload.amount > ticket.selling_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount cannot exceed the ticket selling price.",
        )

    try:
        _prepare_ticket_for_lifecycle_change(session=session, ticket=ticket)

        refund_transaction = Transaction(
            amount=payload.amount,
            type=TransactionType.PAYMENT,
            category=TransactionCategory.DISCOUNT,
            method="Ticket lifecycle",
            note=_build_lifecycle_note(
                action="REFUND",
                ticket=ticket,
                actor_user_id=actor_user_id,
                suffix=f"refund amount {payload.amount}",
            ),
            customer_id=customer.id,
            linked_ticket_id=ticket.id,
            created_by=actor_user_id,
        )
        session.add(refund_transaction)

        customer.balance += get_transaction_balance_delta(
            amount=payload.amount,
            transaction_category=refund_transaction.category,
        )
        ticket.status = TicketStatus.REFUNDED
        session.add(ticket)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(ticket)
    session.refresh(customer)
    session.refresh(refund_transaction)

    return TicketRefundResponse(
        ticket=TicketRead.model_validate(ticket),
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(refund_transaction),
        customer_new_balance=customer.balance,
    )


def reassign_confirmed_ticket(
    *,
    session: Session,
    ticket_id: uuid.UUID,
    payload: TicketReassignPayload,
    actor_user_id: uuid.UUID,
) -> TicketReassignResponse:
    """Move a confirmed ticket to another customer and rebalance both ledgers."""

    ticket = _get_ticket_or_404(session=session, ticket_id=ticket_id)
    old_customer = _get_customer_or_404(session=session, customer_id=ticket.customer_id)
    new_customer = _get_customer_or_404(session=session, customer_id=payload.new_customer_id)

    if old_customer.id == new_customer.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket is already assigned to this customer.",
        )

    try:
        purchase_transaction = _prepare_ticket_for_lifecycle_change(
            session=session,
            ticket=ticket,
        )

        reversal = Transaction(
            amount=ticket.selling_price,
            type=TransactionType.PAYMENT,
            category=TransactionCategory.DISCOUNT,
            method="Ticket lifecycle",
            note=_build_lifecycle_note(
                action="REASSIGN",
                ticket=ticket,
                actor_user_id=actor_user_id,
                suffix=f"from {old_customer.name} to {new_customer.name}",
            ),
            customer_id=old_customer.id,
            linked_ticket_id=ticket.id,
            created_by=actor_user_id,
        )
        transfer = Transaction(
            amount=ticket.selling_price,
            type=TransactionType.CHARGE,
            category=TransactionCategory.TICKET_PURCHASE,
            method="Ticket lifecycle",
            note=_build_lifecycle_note(
                action="REASSIGN",
                ticket=ticket,
                actor_user_id=actor_user_id,
                suffix=f"from {old_customer.name} to {new_customer.name}",
            ),
            customer_id=new_customer.id,
            linked_ticket_id=ticket.id,
            created_by=actor_user_id,
        )
        session.add(reversal)
        session.add(transfer)

        old_customer.balance += get_transaction_balance_delta(
            amount=ticket.selling_price,
            transaction_category=reversal.category,
        )
        new_customer.balance += get_transaction_balance_delta(
            amount=ticket.selling_price,
            transaction_category=transfer.category,
        )
        ticket.customer_id = new_customer.id
        session.add(ticket)
        session.add(old_customer)
        session.add(new_customer)
        session.add(purchase_transaction)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(ticket)
    session.refresh(old_customer)
    session.refresh(new_customer)
    session.refresh(purchase_transaction)
    session.refresh(reversal)
    session.refresh(transfer)

    return TicketReassignResponse(
        ticket=TicketRead.model_validate(ticket),
        old_customer=CustomerRead.model_validate(old_customer),
        new_customer=CustomerRead.model_validate(new_customer),
        reversal_transaction=TransactionRead.model_validate(reversal),
        transfer_transaction=TransactionRead.model_validate(transfer),
        old_customer_new_balance=old_customer.balance,
        new_customer_new_balance=new_customer.balance,
    )
