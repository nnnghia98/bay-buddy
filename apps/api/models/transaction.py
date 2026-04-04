"""
Transaction model – records every financial event affecting a Customer's balance.

Schema reference: docs/ARCHITECT.md § Model: Transaction
Dictionary:       docs/DICTIONARY.md  (balance = công nợ)

Balance update logic (applied in a DB transaction):
  CHARGE  → customer.balance += amount   (debt increases)
  PAYMENT → customer.balance -= amount   (debt decreases)
  REFUND  → customer.balance -= amount   (credit returned)
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

from .enums import TransactionType

if TYPE_CHECKING:
    from .customer import Customer
    from .ticket import Ticket


# ---------------------------------------------------------------------------
# Shared / base properties
# ---------------------------------------------------------------------------

class TransactionBase(SQLModel):
    """Fields shared between create/read schemas and the DB table."""

    amount: float = Field(
        gt=0,
        description="Transaction amount. Must be a positive value (direction is encoded in `type`).",
    )
    type: TransactionType = Field(
        description="PAYMENT | CHARGE | REFUND – determines how Customer.balance is adjusted.",
    )
    method: str = Field(
        max_length=100,
        description='Payment method label, e.g. "Bank Transfer", "Cash", "Momo".',
    )
    note: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional free-text note or reference number for this transaction.",
    )

    # FK – resolved at the DB layer.
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)

    # Optional FK back to the ticket that triggered this transaction (debt entry).
    ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="ticket.id",
        index=True,
        description="UUID of the Ticket that created this transaction (null for manual payments).",
    )


# ---------------------------------------------------------------------------
# DB Table
# ---------------------------------------------------------------------------

class Transaction(TransactionBase, table=True):
    """Persisted transaction entity stored in the `transaction` table."""

    __tablename__ = "transaction"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )

    # Auto-stamped in UTC when the record is created.
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of when this transaction was recorded.",
    )

    # Relationship back to Customer.
    customer: Optional["Customer"] = Relationship(back_populates="transactions")

    # Relationship back to Ticket (optional – only set for auto-debt transactions).
    ticket: Optional["Ticket"] = Relationship(back_populates="transactions")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class TransactionCreate(TransactionBase):
    """Payload accepted by POST /transactions."""
    pass


class TransactionRead(TransactionBase):
    """Public read representation of a transaction."""

    id: uuid.UUID
    created_at: datetime


class TransactionUpdate(SQLModel):
    """All fields optional for partial PATCH payloads (typically only `note` or `method` changes)."""

    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[TransactionType] = None
    method: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = Field(default=None, max_length=500)
