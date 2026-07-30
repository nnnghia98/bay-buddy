"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { Card } from "@astryxdesign/core/Card"
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput"
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

import {
  MetricCard,
  Panel,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import { IconBadge, RestrictedAccessPanel } from "@/components/operations-ui"
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
import styles from "./data-center.module.css"

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
  if (operation === "backup") {
    return <Download className={patterns.iconSmall} aria-hidden="true" />
  }

  if (operation === "add") {
    return <Plus className={patterns.iconSmall} aria-hidden="true" />
  }

  if (operation === "remove") {
    return <Trash2 className={patterns.iconSmall} aria-hidden="true" />
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
    <div className={patterns.pageStack}>
      <header className={styles.pageHeader}>
        <div className={patterns.wrapRow}>
          <p className={patterns.accentEyebrow}>
            {t("dataCenter.eyebrow")}
          </p>
          <StatusChip tone="warning">{t("dataCenter.reviewOnly")}</StatusChip>
        </div>
        <div>
          <h1 className={styles.title}>{t("dataCenter.title")}</h1>
          <p className={styles.description}>{t("dataCenter.description")}</p>
        </div>
      </header>

      <div className={patterns.threeColumnGrid}>
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

      <div className={styles.twoPanelGrid}>
        <Panel className={styles.panel}>
          <div className={styles.panelHeader}>
          <div>
            <p className={patterns.accentEyebrow}>
              {t("dataCenter.baseDateTime.eyebrow")}
            </p>
            <p className={patterns.mutedText}>
              {t("dataCenter.baseDateTime.description")}
            </p>
          </div>
          <StatusChip tone={baseDateTime ? "info" : "neutral"}>
            {baseDateTime
              ? formatDateTimeScope(baseDateTime)
              : t("dataCenter.range.allValue")}
          </StatusChip>
        </div>
        <div className={styles.panelBody}>
          <div className={patterns.fieldStack}>
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
            disabled={isLoadingBaseDateTime || isSavingBaseDateTime || !baseDateTime}
            onClick={() => setBaseDateTime("")}
            type="button"
            variant="outline"
          >
            <CalendarClock className={patterns.iconSmall} aria-hidden="true" />
            {t("dataCenter.baseDateTime.clear")}
          </Button>
          <Button
            disabled={isLoadingBaseDateTime || isSavingBaseDateTime}
            onClick={() => void saveBaseDateTime()}
            type="button"
          >
            {isSavingBaseDateTime ? (
              <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} aria-hidden="true" />
            ) : (
              <Save className={patterns.iconSmall} aria-hidden="true" />
            )}
            {isSavingBaseDateTime
              ? t("dataCenter.baseDateTime.saving")
              : t("dataCenter.baseDateTime.save")}
          </Button>
        </div>
        <div className={styles.panelFooter}>
          <p className={patterns.supportingText}>
            {t("dataCenter.baseDateTime.hint")}
          </p>
        </div>
        </Panel>

        <Panel className={styles.panel}>
          <div className={styles.panelHeader}>
          <p className={patterns.accentEyebrow}>
            {t("dataCenter.range.eyebrow")}
          </p>
          <StatusChip tone={hasDateTimeScope ? "info" : "neutral"}>
            {dateTimeScopeLabel}
          </StatusChip>
        </div>
        <div className={cn(styles.panelBody, styles.rangeBody)}>
          <div className={patterns.fieldStack}>
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
          <div className={patterns.fieldStack}>
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
            disabled={!hasDateTimeScope}
            onClick={() => {
              setFromDateTime("")
              setToDateTime("")
            }}
            type="button"
            variant="outline"
          >
            <CalendarClock className={patterns.iconSmall} aria-hidden="true" />
            {t("dataCenter.range.reset")}
          </Button>
        </div>
        <div className={styles.panelFooter}>
          <p className={patterns.supportingText}>
            {t("dataCenter.range.hint")}
          </p>
        </div>
        </Panel>
      </div>

      <Panel className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={patterns.accentEyebrow}>
              {t("dataCenter.preview.eyebrow")}
            </p>
            <p className={patterns.mutedText}>
              {t("dataCenter.preview.description")}
            </p>
          </div>
          <div className={patterns.endRow}>
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
        <div className={styles.selectionBar}>
          <p className={patterns.supportingText}>
            {t("dataCenter.preview.selectionHint")}
          </p>
          <div className={patterns.wrapRow}>
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
              <TableRow>
                <TableHead className={styles.checkboxColumn}>
                  <CheckboxInput
                    isLabelHidden
                    label={t("dataCenter.preview.selectAll")}
                    onChange={setAllTablesSelected}
                    size="sm"
                    value={
                      allTablesSelected
                        ? true
                        : selectedTableKeys.length > 0
                          ? "indeterminate"
                          : false
                    }
                  />
                </TableHead>
                <TableHead>{t("dataCenter.preview.columns.table")}</TableHead>
                <TableHead>{t("dataCenter.preview.columns.scope")}</TableHead>
                <TableHead>{t("dataCenter.preview.columns.records")}</TableHead>
                <TableHead className={styles.intentColumn}>
                  {t("dataCenter.preview.columns.intent")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableKeys.map((tableKey) => {
                const isSelected = selectedTableKeySet.has(tableKey)

                return (
                <TableRow
                  className={!isSelected ? styles.unselectedRow : undefined}
                  key={tableKey}
                >
                  <TableCell>
                    <CheckboxInput
                      isLabelHidden
                      label={t("dataCenter.preview.selectTableAria", {
                        table: t(`dataCenter.tables.items.${tableKey}.label`),
                      })}
                      onChange={() => toggleTableSelection(tableKey)}
                      size="sm"
                      value={isSelected}
                    />
                  </TableCell>
                  <TableCell>
                    <div className={patterns.row}>
                      <IconBadge icon={Database} />
                      <div>
                        <p className={patterns.labelText}>
                          {t(`dataCenter.tables.items.${tableKey}.label`)}
                        </p>
                        <p className={styles.fileName}>
                          {t(`dataCenter.tables.items.${tableKey}.file`)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={styles.scopeText}>
                    {isSelected ? dateTimeScopeLabel : t("dataCenter.preview.notSelected")}
                  </TableCell>
                  <TableCell>
                    {!isSelected ? (
                      <StatusChip tone="neutral">
                        {t("dataCenter.preview.notSelected")}
                      </StatusChip>
                    ) : previewCountByTable.has(tableKey) ? (
                      <span className={patterns.sectionTitle}>
                        {previewCountByTable.get(tableKey)}
                      </span>
                    ) : (
                      <StatusChip tone="warning">
                        {t("dataCenter.preview.pendingCount")}
                      </StatusChip>
                    )}
                  </TableCell>
                  <TableCell className={styles.intentColumn}>
                    <div className={patterns.endRow}>
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
        <div className={styles.panelFooter}>
          <p className={patterns.supportingText}>
            {t("dataCenter.preview.hint")}
          </p>
          <Button
            disabled={isQueryingPreview || !hasSelectedTables}
            onClick={() => void querySelectedData()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Database className={patterns.iconSmall} aria-hidden="true" />
            {isQueryingPreview
              ? t("dataCenter.preview.queryPending")
              : t("dataCenter.preview.queryAction")}
          </Button>
        </div>
      </Panel>

      <div className={styles.operationGrid}>
        {operationKeys.map((operation) => {
          const isDestructive = operation === "remove"

          return (
            <Card
              key={operation}
              padding={5}
              variant={isDestructive ? "red" : "default"}
            >
              <div className={styles.operationIcon}>
                <OperationIcon operation={operation} />
              </div>
              <h2 className={styles.operationTitle}>
                {t(`dataCenter.operations.${operation}.title`)}
              </h2>
              <p className={styles.operationDescription}>
                {t(`dataCenter.operations.${operation}.description`)}
              </p>
              <Button
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
                variant={isDestructive ? "destructive" : "outline"}
                width="100%"
              >
                {operation === "backup"
                  ? isBackingUp
                    ? t("dataCenter.actions.backupPending")
                    : t("dataCenter.actions.backupAction")
                  : t("dataCenter.connectLater")}
              </Button>
            </Card>
          )
        })}
      </div>

      <Card padding={0} variant="red">
        <div className={styles.dangerHeader}>
          <p className={patterns.eyebrow}>
            {t("dataCenter.danger.eyebrow")}
          </p>
          <StatusChip tone="danger">{t("dataCenter.danger.locked")}</StatusChip>
        </div>
        <div className={styles.dangerBody}>
          <div className={patterns.rowStart}>
            <IconBadge icon={ShieldAlert} />
            <div>
              <h2 className={styles.dangerTitle}>
                {t("dataCenter.danger.title")}
              </h2>
              <p className={cn(patterns.mutedText, styles.dangerDescription)}>
                {t("dataCenter.danger.description")}
              </p>
              <div className={styles.dangerScopes}>
                <StatusChip tone="danger">
                  {`${t("dataCenter.danger.scopeLabel")}: ${dateTimeScopeLabel}`}
                </StatusChip>
                <StatusChip tone="danger">
                  {`${t("dataCenter.danger.tablesLabel")}: ${t(
                    "dataCenter.metrics.selectedTables",
                    {
                      count: selectedTableKeys.length,
                      total: tableKeys.length,
                    },
                  )}`}
                </StatusChip>
              </div>
            </div>
          </div>
          <div className={patterns.stack}>
            <div className={patterns.fieldStack}>
              <Label htmlFor="wipe-confirmation">
                {t("dataCenter.danger.confirmLabel")}
              </Label>
              <Input
                autoComplete="off"
                id="wipe-confirmation"
                onChange={(event) => setConfirmationValue(event.target.value)}
                value={confirmationValue}
              />
              <p className={patterns.supportingText}>
                {t("dataCenter.danger.confirmHint")}
              </p>
            </div>
            <Button
              disabled={!isWipeConfirmed || isWiping || !hasSelectedTables}
              onClick={() => void wipeSelectedData()}
              type="button"
              variant="destructive"
              width="100%"
            >
              <Trash2 className={patterns.iconSmall} aria-hidden="true" />
              {isWiping
                ? t("dataCenter.actions.wipePending")
                : isWipeConfirmed
                  ? t("dataCenter.danger.confirmedAction")
                  : t("dataCenter.danger.disabledAction")}
            </Button>
            <div className={styles.dangerNote}>
              <Upload
                className={cn(patterns.iconSmall, styles.dangerNoteIcon)}
                aria-hidden="true"
              />
              <span>{t("dataCenter.danger.importNote")}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
