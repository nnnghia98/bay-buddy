"""Authenticated HTTP boundary for Workbook Editor V2."""

from __future__ import annotations

import re
import uuid
from functools import lru_cache
from typing import Annotated, Any, BinaryIO, Callable, Iterator, TypeVar
from urllib.parse import quote

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse, StreamingResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from core.auth import CurrentUserDep, require_user_roles
from core.responses import success_response
from core.settings import settings
from database import SessionDep
from models.enums import UserRole
from schemas.workbook import (
    MAX_CELL_VALUE_LOOKUPS,
    WorkbookAddColumnRequest,
    WorkbookCellValueLookupRequest,
    WorkbookCellValueLookupResponse,
    WorkbookRemoveColumnRequest,
    WorkbookColumnConfigurationRequest,
    WorkbookErrorDetail,
    WorkbookErrorResponse,
    WorkbookFormulaPreviewRequest,
    WorkbookFormulaPreviewResponse,
    WorkbookRecordsPage,
    WorkbookRecordsQuery,
    WorkbookSaveRequest,
    WorkbookSaveResponse,
    WorkbookSessionCreateRequest,
    WorkbookSessionListQuery,
    WorkbookSessionListResponse,
    WorkbookSessionRenameRequest,
    WorkbookSessionResponse,
    WorkbookSessionSummary,
    WorkbookUploadResponse,
    WorkbookSuccessResponse,
    WorkbookUpdateColumnRequest,
    WorksheetInspectionResponse,
)
from services.workbook_mutation import PriceChange
from services.workbook_reader import WorkbookCellReference
from services.workbook_service import (
    WorkbookServiceError,
    add_session_column,
    remove_session_column,
    update_session_column_configuration,
    create_editing_session,
    discard_editing_session,
    get_current_download,
    get_editing_session,
    get_latest_editing_session,
    list_editing_sessions,
    lookup_session_cell_values,
    preview_session_formula,
    read_session_records,
    rename_editing_session,
    save_session_changes,
    update_session_column,
    upload_workbook,
)
from storage.workbooks import LocalWorkbookStorage, WorkbookStorage


router = APIRouter()
_T = TypeVar("_T")
_DOWNLOAD_CHUNK_SIZE = 1024 * 1024
_MULTIPART_OVERHEAD_ALLOWANCE = 1024 * 1024
_ERROR_RESPONSE = {"model": WorkbookErrorResponse}
_VALIDATION_RESPONSE = {
    "description": "Workbook domain error or request validation error.",
    "content": {
        "application/json": {
            "schema": {
                "oneOf": [
                    {"$ref": "#/components/schemas/WorkbookErrorResponse"},
                    {"$ref": "#/components/schemas/HTTPValidationError"},
                ]
            }
        }
    },
}
_DOWNLOAD_RESPONSE = {
    "description": "Current immutable workbook version.",
    "content": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
            "schema": {"type": "string", "format": "binary"}
        }
    },
}


