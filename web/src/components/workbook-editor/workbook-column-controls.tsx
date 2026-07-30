"use client"

import * as React from "react"
import { Eye, FunctionSquare, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type {
  WorkbookColumn,
  WorkbookColumnDataType,
  WorkbookColumnFormula,
} from "@/schemas/workbook"
import { FormulaBuilderDialog } from "./formula-builder-dialog"
import type { FormulaTranslator } from "./simple-formula-builder"
import styles from "./workbook-editor-components.module.css"

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
  const [hiddenOpen, setHiddenOpen] = React.useState(false)
  const formulaColumns = columns.filter((column) => column.origin === "user" && column.formula)
  const hiddenColumns = columns.filter((column) => column.hidden)
  const hidden = hiddenColumns.map((column) => column.id)
  const sticky = columns.filter((column) => column.sticky).map((column) => column.id)

  return (
    <div className={styles.columnControls}>
      <Button
        className={styles.controlButton}
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
          className={styles.controlSelect}
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

      {hiddenColumns.length > 0 ? (
        <Dialog onOpenChange={setHiddenOpen} open={hiddenOpen}>
          <DialogTrigger asChild>
          <Button className={styles.controlButton} disabled={busy} size="sm" type="button" variant="outline">
            <Eye />
            {t("workbookEditor.editor.columns.hiddenColumns", { count: hiddenColumns.length })}
          </Button>
          </DialogTrigger>
          <DialogContent width="min(92vw, 34rem)">
            <DialogHeader>
              <DialogTitle>{t("workbookEditor.editor.columns.hiddenTitle")}</DialogTitle>
              <DialogDescription>{t("workbookEditor.editor.columns.hiddenDescription")}</DialogDescription>
            </DialogHeader>
            <div className={styles.hiddenList}>
            {hiddenColumns.map((column) => <div className={styles.hiddenRow} key={column.id}>
              <div className={styles.hiddenCopy}><p className={styles.hiddenName}>{column.label}</p><p className={styles.hiddenMeta}>{column.formula ? <FunctionSquare className={styles.tinyIcon} /> : null}{column.formula ? t("workbookEditor.editor.columns.derived") : t(`workbookEditor.editor.columns.types.${column.data_type}`)}</p>{column.formula ? <p className={styles.hiddenHint}>{t("workbookEditor.editor.columns.dependenciesHint")}</p> : null}</div>
              <Button disabled={busy} onClick={() => onConfigurationChange(hidden.filter((id) => id !== column.id), sticky)} size="sm" type="button" variant="outline"><Eye />{t("workbookEditor.editor.columns.showAgain")}</Button>
            </div>)}
          </div>
          </DialogContent>
        </Dialog>
      ) : null}

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
