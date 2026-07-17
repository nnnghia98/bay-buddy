"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  WorkbookColumn,
  WorkbookComparisonOperator,
  WorkbookFormulaExpression,
  WorkbookFormulaOperator,
  WorkbookVariadicFunction,
} from "@/schemas/workbook"

export type FormulaTranslator = (key: string, values?: Record<string, string | number>) => string

type ExpressionKind = "column" | "constant" | "binary" | "comparison" | "if" | "round" | "function"

function columnExpression(columns: WorkbookColumn[]): WorkbookFormulaExpression {
  return columns[0]
    ? { type: "column", column_id: columns[0].id }
    : { type: "constant", value: "0" }
}

export function defaultFormulaExpression(columns: WorkbookColumn[]): WorkbookFormulaExpression {
  return {
    type: "binary",
    operator: "+",
    left: columnExpression(columns),
    right: { type: "constant", value: "100000" },
  }
}

function comparisonExpression(columns: WorkbookColumn[]): WorkbookFormulaExpression {
  return {
    type: "comparison",
    operator: ">",
    left: columnExpression(columns),
    right: { type: "constant", value: "0" },
  }
}

function expressionForKind(
  kind: ExpressionKind,
  columns: WorkbookColumn[],
): WorkbookFormulaExpression {
  const value = columnExpression(columns)
  if (kind === "column") return value
  if (kind === "constant") return { type: "constant", value: "0" }
  if (kind === "binary") return { type: "binary", operator: "+", left: value, right: { type: "constant", value: "0" } }
  if (kind === "comparison") return comparisonExpression(columns)
  if (kind === "if") return { type: "if", condition: comparisonExpression(columns), when_true: value, when_false: { type: "constant", value: "0" } }
  if (kind === "round") return { type: "round", value, digits: 0 }
  return { type: "function", function: "SUM", arguments: [value, { type: "constant", value: "0" }] }
}

function nodeKind(expression: WorkbookFormulaExpression): ExpressionKind {
  return expression.type
}

const selectClass = "h-10 min-w-0 rounded-md border border-input bg-white px-2 text-sm"

