"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import * as React from "react"

import { createClientUuid } from "@/lib/client-uuid"
import type { WorkbookCellValue, WorkbookSaveRequest } from "@/schemas/workbook"
import {
  acknowledgeWorkbookSave,
  reconcileWorkbookDraft,
  resolveWorkbookDraftConflict,
  updateWorkbookDraftCell,
  withPendingWorkbookSave,
  withWorkbookSaveError,
  workbookDraftKey,
  type WorkbookCellServerValue,
  type WorkbookDraftIdentity,
  type WorkbookDraftRecord,
} from "./draft-schema"
import {
  cleanupWorkbookDrafts,
  deleteWorkbookDraft,
  getWorkbookDraft,
  listWorkbookDraftSummaries,
  publishWorkbookDraftSignal,
  putWorkbookDraft,
  subscribeWorkbookDraftSignals,
  type WorkbookDraftSummary,
} from "./draft-store"

const WRITE_DEBOUNCE_MS = 250

const draftQueryKeys = {
  session: (userId: string, sessionId: string) =>
    ["workbook-drafts", userId, sessionId] as const,
  summaries: (userId: string) => ["workbook-drafts", userId, "summaries"] as const,
}

export function useWorkbookDraft({
  identity,
  serverVersion,
}: {
  identity: WorkbookDraftIdentity
  serverVersion: number
}) {
  const queryClient = useQueryClient()
  const senderId = React.useRef(createClientUuid())
  const writeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWrite = React.useRef<WorkbookDraftRecord | null | undefined>(undefined)
  const queryKey = React.useMemo(
    () => draftQueryKeys.session(identity.userId, identity.sessionId),
    [identity.sessionId, identity.userId],
  )
  const draftQuery = useQuery({
    queryKey,
    queryFn: () => getWorkbookDraft(identity.userId, identity.sessionId),
    staleTime: Infinity,
    refetchOnMount: "always",
  })

  const persist = React.useCallback(async () => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current)
      writeTimer.current = null
    }
    const next = pendingWrite.current
    pendingWrite.current = undefined
    if (next === undefined) return
    if (next === null) {
      await deleteWorkbookDraft(identity.userId, identity.sessionId)
      publishWorkbookDraftSignal({
        type: "cleared",
        userId: identity.userId,
        sessionId: identity.sessionId,
        senderId: senderId.current,
      })
    } else {
      await putWorkbookDraft(next)
      publishWorkbookDraftSignal({
        type: "updated",
        userId: identity.userId,
        sessionId: identity.sessionId,
        updatedAt: next.updatedAt,
        senderId: senderId.current,
      })
    }
    await queryClient.invalidateQueries({
      queryKey: draftQueryKeys.summaries(identity.userId),
    })
  }, [identity.sessionId, identity.userId, queryClient])

  const setDraft = React.useCallback((
    next: WorkbookDraftRecord | null,
    options: { immediate?: boolean } = {},
  ) => {
    queryClient.setQueryData(queryKey, next)
    pendingWrite.current = next
    if (options.immediate) {
      void persist()
      return
    }
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => void persist(), WRITE_DEBOUNCE_MS)
  }, [persist, queryClient, queryKey])

  React.useEffect(() => {
    return subscribeWorkbookDraftSignals((signal) => {
      if (
        signal.senderId === senderId.current ||
        signal.userId !== identity.userId ||
        signal.sessionId !== identity.sessionId
      ) return
      void queryClient.invalidateQueries({ queryKey })
    })
  }, [identity.sessionId, identity.userId, queryClient, queryKey])

  React.useEffect(() => {
    const flush = () => void persist()
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", flush)
      void persist()
    }
  }, [persist])

  const updateCell = React.useCallback((update: {
    rowNumber: number
    columnId: string
    originalValue: WorkbookCellValue
    localInput: string
    localValue?: WorkbookCellValue
    matchesOriginal: boolean
  }) => {
    const current = queryClient.getQueryData<WorkbookDraftRecord | null>(queryKey) ?? null
    const next = updateWorkbookDraftCell(
      current,
      identity,
      current?.serverBaseVersion ?? serverVersion,
      update,
    )
    setDraft(next)
  }, [identity, queryClient, queryKey, serverVersion, setDraft])

  const beginSave = React.useCallback(async (payload: WorkbookSaveRequest) => {
    const current = queryClient.getQueryData<WorkbookDraftRecord | null>(queryKey)
    if (!current) return
    const next = withPendingWorkbookSave(current, payload)
    queryClient.setQueryData(queryKey, next)
    pendingWrite.current = next
    await persist()
  }, [persist, queryClient, queryKey])

  const markSaveError = React.useCallback((code: string) => {
    const current = queryClient.getQueryData<WorkbookDraftRecord | null>(queryKey)
    if (!current) return
    setDraft(withWorkbookSaveError(current, code), { immediate: true })
  }, [queryClient, queryKey, setDraft])

  const applyReconciliation = React.useCallback((
    currentVersion: number,
    cells: WorkbookCellServerValue[],
    inspected: { revision: number; cells: WorkbookDraftRecord["cells"] },
  ): boolean => {
    const current = queryClient.getQueryData<WorkbookDraftRecord | null>(queryKey)
    if (!current) return false
    const changedDuringLookup = current.revision !== inspected.revision
    setDraft(
      reconcileWorkbookDraft(current, currentVersion, cells, inspected.cells),
      { immediate: true },
    )
    return changedDuringLookup
  }, [queryClient, queryKey, setDraft])

  const acknowledgeSave = React.useCallback(async (
    currentVersion: number,
    requestId: string,
  ): Promise<WorkbookDraftRecord | null> => {
    const current = queryClient.getQueryData<WorkbookDraftRecord | null>(queryKey)
    if (!current) return null
    const next = acknowledgeWorkbookSave(current, currentVersion, requestId)
    setDraft(next)
    await persist()
    return next
  }, [persist, queryClient, queryKey, setDraft])

  const resolveConflict = React.useCallback((
    rowNumber: number,
    columnId: string,
    resolution: "keep-local" | "use-server",
  ) => {
    const current = queryClient.getQueryData<WorkbookDraftRecord | null>(queryKey)
    if (!current) return
    setDraft(
      resolveWorkbookDraftConflict(current, rowNumber, columnId, resolution),
      { immediate: true },
    )
  }, [queryClient, queryKey, setDraft])

  const clear = React.useCallback(async (type: "cleared" | "saved" = "cleared") => {
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = null
    pendingWrite.current = undefined
    await deleteWorkbookDraft(identity.userId, identity.sessionId)
    queryClient.setQueryData(queryKey, null)
    publishWorkbookDraftSignal({
      type,
      userId: identity.userId,
      sessionId: identity.sessionId,
      senderId: senderId.current,
    })
    await queryClient.invalidateQueries({
      queryKey: draftQueryKeys.summaries(identity.userId),
    })
  }, [identity.sessionId, identity.userId, queryClient, queryKey])

  return {
    draft: draftQuery.data ?? null,
    isHydrated: draftQuery.isFetched,
    isLoading: draftQuery.isLoading,
    error: draftQuery.error,
    updateCell,
    beginSave,
    markSaveError,
    applyReconciliation,
    acknowledgeSave,
    resolveConflict,
    clear,
    flush: persist,
  }
}

