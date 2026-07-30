"use client"

import patterns from "@/styles/ui-patterns.module.css"

import { LoaderCircle } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/locales/client"
import type { WorkbookSessionSummary } from "@/schemas/workbook"

export function SessionRenameDialog({
  session,
  open,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  session: WorkbookSessionSummary
  open: boolean
  pending: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (displayName: string) => void
}) {
  const t = useI18n()
  const text = React.useCallback((key: string) => t(key as never), [t])
  const [displayName, setDisplayName] = React.useState(session.display_name)
  const normalizedName = displayName.trim()

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{text("workbookEditor.library.renameDialog.title")}</DialogTitle>
          <DialogDescription>
            {text("workbookEditor.library.renameDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          className={patterns.sectionStack}
          onSubmit={(event) => {
            event.preventDefault()
            if (!normalizedName || pending) return
            onSubmit(normalizedName)
          }}
        >
          <div className={patterns.fieldStack}>
            <Label htmlFor="workbook-session-name">
              {text("workbookEditor.library.renameDialog.label")}
            </Label>
            <Input
              autoFocus
              disabled={pending}
              id="workbook-session-name"
              maxLength={255}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={text("workbookEditor.library.renameDialog.placeholder")}
              required
              value={displayName}
            />
          </div>
          {error ? (
            <p className={patterns.errorText} role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={pending} type="button" variant="outline">
                {text("workbookEditor.library.renameDialog.cancel")}
              </Button>
            </DialogClose>
            <Button disabled={!normalizedName || pending} type="submit">
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className={`${patterns.iconSmall} ${patterns.spinner}`}
                />
              ) : null}
              {pending
                ? text("workbookEditor.library.renameDialog.saving")
                : text("workbookEditor.library.renameDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
