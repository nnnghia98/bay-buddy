"use client"

import patterns from "@/styles/ui-patterns.module.css"

import { FileSpreadsheet, LoaderCircle, Upload } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import styles from "./workbook-editor-components.module.css"

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const XLS_MIME_TYPE = "application/vnd.ms-excel"

type WorkbookUploadProps = {
  file: File | null
  disabled?: boolean
  pending?: boolean
  labels: {
    choose: string
    drop: string
    supported: string
    selected: string
    change: string
    upload: string
    uploading: string
  }
  onFileChange: (file: File) => void
  onInvalidFile: () => void
  onUpload: () => void
}

function isWorkbookFile(file: File): boolean {
  const filename = file.name.toLocaleLowerCase()
  return filename.endsWith(".xlsx") || filename.endsWith(".xls")
}

export function WorkbookUpload({
  file,
  disabled = false,
  pending = false,
  labels,
  onFileChange,
  onInvalidFile,
  onUpload,
}: WorkbookUploadProps) {
  const inputId = React.useId()
  const [isDragging, setIsDragging] = React.useState(false)

  const acceptFile = React.useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return
      if (!isWorkbookFile(candidate)) {
        onInvalidFile()
        return
      }
      onFileChange(candidate)
    },
    [onFileChange, onInvalidFile],
  )

  return (
    <div className={patterns.stack}>
      <label
        className={cn(
          styles.dropZone,
          isDragging && styles.dropZoneDragging,
          disabled && styles.dropZoneDisabled,
        )}
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false)
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (!disabled) acceptFile(event.dataTransfer.files[0])
        }}
      >
        <input
          accept={`.xlsx,.xls,${XLSX_MIME_TYPE},${XLS_MIME_TYPE}`}
          className={patterns.srOnly}
          disabled={disabled}
          id={inputId}
          onChange={(event) => {
            acceptFile(event.target.files?.[0])
            event.target.value = ""
          }}
          type="file"
        />
        <span className={cn(styles.iconTileLarge, styles.dropZoneIcon)}>
          <Upload aria-hidden="true" className={patterns.iconSmall} />
        </span>
        <span className={patterns.sectionTitle}>{labels.choose}</span>
        <span className={patterns.mutedText}>{labels.drop}</span>
        <span className={styles.supportedFiles}>
          {labels.supported}
        </span>
      </label>

      {file ? (
        <div className={styles.selectedFile}>
          <div className={styles.selectedFileIdentity}>
            <span className={styles.iconTile}>
              <FileSpreadsheet aria-hidden="true" className={patterns.iconSmall} />
            </span>
            <div className={patterns.minWidthZero}>
              <p className={patterns.accentEyebrow}>
                {labels.selected}
              </p>
              <p className={styles.selectedFilename} title={file.name}>
                {file.name}
              </p>
            </div>
          </div>
          <div className={styles.selectedFileActions}>
            <Button
              disabled={disabled}
              onClick={() => document.getElementById(inputId)?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              {labels.change}
            </Button>
            <Button disabled={disabled || pending} onClick={onUpload} size="sm" type="button">
              {pending ? (
                <LoaderCircle aria-hidden="true" className={`${patterns.iconSmall} ${patterns.spinner}`} />
              ) : null}
              {pending ? labels.uploading : labels.upload}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
