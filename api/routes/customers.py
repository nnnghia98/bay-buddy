import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlmodel import select

from core.auth import CurrentUserDep, require_user_roles
from core.pagination import build_pagination, normalize_page, normalize_page_size
from core.responses import success_response
from database import SessionDep
from models.customer import (
    Customer,
    CustomerCreate,
    CustomerDirectoryItem,
    CustomerRead,
    CustomerUpdate,
)
from models.enums import UserRole
from models.invoice import Invoice
from models.quote import Quote
from models.ticket import Ticket
from models.transaction import Transaction
from services.customer_balance_service import get_customer_balances
from services.system_settings_service import get_app_base_datetime
from services.finance_service import (
    RecordPaymentPayload,
    get_customer_ledger,
    record_payment,
)

router = APIRouter()


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_customer(
    *, session: SessionDep, current_user: CurrentUserDep, customer_in: CustomerCreate
):
    """Create a new customer."""
    require_user_roles(current_user, UserRole.ADMIN)
    db_customer = Customer.model_validate(customer_in)
    session.add(db_customer)
    session.commit()
    session.refresh(db_customer)
    
    return success_response(CustomerRead.model_validate(db_customer).model_dump())

@router.get("/", response_model=dict)
async def list_customers(
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    q: str | None = Query(default=None, max_length=100),
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
):
    """List customers with optional search and pagination."""
    del current_user
    base_datetime = get_app_base_datetime(session=session)

    normalized_query = q.strip() if q else ""
    filters = []
    if normalized_query:
        search_pattern = f"%{normalized_query}%"
        filters.append(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
            )
        )

    is_paged = page is not None or page_size is not None
    page_number = normalize_page(page)
    effective_page_size = normalize_page_size(page_size, fallback=limit)
    offset = (page_number - 1) * effective_page_size if is_paged else skip
    query = select(Customer)
    if filters:
        query = query.where(*filters)

    statement = (
        query.order_by(Customer.name, Customer.id)
        .offset(offset)
        .limit(effective_page_size)
    )
    customers = session.exec(statement).all()
    customer_balances = get_customer_balances(
        session=session,
        customers=customers,
        base_datetime=base_datetime,
    )
    customer_directory = [
        CustomerDirectoryItem(
            id=customer.id,
            full_name=customer.name,
            phone=customer.phone,
            current_balance=customer_balances.get(customer.id, 0.0),
            is_active=customer.is_active,
        ).model_dump(mode="json")
        for customer in customers
    ]

    if not is_paged:
        return success_response(customer_directory)

    count_query = select(func.count()).select_from(Customer)
    if filters:
        count_query = count_query.where(*filters)
    total = session.exec(count_query).one()

    return success_response(
        {
            "items": customer_directory,
            "pagination": build_pagination(
                page=page_number,
                page_size=effective_page_size,
                total=total,
            ),
        }
    )

@router.get("/{customer_id}", response_model=dict)
async def get_customer(
    customer_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep
):
    """Get a specific customer by ID."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )
    return success_response(CustomerRead.model_validate(customer).model_dump())


@router.patch("/{customer_id}", response_model=dict)
async def update_customer(
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Partially update a customer and enforce unique email/tax code constraints."""
    require_user_roles(current_user, UserRole.ADMIN)

    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    update_data = customer_in.model_dump(exclude_unset=True)

    normalized_email = update_data.get("email")
    if normalized_email is not None:
        existing_customer = session.exec(
            select(Customer).where(
                Customer.email == normalized_email,
                Customer.id != customer_id,
            )
        ).first()
        if existing_customer is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already used by another customer",
            )

    normalized_tax_code = update_data.get("tax_code")
    if normalized_tax_code is not None:
        existing_customer = session.exec(
            select(Customer).where(
                Customer.tax_code == normalized_tax_code,
                Customer.id != customer_id,
            )
        ).first()
        if existing_customer is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tax code is already used by another customer",
            )

    for field_name, value in update_data.items():
        setattr(customer, field_name, value)

    session.add(customer)
    session.commit()
    session.refresh(customer)

    return success_response(CustomerRead.model_validate(customer).model_dump(mode="json"))


@router.delete("/{customer_id}", response_model=dict)
async def delete_customer(
    customer_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Delete a customer when no related finance/ticket records exist."""
    require_user_roles(current_user, UserRole.ADMIN)

    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    has_tickets = session.exec(
        select(Ticket.id).where(Ticket.customer_id == customer_id).limit(1)
    ).first()
    has_transactions = session.exec(
        select(Transaction.id).where(Transaction.customer_id == customer_id).limit(1)
    ).first()
    has_invoices = session.exec(
        select(Invoice.id).where(Invoice.customer_id == customer_id).limit(1)
    ).first()
    has_quotes = session.exec(
        select(Quote.id).where(Quote.customer_id == customer_id).limit(1)
    ).first()

    if has_tickets or has_transactions or has_invoices or has_quotes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer has related records. Archive instead of deleting.",
        )

    session.delete(customer)
    session.commit()

    return success_response({"id": str(customer_id), "deleted": True})


@router.get("/{customer_id}/ledger", response_model=dict)
async def get_customer_ledger_route(
    customer_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Return the customer's ledger with ticket and transaction history."""
    ledger = get_customer_ledger(customer_id=customer_id, session=session)
    return success_response(ledger.model_dump(mode="json"))


@router.post("/{customer_id}/payments", response_model=dict, status_code=status.HTTP_201_CREATED)
async def record_customer_payment(
    customer_id: uuid.UUID,
    payload: RecordPaymentPayload,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Record a manual payment for a customer and reduce their balance."""
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    result = record_payment(
        customer_id=customer_id,
        amount=payload.amount,
        method=payload.method,
        note=payload.note,
        evidence_url=payload.evidence_url,
        linked_ticket_id=payload.linked_ticket_id,
        actor_user_id=current_user.id,
        session=session,
    )
    return success_response(result.model_dump(mode="json"))
