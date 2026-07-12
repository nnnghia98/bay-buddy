"""Integration coverage for the Workbook Editor V2 Phase 3 domain flow."""

from __future__ import annotations

import hashlib
from pathlib import Path

from openpyxl import Workbook

from services.workbook_mutation import PriceChange, apply_price_changes
from services.workbook_reader import read_workbook_records
from services.workbook_validation import (
    MappingStatus,
    validate_and_inspect_workbook,
    validate_generated_workbook,
)


def test_validate_read_mutate_and_read_new_version(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "version-2.xlsx"
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Vé tháng 7"
    worksheet.append(["Báo cáo giá vé"])
    worksheet.append(["Hành khách", "Mã chỗ", "Giá gốc", "Giá bán"])
    worksheet.append(["NGUYỄN VĂN A", "ABC123", 1_000_000, 1_200_000])
    worksheet.append(["TRẦN THỊ B", "DEF456", 1_500_000, 1_800_000])
    workbook.save(source)
    workbook.close()
    source_checksum = hashlib.sha256(source.read_bytes()).hexdigest()

    inspection = validate_and_inspect_workbook(
        source,
        max_rows=20_000,
        max_columns=100,
    )
    sheet = inspection.sheets[0]
    assert sheet.mapping_status is MappingStatus.READY

    first_page = read_workbook_records(
        source,
        sheet_name=sheet.name,
        header_row_number=sheet.header_row_number or 0,
        column_mapping=sheet.column_mapping,
        search="nguyen van a",
    )
    assert [record.row_number for record in first_page.records] == [3]

    mutation = apply_price_changes(
        source,
        output,
        sheet_name=sheet.name,
        header_row_number=sheet.header_row_number or 0,
        column_mapping=sheet.column_mapping,
        changes=[
            PriceChange(
                row_number=3,
                net_price=1_050_000,
                selling_price=1_250_000,
            )
        ],
    )

    assert mutation.changed_cell_count == 2
    assert hashlib.sha256(source.read_bytes()).hexdigest() == source_checksum
    validate_generated_workbook(output)

    updated_page = read_workbook_records(
        output,
        sheet_name=sheet.name,
        header_row_number=sheet.header_row_number or 0,
        column_mapping=sheet.column_mapping,
        search="ABC123",
    )
    assert updated_page.records[0].values["net_price"] == 1_050_000
    assert updated_page.records[0].values["selling_price"] == 1_250_000
