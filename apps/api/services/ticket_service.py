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

from models.customer import Customer
from models.enums import (
    Airline,
    CustomerType,
    TicketStatus,
    TransactionCategory,
    TransactionType,
    get_transaction_balance_delta,
)
from models.ticket import Ticket, TicketRead
from models.transaction import Transaction

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


# ---------------------------------------------------------------------------
# Service function
# ---------------------------------------------------------------------------

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

    Args
    ----
    actor_user_id:
        UUID of the authenticated user extracted from the JWT via `get_current_user`.
        Used for audit context on ticket confirmation writes.

    Raises
    ------
    HTTPException 400  If a ticket with the same PNR already exists.
    HTTPException 422  If the pricing formula is violated (validated by the schema).
    """

    # ── 1. Customer resolution ───────────────────────────────────────────────
    customer_name_normalised = payload.customer_name.strip()

    statement = select(Customer).where(
        Customer.name.ilike(customer_name_normalised)  # type: ignore[attr-defined]
    )
    customer = session.exec(statement).first()
    is_new_customer = customer is None

    if customer is None:
        print(f"[ticket_service] New customer '{customer_name_normalised}' – creating record.")
        logger.info("New customer '%s' – creating record.", customer_name_normalised)
        customer = Customer(
            name=customer_name_normalised,
            type=payload.customer_type,
            balance=0.0,
        )
        session.add(customer)
        # Flush so customer.id is populated before we reference it in FKs.
        session.flush()
        print(f"[ticket_service] Customer created with id={customer.id}")
        logger.info("Customer created with id=%s", customer.id)
    else:
        print(f"[ticket_service] Found existing customer '{customer.name}' id={customer.id}")
        logger.info("Found existing customer '%s' id=%s", customer.name, customer.id)

    # ── 2. Duplicate PNR guard ───────────────────────────────────────────────
    existing_ticket = session.exec(
        select(Ticket).where(Ticket.pnr == payload.pnr)
    ).first()

    if existing_ticket:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A ticket with PNR '{payload.pnr}' already exists in the system.",
        )

    # ── 3. Create Ticket (CONFIRMED) ─────────────────────────────────────────
    selling_price = payload.selling_price  # guaranteed non-None by the validator

    print(f"[ticket_service] Creating ticket PNR={payload.pnr} selling_price={selling_price}")
    logger.info("Creating ticket PNR=%s selling_price=%s", payload.pnr, selling_price)

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
    # Flush so ticket.id is populated before the Transaction FK references it.
    session.flush()
    print(f"[ticket_service] Ticket flushed with id={ticket.id}")
    logger.info("Ticket flushed with id=%s", ticket.id)

    # ── 4. Create CHARGE Transaction ─────────────────────────────────────────
    # BUSINESS.md §3: Every CONFIRMED ticket is a debt entry (CHARGE type).
    # TransactionType.CHARGE → customer.balance += amount (see transaction.py header).
    print(f"[ticket_service] Creating transaction for ticket {ticket.pnr} (amount={selling_price})...")
    logger.info("Creating transaction for ticket %s (amount=%s)...", ticket.pnr, selling_price)

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
    print(f"[ticket_service] Transaction added to session: id={new_transaction.id}")
    logger.info("Transaction added to session: id=%s", new_transaction.id)

    # ── 5. Update customer balance ───────────────────────────────────────────
    # BUSINESS.md §3: Current Balance = Total Debt – Total Paid
    # Adding a debt (CHARGE) increases the balance (positive = customer owes).
    customer.balance += get_transaction_balance_delta(
        amount=selling_price,
        transaction_category=new_transaction.category,
    )
    session.add(customer)
    print(f"[ticket_service] Customer balance updated to {customer.balance}")
    logger.info("Customer '%s' balance updated to %s", customer.name, customer.balance)

    # ── 6. Atomic commit ─────────────────────────────────────────────────────
    print(f"[ticket_service] Committing atomic transaction (ticket + transaction + balance)...")
    logger.info("Committing atomic transaction (ticket + transaction + balance)...")
    session.commit()
    print(f"[ticket_service] Commit successful.")
    logger.info("Commit successful.")

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
