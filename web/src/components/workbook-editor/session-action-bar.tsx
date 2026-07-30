"use client"

import patterns from "@/styles/ui-patterns.module.css"

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
import styles from "./workbook-editor-components.module.css"

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
    <div className={styles.actionBar}>
      <div className={styles.sessionIdentity}>
        <span className={styles.iconTile}>
          <FileSpreadsheet aria-hidden="true" className={patterns.iconSmall} />
        </span>
        <div className={patterns.minWidthZero}>
          <p className={styles.sessionName} title={filename}>
            {filename}
          </p>
          <div className={styles.sessionMeta}>
            <span className={styles.protectedStatus}>
              <LockKeyhole aria-hidden="true" className={patterns.iconCompact} />
              {protectedLabel}
            </span>
            <span className={patterns.monoSupporting}>
              {versionLabel}
            </span>
            {dirtyCount > 0 ? <StatusChip tone="warning">{dirtyLabel}</StatusChip> : null}
          </div>
        </div>
      </div>
      <div className={styles.actionButtons}>
        {dirtyCount > 0 ? (
          <Button
            disabled={isSaving}
            onClick={onClearDraft}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className={patterns.iconSmall} />
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
            <Loader2 aria-hidden="true" className={`${patterns.iconSmall} ${patterns.spinner}`} />
          ) : (
            <Download aria-hidden="true" className={patterns.iconSmall} />
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
            <Loader2 aria-hidden="true" className={`${patterns.iconSmall} ${patterns.spinner}`} />
          ) : (
            <Save aria-hidden="true" className={patterns.iconSmall} />
          )}
          {isSaving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  )
}
