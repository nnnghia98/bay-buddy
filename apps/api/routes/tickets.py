"""
routes/tickets.py – Ticket management endpoints for Bay Buddy API.

Endpoints:
    POST /api/v1/tickets/confirm  – Confirm an AI-parsed ticket, auto-create customer &
                                    CHARGE transaction, update customer balance. [PRIMARY]
    POST /api/v1/tickets/         – Legacy: create ticket by known customer_id (no auto-txn).
    GET  /api/v1/tickets/         – List all tickets.
    GET  /api/v1/tickets/{id}     – Get a ticket by UUID.

Business rules: docs/BUSINESS.md
Service:        services/ticket_service.py
"""

import uuid
from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep
from database import SessionDep
from models.ticket import Ticket, TicketCreate, TicketRead
from models.customer import Customer
from core.responses import success_response
from services.ticket_service import (
    TicketConfirmPayload,
    TicketConfirmResponse,
    create_ticket_with_transaction,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /confirm – Primary endpoint: AI-parsed ticket → full atomic save
# ---------------------------------------------------------------------------

@router.post(
    "/confirm",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Confirm & save an AI-parsed ticket",
    description=(
        "Accepts the user-reviewed ticket data from the frontend. "
        "Automatically resolves or creates the customer record by name, "
        "saves the ticket as CONFIRMED, creates a CHARGE transaction for the debt, "
        "and updates the customer balance. All changes are committed atomically. "
        "Business rule: selling_price = net_price + service_fee (BUSINESS.md §2)."
    ),
)
async def confirm_ticket(
    *,
    session: SessionDep,
    # current_user: CurrentUserDep, # Disabled for testing
    payload: TicketConfirmPayload,
):
    """
    Full ticket-confirmation flow (docs/BUSINESS.md §1, §2, §3):

    1. Resolve customer by name (case-insensitive) — create if new.
    2. Validate selling_price = net_price + service_fee.
    3. Persist Ticket with status = CONFIRMED.
    4. Persist CHARGE Transaction (auto-debt) linked to the customer.
    5. Increment customer.balance by selling_price.
    """
    try:
        result: TicketConfirmResponse = create_ticket_with_transaction(
            payload=payload,
            session=session,
        )

        return success_response(
            {
                "ticket": result.ticket.model_dump(),
                "transaction_id": str(result.transaction_id),
                "customer": {
                    "id": str(result.customer_id),
                    "name": result.customer_name,
                    "balance": result.customer_new_balance,
                    "is_new": result.is_new_customer,
                },
            }
        )
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


# ---------------------------------------------------------------------------
# POST / – Legacy: create ticket when customer_id is already known
# ---------------------------------------------------------------------------

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    *, session: SessionDep, current_user: CurrentUserDep, ticket_in: TicketCreate
):
    """
    Create a new ticket and update the customer's balance.
    Requires a known `customer_id`. Use POST /confirm for the full AI-parse flow.
    """
    # Verify customer exists
    customer = session.get(Customer, ticket_in.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
        )

    # Check if PNR already exists
    statement = select(Ticket).where(Ticket.pnr == ticket_in.pnr)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket with this PNR already exists"
        )

    # Create ticket
    db_ticket = Ticket.model_validate(ticket_in)
    session.add(db_ticket)

    # Update customer balance (increase debt by selling_price)
    customer.balance += ticket_in.selling_price
    session.add(customer)

    session.commit()
    session.refresh(db_ticket)

    return success_response({
        "ticket": TicketRead.model_validate(db_ticket).model_dump(),
        "customer_new_balance": customer.balance,
    })


# ---------------------------------------------------------------------------
# GET / – List all tickets
# ---------------------------------------------------------------------------

@router.get("/", response_model=dict)
async def list_tickets(
    session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100
):
    """List all tickets (paginated)."""
    statement = select(Ticket).offset(skip).limit(limit)
    tickets = session.exec(statement).all()
    tickets_data = [TicketRead.model_validate(t).model_dump() for t in tickets]
    return success_response(tickets_data)


# ---------------------------------------------------------------------------
# GET /{ticket_id} – Get a single ticket
# ---------------------------------------------------------------------------

@router.get("/{ticket_id}", response_model=dict)
async def get_ticket(
    ticket_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep
):
    """Get a specific ticket by UUID."""
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )
    return success_response(TicketRead.model_validate(ticket).model_dump())

