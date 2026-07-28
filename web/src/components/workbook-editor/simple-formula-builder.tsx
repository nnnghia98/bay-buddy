"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type {
  WorkbookColumn,
  WorkbookFormulaExpression,
  WorkbookFormulaOperator,
} from "@/schemas/workbook"

export type FormulaTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string

export type SimpleFormulaDefinition = {
  columnIds: string[]
  operators: WorkbookFormulaOperator[]
}

const formulaOperators = ["+", "-", "*", "/"] satisfies WorkbookFormulaOperator[]
const operatorLabels: Record<WorkbookFormulaOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
}

function operatorPrecedence(operator: WorkbookFormulaOperator): number {
  return operator === "*" || operator === "/" ? 2 : 1
}

function columnExpression(columnId: string): WorkbookFormulaExpression {
  return { type: "column", column_id: columnId }
}

function expressionsMatch(
  left: WorkbookFormulaExpression,
  right: WorkbookFormulaExpression,
): boolean {
  if (left.type !== right.type) return false
  if (left.type === "column" && right.type === "column") {
    return left.column_id === right.column_id
  }
  if (left.type === "binary" && right.type === "binary") {
    return left.operator === right.operator
      && expressionsMatch(left.left, right.left)
      && expressionsMatch(left.right, right.right)
  }
  return false
}

export function createDefaultSimpleFormula(
  columns: WorkbookColumn[],
): SimpleFormulaDefinition | null {
  const numericColumns = columns.filter(
    (column) => column.data_type === "number" || column.data_type === "currency",
  )
  if (numericColumns.length < 2) return null
  return {
    columnIds: [numericColumns[0].id, numericColumns[1].id],
    operators: ["+"],
  }
}

export function buildSimpleFormulaExpression(
  formula: SimpleFormulaDefinition,
): WorkbookFormulaExpression | null {
  if (
    formula.columnIds.length < 2
    || formula.columnIds.length > 3
    || formula.operators.length !== formula.columnIds.length - 1
    || formula.columnIds.some((columnId) => !columnId)
  ) {
    return null
  }

  const firstOperation: WorkbookFormulaExpression = {
    type: "binary",
    operator: formula.operators[0],
    left: columnExpression(formula.columnIds[0]),
    right: columnExpression(formula.columnIds[1]),
  }
  if (formula.columnIds.length === 2) return firstOperation

  const secondOperator = formula.operators[1]
  if (operatorPrecedence(secondOperator) > operatorPrecedence(formula.operators[0])) {
    return {
      type: "binary",
      operator: formula.operators[0],
      left: columnExpression(formula.columnIds[0]),
      right: {
        type: "binary",
        operator: secondOperator,
        left: columnExpression(formula.columnIds[1]),
        right: columnExpression(formula.columnIds[2]),
      },
    }
  }

  return {
    type: "binary",
    operator: secondOperator,
    left: firstOperation,
    right: columnExpression(formula.columnIds[2]),
  }
}

export function parseSimpleFormulaExpression(
  expression: WorkbookFormulaExpression,
): SimpleFormulaDefinition | null {
  if (expression.type !== "binary") return null

  if (expression.left.type === "column" && expression.right.type === "column") {
    return {
      columnIds: [expression.left.column_id, expression.right.column_id],
      operators: [expression.operator],
    }
  }

  const candidates: SimpleFormulaDefinition[] = []
  if (
    expression.left.type === "binary"
    && expression.left.left.type === "column"
    && expression.left.right.type === "column"
    && expression.right.type === "column"
  ) {
    candidates.push({
      columnIds: [
        expression.left.left.column_id,
        expression.left.right.column_id,
        expression.right.column_id,
      ],
      operators: [expression.left.operator, expression.operator],
    })
  }
  if (
    expression.left.type === "column"
    && expression.right.type === "binary"
    && expression.right.left.type === "column"
    && expression.right.right.type === "column"
  ) {
    candidates.push({
      columnIds: [
        expression.left.column_id,
        expression.right.left.column_id,
        expression.right.right.column_id,
      ],
      operators: [expression.operator, expression.right.operator],
    })
  }

  return candidates.find((candidate) => {
    const rebuilt = buildSimpleFormulaExpression(candidate)
    return rebuilt ? expressionsMatch(rebuilt, expression) : false
  }) ?? null
}

