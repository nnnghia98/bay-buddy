import uuid

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep, require_user_roles
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
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    db_customer = Customer.model_validate(customer_in)
    session.add(db_customer)
    session.commit()
    session.refresh(db_customer)
    
    return success_response(CustomerRead.model_validate(db_customer).model_dump())

@router.get("/", response_model=dict)
async def list_customers(
    session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100
):
    """List all customers for the directory page."""
    statement = select(Customer).order_by(Customer.name).offset(skip).limit(limit)
    customers = session.exec(statement).all()
    customer_directory = [
        CustomerDirectoryItem(
            id=customer.id,
            full_name=customer.name,
            phone=customer.phone,
            current_balance=customer.balance,
        ).model_dump(mode="json")
        for customer in customers
    ]
    return success_response(customer_directory)

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
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)

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
