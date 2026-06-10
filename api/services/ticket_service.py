"""
services/ticket_service.py – Business logic for ticket creation with automatic debt tracking.

Business rules reference: docs/BUSINESS.md
  - True Income = Selling Price + Airline Discount - Net Price (§2 Pricing Architecture)
  - CONFIRMED ticket → increases Customer Balance    (§1 Ticket Lifecycle)
  - Every confirmation auto-creates a CHARGE txn     (§3 Debt Management)
  - Customer Balance = Total Debt – Total Paid       (§3 Balance Calculation)

Flow of create_ticket_with_transaction:
  1. Look up customer by name (case-insensitive). Create if not found.
  2. Validate and compute pricing fields.
  3. Persist Ticket with status = CONFIRMED inside a DB transaction.
     Multiple tickets may share the same PNR in group bookings.
  4. Create a CHARGE Transaction linked to the customer AND the ticket.
  5. Increment customer.balance by selling_price.
  All three mutations are committed atomically; any failure triggers a full rollback.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
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
from models.ticket import Ticket, TicketRead, TicketUpdate
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
        true_income = selling_price + discount - net_price
        If `selling_price` is omitted, the service derives it from service_fee.
        If `true_income` is supplied, it must match the computed income.
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
    ticket_number: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Airline ticket number.",
    )
    seat_code: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Optional seat assignment code, e.g. 12A.",
    )
    fare_class: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Optional fare class / fare family label from the source ticket.",
    )
    passengers: List[str] = Field(
        min_length=1,
        description="List of passenger full names (UPPERCASE). At least one required.",
    )
    departure_place: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Readable departure place, e.g. Da Nang City.",
    )
    arrival_place: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Readable arrival place, e.g. Ho Chi Minh City.",
    )
    departure_code: Optional[str] = Field(
        default=None,
        max_length=10,
        description="Departure place code, e.g. DAD.",
    )
    arrival_code: Optional[str] = Field(
        default=None,
        max_length=10,
        description="Arrival place code, e.g. SGN.",
    )
    itinerary: Optional[str] = Field(
        default=None,
        max_length=100,
        description='Flight route string, e.g. "HAN-SGN". Derived from codes when omitted.',
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
    discount: float = Field(
        default=0.0,
        ge=0,
        description="Airline add-in / discount amount earned by the agency for this ticket in VND.",
    )
    true_income: Optional[float] = Field(
        default=None,
        description="Actual ticket income: selling_price + discount - net_price.",
    )

    @model_validator(mode="after")
    def validate_and_compute_selling_price(self) -> "TicketConfirmPayload":
        """
        Compute selling_price and true_income from the ticket pricing fields.
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

        computed_true_income = self.selling_price + self.discount - self.net_price
        if self.true_income is None:
            self.true_income = computed_true_income
        elif abs(self.true_income - computed_true_income) > 1.0:
            raise ValueError(
                f"true_income ({self.true_income}) must equal "
                f"selling_price + discount - net_price "
                f"({self.selling_price} + {self.discount} - {self.net_price} = {computed_true_income})."
            )
        return self

    @model_validator(mode="after")
    def validate_route_details(self) -> "TicketConfirmPayload":
        self.ticket_number = (self.ticket_number or "").strip() or None
        self.seat_code = (self.seat_code or "").strip().upper() or None
        self.fare_class = (self.fare_class or "").strip() or None
        self.departure_place = (self.departure_place or "").strip() or None
        self.arrival_place = (self.arrival_place or "").strip() or None

        departure_code = (self.departure_code or "").strip().upper() or None
        arrival_code = (self.arrival_code or "").strip().upper() or None
        itinerary = (self.itinerary or "").strip().upper() or None

        if (departure_code is None) != (arrival_code is None):
            raise ValueError("departure_code and arrival_code must be provided together.")

        if departure_code and arrival_code:
            computed_itinerary = f"{departure_code}-{arrival_code}"
            if itinerary and itinerary != computed_itinerary:
                raise ValueError(
                    f"itinerary '{itinerary}' must match departure/arrival codes "
                    f"('{computed_itinerary}')."
                )
            itinerary = computed_itinerary

        if itinerary is None:
            raise ValueError(
                "Either itinerary or both departure_code and arrival_code are required."
            )

        if departure_code is None or arrival_code is None:
            route_parts = [part.strip().upper() for part in itinerary.split("-") if part.strip()]
            if len(route_parts) >= 2:
                departure_code = route_parts[0]
                arrival_code = route_parts[-1]

        self.departure_code = departure_code
        self.arrival_code = arrival_code
        self.itinerary = itinerary
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


class TicketCorrectionResponse(BaseModel):
    """Composite response returned after admin ticket correction/removal."""

    ticket: TicketRead
    customer: CustomerRead
    transaction: TransactionRead
    customer_new_balance: float
    deleted: bool = False


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


def _touch_ticket(ticket: Ticket) -> None:
    ticket.updated_at = datetime.now(timezone.utc)


def _ensure_ticket_has_no_dependent_documents(ticket: Ticket) -> None:
    if ticket.invoice_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket is already used by an invoice item.",
        )
    if ticket.quote_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket is already used by a quote item.",
        )


