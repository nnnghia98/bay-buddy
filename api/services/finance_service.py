"""
services/finance_service.py – Customer ledger and payment recording logic.

Business rules reference: docs/BUSINESS.md
  - Current Balance = Total Debt + Fees - Payments - Discounts
  - PAYMENT / DISCOUNT reduce customer.balance
  - TICKET_PURCHASE / ADDITIONAL_FEE / REFUND increase customer.balance
  - Ledger history uses audit timestamps, not scheduled flight datetime
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func
from sqlmodel import Session, select

from core.pagination import build_pagination, normalize_page, normalize_page_size
from models.customer import Customer, CustomerRead
from models.enums import (
    Airline,
    TransactionCategory,
    TicketStatus,
    TransactionType,
    get_expected_transaction_type,
    get_transaction_balance_delta,
    is_cash_transaction_category,
)
from models.ticket import Ticket, TicketRead
from models.transaction import Transaction, TransactionRead, TransactionUpdate
from services.system_settings_service import (
    apply_app_base_datetime,
    ensure_datetime_is_active,
    get_app_base_datetime,
)

TicketDebtDateBasis = Literal["updated_at", "booked_at"]
TicketDebtPaymentMethod = Literal[
    "none",
    "Chuyển khoản",
    "Tiền mặt",
    "AST",
    "THF",
]
TicketDebtMoneyFilter = Literal["zero", "positive"]

_VIETNAM_TIMEZONE = timezone(timedelta(hours=7))


class LedgerEntry(BaseModel):
    """A table-ready customer ledger row ordered by business event time."""

    id: uuid.UUID
    entry_type: Literal["ticket", "payment", "adjustment"]
    created_at: datetime
    content: str
    amount: float
    running_balance: float
    ticket: Optional["TicketRead"] = None
    transaction: Optional[TransactionRead] = None


class CustomerLedgerResponse(BaseModel):
    """Ledger payload returned by GET /customers/{id}/ledger."""

    customer: CustomerRead
    current_balance: float
    balance_state: Literal["debt", "settled", "credit"]
    entries: list[LedgerEntry]


def _normalize_ledger_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


class TicketDebtReportRow(BaseModel):
    """One confirmed ticket debt row for global operational tables."""

    id: uuid.UUID
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: Optional[str] = None
    passenger_names: str
    entry_type: Literal["ticket"] = "ticket"
    issued_at: datetime
    created_at: datetime
    updated_at: datetime
    booked_at: Optional[datetime] = None
    content: str
    amount: float
    running_balance: float
    ticket_id: uuid.UUID
    pnr: Optional[str] = None
    ticket_number: Optional[str] = None
    ticket_net_price: float
    ticket_selling_price: float
    ticket_discount: float
    ticket_ev_price: float
    ticket_ast_price: float
    ticket_thf_price: float
    ticket_web_price: float
    ticket_insurance_price: float
    ticket_true_income: float
    airline: Optional[Airline] = None
    route: Optional[str] = None
    itinerary: Optional[str] = None
    linked_payment_occurred_at: Optional[datetime] = None
    flight_date: Optional[datetime] = None
    ticket_status: Optional[TicketStatus] = None
    transaction_id: Optional[uuid.UUID] = None
    transaction_category: Optional[TransactionCategory] = None
    transaction_method: Optional[str] = None
    evidence_url: Optional[str] = None
    linked_payment_amount: Optional[float] = None
    linked_payment_note: Optional[str] = None
    linked_payment_methods: list[str] = Field(default_factory=list)
    linked_payment_transaction_ids: list[uuid.UUID] = Field(default_factory=list)


@dataclass(frozen=True)
class _LedgerEvent:
    """Internal event used to calculate a customer's running balance."""

    customer_id: uuid.UUID
    created_at: datetime
    priority: int
    id: uuid.UUID
    amount: float
    ticket: Optional[Ticket] = None


@dataclass
class _LinkedPaymentSummary:
    amount: float = 0.0
    notes: list[str] | None = None
    methods: list[str] | None = None
    transaction_ids: list[uuid.UUID] | None = None
    occurred_ats: list[datetime] | None = None

    def __post_init__(self) -> None:
        self.notes = self.notes or []
        self.methods = self.methods or []
        self.transaction_ids = self.transaction_ids or []
        self.occurred_ats = self.occurred_ats or []


