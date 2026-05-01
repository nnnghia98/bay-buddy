"""
InvoiceItem model – individual charge lines that belong to an Invoice.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .invoice import Invoice
    from .ticket import Ticket


class InvoiceItemBase(SQLModel):
    """Shared invoice line properties."""

    description: str = Field(
        min_length=1,
        max_length=500,
        description='Invoice line label, e.g. "Vé máy bay PNR ABC123".',
    )
    quantity: float = Field(gt=0, description="Invoice quantity.")
    unit_price: float = Field(ge=0, description="Invoice unit price in VND.")
    unit_price_snapshot: float = Field(
        ge=0,
        description="Immutable unit price copied from the source ticket/quote.",
    )
    passenger_name_snapshot: str = Field(
        min_length=1,
        max_length=500,
        description="Immutable passenger names copied at invoice creation time.",
    )
    total: float = Field(ge=0, description="Line total in VND.")
    linked_ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="ticket.id",
        index=True,
        description="Optional ticket UUID tied to this invoice line.",
    )
    invoice_id: uuid.UUID = Field(foreign_key="invoice.id", index=True)


class InvoiceItem(InvoiceItemBase, table=True):
    """Persisted invoice line item."""

    __tablename__ = "invoice_item"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )

    invoice: Optional["Invoice"] = Relationship(back_populates="items")
    linked_ticket: Optional["Ticket"] = Relationship(back_populates="invoice_items")


class InvoiceItemCreate(InvoiceItemBase):
    """Payload used internally when creating invoice items."""


class InvoiceItemRead(InvoiceItemBase):
    """Public read representation of an invoice item."""

    id: uuid.UUID
