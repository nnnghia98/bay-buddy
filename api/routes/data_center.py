from __future__ import annotations

import csv
import io
import zipfile
from datetime import datetime
from typing import Any, Callable, Iterable, Optional

from fastapi import APIRouter, Body, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, func
from sqlmodel import SQLModel, select

from core.auth import CurrentUserDep, require_user_roles
from core.responses import success_response
from database import SessionDep
from models import (
    Customer,
    Invoice,
    InvoiceItem,
    Quote,
    QuoteItem,
    Ticket,
    TicketImport,
    Transaction,
    User,
)
from models.enums import UserRole, get_transaction_balance_delta

router = APIRouter()

WIPE_CONFIRMATION = "WIPE DATABASE"


class DataCenterScope(BaseModel):
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    tables: Optional[list[str]] = None

    @property
    def is_all(self) -> bool:
        return self.date_from is None and self.date_to is None


class DataCenterTablePreview(BaseModel):
    key: str
    label: str
    file_name: str
    date_field: Optional[str]
    count: int
    scope: str


class DataCenterPreviewResponse(BaseModel):
    scope: DataCenterScope
    tables: list[DataCenterTablePreview]


class DataCenterWipePayload(DataCenterScope):
    confirmation: str = Field(min_length=1)


class DataCenterWipeResponse(BaseModel):
    scope: DataCenterScope
    deleted: dict[str, int]


TABLE_LABELS: dict[str, str] = {
    "customers": "Customers",
    "tickets": "Tickets",
    "transactions": "Transactions",
    "invoices": "Invoices",
    "quotes": "Quotes",
    "users": "Users",
}
VISIBLE_TABLE_KEYS = tuple(TABLE_LABELS.keys())


class DataCenterTableConfig(BaseModel):
    key: str
    file_name: str
    date_field: Optional[str]


def _ensure_admin(current_user: User) -> User:
    return require_user_roles(current_user, UserRole.ADMIN)


def _validate_scope(scope: DataCenterScope) -> None:
    if (
        scope.date_from is not None
        and scope.date_to is not None
        and scope.date_from > scope.date_to
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must be before or equal to date_to",
        )
    _resolve_table_keys(scope.tables)


def _parse_table_query(tables: Optional[str]) -> list[str] | None:
    if tables is None:
        return None

    table_keys = [
        table_key.strip()
        for table_key in tables.split(",")
        if table_key.strip()
    ]
    return table_keys or None


def _resolve_table_keys(tables: Optional[list[str]]) -> list[str]:
    if not tables:
        return list(VISIBLE_TABLE_KEYS)

    unique_table_keys = list(dict.fromkeys(tables))
    invalid_table_keys = [
        table_key
        for table_key in unique_table_keys
        if table_key not in VISIBLE_TABLE_KEYS
    ]
    if invalid_table_keys:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid data center table selection: {', '.join(invalid_table_keys)}",
        )
    return unique_table_keys


def _scope_label(scope: DataCenterScope) -> str:
    if scope.is_all:
        return "ALL"

    from_label = scope.date_from.isoformat() if scope.date_from else "FROM_START"
    to_label = scope.date_to.isoformat() if scope.date_to else "TO_NOW"
    return f"{from_label}..{to_label}"


def _where_datetime(statement: Any, column: Any, scope: DataCenterScope) -> Any:
    if scope.date_from is not None:
        statement = statement.where(column >= scope.date_from)
    if scope.date_to is not None:
        statement = statement.where(column <= scope.date_to)
    return statement


def _select_customers(scope: DataCenterScope) -> Any:
    statement = select(Customer).order_by(Customer.name)
    return statement if scope.is_all else statement.where(False)


def _select_users(scope: DataCenterScope, *, current_user_id: Any | None = None) -> Any:
    statement = select(User).order_by(User.username)
    if current_user_id is not None:
        statement = statement.where(User.id != current_user_id)
    return statement if scope.is_all else statement.where(False)


def _select_tickets(scope: DataCenterScope) -> Any:
    statement = select(Ticket).order_by(Ticket.updated_at, Ticket.id)
    return _where_datetime(statement, Ticket.updated_at, scope)


def _select_transactions(scope: DataCenterScope) -> Any:
    statement = select(Transaction).order_by(
        Transaction.created_at,
        Transaction.id,
    )
    return _where_datetime(statement, Transaction.created_at, scope)


def _select_invoices(scope: DataCenterScope) -> Any:
    statement = select(Invoice).order_by(Invoice.created_at, Invoice.invoice_number)
    return _where_datetime(statement, Invoice.created_at, scope)


def _select_quotes(scope: DataCenterScope) -> Any:
    statement = select(Quote).order_by(Quote.created_at, Quote.quote_number)
    return _where_datetime(statement, Quote.created_at, scope)


