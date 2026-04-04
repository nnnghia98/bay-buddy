import uuid

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep
from core.responses import success_response
from database import SessionDep
from models.customer import Customer, CustomerCreate, CustomerRead
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
    db_customer = Customer.model_validate(customer_in)
    session.add(db_customer)
    session.commit()
    session.refresh(db_customer)
    
    return success_response(CustomerRead.model_validate(db_customer).model_dump())

@router.get("/", response_model=dict)
async def list_customers(
    session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100
):
    """List all customers."""
    statement = select(Customer).offset(skip).limit(limit)
    customers = session.exec(statement).all()
    customers_read = [CustomerRead.model_validate(c).model_dump() for c in customers]
    return success_response(customers_read)

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
    result = record_payment(
        customer_id=customer_id,
        amount=payload.amount,
        note=payload.note,
        actor_user_id=current_user.id,
        session=session,
    )
    return success_response(result.model_dump(mode="json"))