def _ticket_route(ticket: Ticket) -> Optional[str]:
    if ticket.departure_code and ticket.arrival_code:
        return f"{ticket.departure_code}-{ticket.arrival_code}"
    return ticket.itinerary


def _manual_ticket_note(value: Optional[str]) -> Optional[str]:
    note = (value or "").strip()
    if not note or note.startswith("Auto-debt for ticket "):
        return None
    return note


def _ticket_debt_sort_key(
    row: TicketDebtReportRow,
    date_basis: TicketDebtDateBasis,
) -> tuple[bool, datetime, str]:
    """Sort reports by issue date while keeping workbench creation order."""

    value = row.booked_at if date_basis == "booked_at" else row.created_at
    return value is not None, value or datetime.min, str(row.id)


def list_ticket_debt_rows(
    *,
    session: Session,
    ticket_ids: set[uuid.UUID] | None = None,
    date_basis: TicketDebtDateBasis = "updated_at",
) -> list[TicketDebtReportRow]:
    """Return every active confirmed ticket as one global debt row.

    This intentionally uses bulk queries instead of loading one ledger per
    customer. Ticket rows remain visible even when a customer has many tickets
    or the customer directory contains more than the UI page size.
    """

    ticket_statement = select(Ticket).where(Ticket.status == TicketStatus.CONFIRMED)
    if ticket_ids is not None:
        if not ticket_ids:
            return []
        ticket_statement = ticket_statement.where(Ticket.id.in_(ticket_ids))
    ticket_date_column = (
        Ticket.booked_at if date_basis == "booked_at" else Ticket.updated_at
    )
    ticket_statement = apply_app_base_datetime(
        session=session,
        statement=ticket_statement,
        column=ticket_date_column,
    )
    tickets = session.exec(
        ticket_statement.order_by(Ticket.updated_at, Ticket.id)
    ).all()

    if not tickets:
        return []

    visible_ticket_ids = {ticket.id for ticket in tickets if ticket.id is not None}
    customer_ids = {ticket.customer_id for ticket in tickets}

    all_tickets = tickets
    if ticket_ids is not None:
        all_ticket_statement = select(Ticket).where(
            Ticket.status == TicketStatus.CONFIRMED,
            Ticket.customer_id.in_(customer_ids),
        )
        all_ticket_statement = apply_app_base_datetime(
            session=session,
            statement=all_ticket_statement,
            column=ticket_date_column,
        )
        all_tickets = session.exec(
            all_ticket_statement.order_by(Ticket.updated_at, Ticket.id)
        ).all()

    customers = session.exec(
        select(Customer).where(Customer.id.in_(customer_ids))
    ).all()
    customers_by_id = {customer.id: customer for customer in customers}

    transaction_statement = select(Transaction).where(
        Transaction.customer_id.in_(customer_ids),
    )
    transaction_statement = apply_app_base_datetime(
        session=session,
        statement=transaction_statement,
        column=Transaction.created_at,
    )
    transactions = session.exec(
        transaction_statement.order_by(Transaction.created_at, Transaction.id)
    ).all()

    ticket_by_id = {ticket.id: ticket for ticket in all_tickets}
    ticket_charges: dict[uuid.UUID, Transaction] = {}
    linked_payment_summaries: dict[uuid.UUID, _LinkedPaymentSummary] = {}
    events_by_customer: dict[uuid.UUID, list[_LedgerEvent]] = defaultdict(list)

    for transaction in transactions:
        if (
            transaction.category == TransactionCategory.TICKET_PURCHASE
            and transaction.linked_ticket_id is not None
        ):
            ticket_charges[transaction.linked_ticket_id] = transaction
            continue

        transaction_id = transaction.id
        if transaction_id is None:
            continue

        events_by_customer[transaction.customer_id].append(
            _LedgerEvent(
                customer_id=transaction.customer_id,
                created_at=_normalize_ledger_datetime(transaction.created_at),
                priority=1,
                id=transaction_id,
                amount=get_transaction_balance_delta(
                    amount=transaction.amount,
                    transaction_category=transaction.category,
                    transaction_type=transaction.type,
                    linked_ticket_id=transaction.linked_ticket_id,
                ),
            )
        )

        if (
            transaction.category == TransactionCategory.PAYMENT
            and transaction.linked_ticket_id in ticket_by_id
        ):
            linked_ticket_id = transaction.linked_ticket_id
            if linked_ticket_id is None:
                continue
            summary = linked_payment_summaries.setdefault(
                linked_ticket_id,
                _LinkedPaymentSummary(),
            )
            summary.amount += transaction.amount
            note = (transaction.note or "").strip()
            method = (transaction.method or "").strip()
            if note and note not in summary.notes:
                summary.notes.append(note)
            if method and method not in summary.methods:
                summary.methods.append(method)
            summary.transaction_ids.append(transaction_id)
            summary.occurred_ats.append(
                _normalize_ledger_datetime(transaction.occurred_at)
            )

    for ticket in all_tickets:
        ticket_id = ticket.id
        if ticket_id is None:
            continue
        events_by_customer[ticket.customer_id].append(
            _LedgerEvent(
                customer_id=ticket.customer_id,
                created_at=_normalize_ledger_datetime(ticket.updated_at),
                priority=0,
                id=ticket_id,
                amount=ticket.selling_price,
                ticket=ticket,
            )
        )

    rows: list[TicketDebtReportRow] = []
    for customer_id, events in events_by_customer.items():
        customer = customers_by_id.get(customer_id)
        if customer is None:
            continue

        events.sort(key=lambda event: (event.created_at, event.priority, str(event.id)))
        running_balance = 0.0

        for event in events:
            running_balance += event.amount
            ticket = event.ticket
            if (
                ticket is None
                or ticket.id is None
                or ticket.id not in visible_ticket_ids
            ):
                continue

            charge = ticket_charges.get(ticket.id)
            payment_summary = linked_payment_summaries.get(ticket.id)
            created_at = _normalize_ledger_datetime(ticket.created_at)
            updated_at = _normalize_ledger_datetime(ticket.updated_at)
            linked_payment_note = (
                "; ".join(payment_summary.notes)
                if payment_summary and payment_summary.notes
                else _manual_ticket_note(charge.note if charge else None)
            )

            rows.append(
                TicketDebtReportRow(
                    id=ticket.id,
                    customer_id=customer_id,
                    customer_name=customer.name,
                    customer_phone=customer.phone,
                    passenger_names=", ".join(ticket.passengers),
                    issued_at=created_at,
                    created_at=created_at,
                    updated_at=updated_at,
                    booked_at=(
                        _normalize_ledger_datetime(ticket.booked_at)
                        if ticket.booked_at
                        else None
                    ),
                    content=ticket.pnr or str(ticket.id),
                    amount=ticket.selling_price,
                    running_balance=running_balance,
                    ticket_id=ticket.id,
                    pnr=ticket.pnr,
                    ticket_number=ticket.ticket_number,
                    ticket_net_price=ticket.net_price,
                    ticket_selling_price=ticket.selling_price,
                    ticket_discount=ticket.discount,
                    ticket_ev_price=ticket.ev_price,
                    ticket_ast_price=ticket.ast_price,
                    ticket_thf_price=ticket.thf_price,
                    ticket_web_price=ticket.web_price,
                    ticket_insurance_price=ticket.insurance_price,
                    ticket_true_income=ticket.true_income,
                    airline=ticket.airline,
                    route=_ticket_route(ticket),
                    itinerary=ticket.itinerary,
                    linked_payment_occurred_at=(
                        payment_summary.occurred_ats[0]
                        if payment_summary
                        and len(payment_summary.occurred_ats) == 1
                        else (
                            _normalize_ledger_datetime(
                                charge.payment_occurred_at
                            )
                            if payment_summary is None
                            and charge
                            and charge.payment_occurred_at
                            else None
                        )
                    ),
                    flight_date=_normalize_ledger_datetime(ticket.flight_date),
                    ticket_status=ticket.status,
                    transaction_id=charge.id if charge else None,
                    transaction_category=charge.category if charge else None,
                    transaction_method=charge.method if charge else None,
                    evidence_url=charge.evidence_url if charge else None,
                    linked_payment_amount=(
                        payment_summary.amount if payment_summary else None
                    ),
                    linked_payment_note=linked_payment_note,
                    linked_payment_methods=(
                        payment_summary.methods if payment_summary else []
                    ),
                    linked_payment_transaction_ids=(
                        payment_summary.transaction_ids if payment_summary else []
                    ),
                )
            )

    rows.sort(
        key=lambda row: _ticket_debt_sort_key(row, date_basis),
        reverse=True,
    )
    return rows


