"use client"

import * as React from "react"
import { Columns3, FunctionSquare, LoaderCircle, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { WorkbookColumn, WorkbookColumnDataType, WorkbookColumnFormula, WorkbookFormulaOperator } from "@/schemas/workbook"

type T = (key: string) => string

export function WorkbookColumnControls({ columns, busy, onAdd, onConfigurationChange, onRemove, t }: {
  columns: WorkbookColumn[]
  busy: boolean
  onAdd: (label: string, dataType: WorkbookColumnDataType, formula?: WorkbookColumnFormula) => void
  onConfigurationChange: (hidden: string[], sticky: string[]) => void
  onRemove: (columnId: string) => void
  t: T
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [dataType, setDataType] = React.useState<WorkbookColumnDataType>("text")
  const [useFormula, setUseFormula] = React.useState(false)
  const numericColumns = columns.filter((column) => !column.formula && (column.data_type === "number" || column.data_type === "currency"))
  const [leftColumnId, setLeftColumnId] = React.useState("")
  const [rightColumnId, setRightColumnId] = React.useState("")
  const [operator, setOperator] = React.useState<WorkbookFormulaOperator>("+")
  React.useEffect(() => {
    if (!leftColumnId && numericColumns[0]) setLeftColumnId(numericColumns[0].id)
    if (!rightColumnId && numericColumns[1]) setRightColumnId(numericColumns[1].id)
  }, [leftColumnId, numericColumns, rightColumnId])
  const hidden = columns.filter((column) => column.hidden).map((column) => column.id)
  const sticky = columns.filter((column) => column.sticky).map((column) => column.id)
  const update = (columnId: string, kind: "hidden" | "sticky", checked: boolean) => {
    const current = kind === "hidden" ? hidden : sticky
    const next = checked ? [...current, columnId] : current.filter((id) => id !== columnId)
    const nextSticky = kind === "hidden" && checked
      ? sticky.filter((id) => id !== columnId)
      : kind === "sticky" ? next : sticky
    onConfigurationChange(kind === "hidden" ? next : hidden, nextSticky)
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild><Button size="sm" type="button" variant="outline"><Plus className="size-4" />{t("workbookEditor.editor.columns.add")}</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("workbookEditor.editor.columns.addTitle")}</DialogTitle><DialogDescription>{t("workbookEditor.editor.columns.addDescription")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="workbook-column-label">{t("workbookEditor.editor.columns.label")}</Label><Input id="workbook-column-label" maxLength={100} onChange={(event) => setLabel(event.target.value)} value={label} /></div>
            <div className="grid gap-2"><Label htmlFor="workbook-column-type">{t("workbookEditor.editor.columns.type")}</Label><select className="h-11 rounded-md border border-input bg-white px-3 text-sm" id="workbook-column-type" onChange={(event) => setDataType(event.target.value as WorkbookColumnDataType)} value={dataType}>{(useFormula ? ["number", "currency"] as const : ["text", "number", "date", "currency"] as const).map((type) => <option key={type} value={type}>{t(`workbookEditor.editor.columns.types.${type}`)}</option>)}</select></div>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
              <input className="mt-1" checked={useFormula} disabled={numericColumns.length < 2} onChange={(event) => {
                setUseFormula(event.target.checked)
                if (event.target.checked && dataType !== "number" && dataType !== "currency") setDataType("number")
              }} type="checkbox" />
              <span><span className="flex items-center gap-1.5 text-sm font-medium"><FunctionSquare className="size-4 text-primary" />{t("workbookEditor.editor.columns.formula")}</span><span className="mt-0.5 block text-xs text-muted-foreground">{numericColumns.length < 2 ? t("workbookEditor.editor.columns.formulaNeedsColumns") : t("workbookEditor.editor.columns.formulaDescription")}</span></span>
            </label>
            {useFormula ? <div className="grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Label>{t("workbookEditor.editor.columns.formulaBuilder")}</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] gap-2">
                <select aria-label={t("workbookEditor.editor.columns.leftColumn")} className="h-10 min-w-0 rounded-md border border-input bg-white px-2 text-sm" onChange={(event) => setLeftColumnId(event.target.value)} value={leftColumnId}>{numericColumns.map((column) => <option key={column.id} value={column.id}>{column.label || t("workbookEditor.editor.columns.unnamed")}</option>)}</select>
                <select aria-label={t("workbookEditor.editor.columns.operator")} className="h-10 rounded-md border border-input bg-white px-2 text-center font-mono text-sm" onChange={(event) => setOperator(event.target.value as WorkbookFormulaOperator)} value={operator}>{(["+", "-", "*", "/", "%"] as const).map((item) => <option key={item} value={item}>{item}</option>)}</select>
                <select aria-label={t("workbookEditor.editor.columns.rightColumn")} className="h-10 min-w-0 rounded-md border border-input bg-white px-2 text-sm" onChange={(event) => setRightColumnId(event.target.value)} value={rightColumnId}>{numericColumns.map((column) => <option key={column.id} value={column.id}>{column.label || t("workbookEditor.editor.columns.unnamed")}</option>)}</select>
              </div>
              <p className="text-xs text-muted-foreground">{operator === "%" ? t("workbookEditor.editor.columns.percentHint") : t("workbookEditor.editor.columns.formulaRowHint")}</p>
              {leftColumnId === rightColumnId ? <p className="text-xs font-medium text-destructive" role="alert">{t("workbookEditor.editor.columns.distinctOperands")}</p> : null}
            </div> : null}
          </div>
          <DialogFooter><Button disabled={!label.trim() || busy || (useFormula && (!leftColumnId || !rightColumnId || leftColumnId === rightColumnId))} onClick={() => { onAdd(label.trim(), dataType, useFormula ? { left_column_id: leftColumnId, operator, right_column_id: rightColumnId } : undefined); setAddOpen(false); setLabel(""); setUseFormula(false) }} type="button">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{t("workbookEditor.editor.columns.add")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet>
        <SheetTrigger asChild><Button size="sm" type="button" variant="outline"><Columns3 className="size-4" />{t("workbookEditor.editor.columns.manage")}</Button></SheetTrigger>
        <SheetContent className="flex flex-col gap-5 overflow-y-auto">
          <SheetHeader><SheetTitle>{t("workbookEditor.editor.columns.manageTitle")}</SheetTitle><SheetDescription>{t("workbookEditor.editor.columns.manageDescription")}</SheetDescription></SheetHeader>
          <div className="divide-y divide-border rounded-lg border border-border">
            {columns.map((column) => <div className="grid grid-cols-[1fr_auto] gap-3 p-3" key={column.id}>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{column.label}</p><p className="flex items-center gap-1 text-xs text-muted-foreground">{column.formula ? <FunctionSquare className="size-3" /> : null}{column.formula ? t("workbookEditor.editor.columns.derived") : t(`workbookEditor.editor.columns.types.${column.data_type}`)}</p></div>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5"><input checked={!column.hidden} disabled={busy} onChange={(event) => update(column.id, "hidden", !event.target.checked)} type="checkbox" />{t("workbookEditor.editor.columns.visible")}</label>
                <label className="flex items-center gap-1.5"><input checked={column.sticky} disabled={busy || column.hidden} onChange={(event) => update(column.id, "sticky", event.target.checked)} type="checkbox" />{t("workbookEditor.editor.columns.sticky")}</label>
                {column.origin === "user" ? <Button aria-label={t("workbookEditor.editor.columns.remove")} disabled={busy} onClick={() => onRemove(column.id)} size="icon" title={t("workbookEditor.editor.columns.remove")} type="button" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button> : null}
              </div>
            </div>)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
