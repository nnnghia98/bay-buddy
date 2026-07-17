"""Thin HTTP-boundary tests for Workbook Editor V2 routes."""

from __future__ import annotations

import io
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.auth import get_current_user
from database import get_session
from models.enums import UserRole
from models.workbook import WorkbookSessionStatus
from routes import workbooks as routes
from services.workbook_reader import (
    WorkbookCellValueResult,
    WorkbookColumn,
    WorkbookPagination,
    WorkbookRecord,
    WorkbookRecordPage,
)
from services.workbook_service import (
    EditingSessionDescriptor,
    FormulaPreviewResult,
    FormulaPreviewRow,
    SessionCellValuesResult,
    SessionListResult,
    SessionRecordsResult,
    SessionSummaryDescriptor,
    WorkbookDownloadDescriptor,
    WorkbookSaveResult,
    WorkbookServiceError,
    WorkbookUploadResult,
)
from services.workbook_validation import MappingStatus, WorksheetInspection


NOW = datetime(2026, 7, 12, tzinfo=timezone.utc)
SESSION_ID = uuid.uuid4()
WORKBOOK_ID = uuid.uuid4()
USER_ID = uuid.uuid4()


@pytest.fixture()
def app(monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    application = FastAPI()
    application.include_router(routes.router, prefix="/api/v1/workbooks")
    application.dependency_overrides[get_session] = lambda: object()
    application.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=USER_ID,
        role=UserRole.STAFF,
    )
    monkeypatch.setattr(routes, "_workbook_storage", lambda: object())
    return application


@pytest.fixture()
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


def _session_descriptor() -> EditingSessionDescriptor:
    return EditingSessionDescriptor(
        id=SESSION_ID,
        workbook_id=WORKBOOK_ID,
        original_filename="prices.xlsx",
        selected_sheet_name="Tickets",
        header_row_number=1,
        column_mapping={"passenger_name": 1, "net_price": 2, "selling_price": 3},
        current_version=1,
        status=WorkbookSessionStatus.DRAFT,
        created_at=NOW,
        updated_at=NOW,
    )


def _session_summary() -> SessionSummaryDescriptor:
    return SessionSummaryDescriptor(
        id=SESSION_ID,
        display_name="July prices",
        original_filename="prices.xlsx",
        selected_sheet_name="Tickets",
        current_version=1,
        status=WorkbookSessionStatus.DRAFT,
        created_at=NOW,
        updated_at=NOW,
    )


def test_routes_require_authentication() -> None:
    application = FastAPI()
    application.include_router(routes.router, prefix="/api/v1/workbooks")
    application.dependency_overrides[get_session] = lambda: object()

    response = TestClient(application).get(f"/api/v1/workbooks/sessions/{SESSION_ID}")

    assert response.status_code == 401


def test_upload_middleware_rejects_declared_oversize_before_service(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    application = FastAPI()
    application.include_router(routes.router, prefix="/api/v1/workbooks")
    application.add_middleware(
        routes.WorkbookUploadSizeLimitMiddleware,
        max_file_bytes=4,
        overhead_allowance=0,
    )
    application.dependency_overrides[get_session] = lambda: object()
    application.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=USER_ID,
        role=UserRole.STAFF,
    )
    called = False

    def should_not_run(*_args, **_kwargs):
        nonlocal called
        called = True
        raise AssertionError("Upload service must not run.")

    monkeypatch.setattr(routes, "upload_workbook", should_not_run)
    response = TestClient(application).post(
        "/api/v1/workbooks/uploads",
        files={"file": ("large.xlsx", b"more than four bytes", "application/octet-stream")},
    )

    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "FILE_TOO_LARGE"
    assert called is False


@pytest.mark.anyio
async def test_upload_middleware_rejects_chunked_oversize_during_receive() -> None:
    downstream_completed = False

    async def downstream(scope, receive, send) -> None:
        nonlocal downstream_completed
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if not message.get("more_body", False):
                downstream_completed = True
                await send({"type": "http.response.start", "status": 204, "headers": []})
                await send({"type": "http.response.body", "body": b""})
                return

    middleware = routes.WorkbookUploadSizeLimitMiddleware(
        downstream,
        max_file_bytes=4,
        overhead_allowance=0,
    )
    chunks = iter(
        [
            {"type": "http.request", "body": b"abc", "more_body": True},
            {"type": "http.request", "body": b"def", "more_body": False},
        ]
    )
    sent: list[dict] = []

    async def receive() -> dict:
        return next(chunks)

    async def send(message: dict) -> None:
        sent.append(message)

    await middleware(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/workbooks/uploads",
            "headers": [],
        },
        receive,
        send,
    )

    assert downstream_completed is False
    assert sent[0]["status"] == 413


