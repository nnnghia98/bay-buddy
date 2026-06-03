"""
routes/ticket_imports.py – Customer-safe ticket import endpoints.

Two intake paths are supported:
    - authenticated upload of email HTML / .eml from Bay Buddy staff
    - provider-authenticated inbound email webhook for forwarded itineraries
"""

from __future__ import annotations

import hmac
import uuid
from typing import Any

from fastapi import APIRouter, File, Header, HTTPException, Request, UploadFile, status

from core.auth import CurrentUserDep, require_user_roles
from core.responses import success_response
from core.settings import settings
from database import SessionDep
from models.enums import UserRole
from services.inbound_email_service import (
    InboundEmailContent,
    normalize_inbound_payload,
    parse_eml_bytes,
)
from services.ticket_import_service import (
    create_import_from_email,
    create_import_from_upload,
    get_ticket_import,
    list_ticket_imports,
)

router = APIRouter()

ALLOWED_IMPORT_MIME_TYPES = {
    "text/html",
    "message/rfc822",
}


def _resolve_upload_mime_type(file: UploadFile) -> str:
    mime_type = file.content_type or "application/octet-stream"
    filename = (file.filename or "").lower()
    if mime_type == "application/octet-stream":
        if filename.endswith(".eml"):
            return "message/rfc822"
        if filename.endswith((".html", ".htm")):
            return "text/html"
        if filename.endswith(".txt"):
            return "text/plain"
    return mime_type


def _verify_inbound_secret(secret_header: str | None) -> None:
    configured_secret = settings.ticket_import_webhook_secret
    if not configured_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ticket import webhook secret is not configured.",
        )

    if not secret_header or not hmac.compare_digest(secret_header, configured_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ticket import webhook secret.",
        )


async def _request_payload(request: Request) -> dict[str, Any]:
    content_type = request.headers.get("content-type", "").split(";")[0].lower()
    if content_type == "application/json":
        payload = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Inbound email JSON payload must be an object.",
            )
        return payload

    form = await request.form()
    return dict(form)


async def _extract_email_content(request: Request) -> InboundEmailContent:
    content_type = request.headers.get("content-type", "").split(";")[0].lower()

    if content_type == "message/rfc822":
        return parse_eml_bytes(await request.body())

    if content_type in {"text/html", "text/plain"}:
        body = (await request.body()).decode("utf-8", errors="replace")
        return InboundEmailContent(
            sender_email=request.headers.get("from"),
            recipient_email=request.headers.get("to"),
            subject=request.headers.get("subject"),
            provider_message_id=request.headers.get("message-id"),
            html_body=body if content_type == "text/html" else None,
            text_body=body if content_type == "text/plain" else None,
        )

    return normalize_inbound_payload(await _request_payload(request))


@router.get("/", response_model=dict)
async def list_imports_route(
    *,
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = 50,
):
    """Return recent customer-safe ticket imports for staff review."""

    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    imports = list_ticket_imports(session=session, limit=min(max(limit, 1), 100))
    return success_response([item.model_dump(mode="json") for item in imports])


@router.get("/{import_id}", response_model=dict)
async def get_import_route(
    import_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Return one customer-safe ticket import for staff review."""

    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)
    ticket_import = get_ticket_import(import_id=import_id, session=session)
    if ticket_import is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket import not found.",
        )
    return success_response(ticket_import.model_dump(mode="json"))


@router.post("/uploads", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_upload_import_route(
    *,
    session: SessionDep,
    current_user: CurrentUserDep,
    file: UploadFile = File(..., description="Ticket email HTML or .eml file."),
):
    """Create a pending import from an authenticated staff upload."""

    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)

    mime_type = _resolve_upload_mime_type(file)
    if mime_type not in ALLOWED_IMPORT_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{mime_type}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_IMPORT_MIME_TYPES))}"
            ),
        )

    file_bytes = await file.read()
    if len(file_bytes) > settings.ticket_import_max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded ticket file is too large.",
        )

    ticket_import = await create_import_from_upload(
        file_bytes=file_bytes,
        filename=file.filename,
        mime_type=mime_type,
        created_by=current_user.id,
        session=session,
    )
    return success_response(ticket_import.model_dump(mode="json"))


@router.post("/inbound-email", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_inbound_email_import_route(
    request: Request,
    session: SessionDep,
    x_bay_buddy_inbound_secret: str | None = Header(default=None),
    x_bay_buddy_webhook_secret: str | None = Header(default=None),
):
    """Receive a forwarded airline itinerary from an inbound email provider."""

    _verify_inbound_secret(
        x_bay_buddy_inbound_secret or x_bay_buddy_webhook_secret
    )
    email_content = await _extract_email_content(request)
    try:
        ticket_import = create_import_from_email(
            email_content=email_content,
            session=session,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    return success_response(ticket_import.model_dump(mode="json"))
