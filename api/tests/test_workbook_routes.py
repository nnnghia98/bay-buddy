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
    WorkbookColumn,
    WorkbookPagination,
    WorkbookRecord,
    WorkbookRecordPage,
)
from services.workbook_service import (
    EditingSessionDescriptor,
    SessionRecordsResult,
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


def test_create_session_returns_201_success_envelope(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(routes, "create_editing_session", lambda *args, **kwargs: _session_descriptor())

    response = client.post(
        "/api/v1/workbooks/sessions",
        json={"workbook_id": str(WORKBOOK_ID), "sheet_name": "Tickets"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["success"] is True
    assert payload["error"] is None
    assert payload["data"]["id"] == str(SESSION_ID)
    assert payload["data"]["current_version"] == 1


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
                columns=(WorkbookColumn("passenger_name", "Hành khách", 1, False),),
                records=(
                    WorkbookRecord(2, {"passenger_name": "Nguyễn An"}, {}),
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
            "sort_by": "passenger_name",
            "sort_direction": "desc",
        },
    )

    assert response.status_code == 200
    assert captured["page"] == 2
    assert captured["page_size"] == 1
    assert captured["search"] == "Nguyễn"
    assert captured["sort_by"] == "passenger_name"
    assert captured["sort_direction"] == "desc"
    data = response.json()["data"]
    assert data["version"] == 3
    assert data["items"][0]["row_number"] == 2


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
    assert captured["changes"][0].selling_price == 1_200_000
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
