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
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import String, cast, func, or_
from sqlmodel import select

from core.auth import CurrentUserDep, require_user_roles
from core.pagination import build_pagination, normalize_page, normalize_page_size
from database import SessionDep
from core.responses import success_response
from models.enums import TicketStatus, UserRole
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
        "optionally records a linked customer payment, and updates the customer "
        "balance. All changes are committed atomically. "
        "Business rule: true_income = selling_price + discount - (ev_price + ast_price + thf_price + web_price + insurance_price) "
        "(BUSINESS.md §2)."
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
    2. Compute income from selling price, discount, EV/AST/THF/WEB host net prices, and insurance.
    3. Persist Ticket with status = CONFIRMED.
    4. Persist CHARGE Transaction (auto-debt) linked to the customer.
    5. Optionally persist a linked PAYMENT Transaction.
    6. Apply both transaction effects to customer.balance.
    """
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    result: TicketConfirmResponse = create_ticket_with_transaction(
        payload=payload,
        session=session,
        actor_user_id=current_user.id,
    )

    return success_response(
        {
            "ticket": result.ticket.model_dump(),
            "transaction_id": str(result.transaction_id),
            "payment_transaction_id": (
                str(result.payment_transaction_id)
                if result.payment_transaction_id is not None
                else None
            ),
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
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    q: str | None = Query(default=None, max_length=100),
    status_filter: TicketStatus | None = Query(default=None, alias="status"),
    from_value: datetime | None = Query(default=None, alias="from"),
    to_value: datetime | None = Query(default=None, alias="to"),
    page: int | None = Query(default=None, ge=1),
    page_size: int | None = Query(default=None, ge=1, le=100),
):
    """List tickets with optional filters and page metadata."""
    del current_user

    filters = []
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        filters.append(
            or_(
                Ticket.pnr.ilike(search_pattern),
                Ticket.ticket_number.ilike(search_pattern),
                Ticket.itinerary.ilike(search_pattern),
                Ticket.departure_place.ilike(search_pattern),
                Ticket.arrival_place.ilike(search_pattern),
                Ticket.departure_code.ilike(search_pattern),
                Ticket.arrival_code.ilike(search_pattern),
                cast(Ticket.passengers, String).ilike(search_pattern),
            )
        )
    if status_filter is not None:
        filters.append(Ticket.status == status_filter)
    if from_value is not None:
        filters.append(
            Ticket.updated_at
            >= (
                from_value.astimezone(timezone.utc).replace(tzinfo=None)
                if from_value.tzinfo
                else from_value
            )
        )
    if to_value is not None:
        filters.append(
            Ticket.updated_at
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
    statement = select(Ticket)
    if filters:
        statement = statement.where(*filters)
    statement = apply_app_base_datetime(
        session=session,
        statement=statement,
        column=Ticket.updated_at,
    ).order_by(Ticket.updated_at, Ticket.id).offset(offset).limit(effective_page_size)
    tickets = session.exec(statement).all()
    tickets_data = [TicketRead.model_validate(t).model_dump() for t in tickets]

    if not is_paged:
        return success_response(tickets_data)

    count_statement = select(func.count()).select_from(Ticket)
    if filters:
        count_statement = count_statement.where(*filters)
    count_statement = apply_app_base_datetime(
        session=session,
        statement=count_statement,
        column=Ticket.updated_at,
    )
    total = session.exec(count_statement).one()
    return success_response(
        {
            "items": tickets_data,
            "pagination": build_pagination(
                page=page_number,
                page_size=effective_page_size,
                total=total,
            ),
        }
    )


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