def _parse_report_datetime(
    value: str | None,
    *,
    boundary: Literal["start", "end"],
) -> datetime | None:
    """Parse a report date in the same Vietnam-time contract as the web UI."""

    if not value:
        return None

    date_only_match = value.strip().split("T", 1)[0]
    try:
        year, month, day = (int(part) for part in date_only_match.split("-"))
    except ValueError:
        return None

    try:
        if boundary == "start":
            return datetime(
                year,
                month,
                day,
                tzinfo=timezone.utc,
            ) - timedelta(hours=7)

        return datetime(
            year,
            month,
            day,
            23,
            59,
            59,
            999999,
            tzinfo=timezone.utc,
        ) - timedelta(hours=7)
    except ValueError:
        return None


def _vietnam_calendar_date(value: datetime) -> date:
    """Return a stored UTC timestamp's calendar date in Vietnam."""

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(_VIETNAM_TIMEZONE).date()


def _effective_ticket_debt_payment_methods(
    row: TicketDebtReportRow,
) -> tuple[str, ...]:
    """Return the payment method values shown to staff for a debt row."""

    if row.linked_payment_methods:
        return tuple(row.linked_payment_methods)
    if row.transaction_method:
        return (row.transaction_method,)
    return ()


def _matches_ticket_debt_money_filter(
    value: float,
    filter_value: TicketDebtMoneyFilter | None,
) -> bool:
    """Match the two user-facing money states."""

    if filter_value is None:
        return True
    if filter_value == "zero":
        return value == 0
    return value > 0