def correct_confirmed_ticket(
    *,
    session: Session,
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
) -> TicketCorrectionResponse:
    """Admin-only correction for mutable confirmed ticket details and debt amount."""
    ticket = _get_ticket_or_404(session=session, ticket_id=ticket_id)
    customer = _get_customer_or_404(session=session, customer_id=ticket.customer_id)

    if ticket.status != TicketStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only confirmed tickets can be corrected from the ledger.",
        )

    purchase_transaction = _get_confirmed_ticket_charge(session=session, ticket=ticket)
    update_data = payload.model_dump(exclude_unset=True)

    if "customer_id" in update_data or "status" in update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use explicit lifecycle actions for customer or status changes.",
        )

    old_selling_price = ticket.selling_price
    service_fee = update_data.pop("service_fee", None)

    if service_fee is not None:
        net_price = update_data.get("net_price", ticket.net_price)
        update_data["selling_price"] = net_price + service_fee

    if "departure_code" in update_data and update_data["departure_code"] is not None:
        update_data["departure_code"] = update_data["departure_code"].strip().upper()
    if "arrival_code" in update_data and update_data["arrival_code"] is not None:
        update_data["arrival_code"] = update_data["arrival_code"].strip().upper()
    if "pnr" in update_data and update_data["pnr"] is not None:
        update_data["pnr"] = update_data["pnr"].strip().upper()
    if "passengers" in update_data and update_data["passengers"] is not None:
        update_data["passengers"] = [
            passenger.strip().upper()
            for passenger in update_data["passengers"]
            if passenger.strip()
        ]

    departure_code = update_data.get("departure_code", ticket.departure_code)
    arrival_code = update_data.get("arrival_code", ticket.arrival_code)
    if departure_code and arrival_code:
        update_data["itinerary"] = f"{departure_code}-{arrival_code}"

    for field_name, value in update_data.items():
        setattr(ticket, field_name, value)

    ticket.true_income = ticket.selling_price + ticket.discount - ticket.net_price
    purchase_transaction.amount = ticket.selling_price
    purchase_transaction.note = (
        f"Auto-debt for PNR {ticket.pnr} – {ticket.itinerary} "
        f"on {ticket.flight_date.date()}"
    )

    try:
        _touch_ticket(ticket)
        customer.balance += ticket.selling_price - old_selling_price
        session.add(ticket)
        session.add(purchase_transaction)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(ticket)
    session.refresh(purchase_transaction)
    session.refresh(customer)

    return TicketCorrectionResponse(
        ticket=TicketRead.model_validate(ticket),
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(purchase_transaction),
        customer_new_balance=customer.balance,
    )


def delete_confirmed_ticket_for_admin(
    *,
    session: Session,
    ticket_id: uuid.UUID,
) -> TicketCorrectionResponse:
    """Remove a mutable confirmed ticket and reverse its automatic debt row."""
    ticket = _get_ticket_or_404(session=session, ticket_id=ticket_id)
    customer = _get_customer_or_404(session=session, customer_id=ticket.customer_id)

    if ticket.status != TicketStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only confirmed tickets can be removed from the ledger.",
        )

    _ensure_ticket_has_no_dependent_documents(ticket)
    purchase_transaction = _get_confirmed_ticket_charge(session=session, ticket=ticket)
    other_linked_transactions = session.exec(
        select(Transaction).where(
            Transaction.linked_ticket_id == ticket.id,
            Transaction.id != purchase_transaction.id,
        )
    ).first()
    if other_linked_transactions is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ticket has linked payments or adjustments. Remove those first.",
        )

    response_ticket = TicketRead.model_validate(ticket)
    response_transaction = TransactionRead.model_validate(purchase_transaction)

    try:
        customer.balance -= ticket.selling_price
        session.delete(purchase_transaction)
        session.delete(ticket)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(customer)

    return TicketCorrectionResponse(
        ticket=response_ticket,
        customer=CustomerRead.model_validate(customer),
        transaction=response_transaction,
        customer_new_balance=customer.balance,
        deleted=True,
    )


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
    2. Persist the Ticket with status = CONFIRMED. PNRs may repeat for grouped passengers.
    3. Flush so ticket.id is populated, then persist a CHARGE Transaction linked to
       both the customer and the ticket.
    4. Increment customer.balance by selling_price.
    5. Single atomic commit; refresh and return a structured response.
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

    selling_price = payload.selling_price
    true_income = payload.true_income

    ticket = Ticket(
        pnr=payload.pnr,
        airline=payload.airline,
        ticket_number=payload.ticket_number,
        seat_code=payload.seat_code,
        fare_class=payload.fare_class,
        passengers=payload.passengers,
        departure_place=payload.departure_place,
        arrival_place=payload.arrival_place,
        departure_code=payload.departure_code,
        arrival_code=payload.arrival_code,
        itinerary=payload.itinerary,
        flight_date=payload.flight_date,
        net_price=payload.net_price,
        selling_price=selling_price,
        discount=payload.discount,
        true_income=true_income,
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
        _touch_ticket(ticket)
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
        _touch_ticket(ticket)
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
        _touch_ticket(ticket)
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
