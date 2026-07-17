"""Regression tests for content-aware legacy XLS worksheet bounds."""

from types import SimpleNamespace

import xlrd
from openpyxl import Workbook

from services.workbook_xls_conversion import _copy_sheet, _meaningful_bounds


class FakeLegacySheet:
    nrows = 3
    ncols = 256
    merged_cells = [(0, 1, 0, 2)]

    def cell(self, row: int, column: int) -> SimpleNamespace:
        populated = {(0, 0), (0, 1), (1, 0), (1, 1)}
        return SimpleNamespace(
            ctype=(
                xlrd.XL_CELL_TEXT
                if (row, column) in populated
                else xlrd.XL_CELL_BLANK
            )
        )


def test_xls_bounds_ignore_formatting_only_trailing_columns() -> None:
    assert _meaningful_bounds(FakeLegacySheet()) == (2, 2)


def test_xls_conversion_preserves_value_format_and_visibility() -> None:
    legacy_workbook = SimpleNamespace(
        datemode=0,
        xf_list=[SimpleNamespace(format_key=164)],
        format_map={164: SimpleNamespace(format_str="#,#00.00")},
    )
    legacy_sheet = SimpleNamespace(
        cell=lambda _row, _column: SimpleNamespace(
            ctype=xlrd.XL_CELL_NUMBER,
            value=1234.5,
            xf_index=0,
        ),
        colinfo_map={
            0: SimpleNamespace(
                width=2560,
                hidden=1,
                outline_level=0,
                collapsed=0,
            )
        },
        rowinfo_map={
            0: SimpleNamespace(
                hidden=1,
                outline_level=0,
                height=300,
                has_default_height=True,
            )
        },
        merged_cells=[],
    )
    workbook = Workbook()
    worksheet = workbook.active

    _copy_sheet(
        legacy_workbook,
        legacy_sheet,
        worksheet,
        row_count=1,
        column_count=1,
    )

    assert worksheet["A1"].value == 1234.5
    assert worksheet["A1"].number_format == "#,#00.00"
    assert worksheet.column_dimensions["A"].hidden is True
    assert worksheet.row_dimensions[1].hidden is True
    assert worksheet.row_dimensions[1].height == 15
    workbook.close()
