"use client"

import * as React from "react"
import { Columns3, LoaderCircle, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { WorkbookColumn, WorkbookColumnDataType } from "@/schemas/workbook"

type T = (key: string) => string

export function WorkbookColumnControls({ columns, busy, onAdd, onConfigurationChange, onRemove, t }: {
  columns: WorkbookColumn[]
  busy: boolean
  onAdd: (label: string, dataType: WorkbookColumnDataType) => void
  onConfigurationChange: (hidden: string[], sticky: string[]) => void
  onRemove: (columnId: string) => void
  t: T
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [label, setLabel] = React.useState("")
  const [dataType, setDataType] = React.useState<WorkbookColumnDataType>("text")
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("workbookEditor.editor.columns.addTitle")}</DialogTitle><DialogDescription>{t("workbookEditor.editor.columns.addDescription")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label htmlFor="workbook-column-label">{t("workbookEditor.editor.columns.label")}</Label><Input id="workbook-column-label" maxLength={100} onChange={(event) => setLabel(event.target.value)} value={label} /></div>
            <div className="grid gap-2"><Label htmlFor="workbook-column-type">{t("workbookEditor.editor.columns.type")}</Label><select className="h-11 rounded-md border border-input bg-white px-3 text-sm" id="workbook-column-type" onChange={(event) => setDataType(event.target.value as WorkbookColumnDataType)} value={dataType}>{(["text", "number", "date", "currency"] as const).map((type) => <option key={type} value={type}>{t(`workbookEditor.editor.columns.types.${type}`)}</option>)}</select></div>
          </div>
          <DialogFooter><Button disabled={!label.trim() || busy} onClick={() => { onAdd(label.trim(), dataType); setAddOpen(false); setLabel("") }} type="button">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{t("workbookEditor.editor.columns.add")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet>
        <SheetTrigger asChild><Button size="sm" type="button" variant="outline"><Columns3 className="size-4" />{t("workbookEditor.editor.columns.manage")}</Button></SheetTrigger>
        <SheetContent className="flex flex-col gap-5 overflow-y-auto">
          <SheetHeader><SheetTitle>{t("workbookEditor.editor.columns.manageTitle")}</SheetTitle><SheetDescription>{t("workbookEditor.editor.columns.manageDescription")}</SheetDescription></SheetHeader>
          <div className="divide-y divide-border rounded-lg border border-border">
            {columns.map((column) => <div className="grid grid-cols-[1fr_auto] gap-3 p-3" key={column.id}>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{column.label}</p><p className="text-xs text-muted-foreground">{t(`workbookEditor.editor.columns.types.${column.data_type}`)}</p></div>
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