class WorkbookUploadSizeLimitMiddleware:
    """Reject oversized workbook requests before multipart parsing."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        max_file_bytes: int,
        overhead_allowance: int = _MULTIPART_OVERHEAD_ALLOWANCE,
    ) -> None:
        self.app = app
        self.max_request_bytes = max_file_bytes + overhead_allowance

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if (
            scope["type"] == "http"
            and scope.get("method") == "POST"
            and scope.get("path") == "/api/v1/workbooks/uploads"
        ):
            headers = dict(scope.get("headers", []))
            raw_length = headers.get(b"content-length")
            try:
                content_length = int(raw_length) if raw_length is not None else None
            except ValueError:
                content_length = None
            if content_length is not None and content_length > self.max_request_bytes:
                response = JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": {
                            "code": "FILE_TOO_LARGE",
                            "message": "Workbook exceeds the upload size limit.",
                            "details": {},
                        }
                    },
                )
                await response(scope, receive, send)
                return

            received_bytes = 0
            rejected = False

            async def limited_receive() -> dict[str, Any]:
                nonlocal received_bytes, rejected
                message = await receive()
                if message.get("type") != "http.request":
                    return message
                received_bytes += len(message.get("body", b""))
                if received_bytes > self.max_request_bytes:
                    rejected = True
                    # Starlette's multipart parser sees a clean disconnect. The
                    # outer middleware owns the final, stable error response.
                    return {"type": "http.disconnect"}
                return message

            async def limited_send(message: dict[str, Any]) -> None:
                if not rejected:
                    await send(message)

            await self.app(scope, limited_receive, limited_send)
            if rejected:
                response = JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": {
                            "code": "FILE_TOO_LARGE",
                            "message": "Workbook exceeds the upload size limit.",
                            "details": {},
                        }
                    },
                )
                await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


@lru_cache(maxsize=1)
def _workbook_storage() -> WorkbookStorage:
    return LocalWorkbookStorage(settings.workbook_storage_root)


def _authorize(current_user: Any) -> None:
    require_user_roles(current_user, UserRole.ADMIN, UserRole.STAFF)


def _raise_http_error(error: WorkbookServiceError) -> None:
    detail = WorkbookErrorDetail(
        code=error.code,
        message=error.message,
        details=error.details,
    )
    raise HTTPException(
        status_code=error.status_code,
        detail=detail.model_dump(mode="json"),
    ) from error


async def _call_service(function: Callable[..., _T], *args: Any, **kwargs: Any) -> _T:
    try:
        return await run_in_threadpool(function, *args, **kwargs)
    except WorkbookServiceError as error:
        _raise_http_error(error)


def _session_response(result: Any) -> WorkbookSessionResponse:
    return WorkbookSessionResponse(
        id=result.id,
        workbook_id=result.workbook_id,
        original_filename=result.original_filename,
        selected_sheet_name=result.selected_sheet_name,
        header_row_number=result.header_row_number,
        column_mapping=result.column_mapping,
        column_config=result.column_config,
        current_version=result.current_version,
        status=result.status,
        created_at=result.created_at,
        updated_at=result.updated_at,
    )


def _session_summary_response(result: Any) -> WorkbookSessionSummary:
    return WorkbookSessionSummary(
        id=result.id,
        display_name=result.display_name,
        original_filename=result.original_filename,
        selected_sheet_name=result.selected_sheet_name,
        current_version=result.current_version,
        status=result.status,
        created_at=result.created_at,
        updated_at=result.updated_at,
    )


@router.post(
    "/uploads",
    response_model=WorkbookSuccessResponse[WorkbookUploadResponse],
    status_code=status.HTTP_201_CREATED,
    responses={
        413: _ERROR_RESPONSE,
        415: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def upload_workbook_route(
    *,
    db: SessionDep,
    current_user: CurrentUserDep,
    file: UploadFile = File(..., description="Excel .xlsx or legacy .xls workbook."),
):
    _authorize(current_user)
    try:
        result = await _call_service(
            upload_workbook,
            db,
            _workbook_storage(),
            actor=current_user,
            filename=file.filename or "",
            mime_type=file.content_type or "application/octet-stream",
            source=file.file,
            max_upload_bytes=settings.workbook_max_upload_bytes,
            max_rows=settings.workbook_max_rows,
            max_columns=settings.workbook_max_columns,
        )
    finally:
        await file.close()

    response = WorkbookUploadResponse(
        id=result.id,
        original_filename=result.original_filename,
        mime_type=result.mime_type,
        file_size=result.file_size,
        checksum=result.checksum,
        sheet_count=result.sheet_count,
        sheets=[WorksheetInspectionResponse.from_domain(sheet) for sheet in result.sheets],
        created_at=result.created_at,
    )
    return success_response(response.model_dump(mode="json"))


@router.post(
    "/sessions",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    status_code=status.HTTP_201_CREATED,
    responses={
        404: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def create_editing_session_route(
    payload: WorkbookSessionCreateRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        create_editing_session,
        db,
        _workbook_storage(),
        actor=current_user,
        workbook_id=payload.workbook_id,
        sheet_name=payload.sheet_name,
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.get(
    "/sessions",
    response_model=WorkbookSuccessResponse[WorkbookSessionListResponse],
    responses={422: _VALIDATION_RESPONSE, 500: _ERROR_RESPONSE},
)
async def list_editing_sessions_route(
    query: Annotated[WorkbookSessionListQuery, Query()],
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        list_editing_sessions,
        db,
        actor=current_user,
        page=query.page,
        page_size=query.page_size,
        search=query.search,
        session_status=query.status,
    )
    response = WorkbookSessionListResponse(
        items=[_session_summary_response(item) for item in result.items],
        pagination={
            "page": result.page,
            "page_size": result.page_size,
            "total": result.total,
            "total_pages": result.total_pages,
        },
    )
    return success_response(response.model_dump(mode="json"))


@router.get(
    "/sessions/latest",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    responses={404: _ERROR_RESPONSE, 422: _VALIDATION_RESPONSE, 500: _ERROR_RESPONSE},
)
async def get_latest_editing_session_route(
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        get_latest_editing_session,
        db,
        actor=current_user,
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.patch(
    "/sessions/{session_id}",
    response_model=WorkbookSuccessResponse[WorkbookSessionSummary],
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def rename_editing_session_route(
    session_id: uuid.UUID,
    payload: WorkbookSessionRenameRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        rename_editing_session,
        db,
        actor=current_user,
        session_id=session_id,
        display_name=payload.display_name,
    )
    return success_response(_session_summary_response(result).model_dump(mode="json"))


@router.delete(
    "/sessions/{session_id}",
    response_model=WorkbookSuccessResponse[WorkbookSessionSummary],
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def discard_editing_session_route(
    session_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        discard_editing_session,
        db,
        actor=current_user,
        session_id=session_id,
    )
    return success_response(_session_summary_response(result).model_dump(mode="json"))


@router.get(
    "/sessions/{session_id}",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    responses={404: _ERROR_RESPONSE, 422: _VALIDATION_RESPONSE, 500: _ERROR_RESPONSE},
)
async def get_editing_session_route(
    session_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        get_editing_session,
        db,
        actor=current_user,
        session_id=session_id,
        storage=_workbook_storage(),
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.get(
    "/sessions/{session_id}/records",
    response_model=WorkbookSuccessResponse[WorkbookRecordsPage],
    responses={404: _ERROR_RESPONSE, 422: _VALIDATION_RESPONSE, 500: _ERROR_RESPONSE},
)
async def read_session_records_route(
    session_id: uuid.UUID,
    query: Annotated[WorkbookRecordsQuery, Query()],
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        read_session_records,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        page=query.page,
        page_size=query.page_size,
        max_page_size=settings.workbook_max_page_size,
        search=query.search,
        sort_by=query.sort_by,
        sort_direction=query.sort_direction.value,
    )
    response = WorkbookRecordsPage(
        session_id=result.session_id,
        version=result.version,
        sheet_name=result.sheet_name,
        columns=[
            {
                "field": column.field,
                "id": column.id or column.field,
                "label": column.header,
                "editable": column.editable,
                "semantic_field": column.semantic_field,
                "origin": column.origin,
                "data_type": column.data_type,
                "hidden": column.hidden,
                "sticky": column.sticky,
                "group_label": column.group_label,
                "header_row_span": column.header_row_span,
                "formula": column.formula,
                "number_format": column.number_format,
            }
            for column in result.page.columns
        ],
        header_row_count=result.page.header_row_count,
        items=[
            {
                "row_number": record.row_number,
                "values": record.values,
                "editable": record.editable,
            }
            for record in result.page.records
        ],
        pagination={
            "page": result.page.pagination.page,
            "page_size": result.page.pagination.page_size,
            "total": result.page.pagination.total,
            "total_pages": result.page.pagination.total_pages,
        },
    )
    return success_response(response.model_dump(mode="json"))


@router.post(
    "/sessions/{session_id}/cell-values",
    response_model=WorkbookSuccessResponse[WorkbookCellValueLookupResponse],
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def lookup_session_cell_values_route(
    session_id: uuid.UUID,
    payload: WorkbookCellValueLookupRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        lookup_session_cell_values,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        base_version=payload.base_version,
        cells=[
            WorkbookCellReference(
                row_number=cell.row_number,
                column_id=cell.column_id,
            )
            for cell in payload.cells
        ],
        max_cells=MAX_CELL_VALUE_LOOKUPS,
    )
    response = WorkbookCellValueLookupResponse(
        session_id=result.session_id,
        version=result.version,
        cells=[
            {
                "row_number": cell.row_number,
                "column_id": cell.column_id,
                "value": cell.value,
            }
            for cell in result.cells
        ],
    )
    return success_response(response.model_dump(mode="json"))


@router.post(
    "/sessions/{session_id}/formulas/preview",
    response_model=WorkbookSuccessResponse[WorkbookFormulaPreviewResponse],
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def preview_session_formula_route(
    session_id: uuid.UUID,
    payload: WorkbookFormulaPreviewRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        preview_session_formula,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        base_version=payload.base_version,
        formula=payload.formula.model_dump(mode="json"),
        output_type=payload.output_type.value,
        output_column_id=payload.output_column_id,
        sample_rows=payload.sample_rows,
    )
    response = WorkbookFormulaPreviewResponse(
        valid=result.valid,
        normalized_formula=result.normalized_formula,
        readable_expression=result.readable_expression,
        referenced_column_ids=list(result.referenced_column_ids),
        results=[
            {
                "row_number": row.row_number,
                "value": row.value,
                "error_code": row.error_code,
                "error_message": row.error_message,
            }
            for row in result.results
        ],
        errors=list(result.errors),
        warnings=list(result.warnings),
    )
    return success_response(response.model_dump(mode="json"))


@router.post(
    "/sessions/{session_id}/columns",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    status_code=status.HTTP_201_CREATED,
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def add_session_column_route(
    session_id: uuid.UUID,
    payload: WorkbookAddColumnRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        add_session_column,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        base_version=payload.base_version,
        label=payload.label,
        data_type=payload.data_type.value,
        formula=(payload.formula.model_dump(mode="json") if payload.formula else None),
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.patch(
    "/sessions/{session_id}/columns/{column_id}",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def update_session_column_route(
    session_id: uuid.UUID,
    column_id: str,
    payload: WorkbookUpdateColumnRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        update_session_column,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        column_id=column_id,
        base_version=payload.base_version,
        label=payload.label,
        data_type=payload.data_type.value if payload.data_type else None,
        formula=(payload.formula.model_dump(mode="json") if payload.formula else None),
        formula_was_provided=payload.formula_was_provided,
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.post(
    "/sessions/{session_id}/columns/{column_id}/remove",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    status_code=status.HTTP_201_CREATED,
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def remove_session_column_route(
    session_id: uuid.UUID,
    column_id: str,
    payload: WorkbookRemoveColumnRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        remove_session_column,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        column_id=column_id,
        base_version=payload.base_version,
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.patch(
    "/sessions/{session_id}/column-configuration",
    response_model=WorkbookSuccessResponse[WorkbookSessionResponse],
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def update_session_column_configuration_route(
    session_id: uuid.UUID,
    payload: WorkbookColumnConfigurationRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    result = await _call_service(
        update_session_column_configuration,
        db,
        actor=current_user,
        session_id=session_id,
        base_version=payload.base_version,
        hidden_column_ids=payload.hidden_column_ids,
        sticky_column_ids=payload.sticky_column_ids,
    )
    return success_response(_session_response(result).model_dump(mode="json"))


@router.post(
    "/sessions/{session_id}/saves",
    response_model=WorkbookSuccessResponse[WorkbookSaveResponse],
    status_code=status.HTTP_201_CREATED,
    responses={
        404: _ERROR_RESPONSE,
        409: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def save_session_changes_route(
    session_id: uuid.UUID,
    payload: WorkbookSaveRequest,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    changes = [
        PriceChange(
            row_number=change.row_number,
            values=change.values.model_dump(exclude_unset=True),
        )
        for change in payload.changes
    ]
    result = await _call_service(
        save_session_changes,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
        request_id=payload.request_id,
        base_version=payload.base_version,
        changes=changes,
        max_changes=500,
    )
    response = WorkbookSaveResponse(
        operation_id=result.operation_id,
        request_id=result.request_id,
        previous_version=result.previous_version,
        current_version=result.current_version,
        changed_cells=result.changed_cells,
        saved_at=result.saved_at,
    )
    return success_response(response.model_dump(mode="json"))


def _content_disposition(filename: str) -> str:
    fallback = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip("-.")
    fallback = fallback[:200] or "workbook-edited.xlsx"
    return f'attachment; filename="{fallback}"; filename*=UTF-8\'\'{quote(filename, safe="")}'


def _stream_chunks(stream: BinaryIO) -> Iterator[bytes]:
    try:
        while chunk := stream.read(_DOWNLOAD_CHUNK_SIZE):
            yield chunk
    finally:
        stream.close()


@router.get(
    "/sessions/{session_id}/download",
    response_class=StreamingResponse,
    responses={
        200: _DOWNLOAD_RESPONSE,
        404: _ERROR_RESPONSE,
        422: _VALIDATION_RESPONSE,
        500: _ERROR_RESPONSE,
    },
)
async def download_current_workbook_route(
    session_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUserDep,
):
    _authorize(current_user)
    descriptor = await _call_service(
        get_current_download,
        db,
        _workbook_storage(),
        actor=current_user,
        session_id=session_id,
    )
    headers = {
        "Content-Disposition": _content_disposition(descriptor.filename),
        "Content-Length": str(descriptor.file_size),
        "ETag": f'"{descriptor.checksum}"',
        "X-Workbook-Version": str(descriptor.version),
    }
    return StreamingResponse(
        _stream_chunks(descriptor.stream),
        media_type=descriptor.mime_type,
        headers=headers,
        background=BackgroundTask(descriptor.stream.close),
    )
