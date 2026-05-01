from datetime import datetime
import uuid

from fastapi import APIRouter, Query, status

from core.auth import CurrentUserDep, require_user_roles
from core.responses import success_response
from database import SessionDep
from models.enums import InvoiceStatus, UserRole
from models.invoice import (
    InvoiceCreate,
    InvoiceListFilters,
    InvoiceStatusUpdate,
    InvoiceUpdate,
)
from models.quote import QuoteCreate
from services.invoice_service import (
    convert_quote_to_invoice,
    create_invoice,
    get_invoice_detail,
    get_invoice_public_view,
    list_invoices,
    update_invoice,
    update_invoice_status,
)
from services.quote_service import create_quote, get_quote_detail

router = APIRouter()


@router.post("/invoices", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_invoice_route(
    payload: InvoiceCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Generate a draft invoice from selected tickets in one atomic transaction."""
    require_user_roles(current_user, UserRole.ADMIN)
    invoice = create_invoice(session=session, payload=payload)
    return success_response(invoice.model_dump(mode="json"))


@router.get("/invoices", response_model=dict)
async def list_invoices_route(
    customer_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    status: InvoiceStatus | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
):
    """List customer invoices with optional status/date filters."""
    del current_user
    invoices = list_invoices(
        session=session,
        filters=InvoiceListFilters(
            customer_id=customer_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        ),
    )
    return success_response([invoice.model_dump(mode="json") for invoice in invoices])


@router.get("/invoices/{invoice_id}", response_model=dict)
async def get_invoice_route(
    invoice_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Fetch full invoice details including line items and amount in words."""
    del current_user
    invoice = get_invoice_detail(session=session, invoice_id=invoice_id)
    return success_response(invoice.model_dump(mode="json"))


@router.get("/invoices/{invoice_id}/public", response_model=dict)
async def get_invoice_public_route(
    invoice_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Return a printable/public invoice payload using immutable snapshots only."""
    del current_user
    invoice = get_invoice_public_view(session=session, invoice_id=invoice_id)
    return success_response(invoice.model_dump(mode="json"))


@router.patch("/invoices/{invoice_id}", response_model=dict)
async def update_invoice_route(
    invoice_id: uuid.UUID,
    payload: InvoiceUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Update mutable draft invoice fields. Issued/paid invoices are read-only."""
    require_user_roles(current_user, UserRole.ADMIN)
    invoice = update_invoice(session=session, invoice_id=invoice_id, payload=payload)
    return success_response(invoice.model_dump(mode="json"))


@router.patch("/invoices/{invoice_id}/status", response_model=dict)
async def update_invoice_status_route(
    invoice_id: uuid.UUID,
    payload: InvoiceStatusUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Update invoice lifecycle status and lock linked transactions on issue."""
    require_user_roles(current_user, UserRole.ADMIN)
    invoice = update_invoice_status(
        session=session,
        invoice_id=invoice_id,
        next_status=payload.status,
    )
    return success_response(invoice.model_dump(mode="json"))


@router.post("/quotes", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_quote_route(
    payload: QuoteCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Create an informational quote without touching the ledger."""
    require_user_roles(current_user, UserRole.ADMIN)
    quote = create_quote(session=session, payload=payload)
    return success_response(quote.model_dump(mode="json"))


@router.get("/quotes/{quote_id}", response_model=dict)
async def get_quote_route(
    quote_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Fetch full quote details from immutable snapshot fields."""
    del current_user
    quote = get_quote_detail(session=session, quote_id=quote_id)
    return success_response(quote.model_dump(mode="json"))


@router.post("/quotes/{quote_id}/convert-to-invoice", response_model=dict)
async def convert_quote_to_invoice_route(
    quote_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Accept a quote and convert it into a draft invoice."""
    require_user_roles(current_user, UserRole.ADMIN)
    result = convert_quote_to_invoice(session=session, quote_id=quote_id)
    return success_response(result.model_dump(mode="json"))