def _has_ticket_debt_structured_filters(
    *,
    booked_at: date | None,
    payment_method: TicketDebtPaymentMethod | None,
    ev_price: TicketDebtMoneyFilter | None,
    ast_price: TicketDebtMoneyFilter | None,
    thf_price: TicketDebtMoneyFilter | None,
    web_price: TicketDebtMoneyFilter | None,
    insurance_price: TicketDebtMoneyFilter | None,
    selling_price: TicketDebtMoneyFilter | None,
) -> bool:
    return any(
        value is not None
        for value in (
            booked_at,
            payment_method,
            ev_price,
            ast_price,
            thf_price,
            web_price,
            insurance_price,
            selling_price,
        )
    )


def _filter_ticket_debt_rows(
    rows: list[TicketDebtReportRow],
    *,
    query: str | None,
    from_value: str | None,
    to_value: str | None,
    date_basis: TicketDebtDateBasis = "updated_at",
    booked_at: date | None = None,
    payment_method: TicketDebtPaymentMethod | None = None,
    ev_price: TicketDebtMoneyFilter | None = None,
    ast_price: TicketDebtMoneyFilter | None = None,
    thf_price: TicketDebtMoneyFilter | None = None,
    web_price: TicketDebtMoneyFilter | None = None,
    insurance_price: TicketDebtMoneyFilter | None = None,
    selling_price: TicketDebtMoneyFilter | None = None,
) -> list[TicketDebtReportRow]:
    """Apply report filters to the already reconciled ticket rows."""

    normalized_query = (query or "").strip().casefold()
    from_datetime = _parse_report_datetime(from_value, boundary="start")
    to_datetime = _parse_report_datetime(to_value, boundary="end")

    def matches(row: TicketDebtReportRow) -> bool:
        row_datetime = (
            row.booked_at if date_basis == "booked_at" else row.updated_at
        )
        if row_datetime is None:
            if from_datetime or to_datetime:
                return False
        else:
            if row_datetime.tzinfo is None:
                row_datetime = row_datetime.replace(tzinfo=timezone.utc)

            if from_datetime and row_datetime < from_datetime:
                return False
            if to_datetime and row_datetime > to_datetime:
                return False

        if normalized_query:
            searchable_values = (
                row.customer_name,
                row.customer_phone,
                row.passenger_names,
                row.content,
                row.pnr,
                row.ticket_number,
                row.airline.value if row.airline else None,
                row.route,
                row.ticket_status.value if row.ticket_status else None,
                row.transaction_method,
                row.linked_payment_note,
                *(row.linked_payment_methods or []),
            )
            if normalized_query not in " ".join(
                value.casefold() for value in searchable_values if value
            ):
                return False

        if booked_at is not None:
            if (
                row.booked_at is None
                or _vietnam_calendar_date(row.booked_at) != booked_at
            ):
                return False

        effective_payment_methods = _effective_ticket_debt_payment_methods(row)
        if payment_method == "none":
            if effective_payment_methods:
                return False
        elif (
            payment_method is not None
            and payment_method not in effective_payment_methods
        ):
            return False

        return all(
            (
                _matches_ticket_debt_money_filter(row.ticket_ev_price, ev_price),
                _matches_ticket_debt_money_filter(row.ticket_ast_price, ast_price),
                _matches_ticket_debt_money_filter(row.ticket_thf_price, thf_price),
                _matches_ticket_debt_money_filter(row.ticket_web_price, web_price),
                _matches_ticket_debt_money_filter(
                    row.ticket_insurance_price,
                    insurance_price,
                ),
                _matches_ticket_debt_money_filter(
                    row.ticket_selling_price,
                    selling_price,
                ),
            )
        )

    return [row for row in rows if matches(row)]


