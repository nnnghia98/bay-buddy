from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from models.customer import Customer
from models.enums import (
    TicketStatus,
    TransactionCategory,
)
from models.ticket import Ticket
from models.transaction import Transaction
from services.customer_balance_service import get_customer_balances
from services.system_settings_service import get_app_base_datetime


RECENT_ACTIVITY_LIMIT = 8


class DashboardFinancialSummary(BaseModel):
    total_ticket_sales: float
    total_true_income: float
    total_receivables: float
    total_held_credit: float
    confirmed_tickets: int
    customers_with_debt: int
    customers_with_credit: int
    income_rate_percent: float


class DashboardTopDebtor(BaseModel):
    customer_id: uuid.UUID
    customer_name: str
    outstanding_balance: float


class DashboardActionQueue(BaseModel):
    key: Literal["receivables", "heldCredit", "draftTickets"]
    count: int
    amount: float


class DashboardRecentActivity(BaseModel):
    id: uuid.UUID
    type: Literal["ticket", "payment", "adjustment", "refund"]
    category: TransactionCategory | None = None
    customer_id: uuid.UUID
    customer_name: str
    title: str
    amount: float
    created_at: datetime


class DashboardSummary(BaseModel):
    financial: DashboardFinancialSummary
    top_debtors: list[DashboardTopDebtor]
    action_queues: list[DashboardActionQueue]
    recent_activity: list[DashboardRecentActivity]
    scope_started_at: datetime | None
    updated_at: datetime


def _ticket_title(ticket: Ticket) -> str:
    reference = ticket.pnr or ticket.ticket_number
    route = (
        f"{ticket.departure_code}-{ticket.arrival_code}"
        if ticket.departure_code and ticket.arrival_code
        else ticket.itinerary
    )
    if reference and route:
        return f"{reference} · {route}"
    return reference or route or ""


def _transaction_activity_type(
    category: TransactionCategory,
) -> Literal["payment", "adjustment", "refund"]:
    if category == TransactionCategory.PAYMENT:
        return "payment"
    if category == TransactionCategory.REFUND:
        return "refund"
    return "adjustment"


def _transaction_activity_amount(transaction: Transaction) -> float:
    if transaction.category in {
        TransactionCategory.PAYMENT,
        TransactionCategory.DISCOUNT,
    }:
        return -transaction.amount
    return transaction.amount


def _timestamp(value: datetime) -> float:
    normalized = (
        value
        if value.tzinfo is not None
        else value.replace(tzinfo=timezone.utc)
    )
    return normalized.timestamp()


def _build_recent_activity(
    *,
    session: Session,
    base_datetime: datetime | None,
) -> list[DashboardRecentActivity]:
    ticket_statement = (
        select(Ticket, Customer.name)
        .join(Customer, Customer.id == Ticket.customer_id)
        .where(Ticket.status == TicketStatus.CONFIRMED)
    )
    transaction_statement = (
        select(Transaction, Customer.name)
        .join(Customer, Customer.id == Transaction.customer_id)
        .where(Transaction.category != TransactionCategory.TICKET_PURCHASE)
    )
    if base_datetime is not None:
        ticket_statement = ticket_statement.where(
            Ticket.updated_at >= base_datetime,
        )
        transaction_statement = transaction_statement.where(
            Transaction.created_at >= base_datetime,
        )

    ticket_rows = session.exec(
        ticket_statement.order_by(Ticket.updated_at.desc(), Ticket.id.desc()).limit(
            RECENT_ACTIVITY_LIMIT
        )
    ).all()
    transaction_rows = session.exec(
        transaction_statement.order_by(
            Transaction.created_at.desc(),
            Transaction.id.desc(),
        ).limit(RECENT_ACTIVITY_LIMIT)
    ).all()

    ticket_activity = [
        DashboardRecentActivity(
            id=ticket.id,
            type="ticket",
            customer_id=ticket.customer_id,
            customer_name=customer_name,
            title=_ticket_title(ticket),
            amount=ticket.selling_price,
            created_at=ticket.updated_at,
        )
        for ticket, customer_name in ticket_rows
    ]
    transaction_activity = [
        DashboardRecentActivity(
            id=transaction.id,
            type=_transaction_activity_type(transaction.category),
            category=transaction.category,
            customer_id=transaction.customer_id,
            customer_name=customer_name,
            title=(transaction.note or "").strip(),
            amount=_transaction_activity_amount(transaction),
            created_at=transaction.created_at,
        )
        for transaction, customer_name in transaction_rows
    ]

    return sorted(
        [*ticket_activity, *transaction_activity],
        key=lambda activity: (_timestamp(activity.created_at), str(activity.id)),
        reverse=True,
    )[:RECENT_ACTIVITY_LIMIT]


