"use client"

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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("workbookEditor.editor.conflicts.title")}</DialogTitle>
          <DialogDescription>
            {t("workbookEditor.editor.conflicts.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {cells.map((cell) => {
            const unresolved = cell.conflict?.resolution === "unresolved"
            return (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50/60 p-3"
                key={`${cell.rowNumber}:${cell.columnId}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {t("workbookEditor.editor.conflicts.cell")}
                    {` ${cell.rowNumber} · ${cell.columnId}`}
                  </p>
                  {!unresolved ? (
                    <span className="text-xs font-semibold text-emerald-700">
                      {t("workbookEditor.editor.conflicts.resolved")}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-white p-2">
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t("workbookEditor.editor.conflicts.serverValue")}
                    </dt>
                    <dd className="mt-1 break-words font-mono">
                      {displayValue(
                        cell.conflict?.serverValue,
                        t("workbookEditor.editor.conflicts.blank"),
                        booleanLabels,
                      )}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border bg-white p-2">
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t("workbookEditor.editor.conflicts.localValue")}
                    </dt>
                    <dd className="mt-1 break-words font-mono">
                      {displayValue(
                        cell.localInput,
                        t("workbookEditor.editor.conflicts.blank"),
                        booleanLabels,
                      )}
                    </dd>
                  </div>
                </dl>
                {unresolved ? (
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
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