def list_ticket_debt_export_rows(
    *,
    session: Session,
    query: str | None = None,
    from_value: str | None = None,
    to_value: str | None = None,
    date_basis: TicketDebtDateBasis = "updated_at",
    booked_at: date | None = None,
    payment_method: TicketDebtPaymentMethod | None = None,
    ev_price: TicketDebtMoneyFilter | None = None,
    ast_price: TicketDebtMoneyFilter | None = None,
    thf_price: TicketDebtMoneyFilter | None = None,
    web_price: TicketDebtMoneyFilter | None = None,
    insurance_price: TicketDebtMoneyFilter | None = None,
    selling_price: TicketDebtMoneyFilter | None = None,
) -> list[dict[str, object]]:
    """Return all filtered rows for an explicit report export request."""

    rows = _filter_ticket_debt_rows(
        list_ticket_debt_rows(session=session, date_basis=date_basis),
        query=query,
        from_value=from_value,
        to_value=to_value,
        date_basis=date_basis,
        booked_at=booked_at,
        payment_method=payment_method,
        ev_price=ev_price,
        ast_price=ast_price,
        thf_price=thf_price,
        web_price=web_price,
        insurance_price=insurance_price,
        selling_price=selling_price,
    )
    return [row.model_dump(mode="json") for row in rows]