export function SimpleFormulaBuilder({
  columns,
  value,
  onChange,
  t,
}: {
  columns: WorkbookColumn[]
  value: SimpleFormulaDefinition
  onChange: (value: SimpleFormulaDefinition) => void
  t: FormulaTranslator
}) {
  const numericColumns = columns.filter(
    (column) => column.data_type === "number" || column.data_type === "currency",
  )
  const hasThirdColumn = value.columnIds.length === 3
  const canAddThirdColumn = !hasThirdColumn && numericColumns.length >= 3
  const columnSelectClass = "h-11 min-w-0 rounded-md border border-input bg-white px-3 text-sm"
  const operatorSelectClass = "h-11 min-w-0 rounded-md border border-input bg-white px-2 text-center font-mono text-base"

  const updateColumn = (index: number, columnId: string) => {
    onChange({
      ...value,
      columnIds: value.columnIds.map((current, currentIndex) =>
        currentIndex === index ? columnId : current
      ),
    })
  }
  const updateOperator = (index: number, operator: WorkbookFormulaOperator) => {
    onChange({
      ...value,
      operators: value.operators.map((current, currentIndex) =>
        currentIndex === index ? operator : current
      ),
    })
  }
  const addThirdColumn = () => {
    const nextColumn = numericColumns.find(
      (column) => !value.columnIds.includes(column.id),
    )
    if (!nextColumn) return
    onChange({
      columnIds: [...value.columnIds, nextColumn.id],
      operators: [...value.operators, "+"],
    })
  }
  const removeThirdColumn = () => {
    onChange({
      columnIds: value.columnIds.slice(0, 2),
      operators: value.operators.slice(0, 1),
    })
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-secondary/20 p-3">
      <div
        className={cn(
          "grid gap-3",
          hasThirdColumn
            ? "sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_4.5rem_minmax(0,1fr)]"
            : "sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)]",
        )}
      >
        {value.columnIds.map((columnId, index) => (
          <div className="contents" key={`${index}:${columnId}`}>
            {index > 0 ? (
              <div className="grid content-start gap-1.5">
                <Label htmlFor={`simple-formula-operator-${index}`}>
                  {t("workbookEditor.editor.columns.operator")}
                </Label>
                <select
                  aria-label={t("workbookEditor.editor.columns.simpleOperator", { index })}
                  className={operatorSelectClass}
                  id={`simple-formula-operator-${index}`}
                  onChange={(event) => updateOperator(
                    index - 1,
                    event.target.value as WorkbookFormulaOperator,
                  )}
                  value={value.operators[index - 1]}
                >
                  {formulaOperators.map((operator) => (
                    <option key={operator} value={operator}>
                      {operatorLabels[operator]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid content-start gap-1.5">
              <Label htmlFor={`simple-formula-column-${index + 1}`}>
                {t("workbookEditor.editor.columns.simpleColumn", { index: index + 1 })}
              </Label>
              <select
                aria-label={t("workbookEditor.editor.columns.simpleColumn", { index: index + 1 })}
                className={columnSelectClass}
                id={`simple-formula-column-${index + 1}`}
                onChange={(event) => updateColumn(index, event.target.value)}
                value={columnId}
              >
                {numericColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label || t("workbookEditor.editor.columns.unnamed")}
                    {column.formula
                      ? ` · ${t("workbookEditor.editor.columns.derivedShort")}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("workbookEditor.editor.columns.simpleFormulaOrder")}
        </p>
        {canAddThirdColumn ? (
          <Button onClick={addThirdColumn} size="sm" type="button" variant="outline">
            <Plus />
            {t("workbookEditor.editor.columns.addThirdColumn")}
          </Button>
        ) : null}
        {hasThirdColumn ? (
          <Button onClick={removeThirdColumn} size="sm" type="button" variant="ghost">
            <X />
            {t("workbookEditor.editor.columns.removeThirdColumn")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
