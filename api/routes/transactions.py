import uuid

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep
from core.responses import success_response
from database import SessionDep
from models.customer import Customer
from models.enums import get_transaction_balance_delta
from models.ticket import Ticket
from models.transaction import Transaction, TransactionCreate, TransactionRead

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
    # Verify customer exists
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
    session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100
):
    """List all transactions."""
    statement = (
        select(Transaction)
        .order_by(Transaction.occurred_at, Transaction.created_at, Transaction.id)
        .offset(skip)
        .limit(limit)
    )
    transactions = session.exec(statement).all()
    tx_data = [TransactionRead.model_validate(tx).model_dump() for tx in transactions]
    return success_response(tx_data)
