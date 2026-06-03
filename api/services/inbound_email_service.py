"""
Inbound email parsing helpers for customer-safe ticket imports.

The provider-facing route accepts common JSON/form payload shapes from inbound
email services. Raw `.eml` parsing uses Python's stdlib email package so the
first slice does not require a mailbox server or new parser dependency.
"""

from __future__ import annotations

from dataclasses import dataclass
from email import policy
from email.parser import BytesParser
from typing import Any


@dataclass(frozen=True)
class InboundEmailContent:
    """Normalized email content used by the ticket import service."""

    sender_email: str | None
    recipient_email: str | None
    subject: str | None
    provider_message_id: str | None
    html_body: str | None
    text_body: str | None


def _first_text(value: Any) -> str | None:
    if value is None:
        return None

    if isinstance(value, list):
        for item in value:
            text = _first_text(item)
            if text:
                return text
        return None

    text = str(value).strip()
    return text or None


def normalize_inbound_payload(payload: dict[str, Any]) -> InboundEmailContent:
    """Normalize common inbound email webhook fields into one shape."""

    def pick(*keys: str) -> str | None:
        for key in keys:
            if key in payload:
                value = _first_text(payload.get(key))
                if value:
                    return value
        return None

    return InboundEmailContent(
        sender_email=pick("from", "From", "sender", "Sender"),
        recipient_email=pick("to", "To", "recipient", "Recipient"),
        subject=pick("subject", "Subject"),
        provider_message_id=pick(
            "message_id",
            "MessageID",
            "Message-Id",
            "Message-ID",
            "message-id",
        ),
        html_body=pick("html", "HtmlBody", "body-html", "stripped-html"),
        text_body=pick("text", "TextBody", "body-plain", "stripped-text"),
    )


def parse_eml_bytes(file_bytes: bytes) -> InboundEmailContent:
    """Parse a raw RFC822 email and extract the useful HTML/text body parts."""

    message = BytesParser(policy=policy.default).parsebytes(file_bytes)
    html_body: str | None = None
    text_body: str | None = None

    if message.is_multipart():
        for part in message.walk():
            content_type = part.get_content_type()
            disposition = part.get_content_disposition()
            if disposition == "attachment":
                continue

            if content_type == "text/html" and html_body is None:
                html_body = part.get_content()
            elif content_type == "text/plain" and text_body is None:
                text_body = part.get_content()
    else:
        content_type = message.get_content_type()
        if content_type == "text/html":
            html_body = message.get_content()
        elif content_type == "text/plain":
            text_body = message.get_content()

    return InboundEmailContent(
        sender_email=_first_text(message.get("From")),
        recipient_email=_first_text(message.get("To")),
        subject=_first_text(message.get("Subject")),
        provider_message_id=_first_text(message.get("Message-ID")),
        html_body=html_body,
        text_body=text_body,
    )

