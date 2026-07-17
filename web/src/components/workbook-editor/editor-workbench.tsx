"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Panel } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import { createClientUuid } from "@/lib/client-uuid"
import {
  addWorkbookColumn,
  downloadCurrentWorkbook,
  fetchWorkbookRecords,
  fetchWorkbookSession,
  lookupWorkbookCellValues,
  removeWorkbookColumn,
  saveWorkbookChanges,
  updateWorkbookColumn,
  updateWorkbookColumnConfiguration,
  WorkbookClientError,
} from "@/lib/workbooks/client"
import {
  workbookDraftDirtyCount,
  workbookDraftHasUnresolvedConflicts,
  workbookDraftToMap,
  type WorkbookDraftMap,
  type WorkbookDraftRecord,
} from "@/lib/workbooks/draft-schema"
import { workbookQueryKeys } from "@/lib/workbooks/query-keys"
import { useWorkbookDraft } from "@/lib/workbooks/use-workbook-draft"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import {
  WORKBOOK_MAX_SAFE_VND,
  WORKBOOK_MAX_TEXT_LENGTH,
  type WorkbookRecordsPage,
  type WorkbookSaveRequest,
  type WorkbookSession,
  type WorkbookColumnDataType,
  type WorkbookColumnFormula,
} from "@/schemas/workbook"
import { EditorFeedback, type EditorSaveState } from "./editor-feedback"
import { SessionActionBar } from "./session-action-bar"
import { WorkbookPagination } from "./workbook-pagination"
import { WorkbookRecordsTable } from "./workbook-records-table"
import { WorkbookTableToolbar } from "./workbook-table-toolbar"
import { WorkbookColumnControls } from "./workbook-column-controls"
import { WorkbookDraftConflictDialog } from "./workbook-draft-conflict-dialog"

type DraftMap = WorkbookDraftMap
type ErrorMap = Map<string, string>
type WorkbookTranslator = (key: string, values?: Record<string, string | number>) => string

