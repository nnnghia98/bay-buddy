"""Regression tests for content-aware legacy XLS worksheet bounds."""

from types import SimpleNamespace

import xlrd

from services.workbook_xls_conversion import _meaningful_bounds


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
