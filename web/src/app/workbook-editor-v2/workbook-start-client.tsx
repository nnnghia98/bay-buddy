"use client"

import patterns from "@/styles/ui-patterns.module.css"

import { Banner } from "@astryxdesign/core/Banner"
import { Card } from "@astryxdesign/core/Card"
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
import styles from "./workbook-start.module.css"

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
    <div className={styles.workbench}>
      <Card
        aria-labelledby="workbook-start-title"
        className={styles.startCard}
        padding={0}
      >
        <div className={styles.header}>
          <div className={styles.identity}>
            <span className={styles.iconTile}>
              <FileSpreadsheet aria-hidden="true" className={patterns.iconSmall} />
            </span>
            <h1 className={styles.title} id="workbook-start-title">
              {text("workbookEditor.start.title")}
            </h1>
          </div>
          <div className={styles.protected}>
            <ShieldCheck aria-hidden="true" className={patterns.iconSmall} />
            <span>{text("workbookEditor.start.originalProtected")}</span>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.upload}>
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
              <div className={styles.error}>
                <Banner
                  icon={<AlertTriangle aria-hidden="true" />}
                  status="error"
                  title={error}
                />
              </div>
            ) : null}
          </div>

          <div
            aria-busy={busy}
            className={styles.sheetsRegion}
            ref={sheetsRegionRef}
            tabIndex={-1}
          >
            <div className={styles.sheetsHeader}>
              <div className={styles.sheetsHeaderRow}>
                <p className={patterns.sectionTitle}>
                  {text("workbookEditor.sheets.eyebrow")}
                </p>
                {uploaded ? (
                  <span className={patterns.monoSupporting}>
                    {uploaded.sheets.length}
                  </span>
                ) : null}
              </div>
              <p className={styles.sheetsDescription}>
                {text("workbookEditor.sheets.description")}
              </p>
            </div>

            {uploaded ? (
              <div className={styles.uploadedContent}>
                <div className={styles.uploadedFile}>
                  <div className={styles.uploadedIdentity}>
                    <FileSpreadsheet aria-hidden="true" className={patterns.iconSmall} />
                    <div className={patterns.minWidthZero}>
                      <p className={styles.uploadedName} title={uploaded.original_filename}>
                        {uploaded.original_filename}
                      </p>
                      <p className={patterns.supportingText}>
                        {text("workbookEditor.start.uploadedProtected")}
                      </p>
                    </div>
                  </div>
                </div>

                <fieldset className={styles.sheetList} disabled={busy}>
                  <legend className={patterns.srOnly}>{text("workbookEditor.sheets.selectLabel")}</legend>
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

                <div className={styles.openAction}>
                  <Button
                    disabled={!selectedSheet || busy}
                    onClick={handleCreateSession}
                    type="button"
                    width="100%"
                  >
                    {pending === "session" ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className={`${patterns.iconSmall} ${patterns.spinner}`}
                      />
                    ) : null}
                    {pending === "session"
                      ? text("workbookEditor.sheets.opening")
                      : text("workbookEditor.sheets.openAction")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyCopy}>
                  <span className={styles.emptyIcon}>
                    <FileSpreadsheet aria-hidden="true" className={patterns.iconSmall} />
                  </span>
                  <p className={styles.emptyTitle}>
                    {text("workbookEditor.sheets.emptyTitle")}
                  </p>
                  <p className={patterns.mutedText}>
                    {text("workbookEditor.sheets.emptyDescription")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
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
        styles.sheetOption,
        selectable ? styles.sheetSelectable : styles.sheetUnavailable,
        selected && styles.sheetSelected,
      )}
    >
      {selected ? (
        <span aria-hidden="true" className={styles.selectionMarker} />
      ) : null}
      <div className={patterns.rowStart}>
        <input
          checked={selected}
          className={styles.radio}
          disabled={!selectable}
          name="workbook-sheet"
          onChange={() => onSelect(sheet.name)}
          type="radio"
          value={sheet.name}
        />
        <div className={styles.sheetCopy}>
          <span className={cn(styles.sheetName, selected && styles.sheetNameSelected)} title={sheet.name}>
            {sheet.name}
          </span>
          <p className={styles.sheetSize}>
            {labels.rowsColumns}: {sheet.max_row} × {sheet.max_column}
          </p>
        </div>
      </div>
    </label>
  )
}
