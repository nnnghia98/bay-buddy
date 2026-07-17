"""Validation and serialization tests for Workbook Editor V2 API schemas."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from models.workbook import WorkbookSessionStatus
from schemas.workbook import (
    SortDirection,
    WorkbookCellValueLookupRequest,
    WorkbookCellValueLookupResponse,
    WorkbookColumnFormula,
    WorkbookErrorDetail,
    WorkbookFormulaPreviewRequest,
    WorkbookUpdateColumnRequest,
    WorkbookMappingStatus,
    WorkbookPagination,
    WorkbookPriceChange,
    WorkbookPriceChangeValues,
    WorkbookRecordColumn,
    WorkbookRecordItem,
    WorkbookRecordsPage,
    WorkbookRecordsQuery,
    WorkbookSaveRequest,
    WorkbookSaveResponse,
    WorkbookSemanticField,
    WorkbookSessionCreateRequest,
    WorkbookSessionListQuery,
    WorkbookSessionListResponse,
    WorkbookSessionRenameRequest,
    WorkbookSessionResponse,
    WorkbookSessionSummary,
    WorkbookUploadResponse,
    WorksheetInspectionResponse,
)
from services.workbook_validation import (
    MappingStatus,
    WorksheetInspection,
)


NOW = datetime(2026, 7, 12, 2, 30, tzinfo=timezone.utc)


def ready_sheet() -> WorksheetInspectionResponse:
    return WorksheetInspectionResponse(
        name="Bảng giá",
        max_row=20,
        max_column=5,
        header_row_number=2,
        detected_headers=["Hành khách", "Giá gốc", "Giá bán"],
        column_mapping={
            WorkbookSemanticField.PASSENGER_NAME: 1,
            WorkbookSemanticField.NET_PRICE: 4,
            WorkbookSemanticField.SELLING_PRICE: 5,
        },
        mapping_status=WorkbookMappingStatus.READY,
        missing_required_fields=[],
        ambiguous_fields={},
    )


def one_change(row_number: int = 3) -> WorkbookPriceChange:
    return WorkbookPriceChange(
        row_number=row_number,
        values=WorkbookPriceChangeValues(
            net_price=1_200_000,
            selling_price=1_350_000,
        ),
    )


def test_sheet_inspection_converts_from_domain_and_serializes_enum_keys() -> None:
    domain = WorksheetInspection(
        name="Bảng giá",
        max_row=10,
        max_column=5,
        header_row_number=1,
        detected_headers=("Họ tên", "Giá gốc", "Giá bán"),
        column_mapping={"passenger_name": 1, "net_price": 2, "selling_price": 3},
        mapping_status=MappingStatus.READY,
        missing_required_fields=(),
        ambiguous_fields={},
    )

    response = WorksheetInspectionResponse.from_domain(domain)
    payload = json.loads(response.model_dump_json())

    assert response.mapping_status is WorkbookMappingStatus.READY
    assert payload["column_mapping"] == {
        "passenger_name": 1,
        "net_price": 2,
        "selling_price": 3,
    }
    assert payload["mapping_status"] == "READY"


def test_upload_response_serializes_uuid_datetime_and_sheets() -> None:
    workbook_id = uuid.uuid4()
    response = WorkbookUploadResponse(
        id=workbook_id,
        original_filename="prices.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        file_size=1024,
        checksum="a" * 64,
        sheet_count=1,
        sheets=[ready_sheet()],
        created_at=NOW,
    )

    payload = json.loads(response.model_dump_json())

    assert payload["id"] == str(workbook_id)
    assert payload["created_at"] == "2026-07-12T02:30:00Z"
    assert payload["sheets"][0]["mapping_status"] == "READY"

    with pytest.raises(ValidationError, match="sheet_count"):
        WorkbookUploadResponse(
            id=workbook_id,
            original_filename="prices.xlsx",
            mime_type="application/octet-stream",
            file_size=1024,
            checksum="a" * 64,
            sheet_count=2,
            sheets=[ready_sheet()],
            created_at=NOW,
        )


def test_sheet_mapping_column_numbers_are_strictly_positive() -> None:
    with pytest.raises(ValidationError):
        WorksheetInspectionResponse(
            name="Sheet1",
            max_row=1,
            max_column=1,
            header_row_number=1,
            detected_headers=["Cost"],
            column_mapping={"net_price": 0},
            mapping_status="MAPPING_INCOMPLETE",
            missing_required_fields=["selling_price"],
            ambiguous_fields={},
        )


@pytest.mark.parametrize(
    "payload",
    [
        {"workbook_id": uuid.uuid4(), "sheet_name": "", "header_row_number": 1},
        {"workbook_id": "not-a-uuid", "sheet_name": "Sheet1", "header_row_number": 1},
        {"workbook_id": uuid.uuid4(), "sheet_name": "Sheet1", "header_row_number": 0},
        {"workbook_id": uuid.uuid4(), "sheet_name": "Sheet1", "header_row_number": 1, "extra": True},
    ],
)
def test_create_session_rejects_invalid_boundary(payload: dict) -> None:
    with pytest.raises(ValidationError):
        WorkbookSessionCreateRequest.model_validate(payload)


def test_create_session_requires_explicit_header_row() -> None:
    request = WorkbookSessionCreateRequest(
        workbook_id=uuid.uuid4(),
        sheet_name="Sheet1",
        header_row_number=3,
    )
    assert request.header_row_number == 3
    with pytest.raises(ValidationError):
        WorkbookSessionCreateRequest.model_validate(
            {"workbook_id": uuid.uuid4(), "sheet_name": "Sheet1"}
        )


def test_session_response_uses_domain_status_and_positive_version() -> None:
    response = WorkbookSessionResponse(
        id=uuid.uuid4(),
        workbook_id=uuid.uuid4(),
        original_filename="prices.xlsx",
        selected_sheet_name="Sheet1",
        header_row_number=1,
        column_mapping={"net_price": 2, "selling_price": 3},
        current_version=1,
        status=WorkbookSessionStatus.DRAFT,
        created_at=NOW,
        updated_at=NOW,
    )

    assert json.loads(response.model_dump_json())["status"] == "DRAFT"

    with pytest.raises(ValidationError):
        WorkbookSessionResponse.model_validate(
            {**response.model_dump(), "current_version": 0}
        )


def test_session_library_contracts_normalize_names_and_validate_pagination() -> None:
    rename = WorkbookSessionRenameRequest(display_name="  July workbook  ")
    assert rename.display_name == "July workbook"
    with pytest.raises(ValidationError):
        WorkbookSessionRenameRequest(display_name="   ")

    query = WorkbookSessionListQuery(status=WorkbookSessionStatus.DRAFT)
    assert query.page == 1
    assert query.page_size == 10
    with pytest.raises(ValidationError):
        WorkbookSessionListQuery(page_size=101)

    summary = WorkbookSessionSummary(
        id=uuid.uuid4(),
        display_name="July workbook",
        original_filename="prices.xlsx",
        selected_sheet_name="Tickets",
        current_version=2,
        status=WorkbookSessionStatus.DRAFT,
        created_at=NOW,
        updated_at=NOW,
    )
    response = WorkbookSessionListResponse(
        items=[summary],
        pagination=WorkbookPagination(
            page=1,
            page_size=10,
            total=1,
            total_pages=1,
        ),
    )
    assert response.items[0].display_name == "July workbook"


def test_records_query_defaults_and_bounds() -> None:
    query = WorkbookRecordsQuery()
    assert query.page == 1
    assert query.page_size == 50
    assert query.sort_direction is SortDirection.ASC

    with pytest.raises(ValidationError):
        WorkbookRecordsQuery(page_size=201)
    with pytest.raises(ValidationError):
        WorkbookRecordsQuery(page=0)
    with pytest.raises(ValidationError):
        WorkbookRecordsQuery(sort_direction="sideways")


def test_records_page_serializes_typed_values_and_pagination() -> None:
    page = WorkbookRecordsPage(
        session_id=uuid.uuid4(),
        version=3,
        sheet_name="Sheet1",
        columns=[
            WorkbookRecordColumn(
                field=WorkbookSemanticField.NET_PRICE,
                label="Giá gốc",
                editable=True,
            )
        ],
        items=[
            WorkbookRecordItem(
                row_number=4,
                values={"net_price": 1_000_000, "passenger_name": "NGUYEN A"},
                editable={"net_price": True},
            )
        ],
        pagination=WorkbookPagination(
            page=1,
            page_size=50,
            total=51,
            total_pages=2,
        ),
    )

    payload = json.loads(page.model_dump_json())
    assert payload["items"][0]["values"]["net_price"] == 1_000_000
    assert payload["pagination"]["total_pages"] == 2


@pytest.mark.parametrize(
    "pagination",
    [
        {"page": 1, "page_size": 50, "total": 51, "total_pages": 1},
    ],
)
def test_pagination_rejects_inconsistent_totals(pagination: dict) -> None:
    with pytest.raises(ValidationError):
        WorkbookPagination.model_validate(pagination)


def test_record_editability_must_reference_a_returned_value() -> None:
    with pytest.raises(ValidationError, match="present"):
        WorkbookRecordItem(
            row_number=2,
            values={"passenger_name": "A"},
            editable={"net_price": True},
        )


@pytest.mark.parametrize(
    "values",
    [
        {},
        {"source-a": float("nan")},
        {"source-a": float("inf")},
        {"source-a": object()},
        {"": 1},
    ],
)
def test_cell_values_require_non_empty_keys_and_json_safe_scalars(values: dict) -> None:
    with pytest.raises(ValidationError):
        WorkbookPriceChangeValues.model_validate(values)


def test_cell_values_accept_generic_types_null_and_legacy_price_keys() -> None:
    values = WorkbookPriceChangeValues.model_validate(
        {
            "net_price": -12.5,
            "source-text": "note",
            "source-date": "2026-07-14",
            "source-boolean": True,
            "source-blank": None,
        }
    )
    assert values.changed_cell_count == 5
    assert values.model_dump(exclude_unset=True)["source-blank"] is None


def test_cell_value_lookup_is_bounded_unique_and_serializable() -> None:
    cells = [
        {"row_number": index + 1, "column_id": "source-1"}
        for index in range(500)
    ]
    request = WorkbookCellValueLookupRequest(base_version=2, cells=cells)
    assert len(request.cells) == 500

    with pytest.raises(ValidationError):
        WorkbookCellValueLookupRequest(base_version=2, cells=[])
    with pytest.raises(ValidationError):
        WorkbookCellValueLookupRequest(
            base_version=2,
            cells=cells + [{"row_number": 501, "column_id": "source-1"}],
        )
    with pytest.raises(ValidationError, match="unique"):
        WorkbookCellValueLookupRequest(
            base_version=2,
            cells=[cells[0], cells[0]],
        )

    response = WorkbookCellValueLookupResponse(
        session_id=uuid.uuid4(),
        version=2,
        cells=[
            {"row_number": 2, "column_id": "source-1", "value": "text"},
            {"row_number": 2, "column_id": "source-2", "value": 12.5},
            {"row_number": 2, "column_id": "source-3", "value": True},
            {"row_number": 2, "column_id": "source-4", "value": None},
        ],
    )
    assert json.loads(response.model_dump_json())["cells"][-1]["value"] is None


def test_save_request_requires_uuid_version_and_unique_rows() -> None:
    valid = WorkbookSaveRequest(
        request_id=uuid.uuid4(),
        base_version=1,
        changes=[one_change(3), one_change(4)],
    )
    assert len(valid.changes) == 2

    with pytest.raises(ValidationError, match="unique row"):
        WorkbookSaveRequest(
            request_id=uuid.uuid4(),
            base_version=1,
            changes=[one_change(3), one_change(3)],
        )
    with pytest.raises(ValidationError):
        WorkbookSaveRequest(
            request_id="bad-uuid",
            base_version=1,
            changes=[one_change()],
        )
    with pytest.raises(ValidationError):
        WorkbookSaveRequest(
            request_id=uuid.uuid4(),
            base_version=0,
            changes=[one_change()],
        )


def test_save_request_caps_rows_and_changed_cells_at_500() -> None:
    single_cell_changes = [
        WorkbookPriceChange(
            row_number=row,
            values=WorkbookPriceChangeValues(net_price=row),
        )
        for row in range(1, 501)
    ]
    assert len(
        WorkbookSaveRequest(
            request_id=uuid.uuid4(),
            base_version=1,
            changes=single_cell_changes,
        ).changes
    ) == 500

    too_many_cells = [one_change(row) for row in range(1, 252)]
    with pytest.raises(ValidationError, match="500 cells"):
        WorkbookSaveRequest(
            request_id=uuid.uuid4(),
            base_version=1,
            changes=too_many_cells,
        )

    with pytest.raises(ValidationError):
        WorkbookSaveRequest(
            request_id=uuid.uuid4(),
            base_version=1,
            changes=single_cell_changes + [
                WorkbookPriceChange(
                    row_number=501,
                    values=WorkbookPriceChangeValues(net_price=501),
                )
            ],
        )


def test_save_response_advances_one_version_and_serializes() -> None:
    operation_id = uuid.uuid4()
    request_id = uuid.uuid4()
    response = WorkbookSaveResponse(
        operation_id=operation_id,
        request_id=request_id,
        previous_version=3,
        current_version=4,
        changed_cells=2,
        saved_at=NOW,
    )

    payload = json.loads(response.model_dump_json())
    assert payload["operation_id"] == str(operation_id)
    assert payload["current_version"] == 4

    with pytest.raises(ValidationError, match="exactly one"):
        WorkbookSaveResponse(
            operation_id=operation_id,
            request_id=request_id,
            previous_version=3,
            current_version=5,
            changed_cells=2,
            saved_at=NOW,
        )


def test_structured_error_detail_is_machine_readable_and_bounded() -> None:
    error = WorkbookErrorDetail(
        code="VERSION_CONFLICT",
        message="The workbook has a newer version.",
        details={"current_version": 4},
    )

    assert error.model_dump(mode="json") == {
        "code": "VERSION_CONFLICT",
        "message": "The workbook has a newer version.",
        "details": {"current_version": 4},
    }

    with pytest.raises(ValidationError):
        WorkbookErrorDetail(code="bad-code", message="Bad")


def test_versioned_formula_preview_and_nullable_update_contracts() -> None:
    formula = WorkbookColumnFormula.model_validate(
        {
            "schema_version": 1,
            "expression": {
                "type": "if",
                "condition": {
                    "type": "comparison",
                    "operator": ">",
                    "left": {"type": "column", "column_id": "sale"},
                    "right": {"type": "column", "column_id": "fare"},
                },
                "when_true": {
                    "type": "binary",
                    "operator": "-",
                    "left": {"type": "column", "column_id": "sale"},
                    "right": {"type": "column", "column_id": "fare"},
                },
                "when_false": {"type": "constant", "value": "0"},
            },
        }
    )
    preview = WorkbookFormulaPreviewRequest(
        base_version=2,
        formula=formula,
        output_type="currency",
        sample_rows=[2, 4],
    )
    assert preview.formula.schema_version == 1
    assert preview.sample_rows == [2, 4]

    remove_formula = WorkbookUpdateColumnRequest(
        base_version=2,
        formula=None,
    )
    assert remove_formula.formula_was_provided is True
    with pytest.raises(ValidationError):
        WorkbookUpdateColumnRequest(base_version=2)


def test_formula_schema_rejects_raw_excel_text_and_bad_round_arity() -> None:
    with pytest.raises(ValidationError):
        WorkbookColumnFormula.model_validate(
            {"schema_version": 1, "expression": "=A2+B2"}
        )
    with pytest.raises(ValidationError):
        WorkbookColumnFormula.model_validate(
            {
                "schema_version": 1,
                "expression": {
                    "type": "round",
                    "value": {"type": "constant", "value": "1"},
                    "digits": 16,
                },
            }
        )