def list_ticket_debt_page(
    *,
    session: Session,
    page: int | None = None,
    page_size: int | None = None,
    query: str | None = None,
    from_value: str | None = None,
    to_value: str | None = None,
    date_basis: TicketDebtDateBasis = "updated_at",
    booked_at: date | None = None,
    payment_method: TicketDebtPaymentMethod | None = None,
    ev_price: TicketDebtMoneyFilter | None = None,
    ast_price: TicketDebtMoneyFilter | None = None,
    thf_price: TicketDebtMoneyFilter | None = None,
    web_price: TicketDebtMoneyFilter | None = None,
    insurance_price: TicketDebtMoneyFilter | None = None,
    selling_price: TicketDebtMoneyFilter | None = None,
) -> dict[str, object]:
    """Return one filtered page and summary for a ticket debt view."""

    page_number = normalize_page(page)
    effective_page_size = normalize_page_size(page_size)

    if not (query or "").strip() and not _has_ticket_debt_structured_filters(
        booked_at=booked_at,
        payment_method=payment_method,
        ev_price=ev_price,
        ast_price=ast_price,
        thf_price=thf_price,
        web_price=web_price,
        insurance_price=insurance_price,
        selling_price=selling_price,
    ):
        from_datetime = _parse_report_datetime(from_value, boundary="start")
        to_datetime = _parse_report_datetime(to_value, boundary="end")
        ticket_filters = [Ticket.status == TicketStatus.CONFIRMED]
        date_column = (
            Ticket.booked_at if date_basis == "booked_at" else Ticket.updated_at
        )
        base_datetime = get_app_base_datetime(session=session)
        if base_datetime is not None:
            ticket_filters.append(date_column >= base_datetime)
        if from_datetime is not None:
            ticket_filters.append(
                date_column >= _normalize_ledger_datetime(from_datetime)
            )
        if to_datetime is not None:
            ticket_filters.append(
                date_column <= _normalize_ledger_datetime(to_datetime)
            )

        summary_statement = select(
            func.count(Ticket.id),
            func.count(func.distinct(Ticket.customer_id)),
            func.coalesce(func.sum(Ticket.selling_price), 0),
            func.coalesce(func.sum(Ticket.true_income), 0),
        ).where(*ticket_filters)
        total, customers, total_selling_price, total_income = session.exec(
            summary_statement
        ).one()

        start = (page_number - 1) * effective_page_size
        ticket_id_statement = select(Ticket.id).where(*ticket_filters)
        if date_basis == "booked_at":
            ticket_id_statement = ticket_id_statement.order_by(
                Ticket.booked_at.is_(None),
                Ticket.booked_at.desc(),
                Ticket.id.desc(),
            )
        else:
            ticket_id_statement = ticket_id_statement.order_by(
                Ticket.created_at.desc(),
                Ticket.id.desc(),
            )
        ticket_id_statement = ticket_id_statement.offset(start).limit(
            effective_page_size
        )
        selected_ticket_ids = {
            ticket_id
            for ticket_id in session.exec(ticket_id_statement).all()
            if ticket_id is not None
        }
        rows = list_ticket_debt_rows(
            session=session,
            ticket_ids=selected_ticket_ids,
            date_basis=date_basis,
        )
        total = int(total or 0)

        return {
            "items": [row.model_dump(mode="json") for row in rows],
            "pagination": build_pagination(
                page=page_number,
                page_size=effective_page_size,
                total=total,
            ),
            "summary": {
                "rows": total,
                "customers": int(customers or 0),
                "total_selling_price": float(total_selling_price or 0),
                "total_income": float(total_income or 0),
            },
        }

    rows = _filter_ticket_debt_rows(
        list_ticket_debt_rows(session=session, date_basis=date_basis),
        query=query,
        from_value=from_value,
        to_value=to_value,
        date_basis=date_basis,
        booked_at=booked_at,
        payment_method=payment_method,
        ev_price=ev_price,
        ast_price=ast_price,
        thf_price=thf_price,
        web_price=web_price,
        insurance_price=insurance_price,
        selling_price=selling_price,
    )
    start = (page_number - 1) * effective_page_size
    page_rows = rows[start : start + effective_page_size]
    total = len(rows)

    return {
        "items": [row.model_dump(mode="json") for row in page_rows],
        "pagination": build_pagination(
            page=page_number,
            page_size=effective_page_size,
            total=total,
        ),
        "summary": {
            "rows": total,
            "customers": len({row.customer_id for row in rows}),
            "total_selling_price": sum(row.ticket_selling_price for row in rows),
            "total_income": sum(row.ticket_true_income for row in rows),
        },
    }


class RecordPaymentPayload(BaseModel):
    """Payload accepted by POST /customers/{id}/payments."""

    amount: float = Field(gt=0, description="Payment amount in VND.")
    method: str = Field(
        min_length=1,
        max_length=100,
        description="Payment method label, e.g. Chuyển khoản or Tiền mặt.",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Required payment note or transfer reference.",
    )
    evidence_url: Optional[str] = Field(
        default=None,
        max_length=2048,
        description="Optional payment receipt / proof URL.",
    )
    linked_ticket_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Optional ticket UUID for specific reconciliation (đích danh).",
    )

    @model_validator(mode="after")
    def validate_payment_note(self) -> "RecordPaymentPayload":
        if not (self.note or "").strip():
            raise ValueError("Payment note is required.")
        return self


class RecordPaymentResponse(BaseModel):
    """Response returned after recording a customer payment."""

    customer: CustomerRead
    transaction: TransactionRead
    customer_new_balance: float
    balance_state: Literal["debt", "settled", "credit"]


def _get_customer_or_404(session: Session, customer_id: uuid.UUID) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return customer


def _validate_linked_ticket(
    *,
    session: Session,
    customer_id: uuid.UUID,
    linked_ticket_id: uuid.UUID,
) -> None:
    linked_ticket = session.get(Ticket, linked_ticket_id)
    if linked_ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked ticket not found",
        )

    if linked_ticket.customer_id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linked ticket does not belong to the customer",
        )