export function useWorkbookDraftSummaries({
  userId,
  completeSessionIds,
}: {
  userId: string
  completeSessionIds?: ReadonlySet<string>
}): {
  summaries: Record<string, WorkbookDraftSummary>
  isLoading: boolean
  clearSession: (sessionId: string) => Promise<void>
} {
  const queryClient = useQueryClient()
  const senderId = React.useRef(createClientUuid())
  const queryKey = React.useMemo(() => draftQueryKeys.summaries(userId), [userId])
  const summariesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      await cleanupWorkbookDrafts({
        userId,
        ...(completeSessionIds ? { existingSessionIds: completeSessionIds } : {}),
      })
      return listWorkbookDraftSummaries(userId)
    },
    staleTime: Infinity,
    refetchOnMount: "always",
  })

  React.useEffect(() => subscribeWorkbookDraftSignals((signal) => {
    if (signal.senderId === senderId.current || signal.userId !== userId) return
    void queryClient.invalidateQueries({ queryKey })
  }), [queryClient, queryKey, userId])

  const clearSession = React.useCallback(async (sessionId: string) => {
    await deleteWorkbookDraft(userId, sessionId)
    publishWorkbookDraftSignal({
      type: "cleared",
      userId,
      sessionId,
      senderId: senderId.current,
    })
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey, userId])

  return {
    summaries: summariesQuery.data ?? {},
    isLoading: summariesQuery.isLoading,
    clearSession,
  }
}

export { workbookDraftKey }
