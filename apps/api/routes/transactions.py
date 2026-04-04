import uuid
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep
from database import SessionDep
from models.transaction import Transaction, TransactionCreate, TransactionRead
from models.customer import Customer
from models.enums import TransactionType
from core.responses import success_response

router = APIRouter()

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    *, session: SessionDep, current_user: CurrentUserDep, transaction_in: TransactionCreate
):
    """
    Create a new transaction and update the customer's balance.
    CHARGE  → balance += amount (debt increases)
    PAYMENT → balance -= amount (debt decreases)
    REFUND  → balance -= amount (credit returned/debt decreases)
    """
    # Verify customer exists
    customer = session.get(Customer, transaction_in.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    # Create transaction
    db_transaction = Transaction.model_validate(transaction_in)
    session.add(db_transaction)

    # Update balance according to logic
    if transaction_in.type == TransactionType.CHARGE:
        customer.balance += transaction_in.amount
    elif transaction_in.type in (TransactionType.PAYMENT, TransactionType.REFUND):
        customer.balance -= transaction_in.amount
        
    session.add(customer)

    session.commit()
    session.refresh(db_transaction)
    
    return success_response({
        "transaction": TransactionRead.model_validate(db_transaction).model_dump(),
        "customer_new_balance": customer.balance
    })

@router.get("/", response_model=dict)
async def list_transactions(
    session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100
):
    """List all transactions."""
    statement = select(Transaction).offset(skip).limit(limit)
    transactions = session.exec(statement).all()
    tx_data = [TransactionRead.model_validate(tx).model_dump() for tx in transactions]
    return success_response(tx_data)
