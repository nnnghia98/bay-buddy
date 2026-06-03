"""
Business logic for customer-safe ticket imports.

Imports are review records only. They intentionally do not create tickets,
transactions, customers, or balance movements.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from models.enums import TicketImportSource, TicketImportStatus
from models.ticket_import import TicketImport, TicketImportRead
from services.inbound_email_service import InboundEmailContent, parse_eml_bytes
from services.redaction_service import (
    redact_ticket_html,
    redact_ticket_text,
)


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _read_import(ticket_import: TicketImport) -> TicketImportRead:
    return TicketImportRead.model_validate(ticket_import)


def _looks_like_html(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in ("<html", "<body", "<table", "<div", "<p"))


def _refresh_redaction_if_needed(
    *,
    ticket_import: TicketImport,
    session: Session,
) -> None:
    """Upgrade stored customer-safe HTML when redaction rules change."""

    original = ticket_import.original_content
    if not original:
        return

    strategy = ticket_import.redaction_summary.get("strategy")
    if strategy in {"html_payment_removal", "text_payment_lines"}:
        return

    if ticket_import.original_mime_type == "text/html" or _looks_like_html(original):
        redacted, summary = redact_ticket_html(original)
    elif ticket_import.original_mime_type == "text/plain":
        redacted, summary = redact_ticket_text(original)
    else:
        return

    ticket_import.redacted_content = redacted
    ticket_import.redaction_summary = summary
    ticket_import.updated_at = datetime.now(timezone.utc)
    session.add(ticket_import)
    session.commit()
    session.refresh(ticket_import)


def create_import_from_email(
    *,
    email_content: InboundEmailContent,
    session: Session,
) -> TicketImportRead:
    """Create or return a ready import from a forwarded airline email."""

    original = email_content.html_body or email_content.text_body or ""
    if not original.strip():
        raise ValueError("Inbound email did not include HTML or plain-text content.")

    dedupe_source = email_content.provider_message_id or original
    dedupe_key = _sha256_text(dedupe_source)
    existing = session.exec(
        select(TicketImport).where(TicketImport.dedupe_key == dedupe_key)
    ).first()
    if existing is not None:
        _refresh_redaction_if_needed(ticket_import=existing, session=session)
        return _read_import(existing)

    if email_content.html_body:
        redacted, summary = redact_ticket_html(email_content.html_body)
        original_mime_type = "text/html"
    else:
        redacted, summary = redact_ticket_text(email_content.text_body or "")
        original_mime_type = "text/plain"

    now = datetime.now(timezone.utc)
    ticket_import = TicketImport(
        source=TicketImportSource.INBOUND_EMAIL,
        status=TicketImportStatus.READY,
        sender_email=email_content.sender_email,
        recipient_email=email_content.recipient_email,
        subject=email_content.subject,
        provider_message_id=email_content.provider_message_id,
        dedupe_key=dedupe_key,
        original_mime_type=original_mime_type,
        original_content=original,
        redacted_content=redacted,
        redaction_summary=summary,
        created_at=now,
        updated_at=now,
    )
    session.add(ticket_import)
    session.commit()
    session.refresh(ticket_import)
    return _read_import(ticket_import)


async def create_import_from_upload(
    *,
    file_bytes: bytes,
    filename: str | None,
    mime_type: str,
    created_by: uuid.UUID,
    session: Session,
) -> TicketImportRead:
    """Create a visual-preserving customer-safe import from an authenticated upload."""

    content_hash = hashlib.sha256(file_bytes).hexdigest()
    existing = session.exec(
        select(TicketImport).where(TicketImport.dedupe_key == content_hash)
    ).first()
    if existing is not None:
        _refresh_redaction_if_needed(ticket_import=existing, session=session)
        return _read_import(existing)

    redacted_content: str | None = None
    redaction_summary: dict[str, Any] = {}
    failure_reason: str | None = None
    status = TicketImportStatus.READY
    original_text: str | None = None

    if mime_type in {"text/html", "text/plain", "message/rfc822"}:
        if mime_type == "message/rfc822":
            email_content = parse_eml_bytes(file_bytes)
            original_text = email_content.html_body or email_content.text_body or ""
            if email_content.html_body:
                redacted_content, redaction_summary = redact_ticket_html(original_text)
            else:
                redacted_content, redaction_summary = redact_ticket_text(original_text)
        else:
            original_text = file_bytes.decode("utf-8", errors="replace")
            if mime_type == "text/html":
                redacted_content, redaction_summary = redact_ticket_html(original_text)
            else:
                redacted_content, redaction_summary = redact_ticket_text(original_text)
    else:
        status = TicketImportStatus.FAILED
        failure_reason = (
            "Visual-preserving ticket export requires the original email HTML, "
            "plain text, or .eml content."
        )
        redaction_summary = {
            "strategy": "visual_source_required",
            "payment_amount_present": False,
        }

    now = datetime.now(timezone.utc)
    ticket_import = TicketImport(
        source=TicketImportSource.UPLOAD,
        status=status,
        created_by=created_by,
        dedupe_key=content_hash,
        original_filename=filename,
        original_mime_type=mime_type,
        original_content=original_text,
        redacted_content=redacted_content,
        parsed_payload=None,
        redaction_summary=redaction_summary,
        failure_reason=failure_reason,
        created_at=now,
        updated_at=now,
    )
    session.add(ticket_import)
    session.commit()
    session.refresh(ticket_import)
    return _read_import(ticket_import)


def list_ticket_imports(*, session: Session, limit: int = 50) -> list[TicketImportRead]:
    """Return recent imports for the authenticated review queue."""

    statement = (
        select(TicketImport)
        .order_by(TicketImport.created_at.desc(), TicketImport.id)
        .limit(limit)
    )
    ticket_imports = session.exec(statement).all()
    for ticket_import in ticket_imports:
        _refresh_redaction_if_needed(ticket_import=ticket_import, session=session)
    return [_read_import(ticket_import) for ticket_import in ticket_imports]


def get_ticket_import(
    *,
    import_id: uuid.UUID,
    session: Session,
) -> TicketImportRead | None:
    """Return one import by ID."""

    ticket_import = session.get(TicketImport, import_id)
    if ticket_import is None:
        return None
    _refresh_redaction_if_needed(ticket_import=ticket_import, session=session)
    return _read_import(ticket_import)
