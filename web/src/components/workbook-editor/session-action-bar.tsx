"use client"

import {
  Download,
  FileSpreadsheet,
  Loader2,
  LockKeyhole,
  Save,
  Trash2,
} from "lucide-react"

import { StatusChip } from "@/components/command-center"
import { Button } from "@/components/ui/button"

export function SessionActionBar({
  dirtyCount,
  dirtyLabel,
  clearDraftLabel,
  downloadLabel,
  filename,
  isDownloading,
  isSaving,
  onClearDraft,
  onDownload,
  onSave,
  protectedLabel,
  editingAvailable = true,
  saveLabel,
  savingLabel,
  versionLabel,
}: {
  dirtyCount: number
  dirtyLabel: string
  clearDraftLabel: string
  downloadLabel: string
  filename: string
  isDownloading: boolean
  isSaving: boolean
  onClearDraft: () => void
  onDownload: () => void
  onSave: () => void
  protectedLabel: string
  editingAvailable?: boolean
  saveLabel: string
  savingLabel: string
  versionLabel: string
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(247,249,252,0.78)_100%)] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-blue-200 bg-blue-50 text-primary">
          <FileSpreadsheet aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground" title={filename}>
            {filename}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              {protectedLabel}
            </span>
            <span className="font-mono text-xs font-medium text-muted-foreground">
              {versionLabel}
            </span>
            {dirtyCount > 0 ? <StatusChip tone="warning">{dirtyLabel}</StatusChip> : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {dirtyCount > 0 ? (
          <Button
            className="text-muted-foreground"
            disabled={isSaving}
            onClick={onClearDraft}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {clearDraftLabel}
          </Button>
        ) : null}
        <Button
          disabled={isDownloading || isSaving}
          onClick={onDownload}
          size="sm"
          type="button"
          variant="outline"
        >
          {isDownloading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Download aria-hidden="true" className="h-4 w-4" />
          )}
          {downloadLabel}
        </Button>
        <Button
          disabled={!editingAvailable || dirtyCount === 0 || isSaving}
          onClick={onSave}
          size="sm"
          type="button"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {isSaving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  )
}
