"""Focused safety tests for workbook price mutation."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest
from openpyxl import Workbook, load_workbook
from openpyxl.styles import PatternFill, Protection

from services.workbook_mutation import (
    MAX_SAFE_VND,
    PriceChange,
    WorkbookMutationError,
    apply_price_changes,
)


def _make_workbook(path: Path) -> None:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Tickets"
    worksheet.append(["Passenger", "PNR", "Cost Price", "Selling Price", "Notes"])
    worksheet.append(["Nguyen A", "ABC123", 1_000_000, 1_200_000, "keep me"])
    worksheet.append(["Tran B", "DEF456", 2_000_000, 2_300_000, "untouched"])
    workbook.save(path)
    workbook.close()


def _apply(source: Path, output: Path, changes: list[PriceChange]):
    return apply_price_changes(
        source,
        output,
        sheet_name="Tickets",
        header_row_number=1,
        column_mapping={"net_price": 3, "selling_price": 4},
        changes=changes,
    )


def test_changes_only_approved_cells_and_preserves_source_bytes(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "version-2.xlsx"
    _make_workbook(source)
    source_before = source.read_bytes()
    source_checksum = hashlib.sha256(source_before).hexdigest()

    result = _apply(
        source,
        output,
        [PriceChange(row_number=2, net_price=1_050_000, selling_price=1_250_000)],
    )

    assert source.read_bytes() == source_before
    assert hashlib.sha256(source.read_bytes()).hexdigest() == source_checksum
    assert result.changed_cell_count == 2
    assert [(change.field, change.old_value, change.new_value) for change in result.changes] == [
        ("net_price", 1_000_000, 1_050_000),
        ("selling_price", 1_200_000, 1_250_000),
    ]
    workbook = load_workbook(output, data_only=False)
    worksheet = workbook["Tickets"]
    assert [worksheet.cell(2, column).value for column in range(1, 6)] == [
        "Nguyen A", "ABC123", 1_050_000, 1_250_000, "keep me"
    ]
    assert [worksheet.cell(3, column).value for column in range(1, 6)] == [
        "Tran B", "DEF456", 2_000_000, 2_300_000, "untouched"
    ]
    workbook.close()


def test_output_is_a_reopenable_workbook(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    _apply(source, output, [PriceChange(row_number=2, selling_price=1_300_000)])

    workbook = load_workbook(output, read_only=False, data_only=False)
    assert workbook["Tickets"]["D2"].value == 1_300_000
    workbook.close()


def test_preserves_other_sheets_formulas_and_styles(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    workbook = load_workbook(source)
    worksheet = workbook["Tickets"]
    worksheet["E2"] = "=C2+D2"
    worksheet["E2"].fill = PatternFill(fill_type="solid", fgColor="FFF2CC")
    summary = workbook.create_sheet("Summary")
    summary["A1"] = "=Tickets!D2"
    workbook.save(source)
    workbook.close()

    _apply(source, output, [PriceChange(row_number=2, net_price=1_050_000)])

    generated = load_workbook(output, data_only=False)
    assert generated.sheetnames == ["Tickets", "Summary"]
    assert generated["Tickets"]["E2"].value == "=C2+D2"
    assert generated["Tickets"]["E2"].fill.fgColor.rgb == "00FFF2CC"
    assert generated["Summary"]["A1"].value == "=Tickets!D2"
    generated.close()


@pytest.mark.parametrize("field", ["net_price", "selling_price"])
def test_rejects_formula_price_cells(tmp_path: Path, field: str) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    workbook = load_workbook(source)
    column = 3 if field == "net_price" else 4
    workbook["Tickets"].cell(2, column).value = "=1+1"
    workbook.save(source)
    workbook.close()

    change = PriceChange(row_number=2, **{field: 2_000_000})
    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [change])
    assert raised.value.code == "CELL_NOT_EDITABLE"
    assert not output.exists()


def test_rejects_merged_price_cell(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    workbook = load_workbook(source)
    workbook["Tickets"].merge_cells("C2:C3")
    workbook.save(source)
    workbook.close()

    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [PriceChange(row_number=2, net_price=2_000_000)])
    assert raised.value.code == "CELL_NOT_EDITABLE"


def test_rejects_locked_cell_only_when_sheet_is_protected(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    workbook = load_workbook(source)
    worksheet = workbook["Tickets"]
    worksheet["C2"].protection = Protection(locked=True)
    worksheet.protection.sheet = True
    workbook.save(source)
    workbook.close()

    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [PriceChange(row_number=2, net_price=2_000_000)])
    assert raised.value.code == "CELL_NOT_EDITABLE"


@pytest.mark.parametrize(
    "value",
    [-1, 1.5, float("nan"), float("inf"), MAX_SAFE_VND + 1, True, "1000"],
)
def test_rejects_invalid_price_values(tmp_path: Path, value: object) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)

    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [PriceChange(row_number=2, net_price=value)])  # type: ignore[arg-type]
    assert raised.value.code == "INVALID_CELL_VALUE"
    assert not output.exists()


def test_rejects_duplicate_and_invalid_rows(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    _make_workbook(source)

    with pytest.raises(WorkbookMutationError) as duplicate:
        _apply(
            source,
            tmp_path / "duplicate.xlsx",
            [PriceChange(2, net_price=10), PriceChange(2, selling_price=20)],
        )
    assert duplicate.value.code == "INVALID_ROW"

    with pytest.raises(WorkbookMutationError) as header:
        _apply(source, tmp_path / "header.xlsx", [PriceChange(1, net_price=10)])
    assert header.value.code == "INVALID_ROW"


def test_max_changes_limits_changed_cells_not_only_rows(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)

    with pytest.raises(WorkbookMutationError) as raised:
        apply_price_changes(
            source,
            output,
            sheet_name="Tickets",
            header_row_number=1,
            column_mapping={"net_price": 3, "selling_price": 4},
            changes=[PriceChange(2, net_price=10, selling_price=20)],
            max_changes=1,
        )

    assert raised.value.code == "INVALID_ROW"
    assert not output.exists()


def test_rejects_existing_output_without_overwrite(tmp_path: Path) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    output.write_bytes(b"existing immutable version")

    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [PriceChange(row_number=2, net_price=2_000_000)])
    assert raised.value.code == "STORAGE_WRITE_FAILED"
    assert output.read_bytes() == b"existing immutable version"


def test_failure_cleans_temporary_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)

    def fail_link(source_path: Path, output_path: Path) -> None:
        del source_path, output_path
        raise OSError("publish failed")

    monkeypatch.setattr("services.workbook_mutation.os.link", fail_link)
    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [PriceChange(row_number=2, net_price=2_000_000)])
    assert raised.value.code == "STORAGE_WRITE_FAILED"
    assert not output.exists()
    assert sorted(path.name for path in tmp_path.iterdir()) == ["source.xlsx"]


def test_temp_cleanup_failure_does_not_report_published_output_as_failed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "output.xlsx"
    _make_workbook(source)
    original_unlink = Path.unlink

    def fail_temp_unlink(path: Path, *args, **kwargs) -> None:
        if path.name.startswith(".output.xlsx."):
            raise OSError("cleanup failed")
        original_unlink(path, *args, **kwargs)

    monkeypatch.setattr(Path, "unlink", fail_temp_unlink)

    result = _apply(
        source,
        output,
        [PriceChange(row_number=2, net_price=1_100_000)],
    )

    assert result.changed_cell_count == 1
    assert output.exists()


def test_output_directory_failure_uses_safe_domain_error(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "source.xlsx"
    output = tmp_path / "private-customer" / "output.xlsx"
    _make_workbook(source)

    def fail_mkdir(*_args, **_kwargs) -> None:
        raise OSError(f"permission denied: {output.parent}")

    monkeypatch.setattr(Path, "mkdir", fail_mkdir)

    with pytest.raises(WorkbookMutationError) as raised:
        _apply(source, output, [PriceChange(row_number=2, net_price=1_100_000)])

    assert raised.value.code == "STORAGE_WRITE_FAILED"
    assert "private-customer" not in str(raised.value)