def _ensure_transaction_is_mutable(
    transaction: Transaction,
    *,
    allow_ticket_metadata_correction: bool = False,
) -> None:
    if transaction.is_invoiced or transaction.invoice_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transaction is locked by an issued invoice.",
        )
    if (
        transaction.category == TransactionCategory.TICKET_PURCHASE
        and transaction.linked_ticket_id is not None
        and not allow_ticket_metadata_correction
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Use the ticket correction endpoint for ticket purchase rows.",
        )


def get_balance_state(balance: float) -> Literal["debt", "settled", "credit"]:
    """Return a UI-friendly state for the current customer balance."""

    if balance > 0:
        return "debt"
    if balance < 0:
        return "credit"
    return "settled"


def get_customer_ledger(
    *,
    customer_id: uuid.UUID,
    session: Session,
) -> CustomerLedgerResponse:
    """Return the customer's tickets and transactions in chronological order."""
    customer = _get_customer_or_404(session, customer_id)

    ticket_statement = select(Ticket).where(
        Ticket.customer_id == customer_id,
        Ticket.status == TicketStatus.CONFIRMED,
    )
    ticket_statement = apply_app_base_datetime(
        session=session,
        statement=ticket_statement,
        column=Ticket.updated_at,
    )
    tickets = session.exec(ticket_statement.order_by(Ticket.id)).all()

    transaction_statement = select(Transaction).where(
        Transaction.customer_id == customer_id,
    )
    transaction_statement = apply_app_base_datetime(
        session=session,
        statement=transaction_statement,
        column=Transaction.created_at,
    )
    transactions = session.exec(
        transaction_statement.order_by(Transaction.created_at, Transaction.id)
    ).all()

    entries: list[LedgerEntry] = []
    ticket_charge_by_ticket_id: dict[uuid.UUID, Transaction] = {}

    for transaction in transactions:
        if (
            transaction.category == TransactionCategory.TICKET_PURCHASE
            and transaction.linked_ticket_id is not None
        ):
            ticket_charge_by_ticket_id[transaction.linked_ticket_id] = transaction
            continue

        amount = get_transaction_balance_delta(
            amount=transaction.amount,
            transaction_category=transaction.category,
            transaction_type=transaction.type,
            linked_ticket_id=transaction.linked_ticket_id,
        )
        entry_type: Literal["payment", "adjustment"] = "adjustment"
        if is_cash_transaction_category(transaction.category):
            entry_type = "payment"

        entries.append(
            LedgerEntry(
                id=transaction.id,
                entry_type=entry_type,
                created_at=_normalize_ledger_datetime(transaction.created_at),
                content=(transaction.note or transaction.method or "").strip(),
                amount=amount,
                running_balance=0,
                transaction=TransactionRead.model_validate(transaction),
            )
        )

    for ticket in tickets:
        charge_transaction = ticket_charge_by_ticket_id.get(ticket.id)
        entries.append(
            LedgerEntry(
                id=ticket.id,
                entry_type="ticket",
                created_at=_normalize_ledger_datetime(ticket.updated_at),
                content=ticket.pnr or str(ticket.id),
                amount=ticket.selling_price,
                running_balance=0,
                ticket=TicketRead.model_validate(ticket),
                transaction=(
                    TransactionRead.model_validate(charge_transaction)
                    if charge_transaction
                    else None
                ),
            )
        )

    entries.sort(
        key=lambda entry: (
            entry.created_at,
            0 if entry.entry_type == "ticket" else 1,
            str(entry.id),
        )
    )

    running_balance = 0.0
    for entry in entries:
        running_balance += entry.amount
        entry.running_balance = running_balance

    current_balance = (
        running_balance
        if entries or get_app_base_datetime(session=session) is not None
        else customer.balance
    )
    return CustomerLedgerResponse(
        customer=CustomerRead.model_validate(customer),
        current_balance=current_balance,
        balance_state=get_balance_state(current_balance),
        entries=entries,
    )


