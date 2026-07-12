"use client"

import { FileSpreadsheet, LoaderCircle, Upload } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    <div className="space-y-4">
      <label
        className={cn(
          "group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border-strong bg-secondary/35 hover:border-primary/60 hover:bg-primary/[0.03]",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
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
          className="sr-only"
          disabled={disabled}
          id={inputId}
          onChange={(event) => {
            acceptFile(event.target.files?.[0])
            event.target.value = ""
          }}
          type="file"
        />
        <span className="mb-4 grid size-11 place-items-center rounded-md border border-blue-200 bg-blue-50 text-primary shadow-sm">
          <Upload aria-hidden="true" className="size-5" />
        </span>
        <span className="text-sm font-semibold text-foreground">{labels.choose}</span>
        <span className="mt-1 text-sm text-muted-foreground">{labels.drop}</span>
        <span className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {labels.supported}
        </span>
      </label>

      {file ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {labels.selected}
              </p>
              <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                {file.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild disabled={disabled} size="sm" variant="outline">
              <label className="cursor-pointer" htmlFor={inputId}>
                {labels.change}
              </label>
            </Button>
            <Button disabled={disabled || pending} onClick={onUpload} size="sm" type="button">
              {pending ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              ) : null}
              {pending ? labels.uploading : labels.upload}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
