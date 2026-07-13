"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Panel } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import {
  addWorkbookColumn,
  downloadCurrentWorkbook,
  fetchWorkbookRecords,
  fetchWorkbookSession,
  saveWorkbookChanges,
  removeWorkbookColumn,
  updateWorkbookColumnConfiguration,
  WorkbookClientError,
} from "@/lib/workbooks/client"
import { workbookQueryKeys } from "@/lib/workbooks/query-keys"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  WORKBOOK_MAX_SAFE_VND,
  type WorkbookRecordsPage,
  type WorkbookSaveRequest,
  type WorkbookSemanticField,
  type WorkbookSession,
  type WorkbookColumnDataType,
  type WorkbookColumnFormula,
} from "@/schemas/workbook"
import { parseVndDraft } from "./editable-price-cell"
import { EditorFeedback, type EditorSaveState } from "./editor-feedback"
import { SessionActionBar } from "./session-action-bar"
import { WorkbookPagination } from "./workbook-pagination"
import { WorkbookRecordsTable } from "./workbook-records-table"
import { WorkbookTableToolbar } from "./workbook-table-toolbar"
import { WorkbookColumnControls } from "./workbook-column-controls"

type DraftMap = Map<number, Partial<Record<string, string>>>
type ErrorMap = Map<string, string>
type WorkbookTranslator = (key: string, values?: Record<string, string | number>) => string

