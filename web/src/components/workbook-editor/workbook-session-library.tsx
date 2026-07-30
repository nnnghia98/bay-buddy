"use client"

import patterns from "@/styles/ui-patterns.module.css"

import { Card } from "@astryxdesign/core/Card"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowRight,
  Eraser,
  FileSpreadsheet,
  History,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { SessionRenameDialog } from "@/components/workbook-editor/session-rename-dialog"
import { StatusChip } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/locales/client"
import {
  discardWorkbookSession,
  fetchWorkbookSessions,
  renameWorkbookSession,
} from "@/lib/workbooks/client"
import { useWorkbookDraftSummaries } from "@/lib/workbooks/use-workbook-draft"
import {
  workbookQueryKeys,
  type WorkbookSessionListQuery,
} from "@/lib/workbooks/query-keys"
import type {
  WorkbookSessionList,
  WorkbookSessionSummary,
} from "@/schemas/workbook"
import styles from "./workbook-session-library.module.css"

export type WorkbookSessionLocalState = "dirty" | "saving" | "conflict"

const PAGE_SIZE = 10

const updatedAtFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function replaceToken(template: string, token: string, value: string): string {
  return template.replace(`{${token}}`, value)
}

function replaceSessionInPages(
  current: WorkbookSessionList | undefined,
  updated: WorkbookSessionSummary,
): WorkbookSessionList | undefined {
  if (!current) return current
  return {
    ...current,
    items: current.items.map((item) => (item.id === updated.id ? updated : item)),
  }
}

function removeSessionFromPages(
  current: WorkbookSessionList | undefined,
  sessionId: string,
): WorkbookSessionList | undefined {
  if (!current || !current.items.some((item) => item.id === sessionId)) return current
  const total = Math.max(0, current.pagination.total - 1)
  return {
    items: current.items.filter((item) => item.id !== sessionId),
    pagination: {
      ...current.pagination,
      total,
      total_pages: total ? Math.ceil(total / current.pagination.page_size) : 0,
    },
  }
}

