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
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel

from .enums import CustomerType
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
    tickets: List[Ticket] = Relationship(back_populates="customer")
    transactions: List[Transaction] = Relationship(back_populates="customer")


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


class CustomerUpdate(SQLModel):
    """All fields optional for partial PATCH payloads."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    type: Optional[CustomerType] = None
    balance: Optional[float] = None
