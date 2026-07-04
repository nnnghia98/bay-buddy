"use client"

import * as React from "react"
import {
  CalendarClock,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { MetricCard, StatusChip, TableScrollArea } from "@/components/command-center"
import { RestrictedAccessPanel } from "@/components/operations-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetchData } from "@/lib/api"
import { buildApiUrl, getClientApiBaseUrl } from "@/lib/api-base"
import { expireStoredSession, getActiveStoredToken } from "@/lib/auth-storage"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import type { UserRead } from "@/schemas"

type DataCenterClientProps = {
  currentUser: UserRead
}

type OperationKey = "backup" | "add" | "remove"
type TableKey =
  | "customers"
  | "tickets"
  | "transactions"
  | "invoices"
  | "quotes"
  | "users"

const operationKeys: OperationKey[] = ["backup", "add", "remove"]
const tableKeys: TableKey[] = [
  "customers",
  "tickets",
  "transactions",
  "invoices",
  "quotes",
  "users",
]
const defaultSelectedTableKeys: TableKey[] = ["tickets", "transactions", "quotes"]
const wipeConfirmation = "WIPE DATABASE"
const API_BASE_URL = getClientApiBaseUrl()

type DataCenterPreviewTable = {
  key: TableKey
  label: string
  file_name: string
  date_field: string | null
  count: number
  scope: string
}

type DataCenterPreviewResponse = {
  scope: {
    date_from: string | null
    date_to: string | null
  }
  tables: DataCenterPreviewTable[]
}

type DataCenterWipeResponse = {
  deleted: Record<string, number>
}

type BaseDateTimeSettingsResponse = {
  base_datetime: string | null
  updated_at: string
}

function formatDateTimeScope(value: string): string {
  if (!value) {
    return ""
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return ""
  }

  return value.slice(0, 16)
}

function OperationIcon({ operation }: { operation: OperationKey }) {
  const iconClassName = "h-4 w-4"

  if (operation === "backup") {
    return <Download className={iconClassName} aria-hidden="true" />
  }

  if (operation === "add") {
    return <Plus className={iconClassName} aria-hidden="true" />
  }

  if (operation === "remove") {
    return <Trash2 className={iconClassName} aria-hidden="true" />
  }

  return null
}

function buildDataCenterScopeParams(
  fromDateTime: string,
  toDateTime: string,
  selectedTables: readonly TableKey[],
): URLSearchParams {
  const params = new URLSearchParams()
  if (fromDateTime) {
    params.set("date_from", fromDateTime)
  }
  if (toDateTime) {
    params.set("date_to", toDateTime)
  }
  if (selectedTables.length > 0) {
    params.set("tables", selectedTables.join(","))
  }
  return params
}

function getScopedPath(
  path: string,
  fromDateTime: string,
  toDateTime: string,
  selectedTables: readonly TableKey[],
): string {
  const params = buildDataCenterScopeParams(fromDateTime, toDateTime, selectedTables)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function RestrictedDataCenter() {
  const t = useI18n()

  return (
    <RestrictedAccessPanel
      title={t("dataCenter.restricted.title")}
      description={t("dataCenter.restricted.description")}
    />
  )
}

export function DataCenterClient({ currentUser }: DataCenterClientProps) {
  const t = useI18n()
  const [confirmationValue, setConfirmationValue] = React.useState("")
  const [fromDateTime, setFromDateTime] = React.useState("")
  const [toDateTime, setToDateTime] = React.useState("")
  const [baseDateTime, setBaseDateTime] = React.useState("")
  const [selectedTableKeys, setSelectedTableKeys] =
    React.useState<TableKey[]>(defaultSelectedTableKeys)
  const [previewTables, setPreviewTables] = React.useState<DataCenterPreviewTable[] | null>(null)
  const [isLoadingBaseDateTime, setIsLoadingBaseDateTime] = React.useState(false)
  const [isSavingBaseDateTime, setIsSavingBaseDateTime] = React.useState(false)
  const [isQueryingPreview, setIsQueryingPreview] = React.useState(false)
  const [isBackingUp, setIsBackingUp] = React.useState(false)
  const [isWiping, setIsWiping] = React.useState(false)
  const isWipeConfirmed = confirmationValue === wipeConfirmation
  const hasDateTimeScope = Boolean(fromDateTime || toDateTime)
  const hasSelectedTables = selectedTableKeys.length > 0
  const allTablesSelected = selectedTableKeys.length === tableKeys.length
  const selectedTableKeySet = new Set(selectedTableKeys)
  const dateTimeScopeLabel = hasDateTimeScope
    ? [
        fromDateTime
          ? `${t("dataCenter.range.fromShort")} ${formatDateTimeScope(fromDateTime)}`
          : t("dataCenter.range.fromAll"),
        toDateTime
          ? `${t("dataCenter.range.toShort")} ${formatDateTimeScope(toDateTime)}`
          : t("dataCenter.range.toAll"),
      ].join(" • ")
    : t("dataCenter.range.allValue")

  React.useEffect(() => {
    let isMounted = true

    const loadBaseDateTime = async () => {
      setIsLoadingBaseDateTime(true)
      try {
        const payload = await apiFetchData<BaseDateTimeSettingsResponse>(
          "/settings/base-date-time",
        )
        if (isMounted) {
          setBaseDateTime(toDateTimeLocalValue(payload.base_datetime))
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t("dataCenter.baseDateTime.loadFailure")
        toast.error(message)
      } finally {
        if (isMounted) {
          setIsLoadingBaseDateTime(false)
        }
      }
    }

    void loadBaseDateTime()

    return () => {
      isMounted = false
    }
  }, [t])

  if (currentUser.role !== "ADMIN") {
    return <RestrictedDataCenter />
  }

  const previewCountByTable = new Map(
    previewTables?.map((table) => [table.key, table.count]) ?? [],
  )

  const setAllTablesSelected = (isSelected: boolean) => {
    setSelectedTableKeys(isSelected ? tableKeys : [])
    setPreviewTables(null)
  }

  const toggleTableSelection = (tableKey: TableKey) => {
    setSelectedTableKeys((currentTableKeys) => {
      if (currentTableKeys.includes(tableKey)) {
        return currentTableKeys.filter((currentTableKey) => currentTableKey !== tableKey)
      }

      return [...currentTableKeys, tableKey]
    })
    setPreviewTables(null)
  }

  const saveBaseDateTime = async () => {
    setIsSavingBaseDateTime(true)
    try {
      const payload = await apiFetchData<BaseDateTimeSettingsResponse>(
        "/settings/base-date-time",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            base_datetime: baseDateTime || null,
          }),
        },
      )
      setBaseDateTime(toDateTimeLocalValue(payload.base_datetime))
      toast.success(t("dataCenter.baseDateTime.saveSuccess"))
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("dataCenter.baseDateTime.saveFailure")
      toast.error(message)
    } finally {
      setIsSavingBaseDateTime(false)
    }
  }

  const querySelectedData = async () => {
    if (!hasSelectedTables) {
      toast.error(t("dataCenter.actions.noTableSelected"))
      return
    }

    setIsQueryingPreview(true)
    try {
      const payload = await apiFetchData<DataCenterPreviewResponse>(
        getScopedPath(
          "/data-center/preview",
          fromDateTime,
          toDateTime,
          selectedTableKeys,
        ),
      )
      setPreviewTables(payload.tables)
      toast.success(t("dataCenter.preview.querySuccess"))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("dataCenter.preview.queryFailure")
      toast.error(message)
    } finally {
      setIsQueryingPreview(false)
    }
  }

  const backupSelectedData = async () => {
    if (!hasSelectedTables) {
      toast.error(t("dataCenter.actions.noTableSelected"))
      return
    }

    const token = getActiveStoredToken()
    if (!token) {
      toast.error(t("dataCenter.actions.missingAuth"))
      return
    }

    setIsBackingUp(true)
    try {
      const response = await fetch(
        buildApiUrl(
          getScopedPath(
            "/data-center/backup",
            fromDateTime,
            toDateTime,
            selectedTableKeys,
          ),
          API_BASE_URL,
        ),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.status === 401) {
        expireStoredSession("unauthorized")
        return
      }

      if (!response.ok) {
        throw new Error(t("dataCenter.actions.backupFailure"))
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = "bay-buddy-backup.zip"
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success(t("dataCenter.actions.backupSuccess"))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("dataCenter.actions.backupFailure")
      toast.error(message)
    } finally {
      setIsBackingUp(false)
    }
  }

  const wipeSelectedData = async () => {
    if (!hasSelectedTables) {
      toast.error(t("dataCenter.actions.noTableSelected"))
      return
    }

    setIsWiping(true)
    try {
      const payload = await apiFetchData<DataCenterWipeResponse>("/data-center/wipe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: confirmationValue,
          date_from: fromDateTime || null,
          date_to: toDateTime || null,
          tables: selectedTableKeys,
        }),
      })

      const deletedTotal = Object.values(payload.deleted).reduce(
        (total, count) => total + count,
        0,
      )
      setPreviewTables(null)
      setConfirmationValue("")
      toast.success(t("dataCenter.actions.wipeSuccess", { count: deletedTotal }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("dataCenter.actions.wipeFailure")
      toast.error(message)
    } finally {
      setIsWiping(false)
    }
  }

  return (
    <div className="space-y-4 pb-12 text-foreground">
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="space-y-4 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-accent text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Database className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("dataCenter.eyebrow")}
                </p>
                <StatusChip tone="warning">{t("dataCenter.reviewOnly")}</StatusChip>
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-foreground">
                {t("dataCenter.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("dataCenter.description")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard
              icon={Database}
              label={t("dataCenter.metrics.tables")}
              value={t("dataCenter.metrics.selectedTables", {
                count: selectedTableKeys.length,
                total: tableKeys.length,
              })}
            />
            <MetricCard
              icon={FileSpreadsheet}
              label={t("dataCenter.metrics.backup")}
              value={t("dataCenter.metrics.backupValue")}
            />
            <MetricCard
              icon={ShieldCheck}
              label={t("dataCenter.metrics.access")}
              value={t("dataCenter.metrics.accessValue")}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/45 px-5 py-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("dataCenter.baseDateTime.eyebrow")}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("dataCenter.baseDateTime.description")}
            </p>
          </div>
          <StatusChip tone={baseDateTime ? "info" : "neutral"}>
            {baseDateTime
              ? formatDateTimeScope(baseDateTime)
              : t("dataCenter.range.allValue")}
          </StatusChip>
        </div>
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto_auto] lg:items-end xl:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="data-center-base-date-time">
              {t("dataCenter.baseDateTime.label")}
            </Label>
            <Input
              disabled={isLoadingBaseDateTime}
              id="data-center-base-date-time"
              onChange={(event) => setBaseDateTime(event.target.value)}
              type="datetime-local"
              value={baseDateTime}
            />
          </div>
          <Button
            className="w-full lg:w-auto"
            disabled={isLoadingBaseDateTime || isSavingBaseDateTime || !baseDateTime}
            onClick={() => setBaseDateTime("")}
            type="button"
            variant="outline"
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {t("dataCenter.baseDateTime.clear")}
          </Button>
          <Button
            className="w-full lg:w-auto"
            disabled={isLoadingBaseDateTime || isSavingBaseDateTime}
            onClick={() => void saveBaseDateTime()}
            type="button"
          >
            {isSavingBaseDateTime ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {isSavingBaseDateTime
              ? t("dataCenter.baseDateTime.saving")
              : t("dataCenter.baseDateTime.save")}
          </Button>
        </div>
        <div className="border-t border-border bg-secondary/35 px-5 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {t("dataCenter.baseDateTime.hint")}
          </p>
        </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-border bg-secondary/45 px-5 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("dataCenter.range.eyebrow")}
          </p>
          <StatusChip tone={hasDateTimeScope ? "info" : "neutral"}>
            {dateTimeScopeLabel}
          </StatusChip>
        </div>
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end xl:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="data-center-from">
              {t("dataCenter.range.fromLabel")}
            </Label>
            <Input
              id="data-center-from"
              onChange={(event) => setFromDateTime(event.target.value)}
              type="datetime-local"
              value={fromDateTime}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-center-to">
              {t("dataCenter.range.toLabel")}
            </Label>
            <Input
              id="data-center-to"
              min={fromDateTime || undefined}
              onChange={(event) => setToDateTime(event.target.value)}
              type="datetime-local"
              value={toDateTime}
            />
          </div>
          <Button
            className="w-full lg:w-auto"
            disabled={!hasDateTimeScope}
            onClick={() => {
              setFromDateTime("")
              setToDateTime("")
            }}
            type="button"
            variant="outline"
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {t("dataCenter.range.reset")}
          </Button>
        </div>
        <div className="border-t border-border bg-secondary/35 px-5 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {t("dataCenter.range.hint")}
          </p>
        </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/45 px-5 py-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("dataCenter.preview.eyebrow")}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("dataCenter.preview.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <StatusChip tone={hasSelectedTables ? "info" : "warning"}>
              {t("dataCenter.preview.selectedCount", {
                count: selectedTableKeys.length,
                total: tableKeys.length,
              })}
            </StatusChip>
            <StatusChip tone={hasDateTimeScope ? "info" : "neutral"}>
              {dateTimeScopeLabel}
            </StatusChip>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/30 px-5 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {t("dataCenter.preview.selectionHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setAllTablesSelected(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("dataCenter.preview.selectAll")}
            </Button>
            <Button
              disabled={!hasSelectedTables}
              onClick={() => setAllTablesSelected(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("dataCenter.preview.clearSelection")}
            </Button>
          </div>
        </div>
        <TableScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-12 px-5">
                  <input
                    aria-label={t("dataCenter.preview.selectAll")}
                    checked={allTablesSelected}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    onChange={(event) => setAllTablesSelected(event.target.checked)}
                    type="checkbox"
                  />
                </TableHead>
                <TableHead className="px-5">{t("dataCenter.preview.columns.table")}</TableHead>
                <TableHead className="px-5">{t("dataCenter.preview.columns.scope")}</TableHead>
                <TableHead className="px-5">{t("dataCenter.preview.columns.records")}</TableHead>
                <TableHead className="px-5 text-right">
                  {t("dataCenter.preview.columns.intent")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableKeys.map((tableKey) => {
                const isSelected = selectedTableKeySet.has(tableKey)

                return (
                <TableRow
                  className={cn(
                    "transition-colors duration-200 hover:bg-accent/20",
                    !isSelected && "bg-secondary/20 opacity-65",
                  )}
                  key={tableKey}
                >
                  <TableCell className="px-5 py-3.5">
                    <input
                      aria-label={t("dataCenter.preview.selectTableAria", {
                        table: t(`dataCenter.tables.items.${tableKey}.label`),
                      })}
                      checked={isSelected}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      onChange={() => toggleTableSelection(tableKey)}
                      type="checkbox"
                    />
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-accent text-primary">
                        <Database className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t(`dataCenter.tables.items.${tableKey}.label`)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t(`dataCenter.tables.items.${tableKey}.file`)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-sm text-muted-foreground">
                    {isSelected ? dateTimeScopeLabel : t("dataCenter.preview.notSelected")}
                  </TableCell>
                  <TableCell className="px-5 py-3.5">
                    {!isSelected ? (
                      <StatusChip tone="neutral">
                        {t("dataCenter.preview.notSelected")}
                      </StatusChip>
                    ) : previewCountByTable.has(tableKey) ? (
                      <span className="text-sm font-semibold text-foreground">
                        {previewCountByTable.get(tableKey)}
                      </span>
                    ) : (
                      <StatusChip tone="warning">
                        {t("dataCenter.preview.pendingCount")}
                      </StatusChip>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      {isSelected ? (
                        <>
                          <StatusChip tone="info">{t("dataCenter.preview.backupIntent")}</StatusChip>
                          <StatusChip tone="danger">{t("dataCenter.preview.wipeIntent")}</StatusChip>
                        </>
                      ) : (
                        <StatusChip tone="neutral">
                          {t("dataCenter.preview.notSelected")}
                        </StatusChip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableScrollArea>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/35 px-5 py-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {t("dataCenter.preview.hint")}
          </p>
          <Button
            disabled={isQueryingPreview || !hasSelectedTables}
            onClick={() => void querySelectedData()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Database className="h-4 w-4" aria-hidden="true" />
            {isQueryingPreview
              ? t("dataCenter.preview.queryPending")
              : t("dataCenter.preview.queryAction")}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {operationKeys.map((operation) => {
          const isDestructive = operation === "remove"

          return (
            <div
              className={cn(
                "overflow-hidden rounded-xl border bg-white p-5 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--shadow-md)]",
                isDestructive ? "border-rose-200" : "border-border",
              )}
              key={operation}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border",
                  isDestructive
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-primary/10 bg-accent text-primary",
                )}
              >
                <OperationIcon operation={operation} />
              </div>
              <h2 className="mt-3.5 text-sm font-semibold text-foreground">
                {t(`dataCenter.operations.${operation}.title`)}
              </h2>
              <p className="mt-1 min-h-12 text-sm leading-6 text-muted-foreground">
                {t(`dataCenter.operations.${operation}.description`)}
              </p>
              <Button
                className={cn(
                  "mt-4 w-full",
                  isDestructive && "bg-red-600 hover:bg-red-700",
                )}
                disabled={
                  operation === "add" ||
                  operation === "remove" ||
                  !hasSelectedTables ||
                  isBackingUp ||
                  isWiping
                }
                onClick={() => {
                  if (operation === "backup") {
                    void backupSelectedData()
                  }
                }}
                size="sm"
                type="button"
                variant={isDestructive ? "default" : "outline"}
              >
                {operation === "backup"
                  ? isBackingUp
                    ? t("dataCenter.actions.backupPending")
                    : t("dataCenter.actions.backupAction")
                  : t("dataCenter.connectLater")}
              </Button>
            </div>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between border-b border-rose-200 bg-rose-50/70 px-5 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
            {t("dataCenter.danger.eyebrow")}
          </p>
          <StatusChip tone="danger">{t("dataCenter.danger.locked")}</StatusChip>
        </div>
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_360px]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t("dataCenter.danger.title")}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("dataCenter.danger.description")}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dataCenter.danger.scopeLabel")}: {dateTimeScopeLabel}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dataCenter.danger.tablesLabel")}:{" "}
                {t("dataCenter.metrics.selectedTables", {
                  count: selectedTableKeys.length,
                  total: tableKeys.length,
                })}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="wipe-confirmation">
                {t("dataCenter.danger.confirmLabel")}
              </Label>
              <Input
                autoComplete="off"
                id="wipe-confirmation"
                onChange={(event) => setConfirmationValue(event.target.value)}
                value={confirmationValue}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {t("dataCenter.danger.confirmHint")}
              </p>
            </div>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={!isWipeConfirmed || isWiping || !hasSelectedTables}
              onClick={() => void wipeSelectedData()}
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {isWiping
                ? t("dataCenter.actions.wipePending")
                : isWipeConfirmed
                  ? t("dataCenter.danger.confirmedAction")
                  : t("dataCenter.danger.disabledAction")}
            </Button>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{t("dataCenter.danger.importNote")}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
