"""
Invoice model – quote / invoice header for Vietnamese financial workflows.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Text
from sqlmodel import Field, Relationship, SQLModel

from .enums import InvoiceStatus

if TYPE_CHECKING:
    from .customer import Customer
    from .invoice_item import InvoiceItem
    from .transaction import Transaction


class InvoiceBase(SQLModel):
    """Fields shared between invoice create/read and DB table."""

    invoice_number: str = Field(
        index=True,
        unique=True,
        min_length=1,
        max_length=32,
        description="Internal invoice / quote number in format BB-YYYYMM-XXXX.",
    )
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)
    customer_name_snapshot: str = Field(
        min_length=1,
        max_length=255,
        description="Immutable customer name copied when the invoice is created.",
    )
    customer_address_snapshot: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Immutable billing address copied when the invoice is created.",
    )
    customer_tax_code_snapshot: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Immutable tax code copied when the invoice is created.",
    )
    total_amount: float = Field(ge=0, description="Grand total in VND.")
    tax_amount: float = Field(default=0.0, ge=0, description="Tax amount in VND.")
    discount_amount: float = Field(
        default=0.0,
        ge=0,
        description="Discount amount in VND.",
    )
    status: InvoiceStatus = Field(
        default=InvoiceStatus.DRAFT,
        description="Invoice lifecycle status.",
    )
    note: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Optional invoice note / decree-compliance comment.",
    )
    issued_at: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp when the invoice was formally issued.",
    )


class Invoice(InvoiceBase, table=True):
    """Persisted invoice header."""

    __tablename__ = "invoice"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when the invoice draft was created.",
    )

    customer: Optional["Customer"] = Relationship(back_populates="invoices")
    items: List["InvoiceItem"] = Relationship(back_populates="invoice")
    transactions: List["Transaction"] = Relationship(back_populates="invoice")


class InvoiceCreate(SQLModel):
    """Payload for POST /invoices."""

    customer_id: uuid.UUID
    ticket_ids: list[uuid.UUID] = Field(default_factory=list)
    tax_amount: float = Field(default=0.0, ge=0)
    discount_amount: float = Field(default=0.0, ge=0)
    note: Optional[str] = None


class InvoiceRead(InvoiceBase):
    """Public read representation of an invoice header."""

    id: uuid.UUID
    created_at: datetime


class InvoiceStatusUpdate(SQLModel):
    """Payload for PATCH /invoices/{id}/status."""

    status: InvoiceStatus


class InvoiceUpdate(SQLModel):
    """Draft-only mutable invoice fields."""

    tax_amount: Optional[float] = Field(default=None, ge=0)
    discount_amount: Optional[float] = Field(default=None, ge=0)
    note: Optional[str] = None


class InvoiceDetail(InvoiceRead):
    """Detailed invoice response including items and amount in words."""

    items: list["InvoiceItemRead"]
    amount_in_words: str


class InvoiceListItem(InvoiceRead):
    """List-friendly invoice payload."""

    amount_in_words: str


class InvoiceListFilters(SQLModel):
    """Query filters for GET /invoices."""

    customer_id: uuid.UUID
    status: Optional[InvoiceStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class InvoicePublicBrand(SQLModel):
    """Printable Bay Buddy brand payload."""

    company_name: str
    slogan: str
    support_email: str
    hotline: str


class InvoicePublicView(SQLModel):
    """Printable invoice payload using snapshot fields only."""

    brand: InvoicePublicBrand
    invoice: "InvoiceRead"
    items: list["InvoiceItemRead"]
    amount_in_words: str


from .invoice_item import InvoiceItemRead  # noqa: E402