export function WorkbookSessionLibrary({
  initialData,
  userId,
  localStateBySessionId,
}: {
  initialData: WorkbookSessionList
  userId: string
  localStateBySessionId?: Partial<Record<string, WorkbookSessionLocalState>>
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useI18n()
  const text = React.useCallback((key: string) => t(key as never), [t])
  const [page, setPage] = React.useState(1)
  const [renamingSession, setRenamingSession] = React.useState<WorkbookSessionSummary>()
  const [feedback, setFeedback] = React.useState<string>()
  const [renameError, setRenameError] = React.useState<string>()
  const completeSessionIds = React.useMemo(
    () => initialData.pagination.total === initialData.items.length
      ? new Set(initialData.items.map((session) => session.id))
      : undefined,
    [initialData],
  )
  const draftSummaries = useWorkbookDraftSummaries({ userId, completeSessionIds })
  const effectiveLocalState = localStateBySessionId ?? Object.fromEntries(
    Object.entries(draftSummaries.summaries).map(([sessionId, summary]) => [
      sessionId,
      summary.status,
    ]),
  )

  const query: WorkbookSessionListQuery = {
    page,
    pageSize: PAGE_SIZE,
  }
  const sessionsQuery = useQuery({
    queryKey: workbookQueryKeys.sessions(query),
    queryFn: () => fetchWorkbookSessions(query),
    initialData:
      page === 1
        ? initialData
        : undefined,
    placeholderData: (previous) => previous,
    refetchOnMount: false,
  })

  const renameMutation = useMutation({
    mutationFn: ({ sessionId, displayName }: { sessionId: string; displayName: string }) =>
      renameWorkbookSession(sessionId, { display_name: displayName }),
    onSuccess: (updated) => {
      queryClient.setQueriesData<WorkbookSessionList>(
        { queryKey: workbookQueryKeys.sessionsRoot() },
        (current) => replaceSessionInPages(current, updated),
      )
      setRenamingSession(undefined)
      setRenameError(undefined)
      setFeedback(text("workbookEditor.library.renameSuccess"))
      void queryClient.invalidateQueries({ queryKey: workbookQueryKeys.sessionsRoot() })
    },
    onError: () => {
      setRenameError(text("workbookEditor.library.renameError"))
    },
  })

  const discardMutation = useMutation({
    mutationFn: discardWorkbookSession,
    onSuccess: (discarded) => {
      const nextTotal = Math.max(0, data.pagination.total - 1)
      const nextTotalPages = nextTotal ? Math.ceil(nextTotal / PAGE_SIZE) : 0
      void draftSummaries.clearSession(discarded.id)
      queryClient.setQueriesData<WorkbookSessionList>(
        { queryKey: workbookQueryKeys.sessionsRoot() },
        (current) => removeSessionFromPages(current, discarded.id),
      )
      setPage((current) => Math.min(current, Math.max(nextTotalPages, 1)))
      setFeedback(text("workbookEditor.library.deleteSuccess"))
      void queryClient.invalidateQueries({ queryKey: workbookQueryKeys.sessionsRoot() })
    },
    onError: () => {
      setFeedback(text("workbookEditor.library.deleteError"))
    },
  })

  const data = sessionsQuery.data ?? initialData
  const totalPages = data.pagination.total_pages

  return (
    <Card
      aria-label={text("workbookEditor.library.title")}
      aria-busy={sessionsQuery.isFetching}
      className={styles.library}
      padding={0}
    >
      <div className={styles.header}>
        <div className={styles.headerIdentity}>
          <span className={styles.headerIcon}>
            <History aria-hidden="true" className={patterns.iconSmall} />
          </span>
          <h2 className={styles.title}>
            {text("workbookEditor.library.title")}
          </h2>
        </div>
        <span className={styles.total}>
          {replaceToken(
            text("workbookEditor.library.pagination.total"),
            "total",
            String(data.pagination.total),
          )}
        </span>
      </div>

      {feedback ? (
        <div aria-live="polite" className={styles.feedback}>
          {feedback}
        </div>
      ) : null}

      {sessionsQuery.isError ? (
        <div className={styles.errorState} role="alert">
          <AlertTriangle aria-hidden="true" className={styles.errorIcon} />
          <p className={patterns.mutedText}>
            {text("workbookEditor.library.loadError")}
          </p>
          <Button onClick={() => void sessionsQuery.refetch()} size="sm" type="button" variant="outline">
            {text("workbookEditor.library.retry")}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <FileSpreadsheet aria-hidden="true" className={patterns.iconSmall} />
            </span>
            <p className={styles.emptyTitle}>{text("workbookEditor.library.emptyTitle")}</p>
            <p className={styles.emptyDescription}>
              {text("workbookEditor.library.emptyDescription")}
            </p>
          </div>
          {data.pagination.total > 0 ? (
            <div className={styles.emptyPagination}>
              <Button
                disabled={page <= 1 || sessionsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                type="button"
                variant="outline"
              >
                {text("workbookEditor.library.pagination.previous")}
              </Button>
              <span>
                {replaceToken(
                  replaceToken(text("workbookEditor.library.pagination.page"), "page", String(page)),
                  "total",
                  String(Math.max(totalPages, 1)),
                )}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text("workbookEditor.library.columns.name")}</TableHead>
                <TableHead>{text("workbookEditor.library.columns.updated")}</TableHead>
                <TableHead className={styles.tableActionsHeader}>{text("workbookEditor.library.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((session) => {
                const localState = effectiveLocalState[session.id]
                const active = session.status === "DRAFT"
                return (
                  <TableRow key={session.id}>
                    <TableCell className={styles.sessionCell}>
                      <div className={styles.sessionIdentity}>
                        <span className={styles.sessionIcon}>
                          <FileSpreadsheet aria-hidden="true" className={patterns.iconCompact} />
                        </span>
                        <div className={patterns.minWidthZero}>
                          <p className={styles.sessionName} title={session.display_name}>
                            {session.display_name}
                          </p>
                          <p className={styles.sessionSubtitle}>
                            {session.original_filename} / {session.selected_sheet_name}
                          </p>
                          {localState ? (
                            <div className={styles.localStatus}>
                              <StatusChip tone={localState === "conflict" ? "danger" : "warning"}>
                                {text(`workbookEditor.library.localStatuses.${localState}`)}
                              </StatusChip>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={styles.updatedCell}>
                      {updatedAtFormatter.format(new Date(session.updated_at))}
                    </TableCell>
                    <TableCell>
                      <div className={styles.actions}>
                        <Button
                          aria-label={text("workbookEditor.library.actions.open")}
                          onClick={() => router.push(`/workbook-editor-v2/sessions/${session.id}`)}
                          size="icon"
                          title={text("workbookEditor.library.actions.open")}
                          type="button"
                          variant="ghost"
                        >
                          <ArrowRight aria-hidden="true" className={patterns.iconSmall} />
                        </Button>
                        {localState ? (
                          <Button
                            aria-label={text("workbookEditor.library.actions.clearLocal")}
                            onClick={() => {
                              const prompt = replaceToken(
                                text("workbookEditor.library.clearLocalConfirm"),
                                "name",
                                session.display_name,
                              )
                              if (window.confirm(prompt)) {
                                void draftSummaries.clearSession(session.id).then(() => {
                                  setFeedback(text("workbookEditor.library.clearLocalSuccess"))
                                })
                              }
                            }}
                            size="icon"
                            title={text("workbookEditor.library.actions.clearLocal")}
                            type="button"
                            variant="ghost"
                          >
                            <Eraser aria-hidden="true" className={patterns.iconSmall} />
                          </Button>
                        ) : null}
                        {active ? (
                          <>
                            <Button
                              aria-label={text("workbookEditor.library.actions.rename")}
                              onClick={() => {
                                setFeedback(undefined)
                                setRenameError(undefined)
                                setRenamingSession(session)
                              }}
                              size="icon"
                              title={text("workbookEditor.library.actions.rename")}
                              type="button"
                              variant="ghost"
                            >
                              <Pencil aria-hidden="true" className={patterns.iconSmall} />
                            </Button>
                            <Button
                              aria-label={text("workbookEditor.library.actions.delete")}
                              disabled={discardMutation.isPending}
                              onClick={() => {
                                const prompt = replaceToken(
                                  text("workbookEditor.library.deleteConfirm"),
                                  "name",
                                  session.display_name,
                                )
                                if (window.confirm(prompt)) {
                                  setFeedback(undefined)
                                  discardMutation.mutate(session.id)
                                }
                              }}
                              size="icon"
                              title={text("workbookEditor.library.actions.delete")}
                              type="button"
                              variant="destructive"
                            >
                              {discardMutation.isPending && discardMutation.variables === session.id ? (
                                <LoaderCircle
                                  aria-hidden="true"
                                  className={`${patterns.iconSmall} ${patterns.spinner}`}
                                />
                              ) : (
                                <Trash2 aria-hidden="true" className={patterns.iconSmall} />
                              )}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className={styles.pagination}>
            <span>
              {replaceToken(
                text("workbookEditor.library.pagination.total"),
                "total",
                String(data.pagination.total),
              )}
            </span>
            <div className={patterns.row}>
              <Button
                disabled={page <= 1 || sessionsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                type="button"
                variant="outline"
              >
                {text("workbookEditor.library.pagination.previous")}
              </Button>
              <span>
                {replaceToken(
                  replaceToken(
                    text("workbookEditor.library.pagination.page"),
                    "page",
                    String(page),
                  ),
                  "total",
                  String(Math.max(totalPages, 1)),
                )}
              </span>
              <Button
                disabled={page >= totalPages || sessionsQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
                size="sm"
                type="button"
                variant="outline"
              >
                {text("workbookEditor.library.pagination.next")}
              </Button>
            </div>
          </div>
        </>
      )}

      {sessionsQuery.isFetching && !sessionsQuery.isError ? (
        <div className={styles.loading}>
          <LoaderCircle aria-hidden="true" className={`${patterns.iconCompact} ${patterns.spinner}`} />
          {text("workbookEditor.library.loading")}
        </div>
      ) : null}

      {renamingSession ? (
        <SessionRenameDialog
          error={renameError}
          key={renamingSession.id}
          onOpenChange={(open) => {
            if (!open && !renameMutation.isPending) {
              setRenamingSession(undefined)
              setRenameError(undefined)
            }
          }}
          onSubmit={(displayName) =>
            renameMutation.mutate({ sessionId: renamingSession.id, displayName })
          }
          open
          pending={renameMutation.isPending}
          session={renamingSession}
        />
      ) : null}
    </Card>
  )
}
