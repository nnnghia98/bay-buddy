"use client"

import patterns from "@/styles/ui-patterns.module.css"

import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react"

import type { WorkbookFormulaPreviewResponse } from "@/schemas/workbook"
import type { FormulaTranslator } from "./simple-formula-builder"
import { cn } from "@/lib/utils"
import styles from "./workbook-editor-components.module.css"

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
    return <div className={styles.previewState}><LoaderCircle className={`${patterns.iconSmall} ${patterns.spinner}`} />{t("workbookEditor.editor.columns.preview.loading")}</div>
  }
  if (localInvalid) {
    return <div className={cn(styles.previewState, styles.previewError)} role="alert"><AlertCircle className={patterns.iconSmall} />{t("workbookEditor.editor.columns.preview.localInvalid")}</div>
  }
  if (error) {
    return <div className={cn(styles.previewState, styles.previewError)} role="alert"><AlertCircle className={patterns.iconSmall} />{t("workbookEditor.editor.columns.preview.failed")}</div>
  }
  if (!preview) {
    return <div className={styles.previewEmpty}>{t("workbookEditor.editor.columns.preview.empty")}</div>
  }

  return (
    <div className={styles.previewSurface}>
      <div className={styles.previewSummary}>
        {preview.valid ? <CheckCircle2 className={styles.previewSuccessIcon} /> : <AlertCircle className={styles.previewErrorIcon} />}
        <div className={patterns.minWidthZero}>
          <p className={patterns.labelText}>{preview.valid ? t("workbookEditor.editor.columns.preview.valid") : t("workbookEditor.editor.columns.preview.invalid")}</p>
          {preview.readable_expression ? <code className={styles.previewCode}>{preview.readable_expression}</code> : null}
        </div>
      </div>
      {preview.errors?.map((item) => <p className={patterns.errorSupportingText} key={`${item.code}:${item.message}`}>{formulaMessage(t, item.code)}</p>)}
      {preview.warnings?.map((item) => <p className={styles.previewWarning} key={`${item.code}:${item.message}`}>{formulaMessage(t, item.code)}</p>)}
      {preview.results?.length ? (
        <div className={styles.previewTable}>
          <div className={styles.previewTableHeader}>
            <span>{t("workbookEditor.editor.columns.preview.row")}</span>
            <span>{t("workbookEditor.editor.columns.preview.result")}</span>
          </div>
          {preview.results.map((row) => (
            <div className={styles.previewTableRow} key={row.row_number}>
              <span>{row.row_number}</span>
              {row.error_code
                ? <span className={patterns.errorText}>{formulaMessage(t, row.error_code)}</span>
                : <span className={styles.previewValue}>{row.value == null ? t("workbookEditor.editor.columns.preview.blank") : formatFormulaPreviewValue(row.value, outputType)}</span>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
