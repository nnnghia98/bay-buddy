"""Typed API contracts for the Workbook Editor V2 MVP."""

from __future__ import annotations

import math
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Annotated, Any, Generic, Literal, Self, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    field_validator,
    model_validator,
)

from models.workbook import WorkbookSessionStatus
from services.workbook_validation import (
    MappingStatus,
    WorksheetInspection,
)


MAX_PRICE_VND = 1_000_000_000_000
MAX_SAVE_CHANGES = 500
MAX_SAVE_CELLS = 500
MAX_CELL_VALUE_LOOKUPS = 500


class _WorkbookSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


ResponseData = TypeVar("ResponseData")


class WorkbookSuccessResponse(_WorkbookSchema, Generic[ResponseData]):
    """Typed form of Bay Buddy's standard success envelope."""

    success: Literal[True] = True
    data: ResponseData
    error: None = None


class WorkbookMappingStatus(str, Enum):
    READY = "READY"
    MAPPING_INCOMPLETE = "MAPPING_INCOMPLETE"
    AMBIGUOUS_MAPPING = "AMBIGUOUS_MAPPING"


class WorkbookSemanticField(str, Enum):
    PASSENGER_NAME = "passenger_name"
    PNR = "pnr"
    TICKET_NUMBER = "ticket_number"
    NET_PRICE = "net_price"
    SELLING_PRICE = "selling_price"


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


PositiveColumnNumber = Annotated[int, Field(strict=True, ge=1)]


class WorksheetInspectionResponse(_WorkbookSchema):
    name: str = Field(min_length=1, max_length=255)
    max_row: int = Field(ge=0)
    max_column: int = Field(ge=0)
    header_row_number: int | None = Field(default=None, ge=1)
    detected_headers: list[str]
    column_mapping: dict[WorkbookSemanticField, PositiveColumnNumber]
    mapping_status: WorkbookMappingStatus
    missing_required_fields: list[WorkbookSemanticField]
    ambiguous_fields: dict[WorkbookSemanticField, list[PositiveColumnNumber]]

    @classmethod
    def from_domain(cls, inspection: WorksheetInspection) -> Self:
        """Convert a safe validation inspection into its API representation."""

        return cls(
            name=inspection.name,
            max_row=inspection.max_row,
            max_column=inspection.max_column,
            header_row_number=inspection.header_row_number,
            detected_headers=list(inspection.detected_headers),
            column_mapping=inspection.column_mapping,
            mapping_status=WorkbookMappingStatus(inspection.mapping_status.value),
            missing_required_fields=list(inspection.missing_required_fields),
            ambiguous_fields={
                field: list(columns)
                for field, columns in inspection.ambiguous_fields.items()
            },
        )


class WorkbookUploadResponse(_WorkbookSchema):
    id: uuid.UUID
    original_filename: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=1, max_length=255)
    file_size: int = Field(ge=0)
    checksum: str = Field(pattern=r"^[0-9a-f]{64}$")
    sheet_count: int = Field(ge=1)
    sheets: list[WorksheetInspectionResponse] = Field(min_length=1)
    created_at: datetime

    @model_validator(mode="after")
    def sheet_count_matches_inspections(self) -> Self:
        if self.sheet_count != len(self.sheets):
            raise ValueError("sheet_count must match the returned sheet inspections.")
        return self


class WorkbookSessionCreateRequest(_WorkbookSchema):
    workbook_id: uuid.UUID
    sheet_name: str = Field(min_length=1, max_length=255)


class WorkbookSessionRenameRequest(_WorkbookSchema):
    display_name: str = Field(min_length=1, max_length=255)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Display name cannot be blank.")
        return normalized


class WorkbookColumnDataType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    CURRENCY = "currency"
    BOOLEAN = "boolean"


class WorkbookColumnOrigin(str, Enum):
    SOURCE = "source"
    USER = "user"


class WorkbookFormulaOperator(str, Enum):
    ADD = "+"
    SUBTRACT = "-"
    MULTIPLY = "*"
    DIVIDE = "/"


class WorkbookComparisonOperator(str, Enum):
    EQUAL = "="
    NOT_EQUAL = "<>"
    LESS_THAN = "<"
    LESS_THAN_OR_EQUAL = "<="
    GREATER_THAN = ">"
    GREATER_THAN_OR_EQUAL = ">="


class WorkbookVariadicFunction(str, Enum):
    SUM = "SUM"
    MIN = "MIN"
    MAX = "MAX"


class WorkbookFormulaConstant(_WorkbookSchema):
    type: Literal["constant"] = "constant"
    value: StrictStr = Field(min_length=1, max_length=100)


