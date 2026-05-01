"""
Ticket model – represents a booked flight ticket.

Schema reference: docs/ARCHITECT.md § Model: Ticket
Dictionary:       docs/DICTIONARY.md  (pnr, net_price, selling_price, itinerary)
Agent output:     docs/AGENT_PARSER.md (fields produced by the AI extraction step)

Profit per ticket = selling_price - net_price
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column
from sqlmodel import Field, Relationship, SQLModel

try:
    from sqlalchemy.types import JSON
except ImportError:  # pragma: no cover
    from sqlalchemy import JSON  # type: ignore

from .enums import Airline, TicketStatus

if TYPE_CHECKING:
    from .customer import Customer
    from .invoice_item import InvoiceItem
    from .quote_item import QuoteItem
    from .transaction import Transaction


# ---------------------------------------------------------------------------
# Shared / base properties
# ---------------------------------------------------------------------------

class TicketBase(SQLModel):
    """Fields shared between create/read schemas and the DB table."""

    # Mã đặt chỗ – unique 6-character alphanumeric booking reference.
    pnr: str = Field(
        index=True,
        min_length=6,
        max_length=6,
        description=(
            "6-character PNR (Passenger Name Record) booking reference code. "
            "May repeat across passenger rows in group bookings."
        ),
    )
    airline: Airline = Field(
        description="Carrier code: VNA (Vietnam Airlines), VJ (Vietjet), QH (Bamboo), VU (Vietravel).",
    )
    ticket_number: Optional[str] = Field(
        default=None,
        index=True,
        max_length=50,
        description="Airline ticket number. May repeat across outbound/return ticket rows.",
    )
    seat_code: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Optional seat assignment code, e.g. 12A.",
    )
    fare_class: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Optional fare class / fare family label from the source ticket, e.g. B or Flexible.",
    )
    departure_place: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Human-readable departure place, e.g. Da Nang City.",
    )
    arrival_place: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Human-readable arrival place, e.g. Ho Chi Minh City.",
    )
    departure_code: Optional[str] = Field(
        default=None,
        max_length=10,
        description="Compact departure place code, e.g. DAD.",
    )
    arrival_code: Optional[str] = Field(
        default=None,
        max_length=10,
        description="Compact arrival place code, e.g. SGN.",
    )
    # Hành trình – e.g. "HAN-SGN"
    itinerary: str = Field(
        max_length=100,
        description='Flight route string (hành trình), e.g. "HAN-SGN" or "SGN-DAD-HAN".',
    )
    flight_date: datetime = Field(
        description="Scheduled departure datetime stored in ISO-8601 / UTC.",
    )
    # Giá gốc – cost paid to the airline / supplier.
    net_price: float = Field(
        ge=0,
        description="Net cost from airline/supplier (giá gốc). Must be ≥ 0.",
    )
    # Giá bán – price invoiced to the customer.
    selling_price: float = Field(
        ge=0,
        description="Selling price charged to the customer (giá bán). Must be ≥ 0.",
    )
    discount: float = Field(
        default=0.0,
        ge=0,
        description="Optional discount amount applied to the ticket in VND.",
    )

    status: TicketStatus = Field(
        default=TicketStatus.DRAFT,
        description="Lifecycle state of the ticket (DRAFT, CONFIRMED, VOID, REFUNDED).",
    )

    # FK – resolved at the DB layer.
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)


# ---------------------------------------------------------------------------
# DB Table
# ---------------------------------------------------------------------------

class Ticket(TicketBase, table=True):
    """Persisted ticket entity stored in the `ticket` table."""

    __tablename__ = "ticket"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )

    # passengers stored as a JSON array of uppercase full-name strings.
    # e.g. ["NGUYEN VAN A", "TRAN THI B"]
    passengers: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
        description="List of passenger full names (UPPERCASE), stored as JSON.",
    )

    # Relationship back to Customer.
    customer: Optional["Customer"] = Relationship(back_populates="tickets")

    # Relationship to Transactions created from this ticket (e.g. auto-debt).
    transactions: List["Transaction"] = Relationship(back_populates="linked_ticket")
    invoice_items: List["InvoiceItem"] = Relationship(back_populates="linked_ticket")
    quote_items: List["QuoteItem"] = Relationship(back_populates="linked_ticket")

    @property
    def service_fee(self) -> float:
        """Phí dịch vụ – profit margin on this ticket."""
        return self.selling_price - self.net_price


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class TicketCreate(TicketBase):
    """Payload accepted by POST /tickets (after AI-extraction confirmation)."""

    passengers: List[str] = Field(
        default_factory=list,
        min_length=1,
        description="At least one passenger name is required.",
    )


class TicketRead(TicketBase):
    """Public read representation of a ticket."""

    id: uuid.UUID
    passengers: List[str]
    service_fee: float  # computed, not stored


class TicketUpdate(SQLModel):
    """All fields optional for partial PATCH payloads."""

    pnr: Optional[str] = Field(default=None, min_length=6, max_length=6)
    airline: Optional[Airline] = None
    ticket_number: Optional[str] = Field(default=None, max_length=50)
    seat_code: Optional[str] = Field(default=None, max_length=20)
    fare_class: Optional[str] = Field(default=None, max_length=50)
    passengers: Optional[List[str]] = None
    departure_place: Optional[str] = Field(default=None, max_length=255)
    arrival_place: Optional[str] = Field(default=None, max_length=255)
    departure_code: Optional[str] = Field(default=None, max_length=10)
    arrival_code: Optional[str] = Field(default=None, max_length=10)
    itinerary: Optional[str] = Field(default=None, max_length=100)
    flight_date: Optional[datetime] = None
    net_price: Optional[float] = Field(default=None, ge=0)
    service_fee: Optional[float] = Field(
        default=None,
        ge=0,
        description="Optional service fee used to recompute selling_price.",
    )
    selling_price: Optional[float] = Field(default=None, ge=0)
    discount: Optional[float] = Field(default=None, ge=0)
    status: Optional[TicketStatus] = None
    customer_id: Optional[uuid.UUID] = None
