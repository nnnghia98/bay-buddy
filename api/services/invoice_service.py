"""
services/invoice_service.py – invoice numbering, snapshots, printable views, and status logic.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from models.customer import Customer
from models.enums import InvoiceStatus, QuoteStatus, TransactionCategory
from models.invoice import (
    Invoice,
    InvoiceCreate,
    InvoiceDetail,
    InvoiceListFilters,
    InvoiceListItem,
    InvoicePublicBrand,
    InvoicePublicView,
    InvoiceRead,
    InvoiceUpdate,
)
from models.invoice_item import InvoiceItem, InvoiceItemRead
from models.quote import Quote, QuoteConvertResponse, QuoteRead
from models.quote_item import QuoteItem
from models.ticket import Ticket
from models.transaction import Transaction
from services.system_settings_service import (
    apply_app_base_datetime,
    ensure_datetime_is_active,
)


def _normalize_money(value: float) -> float:
    return round(float(value), 2)


def _read_triplet(number: int) -> str:
    digits = ["khong", "mot", "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin"]
    hundreds = number // 100
    tens = (number % 100) // 10
    ones = number % 10
    words: list[str] = []

    if hundreds > 0:
        words.extend([digits[hundreds], "tram"])

    if tens > 1:
        words.extend([digits[tens], "muoi"])
        if ones == 1:
            words.append("mot")
        elif ones == 5:
            words.append("lam")
        elif ones > 0:
            words.append(digits[ones])
    elif tens == 1:
        words.append("muoi")
        if ones == 5:
            words.append("lam")
        elif ones > 0:
            words.append(digits[ones])
    elif ones > 0:
        if hundreds > 0:
            words.append("le")
        words.append(digits[ones] if ones != 5 or hundreds == 0 else "nam")

    return " ".join(words).strip()


def convert_vnd_to_words(amount: float) -> str:
    """Convert a VND amount into Vietnamese words for printable payloads."""

    integer_amount = int(round(amount))
    if integer_amount == 0:
        return "Không đồng chẵn"

    units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]
    chunks: list[str] = []
    remaining = integer_amount
    unit_index = 0

    while remaining > 0:
        chunk = remaining % 1000
        if chunk:
            chunk_words = _read_triplet(chunk)
            unit = units[unit_index] if unit_index < len(units) else ""
            chunks.append(" ".join(part for part in (chunk_words, unit) if part))
        remaining //= 1000
        unit_index += 1

    sentence = " ".join(reversed(chunks)).strip()
    replacements = {
        "khong": "không",
        "mot": "một",
        "hai": "hai",
        "ba": "ba",
        "bon": "bốn",
        "nam": "năm",
        "lam": "lăm",
        "sau": "sáu",
        "bay": "bảy",
        "tam": "tám",
        "chin": "chín",
        "tram": "trăm",
        "muoi": "mươi",
        "le": "lẻ",
    }
    for source, target in replacements.items():
        sentence = sentence.replace(source, target)

    return f"{sentence[:1].upper()}{sentence[1:]} đồng chẵn"


def convert_number_to_vn_words(amount: float) -> str:
    return convert_vnd_to_words(amount)


def generate_invoice_number(*, session: Session, reference_time: datetime | None = None) -> str:
    reference_time = reference_time or datetime.now(timezone.utc)
    month_prefix = reference_time.strftime("BB-%Y%m-")
    existing_numbers = session.exec(
        select(Invoice.invoice_number).where(Invoice.invoice_number.like(f"{month_prefix}%"))
    ).all()
    next_sequence = 1
    if existing_numbers:
        suffixes = []
        for invoice_number in existing_numbers:
            try:
                suffixes.append(int(invoice_number.rsplit("-", 1)[1]))
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


def _get_invoice_or_404(*, session: Session, invoice_id: uuid.UUID) -> Invoice:
    invoice = session.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


def _get_quote_or_404(*, session: Session, quote_id: uuid.UUID) -> Quote:
    quote = session.get(Quote, quote_id)
    if quote is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    return quote


def _get_tickets_by_ids(
    *,
    session: Session,
    customer_id: uuid.UUID,
    ticket_ids: list[uuid.UUID],
) -> list[Ticket]:
    tickets = session.exec(select(Ticket).where(Ticket.id.in_(ticket_ids))).all()
    if len(tickets) != len(ticket_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more selected tickets were not found.",
        )
    if any(ticket.customer_id != customer_id for ticket in tickets):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected tickets must belong to the same customer.",
        )
    for ticket in tickets:
        ensure_datetime_is_active(
            session=session,
            value=ticket.updated_at,
            detail="Selected ticket was last updated before the app base date time.",
        )
    return tickets


def _get_ticket_purchase_transaction(*, session: Session, ticket_id: uuid.UUID) -> Transaction | None:
    return session.exec(
        select(Transaction).where(
            Transaction.linked_ticket_id == ticket_id,
            Transaction.category == TransactionCategory.TICKET_PURCHASE,
        )
    ).first()


def _build_ticket_description(ticket: Ticket) -> str:
    route = ticket.itinerary.replace("-", "/") if ticket.itinerary else "No route"
    return f"Flight PNR: {ticket.pnr} - {route}"


def _build_passenger_snapshot(ticket: Ticket) -> str:
    passenger_names = [passenger.strip() for passenger in ticket.passengers if passenger.strip()]
    return ", ".join(passenger_names) or ticket.pnr


def _build_invoice_item_for_ticket(ticket: Ticket, invoice_id: uuid.UUID) -> InvoiceItem:
    unit_price = _normalize_money(ticket.selling_price)
    return InvoiceItem(
        invoice_id=invoice_id,
        description=_build_ticket_description(ticket),
        quantity=1,
        unit_price=unit_price,
        unit_price_snapshot=unit_price,
        passenger_name_snapshot=_build_passenger_snapshot(ticket),
        total=unit_price,
        linked_ticket_id=ticket.id,
    )


def _calculate_total_amount(*, subtotal: float, tax_amount: float, discount_amount: float) -> float:
    return _normalize_money(max(0, subtotal + tax_amount - discount_amount))


def _ensure_invoice_is_mutable(invoice: Invoice) -> None:
    if invoice.status in {InvoiceStatus.ISSUED, InvoiceStatus.PAID}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Issued or paid invoices are read-only.",
        )


def create_invoice(*, session: Session, payload: InvoiceCreate) -> InvoiceRead:
    """Create a draft invoice with immutable customer and ticket snapshots."""

    customer = _get_customer_or_404(session=session, customer_id=payload.customer_id)
    selected_ticket_ids = list(dict.fromkeys(payload.ticket_ids))
    if not selected_ticket_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one ticket must be selected.",
        )

    tickets = _get_tickets_by_ids(
        session=session,
        customer_id=payload.customer_id,
        ticket_ids=selected_ticket_ids,
    )

    invoice_id = uuid.uuid4()
    invoice = Invoice(
        id=invoice_id,
        invoice_number=generate_invoice_number(session=session),
        customer_id=payload.customer_id,
        customer_name_snapshot=customer.name,
        customer_address_snapshot=customer.address,
        customer_tax_code_snapshot=customer.tax_code,
        total_amount=0,
        tax_amount=_normalize_money(payload.tax_amount),
        discount_amount=_normalize_money(payload.discount_amount),
        status=InvoiceStatus.DRAFT,
        note=(payload.note or "").strip() or None,
    )

    items: list[InvoiceItem] = []
    linked_transactions: list[Transaction] = []

    for ticket in tickets:
        items.append(_build_invoice_item_for_ticket(ticket, invoice_id))
        purchase_transaction = _get_ticket_purchase_transaction(session=session, ticket_id=ticket.id)
        if purchase_transaction is not None:
            if purchase_transaction.is_invoiced or purchase_transaction.invoice_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ticket {ticket.pnr} is already tied to another invoice.",
                )
            linked_transactions.append(purchase_transaction)

    invoice.total_amount = _calculate_total_amount(
        subtotal=sum(item.total for item in items),
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
    )

    try:
        session.add(invoice)
        for item in items:
            session.add(item)
        for transaction in linked_transactions:
            transaction.invoice_id = invoice_id
            session.add(transaction)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(invoice)
    return InvoiceRead.model_validate(invoice)


def list_invoices(*, session: Session, filters: InvoiceListFilters) -> list[InvoiceListItem]:
    _get_customer_or_404(session=session, customer_id=filters.customer_id)

    statement = select(Invoice).where(Invoice.customer_id == filters.customer_id)
    if filters.status is not None:
        statement = statement.where(Invoice.status == filters.status)
    if filters.date_from is not None:
        statement = statement.where(Invoice.created_at >= filters.date_from)
    if filters.date_to is not None:
        statement = statement.where(Invoice.created_at <= filters.date_to)
    statement = apply_app_base_datetime(
        session=session,
        statement=statement,
        column=Invoice.created_at,
    )

    invoices = session.exec(
        statement.order_by(Invoice.created_at.desc(), Invoice.invoice_number.desc())
    ).all()

    return [
        InvoiceListItem(
            **InvoiceRead.model_validate(invoice).model_dump(),
            amount_in_words=convert_vnd_to_words(invoice.total_amount),
        )
        for invoice in invoices
    ]


def _get_invoice_items(*, session: Session, invoice_id: uuid.UUID) -> list[InvoiceItem]:
    return session.exec(
        select(InvoiceItem)
        .where(InvoiceItem.invoice_id == invoice_id)
        .order_by(InvoiceItem.id)
    ).all()


def get_invoice_detail(*, session: Session, invoice_id: uuid.UUID) -> InvoiceDetail:
    invoice = _get_invoice_or_404(session=session, invoice_id=invoice_id)
    items = _get_invoice_items(session=session, invoice_id=invoice_id)
    return InvoiceDetail(
        **InvoiceRead.model_validate(invoice).model_dump(),
        items=[InvoiceItemRead.model_validate(item) for item in items],
        amount_in_words=convert_vnd_to_words(invoice.total_amount),
    )


def get_invoice_public_view(*, session: Session, invoice_id: uuid.UUID) -> InvoicePublicView:
    invoice = _get_invoice_or_404(session=session, invoice_id=invoice_id)
    items = _get_invoice_items(session=session, invoice_id=invoice_id)
    return InvoicePublicView(
        brand=InvoicePublicBrand(
            company_name="Bay Buddy",
            slogan="Flight & Debt Management for Vietnam",
            support_email="support@baybuddy.vn",
            hotline="1900 6868",
        ),
        invoice=InvoiceRead.model_validate(invoice),
        items=[InvoiceItemRead.model_validate(item) for item in items],
        amount_in_words=convert_vnd_to_words(invoice.total_amount),
    )


def update_invoice(*, session: Session, invoice_id: uuid.UUID, payload: InvoiceUpdate) -> InvoiceDetail:
    invoice = _get_invoice_or_404(session=session, invoice_id=invoice_id)
    _ensure_invoice_is_mutable(invoice)

    items = _get_invoice_items(session=session, invoice_id=invoice_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "tax_amount" in update_data:
        invoice.tax_amount = _normalize_money(update_data["tax_amount"])
    if "discount_amount" in update_data:
        invoice.discount_amount = _normalize_money(update_data["discount_amount"])
    if "note" in update_data:
        invoice.note = (update_data["note"] or "").strip() or None

    invoice.total_amount = _calculate_total_amount(
        subtotal=sum(item.total for item in items),
        tax_amount=invoice.tax_amount,
        discount_amount=invoice.discount_amount,
    )

    try:
        session.add(invoice)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(invoice)
    return get_invoice_detail(session=session, invoice_id=invoice_id)


def update_invoice_status(*, session: Session, invoice_id: uuid.UUID, next_status: InvoiceStatus) -> InvoiceDetail:
    invoice = _get_invoice_or_404(session=session, invoice_id=invoice_id)
    linked_transactions = session.exec(
        select(Transaction).where(Transaction.invoice_id == invoice_id)
    ).all()

    allowed_transitions = {
        InvoiceStatus.DRAFT: {InvoiceStatus.ISSUED},
        InvoiceStatus.ISSUED: {InvoiceStatus.PAID, InvoiceStatus.CANCELLED},
        InvoiceStatus.PAID: set(),
        InvoiceStatus.CANCELLED: set(),
    }
    if next_status not in allowed_transitions[invoice.status]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid invoice status transition from {invoice.status} to {next_status}.",
        )

    if next_status == InvoiceStatus.ISSUED:
        invoice.issued_at = invoice.issued_at or datetime.now(timezone.utc)
        for transaction in linked_transactions:
            transaction.invoice_id = invoice_id
            transaction.is_invoiced = True
            session.add(transaction)

    if next_status == InvoiceStatus.CANCELLED:
        for transaction in linked_transactions:
            transaction.is_invoiced = False
            transaction.invoice_id = None
            session.add(transaction)

    invoice.status = next_status

    try:
        session.add(invoice)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(invoice)
    return get_invoice_detail(session=session, invoice_id=invoice.id)


def convert_quote_to_invoice(*, session: Session, quote_id: uuid.UUID) -> QuoteConvertResponse:
    """Accept a quote and convert its immutable snapshots into an invoice."""

    quote = _get_quote_or_404(session=session, quote_id=quote_id)
    if quote.status != QuoteStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft quotes can be converted to invoices.",
        )

    quote_items = session.exec(
        select(QuoteItem).where(QuoteItem.quote_id == quote_id).order_by(QuoteItem.id)
    ).all()
    if not quote_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quote has no items to convert.",
        )

    invoice_id = uuid.uuid4()
    invoice = Invoice(
        id=invoice_id,
        invoice_number=generate_invoice_number(session=session),
        customer_id=quote.customer_id,
        customer_name_snapshot=quote.customer_name_snapshot,
        customer_address_snapshot=quote.customer_address_snapshot,
        customer_tax_code_snapshot=quote.customer_tax_code_snapshot,
        total_amount=quote.total_amount,
        tax_amount=quote.tax_amount,
        discount_amount=quote.discount_amount,
        status=InvoiceStatus.DRAFT,
        note=quote.note,
    )

    invoice_items = [
        InvoiceItem(
            invoice_id=invoice_id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            unit_price_snapshot=item.unit_price_snapshot,
            passenger_name_snapshot=item.passenger_name_snapshot,
            total=item.total,
            linked_ticket_id=item.linked_ticket_id,
        )
        for item in quote_items
    ]

    linked_transactions: list[Transaction] = []
    for item in quote_items:
        if item.linked_ticket_id is None:
            continue
        transaction = _get_ticket_purchase_transaction(session=session, ticket_id=item.linked_ticket_id)
        if transaction is None:
            continue
        if transaction.is_invoiced or transaction.invoice_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="One or more quote items are already tied to another invoice.",
            )
        linked_transactions.append(transaction)

    quote.status = QuoteStatus.ACCEPTED

    try:
        session.add(invoice)
        for item in invoice_items:
            session.add(item)
        for transaction in linked_transactions:
            transaction.invoice_id = invoice_id
            session.add(transaction)
        session.add(quote)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(invoice)
    session.refresh(quote)
    return QuoteConvertResponse(
        quote=QuoteRead.model_validate(quote),
        invoice=InvoiceRead.model_validate(invoice),
    )
