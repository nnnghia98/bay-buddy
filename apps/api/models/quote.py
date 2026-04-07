"""
Quote model – informational commercial quote that does not affect the ledger.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Text
from sqlmodel import Field, Relationship, SQLModel

from .enums import QuoteStatus

if TYPE_CHECKING:
    from .customer import Customer
    from .quote_item import QuoteItem


class QuoteBase(SQLModel):
    """Shared quote properties."""

    quote_number: str = Field(index=True, unique=True, min_length=1, max_length=32)
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)
    customer_name_snapshot: str = Field(min_length=1, max_length=255)
    customer_address_snapshot: Optional[str] = Field(default=None, max_length=500)
    customer_tax_code_snapshot: Optional[str] = Field(default=None, max_length=100)
    total_amount: float = Field(ge=0)
    tax_amount: float = Field(default=0.0, ge=0)
    discount_amount: float = Field(default=0.0, ge=0)
    valid_until: datetime = Field(description="UTC datetime until the quote is valid.")
    status: QuoteStatus = Field(default=QuoteStatus.DRAFT)
    note: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))


class Quote(QuoteBase, table=True):
    """Persisted quote header."""

    __tablename__ = "quote"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    customer: Optional["Customer"] = Relationship(back_populates="quotes")
    items: List["QuoteItem"] = Relationship(back_populates="quote")


class QuoteCreate(SQLModel):
    """Payload for POST /quotes."""

    customer_id: uuid.UUID
    ticket_ids: list[uuid.UUID] = Field(default_factory=list)
    tax_amount: float = Field(default=0.0, ge=0)
    discount_amount: float = Field(default=0.0, ge=0)
    valid_until: datetime
    note: Optional[str] = None


class QuoteRead(QuoteBase):
    """Public read representation of a quote."""

    id: uuid.UUID
    created_at: datetime


class QuoteDetail(QuoteRead):
    """Detailed quote response using snapshot fields only."""

    items: list["QuoteItemRead"]
    amount_in_words: str


class QuoteConvertResponse(SQLModel):
    """Result returned when a quote becomes an invoice."""

    quote: "QuoteRead"
    invoice: "InvoiceRead"


from .invoice import InvoiceRead  # noqa: E402
from .quote_item import QuoteItemRead  # noqa: E402