def get_dashboard_summary(*, session: Session) -> DashboardSummary:
    """Build the authenticated homepage from one backend-owned snapshot."""

    base_datetime = get_app_base_datetime(session=session)
    confirmed_ticket_filters = [Ticket.status == TicketStatus.CONFIRMED]
    draft_ticket_filters = [Ticket.status == TicketStatus.DRAFT]
    if base_datetime is not None:
        confirmed_ticket_filters.append(Ticket.updated_at >= base_datetime)
        draft_ticket_filters.append(Ticket.updated_at >= base_datetime)

    confirmed_count, total_ticket_sales, total_true_income = session.exec(
        select(
            func.count(Ticket.id),
            func.coalesce(func.sum(Ticket.selling_price), 0),
            func.coalesce(func.sum(Ticket.true_income), 0),
        ).where(*confirmed_ticket_filters)
    ).one()
    draft_count, draft_amount = session.exec(
        select(
            func.count(Ticket.id),
            func.coalesce(func.sum(Ticket.selling_price), 0),
        ).where(*draft_ticket_filters)
    ).one()

    customers = session.exec(
        select(Customer).order_by(Customer.name, Customer.id)
    ).all()
    customer_balances = get_customer_balances(
        session=session,
        customers=customers,
        base_datetime=base_datetime,
    )
    debtors = sorted(
        (
            (customer, customer_balances.get(customer.id, 0.0))
            for customer in customers
            if customer.id is not None
            and customer_balances.get(customer.id, 0.0) > 0
        ),
        key=lambda item: (item[1], item[0].name.casefold()),
        reverse=True,
    )
    creditors = [
        (customer, customer_balances.get(customer.id, 0.0))
        for customer in customers
        if customer.id is not None
        and customer_balances.get(customer.id, 0.0) < 0
    ]
    total_receivables = sum(balance for _customer, balance in debtors)
    total_held_credit = sum(abs(balance) for _customer, balance in creditors)
    total_ticket_sales_value = float(total_ticket_sales or 0)
    total_true_income_value = float(total_true_income or 0)

    return DashboardSummary(
        financial=DashboardFinancialSummary(
            total_ticket_sales=total_ticket_sales_value,
            total_true_income=total_true_income_value,
            total_receivables=total_receivables,
            total_held_credit=total_held_credit,
            confirmed_tickets=int(confirmed_count or 0),
            customers_with_debt=len(debtors),
            customers_with_credit=len(creditors),
            income_rate_percent=(
                total_true_income_value / total_ticket_sales_value * 100
                if total_ticket_sales_value > 0
                else 0
            ),
        ),
        top_debtors=[
            DashboardTopDebtor(
                customer_id=customer.id,
                customer_name=customer.name,
                outstanding_balance=balance,
            )
            for customer, balance in debtors[:5]
        ],
        action_queues=[
            DashboardActionQueue(
                key="receivables",
                count=len(debtors),
                amount=total_receivables,
            ),
            DashboardActionQueue(
                key="heldCredit",
                count=len(creditors),
                amount=total_held_credit,
            ),
            DashboardActionQueue(
                key="draftTickets",
                count=int(draft_count or 0),
                amount=float(draft_amount or 0),
            ),
        ],
        recent_activity=_build_recent_activity(
            session=session,
            base_datetime=base_datetime,
        ),
        scope_started_at=base_datetime,
        updated_at=datetime.now(timezone.utc),
    )
