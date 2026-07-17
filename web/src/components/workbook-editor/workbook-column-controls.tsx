"use client"

import * as React from "react"
import { Eye, FunctionSquare, LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type {
  WorkbookColumn,
  WorkbookColumnDataType,
  WorkbookColumnFormula,
} from "@/schemas/workbook"
import { FormulaBuilderDialog } from "./formula-builder-dialog"
import type { FormulaTranslator } from "./formula-expression-node"

export function WorkbookColumnControls({
  columns,
  busy,
  onAdd,
  onConfigurationChange,
  onUpdateFormula,
  t,
}: {
  columns: WorkbookColumn[]
  busy: boolean
  onAdd: (label: string, dataType: WorkbookColumnDataType) => void
  onConfigurationChange: (hidden: string[], sticky: string[]) => void
  onUpdateFormula: (columnId: string | undefined, label: string, dataType: "number" | "currency", formula: WorkbookColumnFormula | null) => void
  t: FormulaTranslator
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [dataType, setDataType] = React.useState<WorkbookColumnDataType>("text")
  const [formulaOpen, setFormulaOpen] = React.useState(false)
  const numericColumns = columns.filter((column) => column.data_type === "number" || column.data_type === "currency")
  const hiddenColumns = columns.filter((column) => column.hidden)
  const hidden = hiddenColumns.map((column) => column.id)
  const sticky = columns.filter((column) => column.sticky).map((column) => column.id)

  return (
    <div className="flex shrink-0 gap-2">
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild><Button size="sm" type="button" variant="outline"><Plus />{t("workbookEditor.editor.columns.add")}</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("workbookEditor.editor.columns.addTitle")}</DialogTitle><DialogDescription>{t("workbookEditor.editor.columns.addDescription")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="workbook-column-label">{t("workbookEditor.editor.columns.label")}</Label><Input id="workbook-column-label" maxLength={255} onChange={(event) => setLabel(event.target.value)} value={label} /></div>
            <div className="grid gap-2"><Label htmlFor="workbook-column-type">{t("workbookEditor.editor.columns.type")}</Label><select className="h-11 rounded-md border border-input bg-white px-3 text-sm" id="workbook-column-type" onChange={(event) => setDataType(event.target.value as WorkbookColumnDataType)} value={dataType}>{(["text", "number", "date", "currency", "boolean"] as const).map((type) => <option key={type} value={type}>{t(`workbookEditor.editor.columns.types.${type}`)}</option>)}</select></div>
          </div>
          <DialogFooter><Button disabled={!label.trim() || busy} onClick={() => { onAdd(label.trim(), dataType); setAddOpen(false); setLabel("") }} type="button">{busy ? <LoaderCircle className="animate-spin" /> : <Plus />}{t("workbookEditor.editor.columns.add")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Button disabled={numericColumns.length === 0 || busy} onClick={() => setFormulaOpen(true)} size="sm" title={numericColumns.length === 0 ? t("workbookEditor.editor.columns.formulaNeedsColumns") : undefined} type="button" variant="outline"><FunctionSquare />{t("workbookEditor.editor.columns.formula")}</Button>

      {hiddenColumns.length > 0 ? <Sheet>
        <SheetTrigger asChild>
          <Button disabled={busy} size="sm" type="button" variant="outline">
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
        busy={busy}
        columns={columns}
        onApply={(nextLabel, nextDataType, formula) => {
          onUpdateFormula(undefined, nextLabel, nextDataType, formula)
          setFormulaOpen(false)
        }}
        onOpenChange={setFormulaOpen}
        open={formulaOpen}
        t={t}
      />
    </div>
  )
}