TABLE_CONFIGS: dict[str, tuple[str, Optional[str], Callable[[DataCenterScope], Any]]] = {
    "customers": ("customers.csv", None, _select_customers),
    "tickets": ("tickets.csv", "updated_at", _select_tickets),
    "transactions": ("transactions.csv", "created_at", _select_transactions),
    "invoices": ("invoices.csv", "created_at", _select_invoices),
    "quotes": ("quotes.csv", "created_at", _select_quotes),
    "users": ("users.csv", None, _select_users),
}


def _rows_to_csv(rows: Iterable[SQLModel]) -> str:
    dumped_rows = [row.model_dump(mode="json") for row in rows]
    if not dumped_rows:
        return ""

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(dumped_rows[0].keys()))
    writer.writeheader()
    writer.writerows(dumped_rows)
    return output.getvalue()


def _zip_csv_files(files: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_name, content in files.items():
            archive.writestr(file_name, content)
    buffer.seek(0)
    return buffer.read()


def _preview_table(
    *,
    session: SessionDep,
    key: str,
    file_name: str,
    date_field: Optional[str],
    statement: Any,
    scope: DataCenterScope,
) -> DataCenterTablePreview:
    rows = session.exec(statement).all()
    return DataCenterTablePreview(
        key=key,
        label=TABLE_LABELS[key],
        file_name=file_name,
        date_field=date_field,
        count=len(rows),
        scope=_scope_label(scope),
    )


def _delete_rows(session: SessionDep, rows: Iterable[SQLModel]) -> int:
    count = 0
    for row in rows:
        session.delete(row)
        count += 1
    return count


def _count_rows(
    session: SessionDep,
    model: type[SQLModel],
    statement: Any | None = None,
) -> int:
    count_statement = select(func.count()).select_from(model)
    if statement is not None:
        count_statement = statement
    return session.exec(count_statement).one()


def _bulk_delete_all_time(
    session: SessionDep,
    *,
    current_user: User,
) -> dict[str, int]:
    deleted = _empty_deleted_counts()
    current_user_id = current_user.id

    delete_plan: list[tuple[str, type[SQLModel], Any]] = [
        ("ticket_imports", TicketImport, delete(TicketImport)),
        ("quote_items", QuoteItem, delete(QuoteItem)),
        ("invoice_items", InvoiceItem, delete(InvoiceItem)),
        ("transactions", Transaction, delete(Transaction)),
        ("quotes", Quote, delete(Quote)),
        ("invoices", Invoice, delete(Invoice)),
        ("tickets", Ticket, delete(Ticket)),
        ("customers", Customer, delete(Customer)),
        (
            "users",
            User,
            delete(User).where(User.id != current_user_id),
        ),
    ]

    for key, model, delete_statement in delete_plan:
        if key == "users":
            deleted[key] = _count_rows(
                session,
                model,
                select(func.count())
                .select_from(User)
                .where(User.id != current_user_id),
            )
        else:
            deleted[key] = _count_rows(session, model)
        session.exec(delete_statement)

    return deleted


def _recalculate_customer_balances(session: SessionDep) -> None:
    customers = session.exec(select(Customer)).all()
    for customer in customers:
        transactions = session.exec(
            select(Transaction).where(Transaction.customer_id == customer.id)
        ).all()
        customer.balance = sum(
            get_transaction_balance_delta(
                amount=transaction.amount,
                transaction_category=transaction.category,
                transaction_type=transaction.type,
                linked_ticket_id=transaction.linked_ticket_id,
            )
            for transaction in transactions
        )
        session.add(customer)


def _empty_deleted_counts() -> dict[str, int]:
    return {
        "ticket_imports": 0,
        "quote_items": 0,
        "invoice_items": 0,
        "transactions": 0,
        "quotes": 0,
        "invoices": 0,
        "tickets": 0,
        "customers": 0,
        "users": 0,
    }


def _dedupe_by_id(rows: Iterable[SQLModel]) -> list[SQLModel]:
    return list({row.id: row for row in rows}.values())


def _detach_transactions_from_tickets(
    session: SessionDep,
    *,
    ticket_ids: set[Any],
) -> None:
    if not ticket_ids:
        return

    transactions = session.exec(
        select(Transaction).where(Transaction.linked_ticket_id.in_(ticket_ids))
    ).all()
    for transaction in transactions:
        transaction.linked_ticket_id = None
        session.add(transaction)


def _detach_transactions_from_invoices(
    session: SessionDep,
    *,
    invoice_ids: set[Any],
) -> None:
    if not invoice_ids:
        return

    transactions = session.exec(
        select(Transaction).where(Transaction.invoice_id.in_(invoice_ids))
    ).all()
    for transaction in transactions:
        transaction.invoice_id = None
        transaction.is_invoiced = False
        session.add(transaction)


def _detach_ticket_imports_from_tickets(
    session: SessionDep,
    *,
    ticket_ids: set[Any],
) -> None:
    if not ticket_ids:
        return

    ticket_imports = session.exec(
        select(TicketImport).where(TicketImport.linked_ticket_id.in_(ticket_ids))
    ).all()
    for ticket_import in ticket_imports:
        ticket_import.linked_ticket_id = None
        session.add(ticket_import)


def _detach_ticket_imports_from_users(
    session: SessionDep,
    *,
    user_ids: set[Any],
) -> None:
    if not user_ids:
        return

    ticket_imports = session.exec(
        select(TicketImport).where(TicketImport.created_by.in_(user_ids))
    ).all()
    for ticket_import in ticket_imports:
        ticket_import.created_by = None
        session.add(ticket_import)


def _filter_users_without_transaction_audit_refs(
    session: SessionDep,
    *,
    users: list[User],
) -> list[User]:
    user_ids = {user.id for user in users}
    if not user_ids:
        return users

    referenced_user_ids = {
        transaction.created_by
        for transaction in session.exec(
            select(Transaction).where(Transaction.created_by.in_(user_ids))
        ).all()
    }
    if not referenced_user_ids:
        return users

    return [user for user in users if user.id not in referenced_user_ids]


def _wipe_selected(
    session: SessionDep,
    *,
    scope: DataCenterScope,
    current_user: User,
    table_keys: list[str],
) -> dict[str, int]:
    selected_tables = set(table_keys)
    deleted = _empty_deleted_counts()

    if scope.is_all and selected_tables == set(VISIBLE_TABLE_KEYS):
        return _bulk_delete_all_time(session, current_user=current_user)

    customers = session.exec(_select_customers(scope)).all() if "customers" in selected_tables else []
    tickets = session.exec(_select_tickets(scope)).all() if "tickets" in selected_tables else []
    transactions = (
        session.exec(_select_transactions(scope)).all()
        if "transactions" in selected_tables
        else []
    )
    invoices = session.exec(_select_invoices(scope)).all() if "invoices" in selected_tables else []
    quotes = session.exec(_select_quotes(scope)).all() if "quotes" in selected_tables else []
    users = (
        session.exec(_select_users(scope, current_user_id=current_user.id)).all()
        if "users" in selected_tables
        else []
    )

    ticket_ids = {ticket.id for ticket in tickets}
    invoice_ids = {invoice.id for invoice in invoices}
    quote_ids = {quote.id for quote in quotes}
    customer_ids = {customer.id for customer in customers}
    user_ids = {user.id for user in users}

    if customer_ids:
        customer_tickets = session.exec(
            select(Ticket).where(Ticket.customer_id.in_(customer_ids))
        ).all()
        customer_transactions = session.exec(
            select(Transaction).where(Transaction.customer_id.in_(customer_ids))
        ).all()
        customer_invoices = session.exec(
            select(Invoice).where(Invoice.customer_id.in_(customer_ids))
        ).all()
        customer_quotes = session.exec(
            select(Quote).where(Quote.customer_id.in_(customer_ids))
        ).all()
        tickets = _dedupe_by_id([*tickets, *customer_tickets])
        transactions = _dedupe_by_id([*transactions, *customer_transactions])
        invoices = _dedupe_by_id([*invoices, *customer_invoices])
        quotes = _dedupe_by_id([*quotes, *customer_quotes])
        ticket_ids = {ticket.id for ticket in tickets}
        invoice_ids = {invoice.id for invoice in invoices}
        quote_ids = {quote.id for quote in quotes}

    if "transactions" in selected_tables and ticket_ids:
        transactions = _dedupe_by_id(
            [
                *transactions,
                *session.exec(
                    select(Transaction).where(Transaction.linked_ticket_id.in_(ticket_ids))
                ).all(),
            ]
        )
    if "transactions" in selected_tables and invoice_ids:
        transactions = _dedupe_by_id(
            [
                *transactions,
                *session.exec(
                    select(Transaction).where(Transaction.invoice_id.in_(invoice_ids))
                ).all(),
            ]
        )

    invoice_items = []
    if invoice_ids:
        invoice_items.extend(
            session.exec(
                select(InvoiceItem).where(InvoiceItem.invoice_id.in_(invoice_ids))
            ).all()
        )
    if ticket_ids:
        invoice_items.extend(
            session.exec(
                select(InvoiceItem).where(InvoiceItem.linked_ticket_id.in_(ticket_ids))
            ).all()
        )

    quote_items = []
    if quote_ids:
        quote_items.extend(
            session.exec(select(QuoteItem).where(QuoteItem.quote_id.in_(quote_ids))).all()
        )
    if ticket_ids:
        quote_items.extend(
            session.exec(
                select(QuoteItem).where(QuoteItem.linked_ticket_id.in_(ticket_ids))
            ).all()
        )

    ticket_imports = []
    if ticket_ids:
        ticket_imports.extend(
            session.exec(
                select(TicketImport).where(TicketImport.linked_ticket_id.in_(ticket_ids))
            ).all()
        )
    if user_ids and scope.is_all:
        ticket_imports.extend(
            session.exec(
                select(TicketImport).where(TicketImport.created_by.in_(user_ids))
            ).all()
        )

    deleted["ticket_imports"] = _delete_rows(
        session,
        _dedupe_by_id(ticket_imports),
    )
    deleted["quote_items"] = _delete_rows(session, _dedupe_by_id(quote_items))
    deleted["invoice_items"] = _delete_rows(session, _dedupe_by_id(invoice_items))

    transaction_ids = {transaction.id for transaction in transactions}
    deleted["transactions"] = _delete_rows(session, transactions)

    if "transactions" not in selected_tables:
        _detach_transactions_from_tickets(session, ticket_ids=ticket_ids)
        _detach_transactions_from_invoices(session, invoice_ids=invoice_ids)
        users = _filter_users_without_transaction_audit_refs(
            session,
            users=users,
        )
    else:
        remaining_invoice_transaction_ids = invoice_ids and session.exec(
            select(Transaction).where(Transaction.invoice_id.in_(invoice_ids))
        ).all()
        for transaction in remaining_invoice_transaction_ids or []:
            if transaction.id not in transaction_ids:
                transaction.invoice_id = None
                transaction.is_invoiced = False
                session.add(transaction)

    if not scope.is_all:
        _detach_ticket_imports_from_tickets(session, ticket_ids=ticket_ids)
        _detach_ticket_imports_from_users(session, user_ids=user_ids)

    deleted["quotes"] = _delete_rows(session, quotes)
    deleted["invoices"] = _delete_rows(session, invoices)
    deleted["tickets"] = _delete_rows(session, tickets)
    deleted["customers"] = _delete_rows(session, customers)
    deleted["users"] = _delete_rows(session, users)

    if selected_tables & {"customers", "tickets", "transactions", "invoices", "quotes"}:
        _recalculate_customer_balances(session)
    return deleted


@router.get("/preview", response_model=dict)
async def preview_data_center_scope(
    session: SessionDep,
    current_user: CurrentUserDep,
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    tables: Optional[str] = Query(default=None),
):
    _ensure_admin(current_user)
    scope = DataCenterScope(
        date_from=date_from,
        date_to=date_to,
        tables=_parse_table_query(tables),
    )
    _validate_scope(scope)
    table_keys = _resolve_table_keys(scope.tables)

    tables = [
        _preview_table(
            session=session,
            key=table_key,
            file_name=TABLE_CONFIGS[table_key][0],
            date_field=TABLE_CONFIGS[table_key][1],
            statement=TABLE_CONFIGS[table_key][2](scope),
            scope=scope,
        )
        for table_key in table_keys
    ]

    payload = DataCenterPreviewResponse(scope=scope, tables=tables)
    return success_response(payload.model_dump(mode="json"))


@router.get("/backup")
async def backup_data_center_scope(
    session: SessionDep,
    current_user: CurrentUserDep,
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    tables: Optional[str] = Query(default=None),
):
    _ensure_admin(current_user)
    scope = DataCenterScope(
        date_from=date_from,
        date_to=date_to,
        tables=_parse_table_query(tables),
    )
    _validate_scope(scope)
    table_keys = _resolve_table_keys(scope.tables)

    files = {
        TABLE_CONFIGS[table_key][0]: _rows_to_csv(
            session.exec(TABLE_CONFIGS[table_key][2](scope)).all()
        )
        for table_key in table_keys
    }

    return Response(
        content=_zip_csv_files(files),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="bay-buddy-backup.zip"'},
    )


@router.delete("/wipe", response_model=dict)
async def wipe_data_center_scope(
    session: SessionDep,
    current_user: CurrentUserDep,
    payload: DataCenterWipePayload = Body(...),
):
    _ensure_admin(current_user)
    _validate_scope(payload)
    table_keys = _resolve_table_keys(payload.tables)

    if payload.confirmation != WIPE_CONFIRMATION:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid wipe confirmation",
        )

    deleted = _wipe_selected(
        session,
        scope=payload,
        current_user=current_user,
        table_keys=table_keys,
    )
    session.flush()
    response = DataCenterWipeResponse(scope=payload, deleted=deleted)
    return success_response(response.model_dump(mode="json"))