export function FormulaExpressionNode({
  columns,
  depth = 0,
  expected = "number",
  expression,
  onChange,
  t,
}: {
  columns: WorkbookColumn[]
  depth?: number
  expected?: "number" | "boolean"
  expression: WorkbookFormulaExpression
  onChange: (expression: WorkbookFormulaExpression) => void
  t: FormulaTranslator
}) {
  const maxGuidedDepth = 5
  const canNest = depth < maxGuidedDepth
  const numericColumns = React.useMemo(
    () => columns.filter((column) => column.data_type === "number" || column.data_type === "currency"),
    [columns],
  )
  const kinds: ExpressionKind[] = expected === "boolean"
    ? ["comparison"]
    : canNest
      ? ["column", "constant", "binary", "if", "round", "function"]
      : ["column", "constant"]
  const currentKind = expected === "boolean" ? "comparison" : nodeKind(expression)

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-white p-3">
      <div className="flex items-center gap-2">
        <select
          aria-label={t("workbookEditor.editor.columns.builder.nodeType")}
          className={selectClass}
          onChange={(event) => onChange(expressionForKind(event.target.value as ExpressionKind, columns))}
          value={currentKind}
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>{t(`workbookEditor.editor.columns.builder.types.${kind}`)}</option>
          ))}
        </select>
        {depth > 0 ? <span className="text-xs text-muted-foreground">{t("workbookEditor.editor.columns.builder.parentheses")}</span> : null}
      </div>

      {expression.type === "column" ? (
        numericColumns.length ? (
          <select
            aria-label={t("workbookEditor.editor.columns.builder.column")}
            className={selectClass}
            onChange={(event) => onChange({ ...expression, column_id: event.target.value })}
            value={expression.column_id}
          >
            {numericColumns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label || t("workbookEditor.editor.columns.unnamed")}{column.formula ? ` · ${t("workbookEditor.editor.columns.derivedShort")}` : ""}
              </option>
            ))}
          </select>
        ) : <p className="text-xs text-muted-foreground">{t("workbookEditor.editor.columns.formulaNeedsColumns")}</p>
      ) : null}

      {expression.type === "constant" ? (
        <Input
          aria-label={t("workbookEditor.editor.columns.builder.constant")}
          inputMode="decimal"
          onChange={(event) => onChange({ ...expression, value: event.target.value })}
          placeholder="100000"
          value={expression.value}
        />
      ) : null}

      {expression.type === "binary" || expression.type === "comparison" ? (
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:items-start">
          <FormulaExpressionNode columns={columns} depth={depth + 1} expression={expression.left} onChange={(left) => onChange({ ...expression, left })} t={t} />
          <select
            aria-label={t("workbookEditor.editor.columns.operator")}
            className={`${selectClass} font-mono md:mt-3`}
            onChange={(event) => onChange({ ...expression, operator: event.target.value as never })}
            value={expression.operator}
          >
            {(expression.type === "binary"
              ? (["+", "-", "*", "/"] satisfies WorkbookFormulaOperator[])
              : (["=", "<>", "<", "<=", ">", ">="] satisfies WorkbookComparisonOperator[])
            ).map((operator) => <option key={operator} value={operator}>{operator}</option>)}
          </select>
          <FormulaExpressionNode columns={columns} depth={depth + 1} expression={expression.right} onChange={(right) => onChange({ ...expression, right })} t={t} />
        </div>
      ) : null}

      {expression.type === "if" ? (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("workbookEditor.editor.columns.builder.condition")}</span>
            <FormulaExpressionNode columns={columns} depth={depth + 1} expected="boolean" expression={expression.condition} onChange={(condition) => onChange({ ...expression, condition })} t={t} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1"><span className="text-xs font-medium text-muted-foreground">{t("workbookEditor.editor.columns.builder.whenTrue")}</span><FormulaExpressionNode columns={columns} depth={depth + 1} expression={expression.when_true} onChange={(when_true) => onChange({ ...expression, when_true })} t={t} /></div>
            <div className="grid gap-1"><span className="text-xs font-medium text-muted-foreground">{t("workbookEditor.editor.columns.builder.whenFalse")}</span><FormulaExpressionNode columns={columns} depth={depth + 1} expression={expression.when_false} onChange={(when_false) => onChange({ ...expression, when_false })} t={t} /></div>
          </div>
        </div>
      ) : null}

      {expression.type === "round" ? (
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem]">
          <FormulaExpressionNode columns={columns} depth={depth + 1} expression={expression.value} onChange={(value) => onChange({ ...expression, value })} t={t} />
          <label className="grid content-start gap-1 text-xs font-medium text-muted-foreground">
            {t("workbookEditor.editor.columns.builder.digits")}
            <Input max={15} min={-15} onChange={(event) => onChange({ ...expression, digits: Number(event.target.value) })} type="number" value={expression.digits} />
          </label>
        </div>
      ) : null}

      {expression.type === "function" ? (
        <div className="grid gap-2">
          <select
            aria-label={t("workbookEditor.editor.columns.builder.function")}
            className={selectClass}
            onChange={(event) => onChange({ ...expression, function: event.target.value as WorkbookVariadicFunction })}
            value={expression.function}
          >
            {(["SUM", "MIN", "MAX"] satisfies WorkbookVariadicFunction[]).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">{t("workbookEditor.editor.columns.builder.rowLocalFunctions")}</p>
          {expression.arguments.map((argument, index) => (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" key={index}>
              <FormulaExpressionNode columns={columns} depth={depth + 1} expression={argument} onChange={(nextArgument) => onChange({ ...expression, arguments: expression.arguments.map((item, itemIndex) => itemIndex === index ? nextArgument : item) })} t={t} />
              <Button aria-label={t("workbookEditor.editor.columns.builder.removeArgument")} disabled={expression.arguments.length <= 1} onClick={() => onChange({ ...expression, arguments: expression.arguments.filter((_, itemIndex) => itemIndex !== index) })} size="icon" type="button" variant="ghost"><Minus /></Button>
            </div>
          ))}
          <Button disabled={expression.arguments.length >= 20} onClick={() => onChange({ ...expression, arguments: [...expression.arguments, { type: "constant", value: "0" }] })} size="sm" type="button" variant="outline"><Plus />{t("workbookEditor.editor.columns.builder.addArgument")}</Button>
        </div>
      ) : null}
    </div>
  )
}
