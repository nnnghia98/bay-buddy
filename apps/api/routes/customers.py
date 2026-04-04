import uuid
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep
from database import SessionDep
from models.customer import Customer, CustomerCreate, CustomerRead
from core.responses import success_response

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
