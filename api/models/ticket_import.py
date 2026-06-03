"""
Ticket import model – pending customer-safe ticket documents.

Imports are intake records created from forwarded airline emails or mobile
uploads. They do not affect tickets, customers, or công nợ until a staff member
reviews and confirms the extracted data through the normal ticket flow.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel

try:
    from sqlalchemy.types import JSON
except ImportError:  # pragma: no cover
    from sqlalchemy import JSON  # type: ignore

from .enums import TicketImportSource, TicketImportStatus


class TicketImportBase(SQLModel):
    """Fields shared by the persisted table and public read schema."""

    source: TicketImportSource = Field(description="Inbound source for this import.")
    status: TicketImportStatus = Field(
        default=TicketImportStatus.READY,
        description="Current review/import lifecycle state.",
    )
    sender_email: Optional[str] = Field(default=None, max_length=255)
    recipient_email: Optional[str] = Field(default=None, max_length=255)
    subject: Optional[str] = Field(default=None, max_length=500)
    provider_message_id: Optional[str] = Field(default=None, max_length=255, index=True)
    dedupe_key: Optional[str] = Field(default=None, max_length=128, index=True)
    original_filename: Optional[str] = Field(default=None, max_length=255)
    original_mime_type: Optional[str] = Field(default=None, max_length=100)
    redaction_summary: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False, default=dict),
    )
    parsed_payload: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    failure_reason: Optional[str] = Field(default=None, sa_column=Column(Text))


class TicketImport(TicketImportBase, table=True):
    """Persisted ticket import stored in the `ticket_import` table."""

    __tablename__ = "ticket_import"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    created_by: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="user.id",
        index=True,
        description="Internal user who uploaded the import; null for inbound email.",
    )
    linked_ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="ticket.id",
        index=True,
        description="Confirmed ticket created from this import, when available.",
    )
    original_content: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Original HTML/plain text when safe to store as text.",
    )
    redacted_content: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Customer-safe HTML/text generated from the original input.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,
    )


class TicketImportRead(TicketImportBase):
    """Public read representation for app review screens."""

    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    linked_ticket_id: Optional[uuid.UUID] = None
    original_content: Optional[str] = None
    redacted_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime

