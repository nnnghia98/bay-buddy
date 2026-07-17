"""Authoritative guided formula language for Workbook Editor V2.

The persisted contract is versioned and references stable workbook column IDs.
Formula expressions are deliberately row-local: they cannot contain raw Excel
text, ranges, sheet references, or cross-row operations.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from decimal import Decimal, DivisionByZero, InvalidOperation, ROUND_HALF_UP, localcontext
from typing import Any, Iterable, Mapping, Sequence

from openpyxl.utils import get_column_letter


SCHEMA_VERSION = 1
MAX_AST_DEPTH = 12
MAX_AST_NODES = 128
MAX_FUNCTION_ARGUMENTS = 20
MAX_ABS_RESULT = Decimal("1000000000000000")
MAX_ROUND_DIGITS = 15
NUMERIC_DATA_TYPES = frozenset({"number", "currency"})
ARITHMETIC_OPERATORS = frozenset({"+", "-", "*", "/"})
COMPARISON_OPERATORS = frozenset({"=", "<>", "<", "<=", ">", ">="})
VARIADIC_FUNCTIONS = frozenset({"SUM", "MIN", "MAX"})


class WorkbookFormulaError(ValueError):
    """Safe formula rejection with a stable machine-readable code."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.details = details or {}


class WorkbookFormulaEvaluationError(WorkbookFormulaError):
    """A formula was valid but could not be evaluated for one row."""


@dataclass(frozen=True, slots=True)
class FormulaColumn:
    id: str
    label: str
    column_number: int
    data_type: str
    formula: dict[str, Any] | None


@dataclass(frozen=True, slots=True)
class FormulaEvaluation:
    value: int | float | None
    error_code: str | None = None
    error_message: str | None = None


@dataclass(slots=True)
class _ValidationState:
    node_count: int = 0


def _reject(
    code: str,
    message: str,
    *,
    details: dict[str, Any] | None = None,
) -> WorkbookFormulaError:
    return WorkbookFormulaError(code, message, details=details)


def _decimal_text(value: object) -> str:
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise _reject("INVALID_FORMULA", "Formula constants must be numeric strings.")
    try:
        decimal_value = Decimal(str(value).strip())
    except (InvalidOperation, ValueError) as exc:
        raise _reject("INVALID_FORMULA", "Formula constant is invalid.") from exc
    if not decimal_value.is_finite() or abs(decimal_value) > MAX_ABS_RESULT:
        raise _reject("FORMULA_RESULT_OUT_OF_RANGE", "Formula constant is outside the supported range.")
    normalized = decimal_value.normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    if text in {"", "-0"}:
        return "0"
    return text


def adapt_legacy_formula(formula: Mapping[str, Any]) -> dict[str, Any]:
    """Convert the legacy binary contract to the versioned AST contract."""

    if "schema_version" in formula or "expression" in formula:
        return dict(formula)
    left = formula.get("left_column_id")
    right = formula.get("right_column_id")
    operator = formula.get("operator")
    if not isinstance(left, str) or not left or not isinstance(right, str) or not right:
        raise _reject("INVALID_FORMULA", "Legacy formula references are invalid.")
    if operator not in {"+", "-", "*", "/", "%"}:
        raise _reject("INVALID_FORMULA", "Legacy formula operator is not supported.")
    expression: dict[str, Any] = {
        "type": "binary",
        "operator": "*" if operator == "%" else operator,
        "left": {"type": "column", "column_id": left},
        "right": {"type": "column", "column_id": right},
    }
    if operator == "%":
        expression = {
            "type": "binary",
            "operator": "/",
            "left": expression,
            "right": {"type": "constant", "value": "100"},
        }
    return {"schema_version": SCHEMA_VERSION, "expression": expression}


def normalize_formula(
    formula: Mapping[str, Any],
    columns: Sequence[Mapping[str, Any]],
    *,
    output_column_id: str | None = None,
    output_type: str = "number",
) -> dict[str, Any]:
    """Validate and canonicalize a persisted formula contract."""

    if not isinstance(formula, Mapping):
        raise _reject("INVALID_FORMULA", "Formula must be an object.")
    adapted = adapt_legacy_formula(formula)
    if adapted.get("schema_version") != SCHEMA_VERSION:
        raise _reject(
            "UNSUPPORTED_FORMULA_VERSION",
            "Formula schema version is not supported.",
            details={"supported_schema_version": SCHEMA_VERSION},
        )
    if set(adapted) != {"schema_version", "expression"}:
        raise _reject("INVALID_FORMULA", "Formula contract contains unsupported fields.")
    if output_type not in NUMERIC_DATA_TYPES:
        raise _reject("INVALID_FORMULA_OUTPUT_TYPE", "Formula output must be number or currency.")

    by_id = _column_map(columns)
    state = _ValidationState()
    expression, expression_type = _normalize_node(
        adapted.get("expression"),
        by_id,
        state=state,
        depth=1,
        output_column_id=output_column_id,
    )
    if expression_type != "number":
        raise _reject("INVALID_FORMULA_TYPE", "Formula output expression must be numeric.")
    return {"schema_version": SCHEMA_VERSION, "expression": expression}


def _column_map(columns: Sequence[Mapping[str, Any]]) -> dict[str, Mapping[str, Any]]:
    by_id: dict[str, Mapping[str, Any]] = {}
    column_numbers: set[int] = set()
    for column in columns:
        column_id = column.get("id")
        column_number = column.get("column_number")
        if (
            not isinstance(column_id, str)
            or not column_id
            or column_id in by_id
            or isinstance(column_number, bool)
            or not isinstance(column_number, int)
            or column_number < 1
            or column_number in column_numbers
        ):
            raise _reject("INVALID_MAPPING", "Workbook column configuration is invalid.")
        by_id[column_id] = column
        column_numbers.add(column_number)
    return by_id


def _normalize_node(
    raw: object,
    columns: Mapping[str, Mapping[str, Any]],
    *,
    state: _ValidationState,
    depth: int,
    output_column_id: str | None,
) -> tuple[dict[str, Any], str]:
    if depth > MAX_AST_DEPTH:
        raise _reject("FORMULA_TOO_COMPLEX", f"Formula depth may not exceed {MAX_AST_DEPTH}.")
    state.node_count += 1
    if state.node_count > MAX_AST_NODES:
        raise _reject("FORMULA_TOO_COMPLEX", f"Formula may contain at most {MAX_AST_NODES} nodes.")
    if not isinstance(raw, Mapping):
        raise _reject("INVALID_FORMULA", "Formula expression node must be an object.")
    node_type = raw.get("type")

    if node_type == "constant":
        if set(raw) != {"type", "value"}:
            raise _reject("INVALID_FORMULA", "Constant node contains unsupported fields.")
        return {"type": "constant", "value": _decimal_text(raw.get("value"))}, "number"

    if node_type == "column":
        if set(raw) != {"type", "column_id"}:
            raise _reject("INVALID_FORMULA", "Column node contains unsupported fields.")
        column_id = raw.get("column_id")
        if not isinstance(column_id, str) or column_id not in columns:
            raise _reject(
                "UNKNOWN_FORMULA_COLUMN",
                "Formula references an unknown column.",
                details={"column_id": column_id},
            )
        if output_column_id is not None and column_id == output_column_id:
            raise _reject("FORMULA_SELF_REFERENCE", "Formula cannot reference its own column.")
        if columns[column_id].get("data_type") not in NUMERIC_DATA_TYPES:
            raise _reject(
                "INVALID_FORMULA_TYPE",
                "Formula references must use number or currency columns.",
                details={"column_id": column_id},
            )
        return {"type": "column", "column_id": column_id}, "number"

    if node_type in {"binary", "comparison"}:
        expected = {"type", "operator", "left", "right"}
        if set(raw) != expected:
            raise _reject("INVALID_FORMULA", f"{node_type.title()} node contains unsupported fields.")
        operator = raw.get("operator")
        supported = ARITHMETIC_OPERATORS if node_type == "binary" else COMPARISON_OPERATORS
        if operator not in supported:
            raise _reject("INVALID_FORMULA", f"Formula {node_type} operator is not supported.")
        left, left_type = _normalize_node(
            raw.get("left"), columns, state=state, depth=depth + 1, output_column_id=output_column_id
        )
        right, right_type = _normalize_node(
            raw.get("right"), columns, state=state, depth=depth + 1, output_column_id=output_column_id
        )
        if left_type != "number" or right_type != "number":
            raise _reject("INVALID_FORMULA_TYPE", "Arithmetic and comparison operands must be numeric.")
        return {
            "type": node_type,
            "operator": operator,
            "left": left,
            "right": right,
        }, "number" if node_type == "binary" else "boolean"

    if node_type == "if":
        expected = {"type", "condition", "when_true", "when_false"}
        if set(raw) != expected:
            raise _reject("INVALID_FORMULA", "IF node contains unsupported fields.")
        condition, condition_type = _normalize_node(
            raw.get("condition"), columns, state=state, depth=depth + 1, output_column_id=output_column_id
        )
        when_true, true_type = _normalize_node(
            raw.get("when_true"), columns, state=state, depth=depth + 1, output_column_id=output_column_id
        )
        when_false, false_type = _normalize_node(
            raw.get("when_false"), columns, state=state, depth=depth + 1, output_column_id=output_column_id
        )
        if condition_type != "boolean":
            raise _reject("INVALID_FORMULA_TYPE", "IF condition must be a comparison.")
        if true_type != "number" or false_type != "number":
            raise _reject("INVALID_FORMULA_TYPE", "IF result branches must be numeric.")
        return {
            "type": "if",
            "condition": condition,
            "when_true": when_true,
            "when_false": when_false,
        }, "number"

    if node_type == "round":
        if set(raw) != {"type", "value", "digits"}:
            raise _reject("INVALID_FORMULA", "ROUND node contains unsupported fields.")
        digits = raw.get("digits")
        if isinstance(digits, bool) or not isinstance(digits, int) or not -MAX_ROUND_DIGITS <= digits <= MAX_ROUND_DIGITS:
            raise _reject(
                "INVALID_FORMULA",
                f"ROUND digits must be an integer from {-MAX_ROUND_DIGITS} to {MAX_ROUND_DIGITS}.",
            )
        value, value_type = _normalize_node(
            raw.get("value"), columns, state=state, depth=depth + 1, output_column_id=output_column_id
        )
        if value_type != "number":
            raise _reject("INVALID_FORMULA_TYPE", "ROUND value must be numeric.")
        return {"type": "round", "value": value, "digits": digits}, "number"

    if node_type == "function":
        if set(raw) != {"type", "function", "arguments"}:
            raise _reject("INVALID_FORMULA", "Function node contains unsupported fields.")
        function = raw.get("function")
        arguments = raw.get("arguments")
        if function not in VARIADIC_FUNCTIONS:
            raise _reject("INVALID_FORMULA", "Formula function is not supported.")
        if not isinstance(arguments, list) or not 1 <= len(arguments) <= MAX_FUNCTION_ARGUMENTS:
            raise _reject(
                "INVALID_FORMULA_ARITY",
                f"{function} requires between 1 and {MAX_FUNCTION_ARGUMENTS} arguments.",
            )
        normalized_arguments: list[dict[str, Any]] = []
        for argument in arguments:
            normalized, argument_type = _normalize_node(
                argument, columns, state=state, depth=depth + 1, output_column_id=output_column_id
            )
            if argument_type != "number":
                raise _reject("INVALID_FORMULA_TYPE", f"{function} arguments must be numeric.")
            normalized_arguments.append(normalized)
        return {
            "type": "function",
            "function": function,
            "arguments": normalized_arguments,
        }, "number"

    raise _reject("INVALID_FORMULA", "Formula expression node type is not supported.")


def referenced_column_ids(formula: Mapping[str, Any]) -> tuple[str, ...]:
    adapted = adapt_legacy_formula(formula)
    references: list[str] = []

    def visit(node: object) -> None:
        if not isinstance(node, Mapping):
            return
        if node.get("type") == "column" and isinstance(node.get("column_id"), str):
            references.append(str(node["column_id"]))
        for key in ("left", "right", "condition", "when_true", "when_false", "value"):
            visit(node.get(key))
        arguments = node.get("arguments")
        if isinstance(arguments, list):
            for argument in arguments:
                visit(argument)

    visit(adapted.get("expression"))
    return tuple(dict.fromkeys(references))


def normalize_column_formulas(
    columns: Sequence[Mapping[str, Any]],
) -> tuple[list[dict[str, Any]], tuple[str, ...]]:
    """Normalize every formula and validate the formula dependency DAG."""

    normalized = [dict(column) for column in columns]
    if any(
        isinstance(column.get("formula"), Mapping)
        and "schema_version" not in column["formula"]
        for column in normalized
    ):
        # Very early binary-formula sessions did not persist column data types.
        # Their operands were already restricted to numeric columns at write time.
        for column in normalized:
            column.setdefault("data_type", "number")
    _column_map(normalized)
    for column in normalized:
        formula = column.get("formula")
        if formula is None:
            continue
        column["formula"] = normalize_formula(
            formula,
            normalized,
            output_column_id=str(column["id"]),
            output_type=str(column.get("data_type", "number")),
        )
    order = formula_evaluation_order(normalized)
    return normalized, order


def formula_evaluation_order(columns: Sequence[Mapping[str, Any]]) -> tuple[str, ...]:
    by_id = _column_map(columns)
    formula_ids = {column_id for column_id, column in by_id.items() if column.get("formula")}
    dependencies: dict[str, set[str]] = {}
    dependents: dict[str, set[str]] = {column_id: set() for column_id in formula_ids}
    for column_id in formula_ids:
        refs = set(referenced_column_ids(by_id[column_id]["formula"]))
        if column_id in refs:
            raise _reject("FORMULA_SELF_REFERENCE", "Formula cannot reference its own column.")
        dependencies[column_id] = refs & formula_ids
        for dependency in dependencies[column_id]:
            dependents[dependency].add(column_id)

    ready = sorted(column_id for column_id, refs in dependencies.items() if not refs)
    order: list[str] = []
    while ready:
        column_id = ready.pop(0)
        order.append(column_id)
        for dependent in sorted(dependents[column_id]):
            dependencies[dependent].discard(column_id)
            if not dependencies[dependent] and dependent not in order and dependent not in ready:
                ready.append(dependent)
        ready.sort()
    if len(order) != len(formula_ids):
        cycle_ids = sorted(column_id for column_id, refs in dependencies.items() if refs)
        raise _reject(
            "FORMULA_DEPENDENCY_CYCLE",
            "Formula columns contain a dependency cycle.",
            details={"column_ids": cycle_ids},
        )
    return tuple(order)


def evaluate_formula(
    formula: Mapping[str, Any],
    values_by_id: Mapping[str, Any],
) -> FormulaEvaluation:
    """Evaluate one normalized or legacy formula for one workbook row."""

    try:
        expression = adapt_legacy_formula(formula)["expression"]
        value = _evaluate_node(expression, values_by_id)
        decimal_value = _checked_decimal(value)
        return FormulaEvaluation(value=_json_number(decimal_value))
    except WorkbookFormulaEvaluationError as exc:
        return FormulaEvaluation(value=None, error_code=exc.code, error_message=str(exc))
    except (DivisionByZero, InvalidOperation, OverflowError, ValueError) as exc:
        return FormulaEvaluation(
            value=None,
            error_code="FORMULA_EVALUATION_ERROR",
            error_message="Formula could not be evaluated for this row.",
        )


def evaluate_formula_columns(
    columns: Sequence[Mapping[str, Any]],
    values_by_id: Mapping[str, Any],
) -> tuple[dict[str, Any], dict[str, FormulaEvaluation]]:
    normalized, order = normalize_column_formulas(columns)
    return evaluate_normalized_formula_columns(normalized, order, values_by_id)


def evaluate_normalized_formula_columns(
    normalized_columns: Sequence[Mapping[str, Any]],
    evaluation_order: Sequence[str],
    values_by_id: Mapping[str, Any],
) -> tuple[dict[str, Any], dict[str, FormulaEvaluation]]:
    """Evaluate a prevalidated formula DAG efficiently for one row."""

    by_id = {str(column["id"]): column for column in normalized_columns}
    values = dict(values_by_id)
    evaluations: dict[str, FormulaEvaluation] = {}
    for column_id in evaluation_order:
        formula = by_id[column_id]["formula"]
        failed_dependency = next(
            (
                dependency_id
                for dependency_id in referenced_column_ids(formula)
                if dependency_id in evaluations
                and evaluations[dependency_id].error_code is not None
            ),
            None,
        )
        if failed_dependency is not None:
            evaluation = FormulaEvaluation(
                value=None,
                error_code="FORMULA_DEPENDENCY_ERROR",
                error_message="A referenced formula column could not be evaluated.",
            )
        else:
            evaluation = evaluate_formula(formula, values)
        evaluations[column_id] = evaluation
        values[column_id] = evaluation.value
    return values, evaluations


def _numeric_operand(value: object) -> Decimal:
    if value is None or value == "":
        return Decimal(0)
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        raise WorkbookFormulaEvaluationError(
            "FORMULA_NON_NUMERIC_VALUE",
            "Formula encountered a non-numeric cell value.",
        )
    try:
        return _checked_decimal(Decimal(str(value)))
    except (InvalidOperation, ValueError) as exc:
        raise WorkbookFormulaEvaluationError(
            "FORMULA_NON_NUMERIC_VALUE",
            "Formula encountered an invalid numeric cell value.",
        ) from exc


def _checked_decimal(value: Decimal) -> Decimal:
    if not value.is_finite() or abs(value) > MAX_ABS_RESULT:
        raise WorkbookFormulaEvaluationError(
            "FORMULA_RESULT_OUT_OF_RANGE",
            "Formula result is outside the supported range.",
        )
    return value


def _evaluate_node(node: Mapping[str, Any], values_by_id: Mapping[str, Any]) -> Decimal | bool:
    node_type = node.get("type")
    if node_type == "constant":
        return _checked_decimal(Decimal(str(node["value"])))
    if node_type == "column":
        return _numeric_operand(values_by_id.get(str(node["column_id"])))
    if node_type == "binary":
        left = _numeric_operand(_evaluate_node(node["left"], values_by_id))
        right = _numeric_operand(_evaluate_node(node["right"], values_by_id))
        operator = node["operator"]
        with localcontext() as context:
            context.prec = 34
            if operator == "+":
                result = left + right
            elif operator == "-":
                result = left - right
            elif operator == "*":
                result = left * right
            elif operator == "/":
                if right == 0:
                    raise WorkbookFormulaEvaluationError(
                        "FORMULA_DIVISION_BY_ZERO",
                        "Formula cannot divide by zero.",
                    )
                result = left / right
            else:  # pragma: no cover - normalized formulas cannot reach this
                raise WorkbookFormulaEvaluationError("INVALID_FORMULA", "Formula operator is invalid.")
        return _checked_decimal(result)
    if node_type == "comparison":
        left = _numeric_operand(_evaluate_node(node["left"], values_by_id))
        right = _numeric_operand(_evaluate_node(node["right"], values_by_id))
        return {
            "=": left == right,
            "<>": left != right,
            "<": left < right,
            "<=": left <= right,
            ">": left > right,
            ">=": left >= right,
        }[str(node["operator"])]
    if node_type == "if":
        condition = _evaluate_node(node["condition"], values_by_id)
        if not isinstance(condition, bool):
            raise WorkbookFormulaEvaluationError("INVALID_FORMULA", "IF condition is invalid.")
        return _evaluate_node(node["when_true"] if condition else node["when_false"], values_by_id)
    if node_type == "round":
        value = _numeric_operand(_evaluate_node(node["value"], values_by_id))
        digits = int(node["digits"])
        quantum = Decimal(1).scaleb(-digits)
        with localcontext() as context:
            context.prec = 34
            return _checked_decimal(value.quantize(quantum, rounding=ROUND_HALF_UP))
    if node_type == "function":
        arguments = [
            _numeric_operand(_evaluate_node(argument, values_by_id))
            for argument in node["arguments"]
        ]
        function = node["function"]
        if function == "SUM":
            return _checked_decimal(sum(arguments, Decimal(0)))
        if function == "MIN":
            return min(arguments)
        if function == "MAX":
            return max(arguments)
    raise WorkbookFormulaEvaluationError("INVALID_FORMULA", "Formula expression is invalid.")


def _json_number(value: Decimal) -> int | float:
    if value == value.to_integral_value():
        return int(value)
    result = float(value)
    if not math.isfinite(result):
        raise WorkbookFormulaEvaluationError(
            "FORMULA_RESULT_OUT_OF_RANGE", "Formula result is outside the supported range."
        )
    return result


def render_readable_expression(
    formula: Mapping[str, Any],
    columns: Sequence[Mapping[str, Any]],
) -> str:
    labels = {str(column.get("id")): str(column.get("label") or column.get("id")) for column in columns}
    expression = adapt_legacy_formula(formula)["expression"]
    return _render_node(expression, lambda column_id: labels.get(column_id, column_id), excel=False)


def render_excel_formula(
    formula: Mapping[str, Any],
    columns: Sequence[Mapping[str, Any]],
    *,
    row_number: int,
) -> str:
    numbers = {str(column.get("id")): int(column["column_number"]) for column in columns}
    expression = adapt_legacy_formula(formula)["expression"]

    def reference(column_id: str) -> str:
        if column_id not in numbers:
            raise _reject("UNKNOWN_FORMULA_COLUMN", "Formula references an unknown column.")
        return f"{get_column_letter(numbers[column_id])}{row_number}"

    return "=" + _render_node(expression, reference, excel=True)


def _render_node(node: Mapping[str, Any], reference, *, excel: bool) -> str:
    node_type = node["type"]
    separator = ","
    if node_type == "constant":
        return str(node["value"])
    if node_type == "column":
        return reference(str(node["column_id"]))
    if node_type in {"binary", "comparison"}:
        left = _render_node(node["left"], reference, excel=excel)
        right = _render_node(node["right"], reference, excel=excel)
        return f"({left} {node['operator']} {right})"
    if node_type == "if":
        condition = _render_node(node["condition"], reference, excel=excel)
        when_true = _render_node(node["when_true"], reference, excel=excel)
        when_false = _render_node(node["when_false"], reference, excel=excel)
        return f"IF({condition}{separator}{when_true}{separator}{when_false})"
    if node_type == "round":
        value = _render_node(node["value"], reference, excel=excel)
        return f"ROUND({value}{separator}{node['digits']})"
    if node_type == "function":
        arguments = separator.join(
            _render_node(argument, reference, excel=excel) for argument in node["arguments"]
        )
        return f"{node['function']}({arguments})"
    raise _reject("INVALID_FORMULA", "Formula expression is invalid.")


def dependent_formula_columns(
    columns: Sequence[Mapping[str, Any]],
    column_id: str,
) -> tuple[str, ...]:
    return tuple(
        str(column["id"])
        for column in columns
        if column.get("formula") and column_id in referenced_column_ids(column["formula"])
    )
