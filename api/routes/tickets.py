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

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from core.auth import CurrentUserDep, require_user_roles
from database import SessionDep
from core.responses import success_response
from models.enums import UserRole
from models.ticket import Ticket, TicketCreate, TicketRead, TicketUpdate
from services.ticket_service import (
    TicketConfirmPayload,
    TicketConfirmResponse,
    TicketCorrectionResponse,
    TicketRefundPayload,
    TicketReassignPayload,
    TicketRefundResponse,
    TicketReassignResponse,
    TicketVoidResponse,
    correct_confirmed_ticket,
    create_ticket_with_transaction,
    delete_confirmed_ticket_for_admin,
    reassign_confirmed_ticket,
    refund_confirmed_ticket,
    void_confirmed_ticket,
)
from services.system_settings_service import (
    apply_app_base_datetime,
    ensure_datetime_is_active,
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
    current_user: CurrentUserDep,
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
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    ensure_datetime_is_active(
        session=session,
        value=payload.flight_date,
        detail="Ticket flight date is before the app base date time.",
    )
    result: TicketConfirmResponse = create_ticket_with_transaction(
        payload=payload,
        session=session,
        actor_user_id=current_user.id,
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


# ---------------------------------------------------------------------------
# POST / – Legacy: create ticket when customer_id is already known
# ---------------------------------------------------------------------------

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    *, session: SessionDep, current_user: CurrentUserDep, ticket_in: TicketCreate
):
    """
    Legacy write path retired in favor of POST /confirm.

    The confirm flow is the only supported ledger-safe ticket mutation because it
    creates the matching CHARGE transaction and updates customer.balance atomically.
    """
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    del session, current_user, ticket_in
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy ticket creation is retired. Use POST /api/v1/tickets/confirm.",
    )


# ---------------------------------------------------------------------------
# GET / – List all tickets
# ---------------------------------------------------------------------------

@router.get("/", response_model=dict)
async def list_tickets(
    session: SessionDep, current_user: CurrentUserDep, skip: int = 0, limit: int = 100
):
    """List all tickets (paginated)."""
    del current_user
    statement = apply_app_base_datetime(
        session=session,
        statement=select(Ticket),
        column=Ticket.flight_date,
    ).offset(skip).limit(limit)
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


@router.patch("/{ticket_id}", response_model=dict)
async def update_ticket(
    ticket_id: uuid.UUID,
    ticket_in: TicketUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Legacy write path retired in favor of the confirm-only ticket flow."""
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    del ticket_id, ticket_in, session, current_user
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Legacy ticket update is retired. Use the confirm flow for ticket writes.",
    )


@router.post("/{ticket_id}/void", response_model=dict)
async def void_ticket_route(
    ticket_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Reverse the confirmed ticket debt and mark the ticket VOID."""
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    result: TicketVoidResponse = void_confirmed_ticket(
        ticket_id=ticket_id,
        session=session,
        actor_user_id=current_user.id,
    )
    return success_response(result.model_dump())


@router.post("/{ticket_id}/refund", response_model=dict)
async def refund_ticket_route(
    ticket_id: uuid.UUID,
    payload: TicketRefundPayload,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Record a refund credit adjustment and mark the ticket REFUNDED."""
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    result: TicketRefundResponse = refund_confirmed_ticket(
        ticket_id=ticket_id,
        payload=payload,
        session=session,
        actor_user_id=current_user.id,
    )
    return success_response(result.model_dump())


@router.post("/{ticket_id}/reassign", response_model=dict)
async def reassign_ticket_route(
    ticket_id: uuid.UUID,
    payload: TicketReassignPayload,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Move a confirmed ticket and its debt to another customer."""
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    result: TicketReassignResponse = reassign_confirmed_ticket(
        ticket_id=ticket_id,
        payload=payload,
        session=session,
        actor_user_id=current_user.id,
    )
    return success_response(result.model_dump())


@router.patch("/{ticket_id}/correction", response_model=dict)
async def correct_ticket_route(
    ticket_id: uuid.UUID,
    ticket_in: TicketUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Admin-only correction for mutable confirmed ticket ledger rows."""
    require_user_roles(current_user, UserRole.ADMIN)
    result: TicketCorrectionResponse = correct_confirmed_ticket(
        ticket_id=ticket_id,
        payload=ticket_in,
        session=session,
    )
    return success_response(result.model_dump(mode="json"))


@router.delete("/{ticket_id}/correction", response_model=dict)
async def delete_ticket_correction_route(
    ticket_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Admin-only removal for mutable confirmed ticket ledger rows."""
    require_user_roles(current_user, UserRole.ADMIN)
    result: TicketCorrectionResponse = delete_confirmed_ticket_for_admin(
        ticket_id=ticket_id,
        session=session,
    )
    return success_response(result.model_dump(mode="json"))
