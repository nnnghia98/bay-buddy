"""
Customer model – represents individual or business clients.

Schema reference: docs/ARCHITECT.md § Model: Customer
Dictionary:       docs/DICTIONARY.md  (balance = công nợ)

Balance semantics
-----------------
  balance > 0  →  Customer owes money  (debt / công nợ dương)
  balance < 0  →  Customer has credit  (over-paid / công nợ âm)
  balance == 0 →  Settled
"""

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

from .enums import CustomerType

if TYPE_CHECKING:
    from .invoice import Invoice
    from .quote import Quote
    from .ticket import Ticket
    from .transaction import Transaction

# ---------------------------------------------------------------------------
# Shared / base properties
# ---------------------------------------------------------------------------

class CustomerBase(SQLModel):
    """Fields shared between create/read schemas and the DB table."""

    name: str = Field(
        index=True,
        min_length=1,
        max_length=255,
        description="Full name of the individual or registered business name.",
    )
    email: Optional[str] = Field(
        default=None,
        index=True,
        unique=True,
        max_length=255,
        description="Optional customer email used for contact and invoice delivery.",
    )
    phone: Optional[str] = Field(
        default=None,
        max_length=30,
        description="Optional customer phone number.",
    )
    address: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional billing/customer address.",
    )
    tax_code: Optional[str] = Field(
        default=None,
        index=True,
        unique=True,
        max_length=100,
        description="Optional Vietnamese tax code for invoicing.",
    )
    type: CustomerType = Field(
        default=CustomerType.INDIVIDUAL,
        description="INDIVIDUAL for personal travellers; BUSINESS for corporate accounts.",
    )
    balance: float = Field(
        default=0.0,
        description=(
            "Current debt balance (công nợ). "
            "Positive = customer owes; Negative = customer has credit."
        ),
    )
    is_active: bool = Field(
        default=True,
        description="Soft-archive flag. Inactive customers stay in history but should be treated as archived in the UI.",
    )


# ---------------------------------------------------------------------------
# DB Table
# ---------------------------------------------------------------------------

class Customer(CustomerBase, table=True):
    """Persisted customer entity stored in the `customer` table."""

    __tablename__ = "customer"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )

    # Relationships – populated lazily by SQLAlchemy; not included in API responses by default.
    tickets: List["Ticket"] = Relationship(back_populates="customer")
    transactions: List["Transaction"] = Relationship(back_populates="customer")
    invoices: List["Invoice"] = Relationship(back_populates="customer")
    quotes: List["Quote"] = Relationship(back_populates="customer")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class CustomerCreate(CustomerBase):
    """Payload accepted by POST /customers."""
    pass


class CustomerRead(CustomerBase):
    """Public representation of a customer."""

    id: uuid.UUID


class CustomerDirectoryItem(SQLModel):
    """Slim customer payload used by the directory page."""

    id: uuid.UUID
    full_name: str
    phone: Optional[str] = None
    current_balance: float
    is_active: bool = True


class CustomerUpdate(SQLModel):
    """All fields optional for partial PATCH payloads."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=500)
    tax_code: Optional[str] = Field(default=None, max_length=100)
    type: Optional[CustomerType] = None
    balance: Optional[float] = None
    is_active: Optional[bool] = None
