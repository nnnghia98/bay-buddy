"use client"

import * as React from "react"
import { FunctionSquare, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WorkbookColumn, WorkbookColumnFormula, WorkbookFormulaOperator } from "@/schemas/workbook"
import type { FormulaTranslator } from "./formula-expression-node"

const selectClass = "h-11 min-w-0 rounded-md border border-input bg-white px-3 text-sm"
const operators: WorkbookFormulaOperator[] = ["+", "-", "*", "/"]

export function FormulaBuilderDialog({
  columns,
  open,
  busy,
  onOpenChange,
  onApply,
  t,
}: {
  columns: WorkbookColumn[]
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onApply: (label: string, dataType: "number", formula: WorkbookColumnFormula) => void
  t: FormulaTranslator
}) {
  const numericColumns = React.useMemo(() => columns.filter((column) =>
    column.data_type === "number" || column.data_type === "currency",
  ), [columns])
  const [label, setLabel] = React.useState("")
  const [leftColumnId, setLeftColumnId] = React.useState("")
  const [rightColumnId, setRightColumnId] = React.useState("")
  const [operator, setOperator] = React.useState<WorkbookFormulaOperator>("+")

  React.useEffect(() => {
    if (!open) return
    setLabel("")
    setLeftColumnId(numericColumns[0]?.id ?? "")
    setRightColumnId(numericColumns[1]?.id ?? numericColumns[0]?.id ?? "")
    setOperator("+")
  }, [numericColumns, open])

  const canApply = Boolean(label.trim() && leftColumnId && rightColumnId && !busy)
  const apply = () => {
    if (!canApply) return
    onApply(label.trim(), "number", {
      schema_version: 1,
      expression: {
        type: "binary",
        operator,
        left: { type: "column", column_id: leftColumnId },
        right: { type: "column", column_id: rightColumnId },
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FunctionSquare className="size-5 text-primary" />{t("workbookEditor.editor.columns.formulaAddTitle")}</DialogTitle>
          <DialogDescription>{t("workbookEditor.editor.columns.simpleFormulaDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="formula-column-label">{t("workbookEditor.editor.columns.label")}</Label>
            <Input id="formula-column-label" maxLength={255} onChange={(event) => setLabel(event.target.value)} value={label} />
          </div>
          <div className="grid gap-2">
            <Label>{t("workbookEditor.editor.columns.formulaBuilder")}</Label>
            <div className="grid gap-2 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] sm:items-center">
              <select aria-label={t("workbookEditor.editor.columns.leftColumn")} className={selectClass} onChange={(event) => setLeftColumnId(event.target.value)} value={leftColumnId}>
                {numericColumns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
              </select>
              <select aria-label={t("workbookEditor.editor.columns.operator")} className={`${selectClass} text-center font-mono text-base`} onChange={(event) => setOperator(event.target.value as WorkbookFormulaOperator)} value={operator}>
                {operators.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label={t("workbookEditor.editor.columns.rightColumn")} className={selectClass} onChange={(event) => setRightColumnId(event.target.value)} value={rightColumnId}>
                {numericColumns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={busy} onClick={() => onOpenChange(false)} type="button" variant="outline">{t("workbookEditor.editor.columns.cancel")}</Button>
          <Button disabled={!canApply} onClick={apply} type="button">{busy ? <LoaderCircle className="animate-spin" /> : null}{t("workbookEditor.editor.columns.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
