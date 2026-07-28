"use client"

import * as React from "react"
import { FunctionSquare, LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { previewWorkbookFormula } from "@/lib/workbooks/client"
import {
  workbookColumnFormulaSchema,
  type WorkbookColumn,
  type WorkbookColumnDataType,
  type WorkbookColumnFormula,
  type WorkbookFormulaExpression,
} from "@/schemas/workbook"
import { FormulaPreview } from "./formula-preview"
import {
  buildSimpleFormulaExpression,
  createDefaultSimpleFormula,
  parseSimpleFormulaExpression,
  SimpleFormulaBuilder,
  type FormulaTranslator,
  type SimpleFormulaDefinition,
} from "./simple-formula-builder"

const selectClass = "h-11 min-w-0 rounded-md border border-input bg-white px-3 text-sm"

export type FormulaDraft = {
  label: string
  dataType: WorkbookColumnDataType
  expression: WorkbookFormulaExpression
  formulaEnabled: boolean
  simpleFormula: SimpleFormulaDefinition | null
}

export function initialFormulaDraft(
  columns: WorkbookColumn[],
  targetColumn?: WorkbookColumn | null,
): FormulaDraft {
  const numericColumns = columns.filter((column) => column.data_type === "number" || column.data_type === "currency")
  const persistedExpression = targetColumn?.formula?.expression
  const simpleFormula = persistedExpression
    ? parseSimpleFormulaExpression(persistedExpression)
    : createDefaultSimpleFormula(numericColumns)
  const simpleExpression = simpleFormula
    ? buildSimpleFormulaExpression(simpleFormula)
    : null
  return {
    label: targetColumn?.label ?? "",
    dataType: targetColumn?.data_type ?? "text",
    expression: persistedExpression
      ?? simpleExpression
      ?? { type: "constant", value: "0" },
    formulaEnabled: Boolean(targetColumn?.formula),
    simpleFormula,
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
  onApply: (
    label: string,
    dataType: WorkbookColumnDataType,
    formula: WorkbookColumnFormula | null,
  ) => void
  t: FormulaTranslator
}) {
  const editableColumns = React.useMemo(
    () => columns.filter((column) => column.id !== targetColumn?.id && (column.data_type === "number" || column.data_type === "currency")),
    [columns, targetColumn?.id],
  )
  const defaultSimpleFormula = React.useMemo(
    () => createDefaultSimpleFormula(editableColumns),
    [editableColumns],
  )
  const [draft, setDraft] = React.useState<FormulaDraft>(() => initialFormulaDraft(columns, targetColumn))
  const [preview, setPreview] = React.useState<Awaited<ReturnType<typeof previewWorkbookFormula>>>()
  const [previewSignature, setPreviewSignature] = React.useState<string>()
  const [previewError, setPreviewError] = React.useState(false)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [localInvalid, setLocalInvalid] = React.useState(false)
  const previewRequestRef = React.useRef(0)
  const plainDataTypeRef = React.useRef<WorkbookColumnDataType>(
    targetColumn?.data_type ?? "text",
  )

  React.useEffect(() => {
    previewRequestRef.current += 1
    if (!open) return
    plainDataTypeRef.current = targetColumn?.data_type ?? "text"
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
  const signature = draft.formulaEnabled && draft.simpleFormula && parsedFormula.success
    ? JSON.stringify({ formula: parsedFormula.data, outputType: draft.dataType, outputColumnId: targetColumn?.id ?? null })
    : undefined
  const previewIsCurrent = Boolean(signature && previewSignature === signature)
  const canPreview = Boolean(
    draft.formulaEnabled
    && draft.simpleFormula
    && parsedFormula.success
    && sessionId
    && baseVersion
    && !busy
    && !previewLoading,
  )
  const canApply = Boolean(
    draft.label.trim()
    && !busy,
  ) && (
    !draft.formulaEnabled
    || Boolean(
      draft.simpleFormula
      && parsedFormula.success
      && preview?.valid
      && previewIsCurrent,
    )
  )
  const dataTypeOptions: WorkbookColumnDataType[] = draft.formulaEnabled
    ? ["number", "currency"]
    : ["text", "number", "date", "currency", "boolean"]
  const formulaOutputType = draft.dataType === "currency" ? "currency" : "number"
  const canEnableFormula = defaultSimpleFormula !== null

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

  const updateFormulaEnabled = (formulaEnabled: boolean) => {
    clearPreview()
    setDraft((current) => {
      if (formulaEnabled) {
        plainDataTypeRef.current = current.dataType
      }
      const simpleFormula = formulaEnabled
        ? current.simpleFormula ?? defaultSimpleFormula
        : current.simpleFormula
      const expression = simpleFormula
        ? buildSimpleFormulaExpression(simpleFormula) ?? current.expression
        : current.expression
      return {
        ...current,
        expression,
        formulaEnabled,
        simpleFormula,
        dataType: formulaEnabled
          ? current.dataType === "number" || current.dataType === "currency"
            ? current.dataType
            : "number"
          : plainDataTypeRef.current,
      }
    })
  }

  const updateSimpleFormula = (simpleFormula: SimpleFormulaDefinition) => {
    const expression = buildSimpleFormulaExpression(simpleFormula)
    if (!expression) return
    updateDraft({ expression, simpleFormula })
  }

  const resetToSimpleFormula = () => {
    if (!defaultSimpleFormula) return
    updateSimpleFormula(defaultSimpleFormula)
  }

  const requestPreview = async () => {
    if (!draft.formulaEnabled || !draft.simpleFormula || !parsedFormula.success) {
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
        output_type: formulaOutputType,
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
    if (!canApply) return
    if (!draft.formulaEnabled) {
      onApply(draft.label.trim(), draft.dataType, null)
      return
    }
    if (!draft.simpleFormula || !parsedFormula.success) return
    onApply(
      draft.label.trim(),
      draft.dataType,
      preview?.normalized_formula ?? parsedFormula.data,
    )
  }

  const title = targetColumn
    ? t("workbookEditor.editor.columns.formulaEditTitle")
    : t("workbookEditor.editor.columns.addTitle")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(46rem,calc(100vh-2rem))] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {targetColumn
              ? <FunctionSquare className="size-5 text-primary" />
              : <Plus className="size-5 text-primary" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {t(targetColumn
              ? "workbookEditor.editor.columns.formulaDialogDescription"
              : "workbookEditor.editor.columns.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="formula-column-label">{t("workbookEditor.editor.columns.label")}</Label>
              <Input id="formula-column-label" maxLength={255} onChange={(event) => updateDraft({ label: event.target.value })} value={draft.label} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="formula-output-type">
                {t(draft.formulaEnabled
                  ? "workbookEditor.editor.columns.outputType"
                  : "workbookEditor.editor.columns.type")}
              </Label>
              <select
                className={selectClass}
                id="formula-output-type"
                onChange={(event) => {
                  const dataType = event.target.value as WorkbookColumnDataType
                  if (!draft.formulaEnabled) plainDataTypeRef.current = dataType
                  updateDraft({ dataType })
                }}
                value={draft.dataType}
              >
                {dataTypeOptions.map((type) => <option key={type} value={type}>{t(`workbookEditor.editor.columns.types.${type}`)}</option>)}
              </select>
            </div>
          </div>

          {!targetColumn ? (
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <label className="flex items-start gap-3" htmlFor="workbook-column-use-formula">
                <input
                  checked={draft.formulaEnabled}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  disabled={!canEnableFormula || busy}
                  id="workbook-column-use-formula"
                  onChange={(event) => updateFormulaEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">{t("workbookEditor.editor.columns.optionalFormula")}</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {t("workbookEditor.editor.columns.optionalFormulaDescription")}
                  </span>
                </span>
              </label>
              {!canEnableFormula ? (
                <p className="mt-2 pl-7 text-xs text-muted-foreground">
                  {t("workbookEditor.editor.columns.formulaNeedsColumns")}
                </p>
              ) : null}
            </div>
          ) : null}

          {draft.formulaEnabled ? (
            <>
              <div className="grid gap-2">
                <div>
                  <Label>{t("workbookEditor.editor.columns.formulaBuilder")}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("workbookEditor.editor.columns.simpleFormulaDescription")}
                  </p>
                </div>
                {draft.simpleFormula ? (
                  <SimpleFormulaBuilder
                    columns={editableColumns}
                    onChange={updateSimpleFormula}
                    t={t}
                    value={draft.simpleFormula}
                  />
                ) : (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-3"
                    role="status"
                  >
                    <p className="max-w-xl text-sm text-muted-foreground">
                      {t("workbookEditor.editor.columns.legacyFormulaDescription")}
                    </p>
                    <Button
                      disabled={!defaultSimpleFormula}
                      onClick={resetToSimpleFormula}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t("workbookEditor.editor.columns.resetSimpleFormula")}
                    </Button>
                  </div>
                )}
              </div>

              {draft.simpleFormula ? (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{t("workbookEditor.editor.columns.preview.title")}</Label>
                    <Button disabled={!canPreview} onClick={requestPreview} size="sm" type="button" variant="outline">
                      {previewLoading ? <LoaderCircle className="animate-spin" /> : null}
                      {t("workbookEditor.editor.columns.preview.action")}
                    </Button>
                  </div>
                  <FormulaPreview error={previewError} loading={previewLoading} localInvalid={localInvalid} outputType={formulaOutputType} preview={preview} t={t} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={busy || previewLoading} onClick={() => onOpenChange(false)} type="button" variant="outline">{t("workbookEditor.editor.columns.cancel")}</Button>
          <Button disabled={!canApply} onClick={apply} type="button">
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            {t(targetColumn
              ? "workbookEditor.editor.columns.apply"
              : "workbookEditor.editor.columns.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