def record_payment(
    *,
    customer_id: uuid.UUID,
    amount: float,
    method: str,
    note: Optional[str],
    evidence_url: Optional[str],
    linked_ticket_id: Optional[uuid.UUID],
    actor_user_id: uuid.UUID,
    session: Session,
) -> RecordPaymentResponse:
    """Create a PAYMENT transaction and reduce the customer's balance atomically."""
    customer = _get_customer_or_404(session, customer_id)

    if linked_ticket_id is not None:
        _validate_linked_ticket(
            session=session,
            customer_id=customer_id,
            linked_ticket_id=linked_ticket_id,
        )

    cleaned_note = (note or "").strip() or None

    payment = Transaction(
        amount=amount,
        type=TransactionType.PAYMENT,
        category=TransactionCategory.PAYMENT,
        method=method.strip(),
        note=cleaned_note,
        evidence_url=evidence_url,
        customer_id=customer_id,
        linked_ticket_id=linked_ticket_id,
        created_by=actor_user_id,
    )
    ensure_datetime_is_active(
        session=session,
        value=payment.created_at,
        detail="Payment record was created before the app base date time.",
    )

    try:
        session.add(payment)
        customer.balance += get_transaction_balance_delta(
            amount=amount,
            transaction_category=payment.category,
        )
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(payment)
    session.refresh(customer)

    return RecordPaymentResponse(
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(payment),
        customer_new_balance=customer.balance,
        balance_state=get_balance_state(customer.balance),
    )


def update_transaction_for_admin(
    *,
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    session: Session,
) -> RecordPaymentResponse:
    """Correct a mutable transaction and rebalance the owning customer."""
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    allow_ticket_metadata_correction = (
        transaction.category == TransactionCategory.TICKET_PURCHASE
        and transaction.linked_ticket_id is not None
        and bool(update_data)
        and set(update_data).issubset(
            {"method", "note", "payment_occurred_at"}
        )
    )
    _ensure_transaction_is_mutable(
        transaction,
        allow_ticket_metadata_correction=allow_ticket_metadata_correction,
    )
    customer = _get_customer_or_404(session, transaction.customer_id)

    old_delta = get_transaction_balance_delta(
        amount=transaction.amount,
        transaction_category=transaction.category,
        transaction_type=transaction.type,
        linked_ticket_id=transaction.linked_ticket_id,
    )

    if "linked_ticket_id" in update_data and update_data["linked_ticket_id"] is not None:
        _validate_linked_ticket(
            session=session,
            customer_id=transaction.customer_id,
            linked_ticket_id=update_data["linked_ticket_id"],
        )
    if "category" in update_data and "type" not in update_data:
        update_data["type"] = get_expected_transaction_type(update_data["category"])

    for field_name, value in update_data.items():
        setattr(transaction, field_name, value)

    ensure_datetime_is_active(
        session=session,
        value=transaction.created_at,
        detail="Transaction record was created before the app base date time.",
    )

    new_delta = get_transaction_balance_delta(
        amount=transaction.amount,
        transaction_category=transaction.category,
        transaction_type=transaction.type,
        linked_ticket_id=transaction.linked_ticket_id,
    )

    try:
        customer.balance += new_delta - old_delta
        session.add(transaction)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(transaction)
    session.refresh(customer)

    return RecordPaymentResponse(
        customer=CustomerRead.model_validate(customer),
        transaction=TransactionRead.model_validate(transaction),
        customer_new_balance=customer.balance,
        balance_state=get_balance_state(customer.balance),
    )


def delete_transaction_for_admin(
    *,
    transaction_id: uuid.UUID,
    session: Session,
) -> RecordPaymentResponse:
    """Remove a mutable transaction and reverse its customer balance impact."""
    transaction = session.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )

    _ensure_transaction_is_mutable(transaction)
    customer = _get_customer_or_404(session, transaction.customer_id)
    delta = get_transaction_balance_delta(
        amount=transaction.amount,
        transaction_category=transaction.category,
        transaction_type=transaction.type,
        linked_ticket_id=transaction.linked_ticket_id,
    )
    response_transaction = TransactionRead.model_validate(transaction)

    try:
        customer.balance -= delta
        session.delete(transaction)
        session.add(customer)
        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(customer)

    return RecordPaymentResponse(
        customer=CustomerRead.model_validate(customer),
        transaction=response_transaction,
        customer_new_balance=customer.balance,
        balance_state=get_balance_state(customer.balance),
    )
