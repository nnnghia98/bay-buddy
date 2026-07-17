"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowRight,
  Eraser,
  History,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { SessionRenameDialog } from "@/components/workbook-editor/session-rename-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import type {
  WorkbookSessionList,
  WorkbookSessionSummary,
} from "@/schemas/workbook"

export type WorkbookSessionLocalState = "dirty" | "saving" | "conflict"

const PAGE_SIZE = 10
const filterStatuses = ["DRAFT", "COMPLETED", "FAILED"] as const

const statusTone: Record<WorkbookSessionSummary["status"], string> = {
  DRAFT: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  DISCARDED: "border-border bg-secondary text-muted-foreground",
}

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
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<"" | WorkbookSessionSummary["status"]>("")
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
    search: search || undefined,
    status: status || undefined,
  }
  const sessionsQuery = useQuery({
    queryKey: workbookQueryKeys.sessions(query),
    queryFn: () => fetchWorkbookSessions(query),
    initialData:
      page === 1 && !search && !status
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
      void draftSummaries.clearSession(discarded.id)
      queryClient.setQueriesData<WorkbookSessionList>(
        { queryKey: workbookQueryKeys.sessionsRoot() },
        (current) => removeSessionFromPages(current, discarded.id),
      )
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
    <section
      aria-labelledby="workbook-library-title"
      className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
    >
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <History aria-hidden="true" className="size-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
              {text("workbookEditor.library.eyebrow")}
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]" id="workbook-library-title">
            {text("workbookEditor.library.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {text("workbookEditor.library.description")}
          </p>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setSearch(searchInput.trim())
          }}
        >
          <label className="sr-only" htmlFor="workbook-session-search">
            {text("workbookEditor.library.searchLabel")}
          </label>
          <Input
            className="h-9 min-w-64"
            id="workbook-session-search"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={text("workbookEditor.library.searchPlaceholder")}
            type="search"
            value={searchInput}
          />
          <label className="sr-only" htmlFor="workbook-session-status">
            {text("workbookEditor.library.statusLabel")}
          </label>
          <select
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            id="workbook-session-status"
            onChange={(event) => {
              setPage(1)
              setStatus(event.target.value as typeof status)
            }}
            value={status}
          >
            <option value="">{text("workbookEditor.library.statusAll")}</option>
            {filterStatuses.map((value) => (
              <option key={value} value={value}>
                {text(`workbookEditor.library.statuses.${value}`)}
              </option>
            ))}
          </select>
          <Button className="h-9" type="submit" variant="outline">
            <Search aria-hidden="true" className="size-4" />
            {text("workbookEditor.library.searchAction")}
          </Button>
        </form>
      </div>

      {feedback ? (
        <div aria-live="polite" className="border-b border-border bg-secondary/30 px-5 py-2 text-sm">
          {feedback}
        </div>
      ) : null}

      {sessionsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
          <AlertTriangle aria-hidden="true" className="size-6 text-rose-600" />
          <p className="text-sm text-muted-foreground">
            {text("workbookEditor.library.loadError")}
          </p>
          <Button onClick={() => void sessionsQuery.refetch()} size="sm" type="button" variant="outline">
            {text("workbookEditor.library.retry")}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <History aria-hidden="true" className="mx-auto size-7 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">{text("workbookEditor.library.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {text("workbookEditor.library.emptyDescription")}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text("workbookEditor.library.columns.name")}</TableHead>
                <TableHead>{text("workbookEditor.library.columns.sheet")}</TableHead>
                <TableHead>{text("workbookEditor.library.columns.updated")}</TableHead>
                <TableHead>{text("workbookEditor.library.columns.version")}</TableHead>
                <TableHead>{text("workbookEditor.library.columns.status")}</TableHead>
                <TableHead className="text-right">{text("workbookEditor.library.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((session) => {
                const localState = effectiveLocalState[session.id]
                const active = session.status === "DRAFT"
                return (
                  <TableRow key={session.id}>
                    <TableCell className="min-w-56">
                      <p className="font-semibold" title={session.display_name}>
                        {session.display_name}
                      </p>
                      <p className="mt-0.5 max-w-72 truncate text-xs text-muted-foreground" title={session.original_filename}>
                        {session.original_filename}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-36 text-muted-foreground">
                      {session.selected_sheet_name}
                    </TableCell>
                    <TableCell className="min-w-44 text-muted-foreground">
                      {updatedAtFormatter.format(new Date(session.updated_at))}
                    </TableCell>
                    <TableCell className="font-medium">
                      {replaceToken(
                        text("workbookEditor.library.version"),
                        "version",
                        String(session.current_version),
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                            statusTone[session.status],
                          )}
                        >
                          {text(`workbookEditor.library.statuses.${session.status}`)}
                        </span>
                        {localState ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            {text(`workbookEditor.library.localStatuses.${localState}`)}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          onClick={() => router.push(`/workbook-editor-v2/sessions/${session.id}`)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ArrowRight aria-hidden="true" className="size-3.5" />
                          {text("workbookEditor.library.actions.open")}
                        </Button>
                        {localState ? (
                          <Button
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
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Eraser aria-hidden="true" className="size-3.5" />
                            {text("workbookEditor.library.actions.clearLocal")}
                          </Button>
                        ) : null}
                        {active ? (
                          <>
                            <Button
                              onClick={() => {
                                setFeedback(undefined)
                                setRenameError(undefined)
                                setRenamingSession(session)
                              }}
                              size="sm"
                              type="button"
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              <Pencil aria-hidden="true" className="size-3.5" />
                              {text("workbookEditor.library.actions.rename")}
                            </Button>
                            <Button
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
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              {discardMutation.isPending && discardMutation.variables === session.id ? (
                                <LoaderCircle
                                  aria-hidden="true"
                                  className="size-3.5 animate-spin motion-reduce:animate-none"
                                />
                              ) : (
                                <Trash2 aria-hidden="true" className="size-3.5" />
                              )}
                              {text("workbookEditor.library.actions.delete")}
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
          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {replaceToken(
                text("workbookEditor.library.pagination.total"),
                "total",
                String(data.pagination.total),
              )}
            </span>
            <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 border-t border-border px-5 py-2 text-xs text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
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
    </section>
  )
}
