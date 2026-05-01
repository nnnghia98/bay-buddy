"""
services/quote_service.py – informational quote creation and retrieval.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from models.customer import Customer
from models.quote import Quote, QuoteCreate, QuoteDetail, QuoteRead
from models.quote_item import QuoteItem, QuoteItemRead
from models.ticket import Ticket
from services.invoice_service import (
    _build_passenger_snapshot,
    _build_ticket_description,
    _calculate_total_amount,
    _get_tickets_by_ids,
    _normalize_money,
    convert_vnd_to_words,
)


def generate_quote_number(*, session: Session, reference_time=None) -> str:
    from datetime import datetime, timezone

    reference_time = reference_time or datetime.now(timezone.utc)
    month_prefix = reference_time.strftime("BQ-%Y%m-")
    existing_numbers = session.exec(
        select(Quote.quote_number).where(Quote.quote_number.like(f"{month_prefix}%"))
    ).all()
    next_sequence = 1
    if existing_numbers:
        suffixes = []
        for quote_number in existing_numbers:
            try:
                suffixes.append(int(quote_number.rsplit("-", 1)[1]))
            except (IndexError, ValueError):
                continue
        if suffixes:
            next_sequence = max(suffixes) + 1
    return f"{month_prefix}{next_sequence:04d}"


def _get_customer_or_404(*, session: Session, customer_id: uuid.UUID) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def create_quote(*, session: Session, payload: QuoteCreate) -> QuoteRead:
    """Create an informational quote without affecting the ledger."""

    customer = _get_customer_or_404(session=session, customer_id=payload.customer_id)
    ticket_ids = list(dict.fromkeys(payload.ticket_ids))
    if not ticket_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one ticket must be selected.",
        )

    tickets = _get_tickets_by_ids(
        session=session,
        customer_id=payload.customer_id,
        ticket_ids=ticket_ids,
    )

    quote_id = uuid.uuid4()
    quote = Quote(
        id=quote_id,
        quote_number=generate_quote_number(session=session),
        customer_id=payload.customer_id,
        customer_name_snapshot=customer.name,
        customer_address_snapshot=customer.address,
        customer_tax_code_snapshot=customer.tax_code,
        total_amount=0,
        tax_amount=_normalize_money(payload.tax_amount),
        discount_amount=_normalize_money(payload.discount_amount),
        valid_until=payload.valid_until,
        note=(payload.note or "").strip() or None,
    )

    items = [
        QuoteItem(
            quote_id=quote_id,
            description=_build_ticket_description(ticket),
            quantity=1,
            unit_price=_normalize_money(ticket.selling_price),
            unit_price_snapshot=_normalize_money(ticket.selling_price),
            passenger_name_snapshot=_build_passenger_snapshot(ticket),
            total=_normalize_money(ticket.selling_price),
            linked_ticket_id=ticket.id,
        )
        for ticket in tickets
    ]
    quote.total_amount = _calculate_total_amount(
        subtotal=sum(item.total for item in items),
        tax_amount=quote.tax_amount,
        discount_amount=quote.discount_amount,
    )

    try:
        session.add(quote)
        for item in items:
            session.add(item)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(quote)
    return QuoteRead.model_validate(quote)


def get_quote_detail(*, session: Session, quote_id: uuid.UUID) -> QuoteDetail:
    quote = session.get(Quote, quote_id)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote_id).order_by(QuoteItem.id)
    ).all()
    return QuoteDetail(
        **QuoteRead.model_validate(quote).model_dump(),
        items=[QuoteItemRead.model_validate(item) for item in items],
        amount_in_words=convert_vnd_to_words(quote.total_amount),
    )
