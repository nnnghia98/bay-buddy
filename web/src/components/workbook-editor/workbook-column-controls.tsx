"use client"

import * as React from "react"
import { Eye, FunctionSquare, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type {
  WorkbookColumn,
  WorkbookColumnDataType,
  WorkbookColumnFormula,
} from "@/schemas/workbook"
import { FormulaBuilderDialog } from "./formula-builder-dialog"
import type { FormulaTranslator } from "./simple-formula-builder"

export function WorkbookColumnControls({
  columns,
  busy,
  baseVersion,
  sessionId,
  onConfigurationChange,
  onSubmitColumn,
  t,
}: {
  columns: WorkbookColumn[]
  busy: boolean
  baseVersion?: number
  sessionId?: string
  onConfigurationChange: (hidden: string[], sticky: string[]) => void
  onSubmitColumn: (
    columnId: string | undefined,
    label: string,
    dataType: WorkbookColumnDataType,
    formula: WorkbookColumnFormula | null,
  ) => void
  t: FormulaTranslator
}) {
  const [formulaOpen, setFormulaOpen] = React.useState(false)
  const [formulaTarget, setFormulaTarget] = React.useState<WorkbookColumn | null>(null)
  const formulaColumns = columns.filter((column) => column.origin === "user" && column.formula)
  const hiddenColumns = columns.filter((column) => column.hidden)
  const hidden = hiddenColumns.map((column) => column.id)
  const sticky = columns.filter((column) => column.sticky).map((column) => column.id)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        className="whitespace-nowrap"
        disabled={busy}
        onClick={() => {
          setFormulaTarget(null)
          setFormulaOpen(true)
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus />
        {t("workbookEditor.editor.columns.add")}
      </Button>

      {formulaColumns.length ? (
        <select
          aria-label={t("workbookEditor.editor.columns.editFormula")}
          className="h-9 max-w-40 rounded-md border border-input bg-white px-2 text-xs font-medium"
          disabled={busy}
          onChange={(event) => {
            const target = formulaColumns.find((column) => column.id === event.target.value)
            if (!target) return
            setFormulaTarget(target)
            setFormulaOpen(true)
            event.currentTarget.value = ""
          }}
          value=""
        >
          <option disabled value="">{t("workbookEditor.editor.columns.editFormula")}</option>
          {formulaColumns.map((column) => <option key={column.id} value={column.id}>{column.label || t("workbookEditor.editor.columns.unnamed")}</option>)}
        </select>
      ) : null}

      {hiddenColumns.length > 0 ? <Sheet>
        <SheetTrigger asChild>
          <Button className="whitespace-nowrap" disabled={busy} size="sm" type="button" variant="outline">
            <Eye />
            {t("workbookEditor.editor.columns.hiddenColumns", { count: hiddenColumns.length })}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col gap-5 overflow-y-auto">
          <SheetHeader><SheetTitle>{t("workbookEditor.editor.columns.hiddenTitle")}</SheetTitle><SheetDescription>{t("workbookEditor.editor.columns.hiddenDescription")}</SheetDescription></SheetHeader>
          <div className="divide-y divide-border rounded-lg border border-border">
            {hiddenColumns.map((column) => <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3" key={column.id}>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{column.label}</p><p className="flex items-center gap-1 text-xs text-muted-foreground">{column.formula ? <FunctionSquare className="size-3" /> : null}{column.formula ? t("workbookEditor.editor.columns.derived") : t(`workbookEditor.editor.columns.types.${column.data_type}`)}</p>{column.formula ? <p className="mt-1 text-[11px] text-muted-foreground">{t("workbookEditor.editor.columns.dependenciesHint")}</p> : null}</div>
              <Button disabled={busy} onClick={() => onConfigurationChange(hidden.filter((id) => id !== column.id), sticky)} size="sm" type="button" variant="outline"><Eye />{t("workbookEditor.editor.columns.showAgain")}</Button>
            </div>)}
          </div>
        </SheetContent>
      </Sheet> : null}

      <FormulaBuilderDialog
        baseVersion={baseVersion}
        busy={busy}
        columns={columns}
        onApply={(nextLabel, nextDataType, formula) => {
          onSubmitColumn(formulaTarget?.id, nextLabel, nextDataType, formula)
          setFormulaOpen(false)
        }}
        onOpenChange={(nextOpen) => {
          setFormulaOpen(nextOpen)
          if (!nextOpen) setFormulaTarget(null)
        }}
        open={formulaOpen}
        sessionId={sessionId}
        t={t}
        targetColumn={formulaTarget}
      />
    </div>
  )
}