class WorkbookFormulaColumnReference(_WorkbookSchema):
    type: Literal["column"] = "column"
    column_id: str = Field(min_length=1, max_length=64)


class WorkbookFormulaBinary(_WorkbookSchema):
    type: Literal["binary"] = "binary"
    operator: WorkbookFormulaOperator
    left: "WorkbookFormulaExpression"
    right: "WorkbookFormulaExpression"


class WorkbookFormulaComparison(_WorkbookSchema):
    type: Literal["comparison"] = "comparison"
    operator: WorkbookComparisonOperator
    left: "WorkbookFormulaExpression"
    right: "WorkbookFormulaExpression"


class WorkbookFormulaIf(_WorkbookSchema):
    type: Literal["if"] = "if"
    condition: "WorkbookFormulaExpression"
    when_true: "WorkbookFormulaExpression"
    when_false: "WorkbookFormulaExpression"


class WorkbookFormulaRound(_WorkbookSchema):
    type: Literal["round"] = "round"
    value: "WorkbookFormulaExpression"
    digits: StrictInt = Field(ge=-15, le=15)


class WorkbookFormulaFunction(_WorkbookSchema):
    type: Literal["function"] = "function"
    function: WorkbookVariadicFunction
    arguments: list["WorkbookFormulaExpression"] = Field(min_length=1, max_length=20)


WorkbookFormulaExpression = Annotated[
    WorkbookFormulaConstant
    | WorkbookFormulaColumnReference
    | WorkbookFormulaBinary
    | WorkbookFormulaComparison
    | WorkbookFormulaIf
    | WorkbookFormulaRound
    | WorkbookFormulaFunction,
    Field(discriminator="type"),
]


class WorkbookColumnFormula(_WorkbookSchema):
    schema_version: Literal[1] = 1
    expression: WorkbookFormulaExpression


class WorkbookLegacyFormulaOperator(str, Enum):
    ADD = "+"
    SUBTRACT = "-"
    MULTIPLY = "*"
    DIVIDE = "/"
    PERCENT = "%"


class WorkbookLegacyColumnFormula(_WorkbookSchema):
    left_column_id: str = Field(min_length=1, max_length=64)
    operator: WorkbookLegacyFormulaOperator
    right_column_id: str = Field(min_length=1, max_length=64)


WorkbookFormulaInput = WorkbookColumnFormula | WorkbookLegacyColumnFormula


class WorkbookColumnConfiguration(_WorkbookSchema):
    id: str = Field(min_length=1, max_length=64)
    label: str = Field(max_length=255)
    column_number: int = Field(ge=1)
    origin: WorkbookColumnOrigin
    data_type: WorkbookColumnDataType
    hidden: bool = False
    sticky: bool = False
    semantic_field: WorkbookSemanticField | None = None
    formula: WorkbookColumnFormula | None = None


class WorkbookAddColumnRequest(_WorkbookSchema):
    base_version: int = Field(ge=1)
    label: str = Field(min_length=1, max_length=255)
    data_type: WorkbookColumnDataType = WorkbookColumnDataType.TEXT
    formula: WorkbookFormulaInput | None = None

    @model_validator(mode="after")
    def formula_output_is_numeric(self) -> Self:
        if self.formula is not None and self.data_type not in {
            WorkbookColumnDataType.NUMBER,
            WorkbookColumnDataType.CURRENCY,
        }:
            raise ValueError("Formula output must be number or currency.")
        return self


class WorkbookUpdateColumnRequest(_WorkbookSchema):
    base_version: int = Field(ge=1)
    label: str | None = Field(default=None, min_length=1, max_length=255)
    data_type: WorkbookColumnDataType | None = None
    formula: WorkbookFormulaInput | None = None

    @model_validator(mode="after")
    def contains_an_update(self) -> Self:
        if not ({"label", "data_type", "formula"} & self.model_fields_set):
            raise ValueError("Provide a column label, data type, or formula update.")
        if (
            self.formula is not None
            and self.data_type is not None
            and self.data_type not in {
                WorkbookColumnDataType.NUMBER,
                WorkbookColumnDataType.CURRENCY,
            }
        ):
            raise ValueError("Formula output must be number or currency.")
        return self

    @property
    def formula_was_provided(self) -> bool:
        return "formula" in self.model_fields_set


class WorkbookFormulaPreviewRequest(_WorkbookSchema):
    base_version: int = Field(ge=1)
    formula: WorkbookFormulaInput
    output_type: WorkbookColumnDataType
    output_column_id: str | None = Field(default=None, min_length=1, max_length=64)
    sample_rows: list[int] | None = Field(default=None, min_length=1, max_length=10)

    @model_validator(mode="after")
    def preview_is_valid(self) -> Self:
        if self.output_type not in {
            WorkbookColumnDataType.NUMBER,
            WorkbookColumnDataType.CURRENCY,
        }:
            raise ValueError("Formula output must be number or currency.")
        if self.sample_rows is not None:
            if any(isinstance(row, bool) or row < 1 for row in self.sample_rows):
                raise ValueError("Sample rows must use positive physical row numbers.")
            if len(self.sample_rows) != len(set(self.sample_rows)):
                raise ValueError("Sample rows must be unique.")
        return self


