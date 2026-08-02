import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import String, cast, func, or_
from sqlmodel import select

from core.auth import CurrentUserDep, require_user_roles
from core.pagination import build_pagination, normalize_page, normalize_page_size
from core.responses import success_response
from database import SessionDep
from models.enums import TransactionCategory, UserRole
from models.customer import Customer
from models.enums import get_transaction_balance_delta
from models.ticket import Ticket
from models.transaction import Transaction, TransactionCreate, TransactionRead, TransactionUpdate
from services.finance_service import (
    delete_transaction_for_admin,
    update_transaction_for_admin,
)
from services.system_settings_service import (
    apply_app_base_datetime,
    ensure_datetime_is_active,
)

router = APIRouter()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    *,
    session: SessionDep,
    current_user: CurrentUserDep,
    transaction_in: TransactionCreate,
):
    """
    Create a new transaction and update the customer's balance.
    The signed debt impact is derived from `category`.
    """
    customer = session.get(Customer, transaction_in.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    if transaction_in.linked_ticket_id is not None:
        linked_ticket = session.get(Ticket, transaction_in.linked_ticket_id)
        if linked_ticket is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked ticket not found",
            )
        if linked_ticket.customer_id != transaction_in.customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Linked ticket does not belong to the customer",
            )

    # Create transaction
    db_transaction = Transaction.model_validate(
        {
            **transaction_in.model_dump(),
            "created_by": current_user.id,
        }
    )
    ensure_datetime_is_active(
        session=session,
        value=db_transaction.created_at,
        detail="Transaction record was created before the app base date time.",
    )
    session.add(db_transaction)

    # Update balance according to VN-market category logic.
    customer.balance += get_transaction_balance_delta(
        amount=transaction_in.amount,
        transaction_category=transaction_in.category,
        transaction_type=transaction_in.type,
        linked_ticket_id=transaction_in.linked_ticket_id,
    )
    session.add(customer)

    session.commit()
    session.refresh(db_transaction)
    session.refresh(customer)

    return success_response({
        "transaction": TransactionRead.model_validate(db_transaction).model_dump(),
        "customer_new_balance": customer.balance
    })


@router.get("/", response_model=dict)
async def list_transactions(
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    q: str | None = Query(default=None, max_length=100),
    category: TransactionCategory | None = Query(default=None),
    from_value: datetime | None = Query(default=None, alias="from"),
    to_value: datetime | None = Query(default=None, alias="to"),
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
):
    """List transactions with optional filters and page metadata."""
    del current_user

    filters = []
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                Transaction.method.ilike(search_pattern),
                Transaction.note.ilike(search_pattern),
                cast(Transaction.category, String).ilike(search_pattern),
                cast(Transaction.type, String).ilike(search_pattern),
            )
        )
    if category is not None:
        filters.append(Transaction.category == category)
    if from_value is not None:
        filters.append(
            Transaction.created_at
            >= (
                from_value.astimezone(timezone.utc).replace(tzinfo=None)
                if from_value.tzinfo
                else from_value
            )
        )
    if to_value is not None:
        filters.append(
            Transaction.created_at
            <= (
                to_value.astimezone(timezone.utc).replace(tzinfo=None)
                if to_value.tzinfo
                else to_value
            )
        )

    is_paged = page is not None or page_size is not None
    page_number = normalize_page(page)
    effective_page_size = normalize_page_size(page_size, fallback=limit)
    offset = (page_number - 1) * effective_page_size if is_paged else skip
    statement = select(Transaction)
    if filters:
        statement = statement.where(*filters)
    statement = apply_app_base_datetime(
        session=session,
        statement=statement,
        column=Transaction.created_at,
    ).order_by(Transaction.created_at, Transaction.id)
    statement = statement.offset(offset).limit(effective_page_size)
    transactions = session.exec(statement).all()
    tx_data = [TransactionRead.model_validate(tx).model_dump() for tx in transactions]

    if not is_paged:
        return success_response(tx_data)

    count_statement = select(func.count()).select_from(Transaction)
    if filters:
        count_statement = count_statement.where(*filters)
    count_statement = apply_app_base_datetime(
        session=session,
        statement=count_statement,
        column=Transaction.created_at,
    )
    total = session.exec(count_statement).one()
    return success_response(
        {
            "items": tx_data,
            "pagination": build_pagination(
                page=page_number,
                page_size=effective_page_size,
                total=total,
            ),
        }
    )


@router.patch("/{transaction_id}", response_model=dict)
async def update_transaction(
    transaction_id: uuid.UUID,
    transaction_in: TransactionUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Admin-only correction for a mutable ledger transaction."""
    require_user_roles(current_user, UserRole.ADMIN)
    result = update_transaction_for_admin(
        transaction_id=transaction_id,
        payload=transaction_in,
        session=session,
    )
    return success_response(result.model_dump(mode="json"))


@router.delete("/{transaction_id}", response_model=dict)
async def delete_transaction(
    transaction_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Admin-only removal for a mutable ledger transaction."""
    require_user_roles(current_user, UserRole.ADMIN)
    result = delete_transaction_for_admin(
        transaction_id=transaction_id,
        session=session,
    )
    return success_response(result.model_dump(mode="json"))
