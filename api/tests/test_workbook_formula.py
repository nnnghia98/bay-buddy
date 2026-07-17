from __future__ import annotations

import pytest

from services.workbook_formula import (
    WorkbookFormulaError,
    adapt_legacy_formula,
    evaluate_formula,
    evaluate_formula_columns,
    formula_evaluation_order,
    normalize_formula,
    render_excel_formula,
    render_readable_expression,
)


COLUMNS = [
    {"id": "fare", "label": "Fare", "column_number": 1, "data_type": "currency"},
    {"id": "sale", "label": "Sale", "column_number": 2, "data_type": "currency"},
    {"id": "tax", "label": "Tax", "column_number": 3, "data_type": "number"},
]


def formula(expression: dict) -> dict:
    return {"schema_version": 1, "expression": expression}


def column(column_id: str) -> dict:
    return {"type": "column", "column_id": column_id}


def constant(value: str) -> dict:
    return {"type": "constant", "value": value}


def binary(operator: str, left: dict, right: dict) -> dict:
    return {"type": "binary", "operator": operator, "left": left, "right": right}


def test_normalizes_decimal_constants_and_renders_nested_expression() -> None:
    normalized = normalize_formula(
        formula(
            {
                "type": "round",
                "value": binary("-", column("sale"), column("fare")),
                "digits": 0,
            }
        ),
        COLUMNS,
        output_type="currency",
    )

    assert normalized["schema_version"] == 1
    assert render_readable_expression(normalized, COLUMNS) == "ROUND((Sale - Fare),0)"
    assert render_excel_formula(normalized, COLUMNS, row_number=7) == "=ROUND((B7 - A7),0)"


def test_nested_if_and_variadic_functions_evaluate_row_locally() -> None:
    expression = {
        "type": "if",
        "condition": {
            "type": "comparison",
            "operator": ">",
            "left": column("sale"),
            "right": column("fare"),
        },
        "when_true": {
            "type": "function",
            "function": "MAX",
            "arguments": [binary("-", column("sale"), column("fare")), constant("0")],
        },
        "when_false": constant("0"),
    }
    normalized = normalize_formula(formula(expression), COLUMNS, output_type="currency")

    assert evaluate_formula(normalized, {"fare": 100, "sale": 150}).value == 50
    assert evaluate_formula(normalized, {"fare": 200, "sale": 150}).value == 0


def test_sum_min_max_are_variadic_but_row_local() -> None:
    sum_formula = normalize_formula(
        formula(
            {
                "type": "function",
                "function": "SUM",
                "arguments": [column("fare"), column("tax"), constant("100")],
            }
        ),
        COLUMNS,
    )
    assert evaluate_formula(sum_formula, {"fare": 1000, "tax": 50}).value == 1150


def test_round_matches_excel_half_away_from_zero() -> None:
    positive = formula({"type": "round", "value": constant("2.5"), "digits": 0})
    negative = formula({"type": "round", "value": constant("-2.5"), "digits": 0})
    assert evaluate_formula(positive, {}).value == 3
    assert evaluate_formula(negative, {}).value == -3


def test_division_by_zero_is_a_safe_row_error() -> None:
    result = evaluate_formula(
        formula(binary("/", column("sale"), constant("0"))),
        {"sale": 100},
    )
    assert result.value is None
    assert result.error_code == "FORMULA_DIVISION_BY_ZERO"


def test_legacy_percent_adapts_to_multiply_then_divide_by_100() -> None:
    adapted = adapt_legacy_formula(
        {"left_column_id": "fare", "operator": "%", "right_column_id": "tax"}
    )
    normalized = normalize_formula(adapted, COLUMNS)
    assert evaluate_formula(normalized, {"fare": 200, "tax": 10}).value == 20
    assert render_excel_formula(normalized, COLUMNS, row_number=2) == "=((A2 * C2) / 100)"


def test_formula_dependencies_use_topological_order() -> None:
    columns = COLUMNS + [
        {
            "id": "profit",
            "label": "Profit",
            "column_number": 4,
            "data_type": "currency",
            "formula": formula(binary("-", column("sale"), column("fare"))),
        },
        {
            "id": "rounded",
            "label": "Rounded",
            "column_number": 5,
            "data_type": "currency",
            "formula": formula(
                {"type": "round", "value": column("profit"), "digits": 0}
            ),
        },
    ]
    assert formula_evaluation_order(columns) == ("profit", "rounded")
    values, evaluations = evaluate_formula_columns(columns, {"fare": 100, "sale": 150})
    assert evaluations["profit"].value == 50
    assert values["rounded"] == 50


def test_dependency_cycles_and_self_references_are_rejected() -> None:
    cycle = [
        {"id": "a", "label": "A", "column_number": 1, "data_type": "number", "formula": formula(column("b"))},
        {"id": "b", "label": "B", "column_number": 2, "data_type": "number", "formula": formula(column("a"))},
    ]
    with pytest.raises(WorkbookFormulaError, match="dependency cycle") as cycle_error:
        formula_evaluation_order(cycle)
    assert cycle_error.value.code == "FORMULA_DEPENDENCY_CYCLE"

    with pytest.raises(WorkbookFormulaError) as self_error:
        normalize_formula(formula(column("fare")), COLUMNS, output_column_id="fare")
    assert self_error.value.code == "FORMULA_SELF_REFERENCE"


def test_non_numeric_references_and_complexity_are_rejected() -> None:
    columns = COLUMNS + [
        {"id": "name", "label": "Name", "column_number": 4, "data_type": "text"}
    ]
    with pytest.raises(WorkbookFormulaError) as type_error:
        normalize_formula(formula(column("name")), columns)
    assert type_error.value.code == "INVALID_FORMULA_TYPE"

    expression = constant("1")
    for _ in range(13):
        expression = binary("+", expression, constant("1"))
    with pytest.raises(WorkbookFormulaError) as depth_error:
        normalize_formula(formula(expression), COLUMNS)
    assert depth_error.value.code == "FORMULA_TOO_COMPLEX"