class WorkbookFormulaPreviewResult(_WorkbookSchema):
    row_number: int = Field(ge=1)
    value: StrictInt | StrictFloat | None = None
    error_code: str | None = Field(default=None, max_length=100)
    error_message: str | None = Field(default=None, max_length=500)


class WorkbookFormulaPreviewResponse(_WorkbookSchema):
    valid: bool
    normalized_formula: WorkbookColumnFormula | None = None
    readable_expression: str | None = Field(default=None, max_length=2000)
    referenced_column_ids: list[str] = Field(default_factory=list, max_length=128)
    results: list[WorkbookFormulaPreviewResult] = Field(default_factory=list, max_length=10)
    errors: list[WorkbookErrorDetail] = Field(default_factory=list, max_length=20)
    warnings: list[WorkbookErrorDetail] = Field(default_factory=list, max_length=20)


class WorkbookRemoveColumnRequest(_WorkbookSchema):
    base_version: int = Field(ge=1)


class WorkbookColumnConfigurationRequest(_WorkbookSchema):
    base_version: int = Field(ge=1)
    hidden_column_ids: list[str] = Field(default_factory=list, max_length=500)
    sticky_column_ids: list[str] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def ids_are_unique(self) -> Self:
        if len(self.hidden_column_ids) != len(set(self.hidden_column_ids)):
            raise ValueError("Hidden column IDs must be unique.")
        if len(self.sticky_column_ids) != len(set(self.sticky_column_ids)):
            raise ValueError("Sticky column IDs must be unique.")
        return self


class WorkbookSessionResponse(_WorkbookSchema):
    id: uuid.UUID
    workbook_id: uuid.UUID
    original_filename: str = Field(min_length=1, max_length=255)
    selected_sheet_name: str = Field(min_length=1, max_length=255)
    header_row_number: int = Field(ge=1)
    column_mapping: dict[WorkbookSemanticField, PositiveColumnNumber]
    column_config: list[WorkbookColumnConfiguration] = Field(default_factory=list)
    current_version: int = Field(ge=1)
    status: WorkbookSessionStatus
    created_at: datetime
    updated_at: datetime


class WorkbookSessionSummary(_WorkbookSchema):
    id: uuid.UUID
    display_name: str = Field(min_length=1, max_length=255)
    original_filename: str = Field(min_length=1, max_length=255)
    selected_sheet_name: str = Field(min_length=1, max_length=255)
    current_version: int = Field(ge=1)
    status: WorkbookSessionStatus
    created_at: datetime
    updated_at: datetime


class WorkbookSessionListQuery(_WorkbookSchema):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    search: str | None = Field(default=None, max_length=255)
    status: WorkbookSessionStatus | None = None


class WorkbookRecordsQuery(_WorkbookSchema):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    search: str | None = Field(default=None, max_length=255)
    sort_by: str | None = Field(default=None, min_length=1, max_length=64)
    sort_direction: SortDirection = SortDirection.ASC


class WorkbookRecordColumn(_WorkbookSchema):
    id: str = Field(default="legacy", min_length=1, max_length=64)
    field: str = Field(min_length=1, max_length=255)
    label: str = Field(max_length=255)
    editable: bool
    semantic_field: WorkbookSemanticField | None = None
    origin: WorkbookColumnOrigin = WorkbookColumnOrigin.SOURCE
    data_type: WorkbookColumnDataType = WorkbookColumnDataType.TEXT
    hidden: bool = False
    sticky: bool = False
    group_label: str | None = Field(default=None, max_length=255)
    header_row_span: int = Field(default=1, ge=1, le=2)
    formula: WorkbookColumnFormula | None = None
    number_format: str | None = Field(default=None, max_length=255)


WorkbookCellValue = StrictStr | StrictInt | StrictFloat | StrictBool | date | datetime | None


class WorkbookCellReference(_WorkbookSchema):
    row_number: int = Field(strict=True, ge=1)
    column_id: str = Field(min_length=1, max_length=64)