def test_create_session_returns_201_success_envelope(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict = {}

    def create_session(*args, **kwargs):
        captured.update(kwargs)
        return _session_descriptor()

    monkeypatch.setattr(routes, "create_editing_session", create_session)

    response = client.post(
        "/api/v1/workbooks/sessions",
        json={
            "workbook_id": str(WORKBOOK_ID),
            "sheet_name": "Tickets",
            "header_row_number": 2,
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["success"] is True
    assert payload["error"] is None
    assert payload["data"]["id"] == str(SESSION_ID)
    assert payload["data"]["current_version"] == 1
    assert captured["header_row_number"] == 2


def test_list_sessions_forwards_filters_and_returns_pagination(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict = {}

    def list_sessions(*args, **kwargs):
        captured.update(kwargs)
        return SessionListResult(
            items=(_session_summary(),),
            page=2,
            page_size=5,
            total=6,
            total_pages=2,
        )

    monkeypatch.setattr(routes, "list_editing_sessions", list_sessions)
    response = client.get(
        "/api/v1/workbooks/sessions",
        params={
            "page": 2,
            "page_size": 5,
            "search": "July",
            "status": "DRAFT",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["items"][0]["display_name"] == "July prices"
    assert response.json()["data"]["pagination"] == {
        "page": 2,
        "page_size": 5,
        "total": 6,
        "total_pages": 2,
    }
    assert captured["search"] == "July"
    assert captured["session_status"] == WorkbookSessionStatus.DRAFT


def test_rename_and_discard_routes_return_session_summaries(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    renamed = _session_summary()
    monkeypatch.setattr(
        routes,
        "rename_editing_session",
        lambda *args, **kwargs: renamed,
    )
    monkeypatch.setattr(
        routes,
        "discard_editing_session",
        lambda *args, **kwargs: SessionSummaryDescriptor(
            id=renamed.id,
            display_name=renamed.display_name,
            original_filename=renamed.original_filename,
            selected_sheet_name=renamed.selected_sheet_name,
            current_version=renamed.current_version,
            status=WorkbookSessionStatus.DISCARDED,
            created_at=renamed.created_at,
            updated_at=renamed.updated_at,
        ),
    )

    rename_response = client.patch(
        f"/api/v1/workbooks/sessions/{SESSION_ID}",
        json={"display_name": "July prices"},
    )
    discard_response = client.delete(
        f"/api/v1/workbooks/sessions/{SESSION_ID}"
    )

    assert rename_response.status_code == 200
    assert rename_response.json()["data"]["display_name"] == "July prices"
    assert discard_response.status_code == 200
    assert discard_response.json()["data"]["status"] == "DISCARDED"


def test_latest_session_returns_restorable_session(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        routes,
        "get_latest_editing_session",
        lambda *args, **kwargs: _session_descriptor(),
    )

    response = client.get("/api/v1/workbooks/sessions/latest")

    assert response.status_code == 200
    assert response.json()["data"]["id"] == str(SESSION_ID)


def test_upload_returns_typed_201_envelope(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def upload(*args, **kwargs):
        assert kwargs["filename"] == "prices.xlsx"
        assert kwargs["source"].read(4) == b"xlsx"
        return WorkbookUploadResult(
            id=WORKBOOK_ID,
            original_filename="prices.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            file_size=4,
            checksum="a" * 64,
            sheet_count=1,
            sheets=(
                WorksheetInspection(
                    name="Tickets",
                    max_row=2,
                    max_column=2,
                    header_row_number=1,
                    detected_headers=("Cost Price", "Selling Price"),
                    column_mapping={"net_price": 1, "selling_price": 2},
                    mapping_status=MappingStatus.READY,
                    missing_required_fields=(),
                    ambiguous_fields={},
                ),
            ),
            created_at=NOW,
        )

    monkeypatch.setattr(routes, "upload_workbook", upload)
    response = client.post(
        "/api/v1/workbooks/uploads",
        files={
            "file": (
                "prices.xlsx",
                b"xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["id"] == str(WORKBOOK_ID)
    assert data["sheets"][0]["mapping_status"] == "READY"


def test_get_session_maps_structured_service_error(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail(*args, **kwargs):
        raise WorkbookServiceError(
            "VERSION_CONFLICT",
            409,
            "Workbook session has a newer version.",
            details={"current_version": 4},
        )

    monkeypatch.setattr(routes, "get_editing_session", fail)
    response = client.get(f"/api/v1/workbooks/sessions/{SESSION_ID}")

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "VERSION_CONFLICT",
        "message": "Workbook session has a newer version.",
        "details": {"current_version": 4},
    }


def test_records_forwards_validated_query_and_returns_envelope(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict = {}

    def read_records(*args, **kwargs):
        captured.update(kwargs)
        return SessionRecordsResult(
            session_id=SESSION_ID,
            version=3,
            sheet_name="Tickets",
            page=WorkbookRecordPage(
                columns=(WorkbookColumn("source-passenger", "Hành khách", 1, False),),
                records=(
                    WorkbookRecord(2, {"source-passenger": "Nguyễn An"}, {}),
                ),
                pagination=WorkbookPagination(2, 1, 2, 2),
            ),
        )

    monkeypatch.setattr(routes, "read_session_records", read_records)
    response = client.get(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/records",
        params={
            "page": 2,
            "page_size": 1,
            "search": "Nguyễn",
            "sort_by": "source-passenger",
            "sort_direction": "desc",
        },
    )

    assert response.status_code == 200
    assert captured["page"] == 2
    assert captured["page_size"] == 1
    assert captured["search"] == "Nguyễn"
    assert captured["sort_by"] == "source-passenger"
    assert captured["sort_direction"] == "desc"
    data = response.json()["data"]
    assert data["version"] == 3
    assert data["items"][0]["row_number"] == 2


def test_cell_value_lookup_forwards_bounded_references_and_returns_ordered_values(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict = {}

    def lookup(*args, **kwargs):
        captured.update(kwargs)
        return SessionCellValuesResult(
            session_id=SESSION_ID,
            version=3,
            cells=(
                WorkbookCellValueResult(7, "source-b", None),
                WorkbookCellValueResult(2, "source-a", "Nguyễn An"),
            ),
        )

    monkeypatch.setattr(routes, "lookup_session_cell_values", lookup)
    response = client.post(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/cell-values",
        json={
            "base_version": 3,
            "cells": [
                {"row_number": 7, "column_id": "source-b"},
                {"row_number": 2, "column_id": "source-a"},
            ],
        },
    )

    assert response.status_code == 200
    assert captured["base_version"] == 3
    assert captured["max_cells"] == 500
    assert [(cell.row_number, cell.column_id) for cell in captured["cells"]] == [
        (7, "source-b"),
        (2, "source-a"),
    ]
    assert response.json()["data"]["cells"] == [
        {"row_number": 7, "column_id": "source-b", "value": None},
        {"row_number": 2, "column_id": "source-a", "value": "Nguyễn An"},
    ]

    duplicate = client.post(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/cell-values",
        json={
            "base_version": 3,
            "cells": [
                {"row_number": 2, "column_id": "source-a"},
                {"row_number": 2, "column_id": "source-a"},
            ],
        },
    )
    assert duplicate.status_code == 422


def test_formula_preview_and_column_update_routes_forward_versioned_ast(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    formula = {
        "schema_version": 1,
        "expression": {
            "type": "binary",
            "operator": "-",
            "left": {"type": "column", "column_id": "sale"},
            "right": {"type": "column", "column_id": "fare"},
        },
    }
    preview_capture: dict = {}
    update_capture: dict = {}

    def preview(*args, **kwargs):
        preview_capture.update(kwargs)
        return FormulaPreviewResult(
            valid=True,
            normalized_formula=formula,
            readable_expression="(Sale - Fare)",
            referenced_column_ids=("sale", "fare"),
            results=(FormulaPreviewRow(row_number=2, value=200_000),),
        )

    def update(*args, **kwargs):
        update_capture.update(kwargs)
        return _session_descriptor()

    monkeypatch.setattr(routes, "preview_session_formula", preview)
    monkeypatch.setattr(routes, "update_session_column", update)
    preview_response = client.post(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/formulas/preview",
        json={
            "base_version": 1,
            "formula": formula,
            "output_type": "currency",
            "sample_rows": [2],
        },
    )
    update_response = client.patch(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/columns/user-profit",
        json={
            "base_version": 1,
            "label": "Profit",
            "data_type": "currency",
            "formula": formula,
        },
    )

    assert preview_response.status_code == 200
    assert preview_response.json()["data"]["results"][0]["value"] == 200_000
    assert preview_capture["formula"] == formula
    assert preview_capture["sample_rows"] == [2]
    assert update_response.status_code == 200
    assert update_capture["column_id"] == "user-profit"
    assert update_capture["formula"] == formula
    assert update_capture["formula_was_provided"] is True


def test_formula_preview_requires_authentication() -> None:
    application = FastAPI()
    application.include_router(routes.router, prefix="/api/v1/workbooks")
    application.dependency_overrides[get_session] = lambda: object()
    response = TestClient(application).post(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/formulas/preview",
        json={
            "base_version": 1,
            "output_type": "number",
            "formula": {"schema_version": 1, "expression": {"type": "constant", "value": "1"}},
        },
    )
    assert response.status_code == 401


def test_save_converts_request_and_returns_version_response(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    request_id = uuid.uuid4()
    operation_id = uuid.uuid4()
    captured: dict = {}

    def save(*args, **kwargs):
        captured.update(kwargs)
        return WorkbookSaveResult(
            operation_id=operation_id,
            request_id=request_id,
            previous_version=1,
            current_version=2,
            changed_cells=2,
            saved_at=NOW,
            checksum="a" * 64,
            file_size=123,
        )

    monkeypatch.setattr(routes, "save_session_changes", save)
    response = client.post(
        f"/api/v1/workbooks/sessions/{SESSION_ID}/saves",
        json={
            "request_id": str(request_id),
            "base_version": 1,
            "changes": [
                {
                    "row_number": 2,
                    "values": {"net_price": 1000000, "selling_price": 1200000},
                }
            ],
        },
    )

    assert response.status_code == 201
    assert captured["base_version"] == 1
    assert captured["changes"][0].row_number == 2
    assert captured["changes"][0].values == {
        "net_price": 1_000_000,
        "selling_price": 1_200_000,
    }
    assert response.json()["data"]["operation_id"] == str(operation_id)
    assert response.json()["data"]["current_version"] == 2


class TrackedStream(io.BytesIO):
    was_closed = False

    def close(self) -> None:
        self.was_closed = True
        super().close()


def test_download_streams_headers_and_closes_stream(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    stream = TrackedStream(b"xlsx bytes")
    descriptor = WorkbookDownloadDescriptor(
        stream=stream,
        filename="Bảng giá-edited-v3.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        checksum="b" * 64,
        file_size=10,
        version=3,
    )
    monkeypatch.setattr(routes, "get_current_download", lambda *args, **kwargs: descriptor)

    response = client.get(f"/api/v1/workbooks/sessions/{SESSION_ID}/download")

    assert response.status_code == 200
    assert response.content == b"xlsx bytes"
    assert response.headers["content-length"] == "10"
    assert response.headers["etag"] == f'"{"b" * 64}"'
    assert response.headers["x-workbook-version"] == "3"
    assert "filename*=UTF-8''" in response.headers["content-disposition"]
    assert stream.was_closed is True


def test_download_streams_in_bounded_chunks(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = b"x" * (routes._DOWNLOAD_CHUNK_SIZE + 17)
    stream = TrackedStream(content)
    descriptor = WorkbookDownloadDescriptor(
        stream=stream,
        filename="prices-edited-v1.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        checksum="c" * 64,
        file_size=len(content),
        version=1,
    )
    monkeypatch.setattr(
        routes,
        "get_current_download",
        lambda *args, **kwargs: descriptor,
    )

    response = client.get(f"/api/v1/workbooks/sessions/{SESSION_ID}/download")

    assert response.content == content
    assert stream.was_closed is True


def test_download_chunk_generator_closes_on_early_disconnect() -> None:
    stream = TrackedStream(b"partial response")
    chunks = routes._stream_chunks(stream)

    assert next(chunks) == b"partial response"
    chunks.close()

    assert stream.was_closed is True
