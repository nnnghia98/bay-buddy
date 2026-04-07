"""
Transaction model – records every financial event affecting a Customer's balance.

Schema reference: docs/ARCHITECT.md § Model: Transaction
Dictionary:       docs/DICTIONARY.md  (balance = công nợ)

Balance update logic (applied in a DB transaction):
  TICKET_PURCHASE / ADDITIONAL_FEE / REFUND → customer.balance += amount
  PAYMENT / DISCOUNT                        → customer.balance -= amount
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import model_validator
from sqlalchemy import Column, Text
from sqlmodel import Field, Relationship, SQLModel

from .enums import (
    TransactionCategory,
    TransactionType,
    get_expected_transaction_type,
)

if TYPE_CHECKING:
    from .customer import Customer
    from .invoice import Invoice
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
        description="Legacy direction enum kept in sync with category.",
    )
    category: TransactionCategory = Field(
        default=TransactionCategory.TICKET_PURCHASE,
        description=(
            "VN-market category used for reconciliation and running balance rules: "
            "TICKET_PURCHASE | PAYMENT | DISCOUNT | ADDITIONAL_FEE | REFUND."
        ),
    )
    method: str = Field(
        max_length=100,
        description='Payment method label, e.g. "Bank Transfer", "Cash", "Momo".',
    )
    note: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Reference/note text. Required for manual payments and manual adjustments."
        ),
    )
    evidence_url: Optional[str] = Field(
        default=None,
        max_length=2048,
        description="Optional receipt / payment-proof URL attached to the transaction.",
    )

    # FK – resolved at the DB layer.
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)

    # Optional FK back to the specifically reconciled ticket (đích danh).
    linked_ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="ticket.id",
        index=True,
        description="UUID of the Ticket explicitly reconciled to this transaction.",
    )
    is_refund_confirmed: bool = Field(
        default=False,
        description=(
            "True once an outbound refund / overpayment return has been confirmed."
        ),
    )
    is_invoiced: bool = Field(
        default=False,
        description=(
            "True once this transaction has been locked into an issued invoice."
        ),
    )
    invoice_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="invoice.id",
        index=True,
        description="Optional invoice UUID for duplicate-billing prevention.",
    )

    @model_validator(mode="after")
    def validate_transaction_semantics(self) -> "TransactionBase":
        """Keep the legacy `type` and the new category field aligned."""

        expected_type = get_expected_transaction_type(self.category)
        if self.type != expected_type:
            raise ValueError(
                f"type '{self.type}' is invalid for category "
                f"'{self.category}'. Expected '{expected_type}'."
            )

        if (
            self.is_refund_confirmed
            and self.category != TransactionCategory.REFUND
        ):
            raise ValueError(
                "is_refund_confirmed can only be true for REFUND transactions."
            )

        if (
            self.category != TransactionCategory.TICKET_PURCHASE
            and not (self.note or "").strip()
        ):
            raise ValueError(
                "note is required for manual payments and manual adjustments."
            )

        return self


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
    created_by: uuid.UUID = Field(
        foreign_key="user.id",
        index=True,
        nullable=False,
        description="Authenticated internal user ID that created this transaction.",
    )

    # Relationship back to Customer.
    customer: Optional["Customer"] = Relationship(back_populates="transactions")

    # Relationship back to Ticket (optional – only set for auto-debt transactions).
    linked_ticket: Optional["Ticket"] = Relationship(back_populates="transactions")
    invoice: Optional["Invoice"] = Relationship(back_populates="transactions")


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
    created_by: uuid.UUID


class TransactionUpdate(SQLModel):
    """All fields optional for partial PATCH payloads (typically only `note` or `method` changes)."""

    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    method: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = None
    evidence_url: Optional[str] = Field(default=None, max_length=2048)
    linked_ticket_id: Optional[uuid.UUID] = None
    is_refund_confirmed: Optional[bool] = None