class WorkbookCellValueLookupRequest(_WorkbookSchema):
    base_version: int = Field(strict=True, ge=1)
    cells: list[WorkbookCellReference] = Field(
        min_length=1,
        max_length=MAX_CELL_VALUE_LOOKUPS,
    )

    @model_validator(mode="after")
    def cell_references_are_unique(self) -> Self:
        references = [
            (cell.row_number, cell.column_id)
            for cell in self.cells
        ]
        if len(references) != len(set(references)):
            raise ValueError("Workbook cell references must be unique.")
        return self


class WorkbookCellValueItem(_WorkbookSchema):
    row_number: int = Field(ge=1)
    column_id: str = Field(min_length=1, max_length=64)
    value: WorkbookCellValue


class WorkbookCellValueLookupResponse(_WorkbookSchema):
    session_id: uuid.UUID
    version: int = Field(ge=1)
    cells: list[WorkbookCellValueItem] = Field(
        min_length=1,
        max_length=MAX_CELL_VALUE_LOOKUPS,
    )


class WorkbookRecordItem(_WorkbookSchema):
    row_number: int = Field(ge=1)
    values: dict[str, WorkbookCellValue]
    editable: dict[str, bool]

    @model_validator(mode="after")
    def editable_fields_are_present(self) -> Self:
        unknown = set(self.editable) - set(self.values)
        if unknown:
            raise ValueError("Editable fields must be present in record values.")
        return self


class WorkbookPagination(_WorkbookSchema):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=200)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)

    @model_validator(mode="after")
    def totals_are_consistent(self) -> Self:
        expected_pages = math.ceil(self.total / self.page_size) if self.total else 0
        if self.total_pages != expected_pages:
            raise ValueError("total_pages does not match total and page_size.")
        return self


class WorkbookSessionListResponse(_WorkbookSchema):
    items: list[WorkbookSessionSummary]
    pagination: WorkbookPagination


class WorkbookRecordsPage(_WorkbookSchema):
    session_id: uuid.UUID
    version: int = Field(ge=1)
    sheet_name: str = Field(min_length=1, max_length=255)
    columns: list[WorkbookRecordColumn]
    header_row_count: int = Field(default=1, ge=1, le=2)
    items: list[WorkbookRecordItem]
    pagination: WorkbookPagination


class WorkbookPriceChangeValues(_WorkbookSchema):
    """Generic cell values with legacy semantic price keys still accepted."""

    model_config = ConfigDict(extra="allow")
    __pydantic_extra__: dict[str, WorkbookCellValue] = Field(init=False)
    net_price: WorkbookCellValue = None
    selling_price: WorkbookCellValue = None

    @model_validator(mode="after")
    def at_least_one_cell(self) -> Self:
        values = self.model_dump(exclude_unset=True)
        if not values:
            raise ValueError("At least one cell value is required.")
        if any(not key or len(key) > 255 for key in values):
            raise ValueError("Cell keys must be between 1 and 255 characters.")
        if any(isinstance(value, float) and not math.isfinite(value) for value in values.values()):
            raise ValueError("Numeric cell values must be finite.")
        return self

    @property
    def changed_cell_count(self) -> int:
        return len(self.model_dump(exclude_unset=True))


class WorkbookPriceChange(_WorkbookSchema):
    row_number: int = Field(ge=1)
    values: WorkbookPriceChangeValues


class WorkbookSaveRequest(_WorkbookSchema):
    request_id: uuid.UUID
    base_version: int = Field(ge=1)
    changes: list[WorkbookPriceChange] = Field(
        min_length=1,
        max_length=MAX_SAVE_CHANGES,
    )

    @model_validator(mode="after")
    def changes_are_unique_and_bounded(self) -> Self:
        row_numbers = [change.row_number for change in self.changes]
        if len(row_numbers) != len(set(row_numbers)):
            raise ValueError("Workbook changes must use unique row numbers.")
        changed_cells = sum(
            change.values.changed_cell_count for change in self.changes
        )
        if changed_cells > MAX_SAVE_CELLS:
            raise ValueError(f"A save may change at most {MAX_SAVE_CELLS} cells.")
        return self


class WorkbookSaveResponse(_WorkbookSchema):
    operation_id: uuid.UUID
    request_id: uuid.UUID
    previous_version: int = Field(ge=1)
    current_version: int = Field(ge=2)
    changed_cells: int = Field(ge=1, le=MAX_SAVE_CELLS)
    saved_at: datetime

    @model_validator(mode="after")
    def version_advances_once(self) -> Self:
        if self.current_version != self.previous_version + 1:
            raise ValueError("A save response must advance exactly one version.")
        return self


class WorkbookErrorDetail(_WorkbookSchema):
    code: str = Field(min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]*$")
    message: str = Field(min_length=1, max_length=500)
    details: dict[str, Any] = Field(default_factory=dict)


class WorkbookErrorResponse(_WorkbookSchema):
    detail: WorkbookErrorDetail
