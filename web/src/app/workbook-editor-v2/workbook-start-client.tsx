"use client"

import {
  AlertTriangle,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { WorkbookSessionLibrary } from "@/components/workbook-editor/workbook-session-library"
import { WorkbookUpload } from "@/components/workbook-editor/workbook-upload"
import { Button } from "@/components/ui/button"
import {
  createWorkbookSession,
  toWorkbookClientError,
  uploadWorkbook,
} from "@/lib/workbooks/client"
import type {
  WorkbookSessionList,
  WorkbookUpload as WorkbookUploadData,
  WorksheetInspection,
} from "@/schemas/workbook"
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"

type PendingAction = "upload" | "session" | null

export function WorkbookStartClient({
  initialSessions,
  userId,
}: {
  initialSessions: WorkbookSessionList
  userId: string
}) {
  const router = useRouter()
  const t = useI18n()
  const text = React.useCallback((key: string) => t(key as never), [t])
  const [file, setFile] = React.useState<File | null>(null)
  const [uploaded, setUploaded] = React.useState<WorkbookUploadData | null>(null)
  const [selectedSheet, setSelectedSheet] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState<PendingAction>(null)
  const [error, setError] = React.useState<string | null>(null)
  const sheetsRegionRef = React.useRef<HTMLDivElement>(null)

  const localizedError = React.useCallback(
    (requestError: unknown, fallbackKey: string) => {
      const code = toWorkbookClientError(requestError).code
      const knownKeys: Record<string, string> = {
        FILE_TOO_LARGE: "workbookEditor.errors.fileTooLarge",
        UNSUPPORTED_FILE_TYPE: "workbookEditor.errors.invalidFile",
        INVALID_XLSX: "workbookEditor.errors.invalidWorkbook",
        INVALID_XLS: "workbookEditor.errors.invalidWorkbook",
        UNSAFE_XLSX_ARCHIVE: "workbookEditor.errors.unsafeWorkbook",
        WORKBOOK_LIMIT_EXCEEDED: "workbookEditor.errors.workbookLimit",
        NETWORK_ERROR: "workbookEditor.errors.network",
      }
      return text(knownKeys[code] ?? fallbackKey)
    },
    [text],
  )

  const chooseFile = React.useCallback((nextFile: File) => {
    setFile(nextFile)
    setUploaded(null)
    setSelectedSheet(null)
    setError(null)
  }, [])

  async function handleUpload() {
    if (!file || pending) return
    setPending("upload")
    setError(null)
    try {
      const result = await uploadWorkbook(file)
      setUploaded(result)
      const defaultSheet = result.sheets.find((sheet) => sheet.header_row_number != null)
      setSelectedSheet(defaultSheet?.name ?? null)
      window.requestAnimationFrame(() => sheetsRegionRef.current?.focus())
    } catch (uploadError) {
      setError(localizedError(uploadError, "workbookEditor.errors.uploadFailed"))
    } finally {
      setPending(null)
    }
  }

  async function handleCreateSession() {
    if (!uploaded || !selectedSheet || pending) return
    setPending("session")
    setError(null)
    try {
      const session = await createWorkbookSession({
        workbook_id: uploaded.id,
        sheet_name: selectedSheet,
      })
      router.push(`/workbook-editor-v2/sessions/${session.id}`)
    } catch (sessionError) {
      setError(localizedError(sessionError, "workbookEditor.errors.sessionFailed"))
      setPending(null)
    }
  }

  const busy = pending !== null

  return (
    <div className="grid gap-4 pb-12 text-foreground xl:grid-cols-[minmax(20rem,5fr)_minmax(0,8fr)] xl:items-start">
      <section
        aria-labelledby="workbook-start-title"
        className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] xl:sticky xl:top-5"
      >
        <div className="flex flex-col gap-3 border-b border-border bg-secondary/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-blue-200 bg-blue-50 text-primary">
              <FileSpreadsheet aria-hidden="true" className="size-4" />
            </span>
            <h1 className="min-w-0 text-base font-semibold tracking-[-0.01em]" id="workbook-start-title">
              {text("workbookEditor.start.title")}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-emerald-700">
            <ShieldCheck aria-hidden="true" className="size-4 text-emerald-700" />
            <span>{text("workbookEditor.start.originalProtected")}</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="p-4">
            <WorkbookUpload
              disabled={busy}
              file={file}
              labels={{
                choose: text("workbookEditor.upload.choose"),
                drop: text("workbookEditor.upload.drop"),
                supported: text("workbookEditor.upload.supported"),
                selected: text("workbookEditor.upload.selected"),
                change: text("workbookEditor.upload.change"),
                upload: text("workbookEditor.upload.action"),
                uploading: text("workbookEditor.upload.uploading"),
              }}
              onFileChange={chooseFile}
              onInvalidFile={() => {
                setFile(null)
                setError(text("workbookEditor.errors.invalidFile"))
                setUploaded(null)
                setSelectedSheet(null)
              }}
              onUpload={handleUpload}
              pending={pending === "upload"}
            />

            {error ? (
              <div
                aria-live="assertive"
                className="mt-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                role="alert"
              >
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <div
            aria-busy={busy}
            className="flex min-h-64 flex-col border-t border-border bg-secondary/20 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
            ref={sheetsRegionRef}
            tabIndex={-1}
          >
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {text("workbookEditor.sheets.eyebrow")}
                </p>
                {uploaded ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {uploaded.sheets.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {text("workbookEditor.sheets.description")}
              </p>
            </div>

            {uploaded ? (
              <div className="flex flex-1 flex-col">
                <div className="border-b border-blue-100 bg-blue-50/65 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" title={uploaded.original_filename}>
                        {uploaded.original_filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {text("workbookEditor.start.uploadedProtected")}
                      </p>
                    </div>
                  </div>
                </div>

                <fieldset className="max-h-64 divide-y divide-border overflow-y-auto" disabled={busy}>
                  <legend className="sr-only">{text("workbookEditor.sheets.selectLabel")}</legend>
                  {uploaded.sheets.map((sheet) => (
                    <SheetOption
                      key={sheet.name}
                      labels={{
                        rowsColumns: text("workbookEditor.sheets.rowsColumns"),
                      }}
                      onSelect={setSelectedSheet}
                      selected={selectedSheet === sheet.name}
                      sheet={sheet}
                    />
                  ))}
                </fieldset>

                <div className="mt-auto border-t border-border bg-white p-3">
                  <Button
                    className="w-full"
                    disabled={!selectedSheet || busy}
                    onClick={handleCreateSession}
                    type="button"
                  >
                    {pending === "session" ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin motion-reduce:animate-none"
                      />
                    ) : null}
                    {pending === "session"
                      ? text("workbookEditor.sheets.opening")
                      : text("workbookEditor.sheets.openAction")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid flex-1 place-items-center px-6 py-9 text-center">
                <div className="max-w-xs">
                  <span className="mx-auto grid size-10 place-items-center rounded-sm border border-border bg-white text-muted-foreground">
                    <FileSpreadsheet aria-hidden="true" className="size-4" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {text("workbookEditor.sheets.emptyTitle")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {text("workbookEditor.sheets.emptyDescription")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      <WorkbookSessionLibrary initialData={initialSessions} userId={userId} />
    </div>
  )
}

function SheetOption({
  sheet,
  selected,
  onSelect,
  labels,
}: {
  sheet: WorksheetInspection
  selected: boolean
  onSelect: (name: string) => void
  labels: {
    rowsColumns: string
  }
}) {
  const selectable = sheet.header_row_number != null

  return (
    <label
      className={cn(
        "relative block bg-white px-4 py-3 transition-colors",
        selectable ? "cursor-pointer hover:bg-primary/[0.035]" : "cursor-not-allowed opacity-60",
        selected && "bg-blue-50/80",
      )}
    >
      {selected ? (
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />
      ) : null}
      <div className="flex items-start gap-3">
        <input
          checked={selected}
          className="mt-1 size-4 accent-primary"
          disabled={!selectable}
          name="workbook-sheet"
          onChange={() => onSelect(sheet.name)}
          type="radio"
          value={sheet.name}
        />
        <div className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-semibold", selected && "text-primary")} title={sheet.name}>
            {sheet.name}
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {labels.rowsColumns}: {sheet.max_row} × {sheet.max_column}
          </p>
        </div>
      </div>
    </label>
  )
}