function buildRecordQueryUrl(
  pathname: string,
  query: {
    page: number
    search: string
    sortBy?: string
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

function parseNumericDraft(value: string, numberFormat?: string | null): number | null {
  const normalized = value.trim().replace(/\s/g, "")
  if (!normalized) return null
  const dotCount = (normalized.match(/\./g) ?? []).length
  const commaCount = (normalized.match(/,/g) ?? []).length
  const formatUsesGrouping = (numberFormat?.split(";")[0] ?? "").includes(",")
  const repeatedGrouping =
    (dotCount > 1 || commaCount > 1 || formatUsesGrouping)
    && /^-?\d{1,3}([.,]\d{3})+$/.test(normalized)
  const machineValue = repeatedGrouping
    ? normalized.replace(/[.,]/g, "")
    : normalized.includes(".") && normalized.includes(",")
      ? normalized.lastIndexOf(".") > normalized.lastIndexOf(",")
        ? normalized.replace(/,/g, "")
        : normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(",", ".")
  const number = Number(machineValue)
  const coefficient = machineValue.toLowerCase().split("e")[0]
  const significantDigits = coefficient
    .replace(/[-+.]/g, "")
    .replace(/^0+/, "")
    .replace(/0+$/, "")
  if (significantDigits.length > 15) return null
  if (!Number.isFinite(number) || Math.abs(number) > 9.99999999999999e307) return null
  if (number === 0 && /[1-9]/.test(machineValue)) return null
  return number
}

export function parseWorkbookCellDraft(
  draft: string,
  dataType: WorkbookColumnDataType,
  numberFormat?: string | null,
): { valid: boolean; value: string | number | boolean | null } {
  const normalized = draft.trim()
  if (dataType === "text") {
    return {
      valid: draft.length <= WORKBOOK_MAX_TEXT_LENGTH && !draft.startsWith("="),
      value: draft,
    }
  }
  if (!normalized) return { valid: true, value: null }
  if (dataType === "number" || dataType === "currency") {
    const isPercentage = Boolean(numberFormat?.includes("%"))
    const numericDraft = isPercentage ? normalized.replace(/%/g, "").trim() : draft
    const value = parseNumericDraft(numericDraft, numberFormat)
    return { valid: value !== null, value: value !== null && isPercentage ? value / 100 : value }
  }
  if (dataType === "boolean") {
    if (normalized === "true") return { valid: true, value: true }
    if (normalized === "false") return { valid: true, value: false }
    return { valid: false, value: null }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return { valid: false, value: null }
  }
  const parsed = new Date(`${normalized}T00:00:00Z`)
  return {
    valid: !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(normalized),
    value: normalized,
  }
}

function isValidSemanticVnd(value: string | number | boolean | null): boolean {
  return value === null || (
    typeof value === "number"
    && Number.isInteger(value)
    && value >= 0
    && value <= WORKBOOK_MAX_SAFE_VND
  )
}

export function validateWorkbookDrafts(
  drafts: DraftMap,
  invalidMessage: string,
  columns?: WorkbookRecordsPage["columns"],
): { errors: ErrorMap; changes: WorkbookSaveRequest["changes"] } {
  const errors: ErrorMap = new Map()
  const changes: WorkbookSaveRequest["changes"] = []
  for (const [rowNumber, rowDraft] of drafts) {
    const values: Record<string, string | number | boolean | null> = {}
    for (const field of Object.keys(rowDraft)) {
      const draft = rowDraft[field]
      if (draft === undefined) continue
      const column = columns?.find((item) => item.field === field)
      const dataType = column?.data_type
        ?? ((field === "net_price" || field === "selling_price") ? "currency" : "text")
      const parsed = parseWorkbookCellDraft(draft, dataType, column?.number_format)
      const isSemanticVnd = column?.semantic_field === "net_price"
        || column?.semantic_field === "selling_price"
        || field === "net_price"
        || field === "selling_price"
      const validSemanticVnd = !isSemanticVnd || isValidSemanticVnd(parsed.value)
      if (!parsed.valid || !validSemanticVnd) errors.set(`${rowNumber}:${field}`, invalidMessage)
      else values[field] = parsed.value
    }
    if (Object.keys(values).length > 0) changes.push({ row_number: rowNumber, values })
  }
  return { errors, changes }
}

export function EditorWorkbench({
  initialQuery,
  initialRecords,
  initialSession,
  userId,
}: {
  initialQuery: {
    page: number
    search: string
    sortBy?: string
    sortDirection: "asc" | "desc"
  }
  initialRecords: WorkbookRecordsPage
  initialSession: WorkbookSession
  userId: string
}) {
  const rawT = useI18n()
  const t = rawT as unknown as WorkbookTranslator
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(initialQuery.page)
  const [search, setSearch] = React.useState(initialQuery.search)
  const [sortBy, setSortBy] = React.useState<string | undefined>(initialQuery.sortBy)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(initialQuery.sortDirection)
  const [baseVersion, setBaseVersion] = React.useState(initialSession.current_version)
  const draftIdentity = React.useMemo(() => ({
    userId,
    sessionId: initialSession.id,
    workbookId: initialSession.workbook_id,
    originalFilename: initialSession.original_filename,
    sheetName: initialSession.selected_sheet_name,
  }), [initialSession, userId])
  const localDraft = useWorkbookDraft({
    identity: draftIdentity,
    serverVersion: baseVersion,
  })
  const drafts = React.useMemo(
    () => workbookDraftToMap(localDraft.draft),
    [localDraft.draft],
  )
  const [cellErrors, setCellErrors] = React.useState<ErrorMap>(() => new Map())
  const [saveState, setSaveState] = React.useState<EditorSaveState>("idle")
  const [feedback, setFeedback] = React.useState<string>()
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = React.useState(false)
  const [reconciliationQueued, setReconciliationQueued] = React.useState(false)
  const recoveryKeyRef = React.useRef<string | undefined>(undefined)
  const replayedRequestRef = React.useRef<string | undefined>(undefined)
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
  const dirtyCount = workbookDraftDirtyCount(localDraft.draft)
  const hasUnresolvedConflicts = workbookDraftHasUnresolvedConflicts(localDraft.draft)

  React.useEffect(() => {
    if (dirtyCount === 0) return
    const confirmNavigation = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", confirmNavigation)
    return () => window.removeEventListener("beforeunload", confirmNavigation)
  }, [dirtyCount])
  const conflictCells = localDraft.draft?.cells.filter(
    (cell) => cell.conflict?.resolution === "unresolved",
  ) ?? []

  const updateUrl = React.useCallback(
    (next: {
      page: number
      search: string
      sortBy?: string
      sortDirection: "asc" | "desc"
    }) => router.replace(buildRecordQueryUrl(pathname, next), { scroll: false }),
    [pathname, router],
  )

  const reconciliationMutation = useMutation({
    mutationFn: async (draft: WorkbookDraftRecord) => {
      const latest = await fetchWorkbookSession(initialSession.id)
      const lookup = await lookupWorkbookCellValues(initialSession.id, {
        base_version: latest.current_version,
        cells: draft.cells.map((cell) => ({
          row_number: cell.rowNumber,
          column_id: cell.columnId,
        })),
      })
      const values = lookup.cells.map((cell) => ({
        rowNumber: cell.row_number,
        columnId: cell.column_id,
        value: cell.value,
      }))
      const currentValues = new Map(
        values.map((cell) => [`${cell.rowNumber}:${cell.columnId}`, cell.value]),
      )
      const hasConflicts = draft.cells.some((cell) =>
        !currentValues.has(`${cell.rowNumber}:${cell.columnId}`)
        || !Object.is(
          currentValues.get(`${cell.rowNumber}:${cell.columnId}`),
          cell.originalValue,
        ),
      )
      return { latest, values, hasConflicts }
    },
    onSuccess: ({ latest, values, hasConflicts }, draft) => {
      setBaseVersion(latest.current_version)
      queryClient.setQueryData(workbookQueryKeys.session(initialSession.id), latest)
      const repeatReconciliation = localDraft.applyReconciliation(
        latest.current_version,
        values,
        { revision: draft.revision, cells: draft.cells },
      )
      setReconciliationQueued(repeatReconciliation)
      setSaveState(hasConflicts ? "conflict" : "dirty")
      setFeedback(t(
        hasConflicts
          ? "workbookEditor.editor.feedback.recoveryConflicts"
          : "workbookEditor.editor.feedback.rebased",
      ))
      setConflictDialogOpen(hasConflicts)
      void queryClient.invalidateQueries({
        queryKey: workbookQueryKeys.recordsRoot(initialSession.id),
      })
    },
    onError: (error) => {
      const code = error instanceof WorkbookClientError ? error.code : "REQUEST_FAILED"
      localDraft.markSaveError(code)
      setSaveState("conflict")
      setFeedback(t("workbookEditor.editor.feedback.recoveryFailed"))
    },
  })

  const saveMutation = useMutation({
    mutationFn: (request: WorkbookSaveRequest) => saveWorkbookChanges(initialSession.id, request),
    onMutate: () => {
      setSaveState("saving")
      setFeedback(t("workbookEditor.editor.feedback.saving"))
    },
    onSuccess: async (result, request) => {
      setBaseVersion(result.current_version)
      setCellErrors(new Map())
      queryClient.setQueryData<WorkbookSession>(
        workbookQueryKeys.session(initialSession.id),
        (current) => ({ ...(current ?? initialSession), current_version: result.current_version }),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workbookQueryKeys.session(initialSession.id) }),
        queryClient.invalidateQueries({ queryKey: workbookQueryKeys.recordsRoot(initialSession.id) }),
      ])
      const remainingDraft = await localDraft.acknowledgeSave(
        result.current_version,
        request.request_id,
      )
      if (remainingDraft) {
        setSaveState("dirty")
        setFeedback(t("workbookEditor.editor.feedback.rebased"))
      } else {
        setSaveState("saved")
        setFeedback(t("workbookEditor.editor.feedback.saved"))
      }
    },
    onError: (error) => {
      const code = error instanceof WorkbookClientError ? error.code : "REQUEST_FAILED"
      localDraft.markSaveError(code)
      if (code === "VERSION_CONFLICT") {
        setSaveState("conflict")
        setFeedback(t("workbookEditor.editor.feedback.reconciling"))
        const draft = localDraft.draft
        if (draft && !reconciliationMutation.isPending) {
          reconciliationMutation.mutate(draft)
        }
      } else {
        setSaveState("error")
        setFeedback(t("workbookEditor.editor.feedback.saveFailed"))
      }
    },
  })

  React.useEffect(() => {
    const draft = localDraft.draft
    if (!localDraft.isHydrated || !draft) return

    if (draft.pendingSave?.retryable) {
      if (
        replayedRequestRef.current !== draft.pendingSave.requestId
        && !saveMutation.isPending
      ) {
        replayedRequestRef.current = draft.pendingSave.requestId
        setFeedback(t("workbookEditor.editor.feedback.retryingPending"))
        saveMutation.mutate(draft.pendingSave.payload)
      }
      return
    }

    if (
      (draft.serverBaseVersion < baseVersion || reconciliationQueued)
      && recoveryKeyRef.current !== draft.updatedAt
      && !reconciliationMutation.isPending
    ) {
      recoveryKeyRef.current = draft.updatedAt
      setReconciliationQueued(false)
      setSaveState("conflict")
      setFeedback(t("workbookEditor.editor.feedback.reconciling"))
      reconciliationMutation.mutate(draft)
      return
    }

    if (draft.serverBaseVersion > baseVersion) {
      recoveryKeyRef.current = draft.updatedAt
      setSaveState("conflict")
      setFeedback(t("workbookEditor.editor.feedback.recoveryFailed"))
      return
    }

    if (!recoveryKeyRef.current) {
      recoveryKeyRef.current = draft.updatedAt
      setBaseVersion(draft.serverBaseVersion)
      setSaveState(draft.status === "conflict" ? "conflict" : "dirty")
      setFeedback(t(
        draft.status === "conflict"
          ? "workbookEditor.editor.feedback.recoveryConflicts"
          : "workbookEditor.editor.feedback.recovered",
      ))
      setConflictDialogOpen(workbookDraftHasUnresolvedConflicts(draft))
    }
  }, [
    baseVersion,
    localDraft.draft,
    localDraft.isHydrated,
    reconciliationMutation,
    saveMutation,
    reconciliationQueued,
    t,
  ])

  React.useEffect(() => {
    if (localDraft.isHydrated && !localDraft.draft && saveState === "dirty") {
      setSaveState("idle")
      setFeedback(undefined)
      return
    }
    if (
      saveState === "conflict"
      && localDraft.draft?.status === "dirty"
      && !hasUnresolvedConflicts
    ) {
      setSaveState("dirty")
      setFeedback(t("workbookEditor.editor.feedback.conflictsResolved"))
      setConflictDialogOpen(false)
    }
  }, [
    hasUnresolvedConflicts,
    localDraft.draft,
    localDraft.isHydrated,
    saveState,
    t,
  ])

  const refreshColumns = async (session: WorkbookSession) => {
    setBaseVersion(session.current_version)
    queryClient.setQueryData(workbookQueryKeys.session(initialSession.id), session)
    if (sortBy && !session.column_config.some((column) => column.id === sortBy)) {
      setSortBy(undefined)
      setSortDirection("asc")
      setPage(1)
      updateUrl({ page: 1, search, sortBy: undefined, sortDirection: "asc" })
      queryClient.removeQueries({
        queryKey: workbookQueryKeys.recordsRoot(initialSession.id),
      })
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: workbookQueryKeys.recordsRoot(initialSession.id),
      }),
      queryClient.invalidateQueries({
        queryKey: workbookQueryKeys.sessionsRoot(),
      }),
    ])
  }
  const structuralError = (error: unknown, fallbackKey: string) => {
    setSaveState("error")
    if (error instanceof WorkbookClientError) {
      if (error.code === "VERSION_CONFLICT") {
        setFeedback(t("workbookEditor.editor.feedback.conflict"))
        return
      }
      if (error.code === "COLUMN_IN_USE") {
        setFeedback(t("workbookEditor.editor.feedback.columnInUse"))
        return
      }
      if (error.code === "FORMULA_DEPENDENCY_CYCLE") {
        setFeedback(t("workbookEditor.editor.feedback.formulaCycle"))
        return
      }
    }
    setFeedback(t(fallbackKey))
  }
  const addColumnsMutation = useMutation({
    mutationFn: ({ label, dataType }: { label: string; dataType: WorkbookColumnDataType }) => addWorkbookColumn(initialSession.id, baseVersion, label, dataType),
    onSuccess: refreshColumns,
    onError: (error) => structuralError(error, "workbookEditor.editor.feedback.addColumnsFailed"),
  })
  const updateColumnMutation = useMutation({
    mutationFn: ({ columnId, label, dataType, formula }: { columnId?: string; label: string; dataType: "number" | "currency"; formula: WorkbookColumnFormula | null }) => columnId
      ? updateWorkbookColumn(initialSession.id, columnId, { base_version: baseVersion, label, data_type: dataType, formula })
      : addWorkbookColumn(initialSession.id, baseVersion, label, dataType, formula ?? undefined),
    onSuccess: refreshColumns,
    onError: (error) => structuralError(error, "workbookEditor.editor.feedback.formulaUpdateFailed"),
  })
  const removeColumnMutation = useMutation({
    mutationFn: (columnId: string) => removeWorkbookColumn(initialSession.id, columnId, baseVersion),
    onSuccess: refreshColumns,
    onError: (error) => structuralError(error, "workbookEditor.editor.feedback.removeColumnFailed"),
  })
  const configurationMutation = useMutation({
    mutationFn: ({ hidden, sticky }: { hidden: string[]; sticky: string[] }) => updateWorkbookColumnConfiguration(initialSession.id, baseVersion, hidden, sticky),
    onSuccess: async (session) => { queryClient.setQueryData(workbookQueryKeys.session(initialSession.id), session); await queryClient.invalidateQueries({ queryKey: workbookQueryKeys.recordsRoot(initialSession.id) }) },
  })
  const hiddenColumnIds = records.columns.filter((column) => column.hidden).map((column) => column.id)
  const stickyColumnIds = records.columns.filter((column) => column.sticky).map((column) => column.id)
  const structuralActionsDisabled = dirtyCount > 0
    || saveMutation.isPending
    || reconciliationMutation.isPending
    || configurationMutation.isPending
    || removeColumnMutation.isPending
    || addColumnsMutation.isPending
    || updateColumnMutation.isPending
  const structuralActionDisabledReason = dirtyCount > 0
    ? t("workbookEditor.editor.unsavedCount", { count: dirtyCount })
    : saveMutation.isPending
      ? t("workbookEditor.editor.feedback.saving")
      : reconciliationMutation.isPending
        ? t("workbookEditor.editor.feedback.reconciling")
        : undefined
  const hideColumn = (columnId: string) => {
    if (structuralActionsDisabled) return
    configurationMutation.mutate({
      hidden: [...hiddenColumnIds, columnId],
      sticky: stickyColumnIds.filter((id) => id !== columnId),
    })
  }
  const toggleStickyColumn = (columnId: string, sticky: boolean) => {
    if (structuralActionsDisabled) return
    configurationMutation.mutate({
      hidden: hiddenColumnIds,
      sticky: sticky
        ? [...stickyColumnIds, columnId]
        : stickyColumnIds.filter((id) => id !== columnId),
    })
  }
  const handleDraftChange = React.useCallback(
    (rowNumber: number, field: string, value: string) => {
      const record = records.items.find((item) => item.row_number === rowNumber)
      const column = records.columns.find((item) => item.field === field)
      const parsed = parseWorkbookCellDraft(value, column?.data_type ?? "text", column?.number_format)
      const isSemanticVnd = column?.semantic_field === "net_price"
        || column?.semantic_field === "selling_price"
      const isValid = parsed.valid && (!isSemanticVnd || isValidSemanticVnd(parsed.value))
      const storedCell = localDraft.draft?.cells.find(
        (cell) => cell.rowNumber === rowNumber && cell.columnId === field,
      )
      const original = storedCell?.originalValue ?? record?.values[field] ?? null
      localDraft.updateCell({
        rowNumber,
        columnId: field,
        originalValue: original,
        localInput: value,
        ...(isValid ? { localValue: parsed.value } : {}),
        matchesOriginal: isValid && Object.is(parsed.value, original),
      })
      setCellErrors((current) => {
        const next = new Map(current)
        next.delete(`${rowNumber}:${field}`)
        return next
      })
      setSaveState("dirty")
      setFeedback(undefined)
    },
    [localDraft, records.columns, records.items],
  )

  const handleSave = async () => {
    if (hasUnresolvedConflicts) {
      setSaveState("conflict")
      setFeedback(t("workbookEditor.editor.feedback.resolveConflicts"))
      setConflictDialogOpen(true)
      return
    }
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
    const request = localDraft.draft?.pendingSave?.retryable
      ? localDraft.draft.pendingSave.payload
      : {
          request_id: createClientUuid(),
          base_version: baseVersion,
          changes: validated.changes,
        }
    if (localDraft.draft) await localDraft.beginSave(request)
    saveMutation.mutate(request)
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

  const reloadLatestVersion = () => {
    if (!localDraft.draft || reconciliationMutation.isPending) return
    setFeedback(t("workbookEditor.editor.feedback.reconciling"))
    reconciliationMutation.mutate(localDraft.draft)
  }

  const handleClearLocalDraft = async () => {
    if (!window.confirm(t("workbookEditor.editor.clearLocalConfirm"))) return
    await localDraft.clear()
    setCellErrors(new Map())
    setSaveState("idle")
    setFeedback(t("workbookEditor.editor.feedback.localCleared"))
    setConflictDialogOpen(false)
  }

  const handleSort = React.useCallback(
    (field: string) => {
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
        clearDraftLabel={t("workbookEditor.editor.actions.clearLocal")}
        dirtyCount={dirtyCount}
        dirtyLabel={t("workbookEditor.editor.unsavedCount", { count: dirtyCount })}
        downloadLabel={t("workbookEditor.editor.actions.download")}
        filename={initialSession.original_filename}
        isDownloading={isDownloading}
        isSaving={saveMutation.isPending || reconciliationMutation.isPending}
        onClearDraft={() => void handleClearLocalDraft()}
        onDownload={handleDownload}
        onSave={handleSave}
        editingAvailable={
          records.columns.some((column) => column.editable)
          && !hasUnresolvedConflicts
        }
        protectedLabel={t("workbookEditor.editor.originalProtected")}
        saveLabel={t("workbookEditor.editor.actions.save")}
        savingLabel={t("workbookEditor.editor.actions.saving")}
        versionLabel={t("workbookEditor.editor.version", { version: baseVersion })}
      />

      <Panel className={cn(recordsQuery.isFetching && "opacity-80")}>
        <WorkbookTableToolbar
          columnControls={<WorkbookColumnControls
            baseVersion={baseVersion}
            busy={structuralActionsDisabled || addColumnsMutation.isPending || updateColumnMutation.isPending}
            columns={records.columns}
            onAdd={(label, dataType) => addColumnsMutation.mutate({ label, dataType })}
            onConfigurationChange={(hidden, sticky) => configurationMutation.mutate({ hidden, sticky })}
            onUpdateFormula={(columnId, nextLabel, nextDataType, formula) => updateColumnMutation.mutate({ columnId, label: nextLabel, dataType: nextDataType, formula })}
            sessionId={initialSession.id}
            t={t}
          />}
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
          booleanLabels={{
            blank: t("workbookEditor.editor.boolean.blank"),
            true: t("workbookEditor.editor.boolean.true"),
            false: t("workbookEditor.editor.boolean.false"),
          }}
          drafts={drafts}
          emptyLabel={t("workbookEditor.editor.empty")}
          errors={cellErrors}
          headerActionLabels={{
            hide: t("workbookEditor.editor.columns.hideColumn"),
            pin: t("workbookEditor.editor.columns.pinColumn"),
            unpin: t("workbookEditor.editor.columns.unpinColumn"),
            remove: t("workbookEditor.editor.columns.removeColumn"),
            removeConfirm: t("workbookEditor.editor.columns.removeColumnConfirm"),
          }}
          isConfiguringColumns={structuralActionsDisabled}
          structuralActionDisabledReason={structuralActionDisabledReason}
          onDraftChange={handleDraftChange}
          onHideColumn={hideColumn}
          onRemoveColumn={(columnId) => {
            if (structuralActionsDisabled || localDraft.draft?.cells.some((cell) => cell.columnId === columnId)) return
            removeColumnMutation.mutate(columnId)
          }}
          onSort={handleSort}
          onToggleSticky={toggleStickyColumn}
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
                {hasUnresolvedConflicts ? (
                  <Button onClick={() => setConflictDialogOpen(true)} size="sm" type="button" variant="outline">
                    {t("workbookEditor.editor.actions.resolveConflicts")}
                  </Button>
                ) : (
                  <Button onClick={reloadLatestVersion} size="sm" type="button" variant="outline">
                    {t("workbookEditor.editor.actions.reloadLatest")}
                  </Button>
                )}
              </div>
            ) : undefined
          }
          message={feedback}
          state={saveState}
        />
      </Panel>
      <WorkbookDraftConflictDialog
        booleanLabels={{
          true: t("workbookEditor.editor.boolean.true"),
          false: t("workbookEditor.editor.boolean.false"),
        }}
        cells={conflictCells}
        onOpenChange={setConflictDialogOpen}
        onResolve={(rowNumber, columnId, resolution) => {
          localDraft.resolveConflict(rowNumber, columnId, resolution)
          setCellErrors((current) => {
            const next = new Map(current)
            next.delete(`${rowNumber}:${columnId}`)
            return next
          })
        }}
        open={conflictDialogOpen && conflictCells.length > 0}
      />
    </div>
  )
}
