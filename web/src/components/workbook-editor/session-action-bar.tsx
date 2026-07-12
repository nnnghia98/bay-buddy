"use client"

import { Download, LockKeyhole, Save } from "lucide-react"

import { StatusChip } from "@/components/command-center"
import { Button } from "@/components/ui/button"

export function SessionActionBar({
  dirtyCount,
  dirtyLabel,
  downloadLabel,
  filename,
  isDownloading,
  isSaving,
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
  downloadLabel: string
  filename: string
  isDownloading: boolean
  isSaving: boolean
  onDownload: () => void
  onSave: () => void
  protectedLabel: string
  editingAvailable?: boolean
  saveLabel: string
  savingLabel: string
  versionLabel: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-[var(--shadow-sm)] lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{filename}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusChip tone="success">
            <LockKeyhole aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
            {protectedLabel}
          </StatusChip>
          <span className="font-mono text-xs font-medium text-muted-foreground">{versionLabel}</span>
          {dirtyCount > 0 ? <StatusChip tone="warning">{dirtyLabel}</StatusChip> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button disabled={isDownloading || isSaving || dirtyCount > 0} onClick={onDownload} type="button" variant="outline">
          <Download aria-hidden="true" className="h-4 w-4" />
          {downloadLabel}
        </Button>
        <Button disabled={!editingAvailable || dirtyCount === 0 || isSaving} onClick={onSave} type="button">
          <Save aria-hidden="true" className="h-4 w-4" />
          {isSaving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  )
}
