"use client"

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react"

import type { WorkbookFormulaPreviewResponse } from "@/schemas/workbook"
import type { FormulaTranslator } from "./simple-formula-builder"

function formulaMessage(t: FormulaTranslator, code?: string | null): string {
  const knownCodes = new Set([
    "INVALID_FORMULA",
    "INVALID_FORMULA_TYPE",
    "INVALID_FORMULA_ARITY",
    "INVALID_FORMULA_OUTPUT_TYPE",
    "UNKNOWN_FORMULA_COLUMN",
    "FORMULA_SELF_REFERENCE",
    "FORMULA_DEPENDENCY_CYCLE",
    "FORMULA_DIVISION_BY_ZERO",
    "FORMULA_NON_NUMERIC_VALUE",
    "FORMULA_RESULT_OUT_OF_RANGE",
    "FORMULA_DEPENDENCY_ERROR",
    "FORMULA_TOO_COMPLEX",
    "NO_PREVIEW_ROWS",
    "PREVIEW_ROW_ERRORS",
  ])
  return code && knownCodes.has(code)
    ? t(`workbookEditor.editor.columns.preview.errors.${code}`)
    : t("workbookEditor.editor.columns.preview.errors.UNKNOWN")
}

export function formatFormulaPreviewValue(
  value: number,
  outputType: "number" | "currency",
): string {
  if (outputType === "currency") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat().format(value)
}

export function FormulaPreview({
  preview,
  loading,
  error = false,
  localInvalid = false,
  outputType = "number",
  t,
}: {
  preview?: WorkbookFormulaPreviewResponse
  loading: boolean
  error?: boolean
  localInvalid?: boolean
  outputType?: "number" | "currency"
  t: FormulaTranslator
}) {
  if (loading) {
    return <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("workbookEditor.editor.columns.preview.loading")}</div>
  }
  if (localInvalid) {
    return <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><AlertCircle className="size-4" />{t("workbookEditor.editor.columns.preview.localInvalid")}</div>
  }
  if (error) {
    return <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><AlertCircle className="size-4" />{t("workbookEditor.editor.columns.preview.failed")}</div>
  }
  if (!preview) {
    return <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">{t("workbookEditor.editor.columns.preview.empty")}</div>
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-secondary/20 p-3">
      <div className="flex items-start gap-2">
        {preview.valid ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> : <AlertCircle className="mt-0.5 size-4 text-destructive" />}
        <div className="min-w-0">
          <p className="text-sm font-medium">{preview.valid ? t("workbookEditor.editor.columns.preview.valid") : t("workbookEditor.editor.columns.preview.invalid")}</p>
          {preview.readable_expression ? <code className="mt-1 block overflow-x-auto rounded bg-white px-2 py-1 text-xs text-foreground">{preview.readable_expression}</code> : null}
        </div>
      </div>
      {preview.errors?.map((item) => <p className="text-xs font-medium text-destructive" key={`${item.code}:${item.message}`}>{formulaMessage(t, item.code)}</p>)}
      {preview.warnings?.map((item) => <p className="text-xs text-amber-700" key={`${item.code}:${item.message}`}>{formulaMessage(t, item.code)}</p>)}
      {preview.results?.length ? (
        <div className="overflow-hidden rounded-md border border-border bg-white">
          <div className="grid grid-cols-[5rem_1fr] bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>{t("workbookEditor.editor.columns.preview.row")}</span>
            <span>{t("workbookEditor.editor.columns.preview.result")}</span>
          </div>
          {preview.results.map((row) => (
            <div className="grid grid-cols-[5rem_1fr] border-t border-border px-3 py-2 text-sm" key={row.row_number}>
              <span>{row.row_number}</span>
              {row.error_code
                ? <span className="text-destructive">{formulaMessage(t, row.error_code)}</span>
                : <span className="font-medium tabular-nums">{row.value == null ? t("workbookEditor.editor.columns.preview.blank") : formatFormulaPreviewValue(row.value, outputType)}</span>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
