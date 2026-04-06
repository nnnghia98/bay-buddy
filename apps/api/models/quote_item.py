"""
QuoteItem model – immutable quote line items.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .quote import Quote
    from .ticket import Ticket


class QuoteItemBase(SQLModel):
    """Shared quote line properties."""

    description: str = Field(min_length=1, max_length=500)
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)
    unit_price_snapshot: float = Field(ge=0)
    passenger_name_snapshot: str = Field(min_length=1, max_length=500)
    total: float = Field(ge=0)
    linked_ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="ticket.id",
        index=True,
    )
    quote_id: uuid.UUID = Field(foreign_key="quote.id", index=True)


class QuoteItem(QuoteItemBase, table=True):
    """Persisted quote line item."""

    __tablename__ = "quote_item"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )

    quote: Optional["Quote"] = Relationship(back_populates="items")
    linked_ticket: Optional["Ticket"] = Relationship(back_populates="quote_items")


class QuoteItemRead(QuoteItemBase):
    """Public read representation of a quote item."""

    id: uuid.UUID
