"""
Deterministic redaction helpers for customer-safe airline ticket documents.

The first supported template is Jetstar's table-heavy itinerary email. The
payment block is removed only when payment wording and a currency amount appear
together, so fare-class labels such as "Giá vé: Vé Tiết kiệm" remain intact.
Barcode, QR, and image blocks are preserved even when they sit next to payment
copy in the same table container.
"""

from __future__ import annotations

import html
import re
from typing import Any


PAYMENT_AMOUNT_RE = re.compile(
    r"thanh\s*to[aá]n\s+c(?:ủ|u)a\s+[\d.,\s]+(?:vnd|₫)",
    re.IGNORECASE,
)
PAYMENT_RECEIVED_RE = re.compile(
    r"(?:đ|d)[aã]\s+nh(?:ậ|a)n\s+(?:đ|d)(?:ư|u)(?:ợ|o)c",
    re.IGNORECASE,
)
FARE_CLASS_RE = re.compile(r"gi[aá]\s+v[eé]\s*:\s*v[eé]", re.IGNORECASE)
TAG_RE = re.compile(r"<[^>]+>")
VISUAL_CODE_RE = re.compile(
    r"<(?:img|svg|canvas)\b|(?:bar\s*code|barcode|qr\s*code|qrcode|m[aã]\s+v[aạ]ch)",
    re.IGNORECASE,
)
UNSAFE_TAG_RE = re.compile(
    r"<(script|iframe|object|embed|form|input|button|textarea|select)\b.*?</\1>|"
    r"<(script|iframe|object|embed|form|input|button|textarea|select)\b[^>]*?/?>",
    re.IGNORECASE | re.DOTALL,
)
EVENT_HANDLER_ATTR_RE = re.compile(r"\s+on[a-z]+\s*=\s*(['\"]).*?\1", re.IGNORECASE | re.DOTALL)
JAVASCRIPT_HREF_RE = re.compile(
    r"\s+href\s*=\s*(['\"])\s*javascript:.*?\1",
    re.IGNORECASE | re.DOTALL,
)


def _visible_text(value: str) -> str:
    text = TAG_RE.sub(" ", value)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _contains_payment_block(value: str) -> bool:
    text = _visible_text(value).casefold()
    return bool(PAYMENT_AMOUNT_RE.search(text) and PAYMENT_RECEIVED_RE.search(text))


def _sanitize_html_for_preview(value: str) -> str:
    sanitized = UNSAFE_TAG_RE.sub("", value)
    sanitized = EVENT_HANDLER_ATTR_RE.sub("", sanitized)
    sanitized = JAVASCRIPT_HREF_RE.sub("", sanitized)
    return sanitized


def _contains_visual_code_block(value: str) -> bool:
    return bool(VISUAL_CODE_RE.search(value))


def _replacement_for_tag(tag: str, attributes: str) -> str:
    if tag == "tr":
        return ""
    if tag in {"td", "th"}:
        return f"<{tag}{attributes}></{tag}>"
    return ""


def _replace_matching_tag_blocks(value: str, tag: str) -> tuple[str, int]:
    pattern = re.compile(
        rf"<{tag}\b([^>]*)>.*?</{tag}>",
        re.IGNORECASE | re.DOTALL,
    )
    replacements = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal replacements
        block = match.group(0)
        if not _contains_payment_block(block):
            return block
        if tag.lower() in {"td", "th", "tr"} and _contains_visual_code_block(block):
            return block
        replacements += 1
        return _replacement_for_tag(tag.lower(), match.group(1))

    return pattern.sub(replace, value), replacements


def redact_ticket_html(raw_html: str) -> tuple[str, dict[str, Any]]:
    """Remove the smallest obvious payment block from airline itinerary HTML."""

    redacted = raw_html
    removed_blocks = 0

    for tag in ("h1", "h2", "h3", "h4", "h5", "h6", "p", "td", "th", "tr"):
        redacted, count = _replace_matching_tag_blocks(redacted, tag)
        removed_blocks += count
        if removed_blocks:
            break

    if not removed_blocks and _contains_payment_block(redacted):
        redacted = PAYMENT_AMOUNT_RE.sub("", redacted)
        redacted = PAYMENT_RECEIVED_RE.sub("", redacted)
        removed_blocks = 1

    redacted = _sanitize_html_for_preview(redacted)
    visible_after = _visible_text(redacted)
    return redacted, {
        "strategy": "html_payment_removal",
        "removed_payment_blocks": removed_blocks,
        "payment_amount_present": bool(PAYMENT_AMOUNT_RE.search(visible_after.casefold())),
        "fare_class_labels_preserved": bool(FARE_CLASS_RE.search(visible_after.casefold())),
    }


def redact_ticket_text(raw_text: str) -> tuple[str, dict[str, Any]]:
    """Remove payment lines from plain-text itinerary content."""

    lines = raw_text.splitlines()
    output: list[str] = []
    removed_lines = 0
    skipping = False

    for line in lines:
        normalized = line.casefold()
        starts_payment = bool(PAYMENT_AMOUNT_RE.search(normalized))
        ends_payment = bool(PAYMENT_RECEIVED_RE.search(normalized))

        if starts_payment:
            skipping = True
            removed_lines += 1
            if ends_payment:
                skipping = False
            continue

        if skipping:
            removed_lines += 1
            if ends_payment:
                skipping = False
            continue

        output.append(line)

    redacted = "\n".join(output)
    return redacted, {
        "strategy": "text_payment_lines",
        "removed_payment_lines": removed_lines,
        "payment_amount_present": bool(PAYMENT_AMOUNT_RE.search(redacted.casefold())),
        "fare_class_labels_preserved": bool(FARE_CLASS_RE.search(redacted.casefold())),
    }