function buildRecordQueryUrl(
  pathname: string,
  query: {
    page: number
    search: string
    sortBy?: WorkbookSemanticField
    sortDirection: "asc" | "desc"
  },
): string {
  const parameters = new URLSearchParams()
  if (query.page > 1) parameters.set("page", String(query.page))
  if (query.search.trim()) parameters.set("search", query.search.trim())
  if (query.sortBy) parameters.set("sort_by", query.sortBy)
  if (query.sortDirection !== "asc") parameters.set("sort_direction", query.sortDirection)
  const encoded = parameters.toString()
  return encoded ? `${pathname}?${encoded}` : pathname
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function validateWorkbookDrafts(
  drafts: DraftMap,
  invalidMessage: string,
  columns?: WorkbookRecordsPage["columns"],
): { errors: ErrorMap; changes: WorkbookSaveRequest["changes"] } {
  const errors: ErrorMap = new Map()
  const changes: WorkbookSaveRequest["changes"] = []
  for (const [rowNumber, rowDraft] of drafts) {
    const values: Record<string, string | number | null> = {}
    for (const field of Object.keys(rowDraft)) {
      const draft = rowDraft[field]
      if (draft === undefined) continue
      const column = columns?.find((item) => item.field === field)
      const dataType = column?.data_type ?? ((field === "net_price" || field === "selling_price") ? "currency" : "text")
      const normalized = draft.trim()
      const amount = dataType === "currency" ? parseVndDraft(draft) : null
      const number = dataType === "number" && normalized ? Number(normalized.replace(",", ".")) : null
      if (dataType === "currency" && normalized && (amount === null || amount > WORKBOOK_MAX_SAFE_VND)) {
        errors.set(`${rowNumber}:${field}`, invalidMessage)
      } else if (dataType === "number" && normalized && (number === null || !Number.isFinite(number))) {
        errors.set(`${rowNumber}:${field}`, invalidMessage)
      } else {
        values[field] = dataType === "currency"
          ? (normalized ? amount : null)
          : dataType === "number"
            ? (normalized ? number : null)
            : dataType === "date"
              ? (normalized || null)
              : draft
      }
    }
    if (Object.keys(values).length > 0) changes.push({ row_number: rowNumber, values })
  }
  return { errors, changes }
}

export function EditorWorkbench({
  initialQuery,
  initialRecords,
  initialSession,
}: {
  initialQuery: {
    page: number
    search: string
    sortBy?: WorkbookSemanticField
    sortDirection: "asc" | "desc"
  }
  initialRecords: WorkbookRecordsPage
  initialSession: WorkbookSession
}) {
  const rawT = useI18n()
  const t = rawT as unknown as WorkbookTranslator
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(initialQuery.page)
  const [search, setSearch] = React.useState(initialQuery.search)
  const [sortBy, setSortBy] = React.useState<WorkbookSemanticField | undefined>(initialQuery.sortBy)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(initialQuery.sortDirection)
  const [baseVersion, setBaseVersion] = React.useState(initialSession.current_version)
  const [drafts, setDrafts] = React.useState<DraftMap>(() => new Map())
  const [cellErrors, setCellErrors] = React.useState<ErrorMap>(() => new Map())
  const [saveState, setSaveState] = React.useState<EditorSaveState>("idle")
  const [feedback, setFeedback] = React.useState<string>()
  const [isDownloading, setIsDownloading] = React.useState(false)
  const pageSize = 50

  const recordsQuery = useQuery({
    queryKey: workbookQueryKeys.records(initialSession.id, {
      version: baseVersion,
      page,
      pageSize,
      search,
      sortBy,
      sortDirection,
    }),
    queryFn: () =>
      fetchWorkbookRecords(initialSession.id, {
        page,
        pageSize,
        search,
        sortBy,
        sortDirection,
      }),
    initialData:
      page === initialQuery.page &&
      search === initialQuery.search &&
      sortBy === initialQuery.sortBy &&
      sortDirection === initialQuery.sortDirection &&
      baseVersion === initialRecords.version
        ? initialRecords
        : undefined,
    placeholderData: (previous) => previous,
    refetchOnMount: "always",
  })
  const records = recordsQuery.data ?? initialRecords
  const dirtyCount = React.useMemo(
    () => Array.from(drafts.values()).reduce((count, draft) => count + Object.keys(draft).length, 0),
    [drafts],
  )

  React.useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (dirtyCount === 0) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", preventUnload)
    return () => window.removeEventListener("beforeunload", preventUnload)
  }, [dirtyCount])

  React.useEffect(() => {
    if (dirtyCount === 0) return

    const confirmNavigation = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest("a[href]")
      if (!link || link.getAttribute("target") === "_blank") return
      const href = link.getAttribute("href")
      if (!href || href.startsWith("#")) return
      if (!window.confirm(t("workbookEditor.editor.discardConfirm"))) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener("click", confirmNavigation, true)
    return () => document.removeEventListener("click", confirmNavigation, true)
  }, [dirtyCount, t])

  const updateUrl = React.useCallback(
    (next: {
      page: number
      search: string
      sortBy?: WorkbookSemanticField
      sortDirection: "asc" | "desc"
    }) => router.replace(buildRecordQueryUrl(pathname, next), { scroll: false }),
    [pathname, router],
  )

  const saveMutation = useMutation({
    mutationFn: (request: WorkbookSaveRequest) => saveWorkbookChanges(initialSession.id, request),
    onMutate: () => {
      setSaveState("saving")
      setFeedback(t("workbookEditor.editor.feedback.saving"))
    },
    onSuccess: async (result) => {
      setBaseVersion(result.current_version)
      setDrafts(new Map())
      setCellErrors(new Map())
      setSaveState("saved")
      setFeedback(t("workbookEditor.editor.feedback.saved"))
      queryClient.setQueryData<WorkbookSession>(
        workbookQueryKeys.session(initialSession.id),
        (current) => ({ ...(current ?? initialSession), current_version: result.current_version }),
      )
      await queryClient.invalidateQueries({ queryKey: workbookQueryKeys.session(initialSession.id) })
    },
    onError: (error) => {
      if (error instanceof WorkbookClientError && error.code === "VERSION_CONFLICT") {
        setSaveState("conflict")
        setFeedback(t("workbookEditor.editor.feedback.conflict"))
      } else {
        setSaveState("error")
        setFeedback(t("workbookEditor.editor.feedback.saveFailed"))
      }
    },
  })

  const refreshColumns = async (session: WorkbookSession) => {
    setBaseVersion(session.current_version)
    queryClient.setQueryData(workbookQueryKeys.session(initialSession.id), session)
    await queryClient.invalidateQueries({ queryKey: workbookQueryKeys.recordsRoot(initialSession.id) })
  }
  const addColumnsMutation = useMutation({
    mutationFn: ({ label, dataType, formula }: { label: string; dataType: WorkbookColumnDataType; formula?: WorkbookColumnFormula }) => addWorkbookColumn(initialSession.id, baseVersion, label, dataType, formula),
    onSuccess: async (session) => {
      await refreshColumns(session)
    },
    onError: (error) => {
      setSaveState("error")
      setFeedback(
        error instanceof WorkbookClientError && error.code === "VERSION_CONFLICT"
          ? t("workbookEditor.editor.feedback.conflict")
          : t("workbookEditor.editor.feedback.addColumnsFailed"),
      )
    },
  })
  const removeColumnMutation = useMutation({ mutationFn: (id: string) => removeWorkbookColumn(initialSession.id, id, baseVersion), onSuccess: refreshColumns })
  const configurationMutation = useMutation({
    mutationFn: ({ hidden, sticky }: { hidden: string[]; sticky: string[] }) => updateWorkbookColumnConfiguration(initialSession.id, hidden, sticky),
    onSuccess: async (session) => { queryClient.setQueryData(workbookQueryKeys.session(initialSession.id), session); await queryClient.invalidateQueries({ queryKey: workbookQueryKeys.recordsRoot(initialSession.id) }) },
  })

  const handleDraftChange = React.useCallback(
    (rowNumber: number, field: string, value: string) => {
      const record = records.items.find((item) => item.row_number === rowNumber)
      const column = records.columns.find((item) => item.field === field)
      const parsed = column?.data_type === "currency" || column?.data_type === "number" ? parseVndDraft(value) : value
      const original = record?.values[field]
      setDrafts((current) => {
        const next = new Map(current)
        const rowDraft = { ...(next.get(rowNumber) ?? {}) }
        if (parsed !== null && typeof original === "number" && parsed === original) {
          delete rowDraft[field]
        } else {
          rowDraft[field] = value
        }
        if (Object.keys(rowDraft).length === 0) next.delete(rowNumber)
        else next.set(rowNumber, rowDraft)
        return next
      })
      setCellErrors((current) => {
        const next = new Map(current)
        next.delete(`${rowNumber}:${field}`)
        return next
      })
      setSaveState("dirty")
      setFeedback(undefined)
    },
    [records.columns, records.items],
  )

  const handleSave = () => {
    const validated = validateWorkbookDrafts(
      drafts,
      t("workbookEditor.editor.validation.invalidCell"),
      records.columns,
    )
    setCellErrors(validated.errors)
    if (validated.errors.size > 0 || validated.changes.length === 0) {
      setSaveState("error")
      setFeedback(t("workbookEditor.editor.feedback.validationFailed"))
      return
    }
    saveMutation.mutate({
      request_id: crypto.randomUUID(),
      base_version: baseVersion,
      changes: validated.changes,
    })
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const download = await downloadCurrentWorkbook(initialSession.id)
      triggerBlobDownload(download.blob, download.filename)
    } catch {
      setSaveState("error")
      setFeedback(t("workbookEditor.editor.feedback.downloadFailed"))
    } finally {
      setIsDownloading(false)
    }
  }

  const reloadLatestVersion = async () => {
    try {
      const latest = await fetchWorkbookSession(initialSession.id)
      setBaseVersion(latest.current_version)
      setSaveState("dirty")
      setFeedback(t("workbookEditor.editor.feedback.latestLoaded"))
    } catch {
      setSaveState("error")
      setFeedback(t("workbookEditor.editor.feedback.loadFailed"))
    }
  }

  const handleSort = React.useCallback(
    (field: WorkbookSemanticField) => {
      const nextDirection = sortBy === field && sortDirection === "asc" ? "desc" : "asc"
      setSortBy(field)
      setSortDirection(nextDirection)
      setPage(1)
      updateUrl({ page: 1, search, sortBy: field, sortDirection: nextDirection })
    },
    [search, sortBy, sortDirection, updateUrl],
  )

  return (
    <div className="space-y-4 pb-12 text-foreground">
      <SessionActionBar
        dirtyCount={dirtyCount}
        dirtyLabel={t("workbookEditor.editor.unsavedCount", { count: dirtyCount })}
        downloadLabel={t("workbookEditor.editor.actions.download")}
        filename={initialSession.original_filename}
        isDownloading={isDownloading}
        isSaving={saveMutation.isPending}
        onDownload={handleDownload}
        onSave={handleSave}
        editingAvailable={records.columns.some((column) => column.editable)}
        protectedLabel={t("workbookEditor.editor.originalProtected")}
        saveLabel={t("workbookEditor.editor.actions.save")}
        savingLabel={t("workbookEditor.editor.actions.saving")}
        versionLabel={t("workbookEditor.editor.version", { version: baseVersion })}
      />

      <Panel className={cn(recordsQuery.isFetching && "opacity-80")}>
        <WorkbookTableToolbar
          columnControls={<WorkbookColumnControls busy={addColumnsMutation.isPending || removeColumnMutation.isPending || configurationMutation.isPending} columns={records.columns} onAdd={(label, dataType, formula) => addColumnsMutation.mutate({ label, dataType, formula })} onConfigurationChange={(hidden, sticky) => configurationMutation.mutate({ hidden, sticky })} onRemove={(id) => removeColumnMutation.mutate(id)} t={t} />}
          onSearch={(value) => {
            const nextSearch = value.trim()
            setSearch(nextSearch)
            setPage(1)
            updateUrl({ page: 1, search: nextSearch, sortBy, sortDirection })
          }}
          search={search}
          searchLabel={t("workbookEditor.editor.actions.search")}
          searchPlaceholder={t("workbookEditor.editor.searchPlaceholder")}
          sheetLabel={t("workbookEditor.editor.sheet", { sheet: records.sheet_name })}
        />
        {recordsQuery.isError ? (
          <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <span>{t("workbookEditor.editor.feedback.loadFailed")}</span>
            <Button onClick={() => recordsQuery.refetch()} size="sm" type="button" variant="outline">
              {t("workbookEditor.editor.actions.retry")}
            </Button>
          </div>
        ) : null}
        <WorkbookRecordsTable
          drafts={drafts}
          emptyLabel={t("workbookEditor.editor.empty")}
          errors={cellErrors}
          onDraftChange={handleDraftChange}
          onSort={handleSort}
          records={records}
          rowLabel={t("workbookEditor.editor.rowLabel")}
          sortBy={sortBy}
          sortDirection={sortDirection}
        />
        <WorkbookPagination
          nextLabel={t("workbookEditor.editor.pagination.next")}
          onPageChange={(nextPage) => {
            setPage(nextPage)
            updateUrl({ page: nextPage, search, sortBy, sortDirection })
          }}
          page={records.pagination.page}
          pageLabel={t("workbookEditor.editor.pagination.page")}
          previousLabel={t("workbookEditor.editor.pagination.previous")}
          total={records.pagination.total}
          totalLabel={t("workbookEditor.editor.pagination.total")}
          totalPages={records.pagination.total_pages}
        />
        <EditorFeedback
          action={
            saveState === "conflict" ? (
              <div className="flex gap-2">
                <Button onClick={reloadLatestVersion} size="sm" type="button" variant="outline">
                  {t("workbookEditor.editor.actions.reloadLatest")}
                </Button>
                <Button onClick={handleDownload} size="sm" type="button" variant="outline">
                  {t("workbookEditor.editor.actions.download")}
                </Button>
              </div>
            ) : undefined
          }
          message={feedback}
          state={saveState}
        />
      </Panel>
    </div>
  )
}
