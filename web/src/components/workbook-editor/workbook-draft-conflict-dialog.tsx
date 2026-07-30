"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/locales/client"
import type { WorkbookDraftCell } from "@/lib/workbooks/draft-schema"
import styles from "./workbook-editor-components.module.css"

function displayValue(
  value: unknown,
  blankLabel: string,
  booleanLabels: { true: string; false: string },
): string {
  if (value === null || value === "") return blankLabel
  if (typeof value === "boolean") return value ? booleanLabels.true : booleanLabels.false
  return String(value)
}

export function WorkbookDraftConflictDialog({
  booleanLabels,
  cells,
  open,
  onOpenChange,
  onResolve,
}: {
  booleanLabels: { true: string; false: string }
  cells: WorkbookDraftCell[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolve: (
    rowNumber: number,
    columnId: string,
    resolution: "keep-local" | "use-server",
  ) => void
}) {
  const rawT = useI18n()
  const t = React.useCallback((key: string) => rawT(key as never), [rawT])

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent maxHeight="85vh">
        <DialogHeader>
          <DialogTitle>{t("workbookEditor.editor.conflicts.title")}</DialogTitle>
          <DialogDescription>
            {t("workbookEditor.editor.conflicts.description")}
          </DialogDescription>
        </DialogHeader>
        <div className={patterns.stack}>
          {cells.map((cell) => {
            const unresolved = cell.conflict?.resolution === "unresolved"
            return (
              <div
                className={styles.conflictCard}
                key={`${cell.rowNumber}:${cell.columnId}`}
              >
                <div className={patterns.betweenRow}>
                  <p className={patterns.sectionTitle}>
                    {t("workbookEditor.editor.conflicts.cell")}
                    {` ${cell.rowNumber} · ${cell.columnId}`}
                  </p>
                  {!unresolved ? (
                    <span className={styles.conflictResolved}>
                      {t("workbookEditor.editor.conflicts.resolved")}
                    </span>
                  ) : null}
                </div>
                <dl className={styles.conflictValues}>
                  <div className={styles.conflictValue}>
                    <dt className={styles.conflictValueLabel}>
                      {t("workbookEditor.editor.conflicts.serverValue")}
                    </dt>
                    <dd className={styles.conflictValueText}>
                      {displayValue(
                        cell.conflict?.serverValue,
                        t("workbookEditor.editor.conflicts.blank"),
                        booleanLabels,
                      )}
                    </dd>
                  </div>
                  <div className={styles.conflictValue}>
                    <dt className={styles.conflictValueLabel}>
                      {t("workbookEditor.editor.conflicts.localValue")}
                    </dt>
                    <dd className={styles.conflictValueText}>
                      {displayValue(
                        cell.localInput,
                        t("workbookEditor.editor.conflicts.blank"),
                        booleanLabels,
                      )}
                    </dd>
                  </div>
                </dl>
                {unresolved ? (
                  <div className={styles.conflictActions}>
                    <Button
                      onClick={() => onResolve(cell.rowNumber, cell.columnId, "use-server")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {t("workbookEditor.editor.conflicts.useServer")}
                    </Button>
                    <Button
                      onClick={() => onResolve(cell.rowNumber, cell.columnId, "keep-local")}
                      size="sm"
                      type="button"
                    >
                      {t("workbookEditor.editor.conflicts.keepLocal")}
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
