"use client"

import * as React from "react"
import { FunctionSquare, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { previewWorkbookFormula } from "@/lib/workbooks/client"
import {
  workbookColumnFormulaSchema,
  type WorkbookColumn,
  type WorkbookColumnFormula,
  type WorkbookFormulaExpression,
} from "@/schemas/workbook"
import { defaultFormulaExpression, FormulaExpressionNode, type FormulaTranslator } from "./formula-expression-node"
import { FormulaPreview } from "./formula-preview"

const selectClass = "h-11 min-w-0 rounded-md border border-input bg-white px-3 text-sm"

export type FormulaDraft = {
  label: string
  dataType: "number" | "currency"
  expression: WorkbookFormulaExpression
}

export function initialFormulaDraft(
  columns: WorkbookColumn[],
  targetColumn?: WorkbookColumn | null,
): FormulaDraft {
  const dataType = targetColumn?.data_type === "currency" ? "currency" : "number"
  const numericColumns = columns.filter((column) => column.data_type === "number" || column.data_type === "currency")
  return {
    label: targetColumn?.label ?? "",
    dataType,
    expression: targetColumn?.formula?.expression ?? defaultFormulaExpression(numericColumns),
  }
}

export function FormulaBuilderDialog({
  columns,
  open,
  busy,
  baseVersion,
  sessionId,
  targetColumn,
  onOpenChange,
  onApply,
  t,
}: {
  columns: WorkbookColumn[]
  open: boolean
  busy: boolean
  baseVersion?: number
  sessionId?: string
  targetColumn?: WorkbookColumn | null
  onOpenChange: (open: boolean) => void
  onApply: (label: string, dataType: "number" | "currency", formula: WorkbookColumnFormula) => void
  t: FormulaTranslator
}) {
  const editableColumns = React.useMemo(
    () => columns.filter((column) => column.id !== targetColumn?.id && (column.data_type === "number" || column.data_type === "currency")),
    [columns, targetColumn?.id],
  )
  const [draft, setDraft] = React.useState<FormulaDraft>(() => initialFormulaDraft(columns, targetColumn))
  const [preview, setPreview] = React.useState<Awaited<ReturnType<typeof previewWorkbookFormula>>>()
  const [previewSignature, setPreviewSignature] = React.useState<string>()
  const [previewError, setPreviewError] = React.useState(false)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [localInvalid, setLocalInvalid] = React.useState(false)
  const previewRequestRef = React.useRef(0)

  React.useEffect(() => {
    previewRequestRef.current += 1
    if (!open) return
    setDraft(initialFormulaDraft(columns, targetColumn))
    setPreview(undefined)
    setPreviewSignature(undefined)
    setPreviewError(false)
    setPreviewLoading(false)
    setLocalInvalid(false)
  }, [columns, open, targetColumn])

  const parsedFormula = React.useMemo(() => workbookColumnFormulaSchema.safeParse({
    schema_version: 1,
    expression: draft.expression,
  }), [draft.expression])
  const signature = parsedFormula.success
    ? JSON.stringify({ formula: parsedFormula.data, outputType: draft.dataType, outputColumnId: targetColumn?.id ?? null })
    : undefined
  const previewIsCurrent = Boolean(signature && previewSignature === signature)
  const canPreview = Boolean(parsedFormula.success && sessionId && baseVersion && !busy && !previewLoading)
  const canApply = Boolean(
    draft.label.trim()
    && parsedFormula.success
    && preview?.valid
    && previewIsCurrent
    && !busy,
  )

  const clearPreview = () => {
    previewRequestRef.current += 1
    setPreview(undefined)
    setPreviewSignature(undefined)
    setPreviewError(false)
    setLocalInvalid(false)
    setPreviewLoading(false)
  }

  const updateDraft = (next: Partial<FormulaDraft>) => {
    clearPreview()
    setDraft((current) => ({ ...current, ...next }))
  }

  const requestPreview = async () => {
    if (!parsedFormula.success) {
      setLocalInvalid(true)
      setPreview(undefined)
      setPreviewError(false)
      return
    }
    if (!sessionId || !baseVersion) return

    const requestId = previewRequestRef.current + 1
    previewRequestRef.current = requestId
    setLocalInvalid(false)
    setPreviewError(false)
    setPreviewLoading(true)
    try {
      const result = await previewWorkbookFormula(sessionId, {
        base_version: baseVersion,
        formula: parsedFormula.data,
        output_type: draft.dataType,
        output_column_id: targetColumn?.id ?? null,
      })
      if (previewRequestRef.current !== requestId) return
      setPreview(result)
      setPreviewSignature(signature)
    } catch {
      if (previewRequestRef.current !== requestId) return
      setPreview(undefined)
      setPreviewSignature(undefined)
      setPreviewError(true)
    } finally {
      if (previewRequestRef.current === requestId) setPreviewLoading(false)
    }
  }

  const apply = () => {
    if (!canApply || !parsedFormula.success) return
    onApply(draft.label.trim(), draft.dataType, preview?.normalized_formula ?? parsedFormula.data)
  }

  const title = targetColumn
    ? t("workbookEditor.editor.columns.formulaEditTitle")
    : t("workbookEditor.editor.columns.formulaAddTitle")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(46rem,calc(100vh-2rem))] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FunctionSquare className="size-5 text-primary" />{title}</DialogTitle>
          <DialogDescription>{t("workbookEditor.editor.columns.formulaDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="formula-column-label">{t("workbookEditor.editor.columns.label")}</Label>
              <Input id="formula-column-label" maxLength={255} onChange={(event) => updateDraft({ label: event.target.value })} value={draft.label} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="formula-output-type">{t("workbookEditor.editor.columns.outputType")}</Label>
              <select className={selectClass} id="formula-output-type" onChange={(event) => updateDraft({ dataType: event.target.value as "number" | "currency" })} value={draft.dataType}>
                {(["number", "currency"] as const).map((type) => <option key={type} value={type}>{t(`workbookEditor.editor.columns.types.${type}`)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("workbookEditor.editor.columns.formulaBuilder")}</Label>
            <FormulaExpressionNode columns={editableColumns} expression={draft.expression} onChange={(expression) => updateDraft({ expression })} t={t} />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label>{t("workbookEditor.editor.columns.preview.title")}</Label>
              <Button disabled={!canPreview} onClick={requestPreview} size="sm" type="button" variant="outline">
                {previewLoading ? <LoaderCircle className="animate-spin" /> : null}
                {t("workbookEditor.editor.columns.preview.action")}
              </Button>
            </div>
            <FormulaPreview error={previewError} loading={previewLoading} localInvalid={localInvalid} outputType={draft.dataType} preview={preview} t={t} />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={busy || previewLoading} onClick={() => onOpenChange(false)} type="button" variant="outline">{t("workbookEditor.editor.columns.cancel")}</Button>
          <Button disabled={!canApply} onClick={apply} type="button">{busy ? <LoaderCircle className="animate-spin" /> : null}{t("workbookEditor.editor.columns.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
