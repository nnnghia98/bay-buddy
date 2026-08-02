"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
} from "lucide-react"

import { TableScrollArea } from "@/components/command-center"
import { TableStateRow } from "@/components/operations-ui"
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
import { expireStoredSession } from "@/lib/auth-storage"
import { SESSION_EXPIRED_LOGIN_PATH } from "@/lib/auth-token"
import { formatCurrency } from "@/lib/formatters"
import { paymentMethodOptions } from "@/schemas"
import {
  buildReportWorkbookBytes,
  createXlsxBlob,
  getMonthlyDebtReportFilename,
  type ReportWorkbookCell,
} from "@/lib/report-export"
import type {
  LedgerReportRow,
  TicketDebtReportPage,
} from "@/lib/server-report"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import styles from "./report.module.css"

type LedgerReportClientProps = {
  initialFrom: string
  initialTo: string
  initialPage: TicketDebtReportPage
}

type TableView = "summary" | "full"

type ColumnKey =
  | "order"
  | "created_at"
  | "booked_at"
  | "description"
  | "pnr"
  | "ticket_number"
  | "airline"
  | "route"
  | "flight_date"
  | "ticket_status"
  | "selling_price"
  | "discount"
  | "ev_price"
  | "ast_price"
  | "thf_price"
  | "web_price"
  | "insurance_price"
  | "true_income"
  | "payment_method"
  | "note"

type ColumnDefinition = {
  key: ColumnKey
  align?: "right"
  getValue: (row: LedgerReportRow, index: number) => string
}

const columns: ColumnDefinition[] = [
  {
    key: "order",
    align: "right",
    getValue: (_row, index) => (index + 1).toString(),
  },
  { key: "created_at", getValue: (row) => row.created_at },
  { key: "booked_at", getValue: (row) => row.booked_at ?? "" },
  {
    key: "description",
    getValue: (row) =>
      [row.passenger_names, row.customer_name].filter(Boolean).join(" · "),
  },
  { key: "pnr", getValue: (row) => row.pnr ?? "" },
  { key: "ticket_number", getValue: (row) => row.ticket_number ?? "" },
  { key: "airline", getValue: (row) => row.airline ?? "" },
  { key: "route", getValue: (row) => row.route ?? "" },
  { key: "flight_date", getValue: (row) => row.flight_date ?? "" },
  { key: "ticket_status", getValue: (row) => row.ticket_status ?? "" },
  {
    key: "selling_price",
    align: "right",
    getValue: (row) => row.ticket_selling_price.toString(),
  },
  {
    key: "discount",
    align: "right",
    getValue: (row) => row.ticket_discount.toString(),
  },
  {
    key: "ev_price",
    align: "right",
    getValue: (row) => row.ticket_ev_price.toString(),
  },
  {
    key: "ast_price",
    align: "right",
    getValue: (row) => row.ticket_ast_price.toString(),
  },
  {
    key: "thf_price",
    align: "right",
    getValue: (row) => row.ticket_thf_price.toString(),
  },
  {
    key: "web_price",
    align: "right",
    getValue: (row) => row.ticket_web_price.toString(),
  },
  {
    key: "insurance_price",
    align: "right",
    getValue: (row) => row.ticket_insurance_price.toString(),
  },
  {
    key: "true_income",
    align: "right",
    getValue: (row) => row.ticket_true_income.toString(),
  },
  {
    key: "payment_method",
    getValue: (row) => getRowPaymentMethod(row),
  },
  { key: "note", getValue: (row) => row.linked_payment_note ?? "" },
]

const summaryColumnKeys: ColumnKey[] = [
  "booked_at",
  "description",
  "selling_price",
  "true_income",
  "payment_method",
  "note",
]

const fullColumnKeys: ColumnKey[] = [
  "created_at",
  "booked_at",
  "description",
  "pnr",
  "ticket_number",
  "airline",
  "route",
  "flight_date",
  "ticket_status",
  "selling_price",
  "discount",
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "insurance_price",
  "true_income",
  "payment_method",
  "note",
]

const moneyColumnKeys = new Set<ColumnKey>([
  "selling_price",
  "discount",
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "insurance_price",
  "true_income",
])

function getRowPaymentMethod(row: LedgerReportRow): string {
  if (row.linked_payment_methods.length > 0) {
    return row.linked_payment_methods.join(", ")
  }

  return paymentMethodOptions.includes(
    row.transaction_method as (typeof paymentMethodOptions)[number],
  )
    ? row.transaction_method ?? ""
    : ""
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function parseDateFilter(value: string, boundary: "start" | "end"): Date | null {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  return boundary === "start"
    ? new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0))
    : new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999))
}

function formatCellValue(
  row: LedgerReportRow,
  key: ColumnKey,
  index: number,
): string {
  if (key === "order") {
    return (index + 1).toString()
  }

  if (key === "created_at") {
    return formatDate(row.created_at)
  }

  if (key === "booked_at" || key === "flight_date") {
    return row[key] ? formatDate(row[key]) : ""
  }

  if (moneyColumnKeys.has(key)) {
    const column = columns.find((item) => item.key === key)
    return column ? formatCurrency(Number(column.getValue(row, index))) : ""
  }

  return columns.find((column) => column.key === key)?.getValue(row, index) ?? ""
}

function getColumnsForView(tableView: TableView): ColumnDefinition[] {
  const keys = tableView === "summary" ? summaryColumnKeys : fullColumnKeys

  return keys.flatMap((key) => {
    const column = columns.find((item) => item.key === key)
    return column ? [column] : []
  })
}

function getWorkbookCellValue(
  row: LedgerReportRow,
  column: ColumnDefinition,
  index: number,
  unpaidLabel: string,
): ReportWorkbookCell {
  const value = column.getValue(row, index)

  if (column.key === "payment_method" && !value) {
    return unpaidLabel
  }

  return column.align === "right"
    ? Number(value)
    : formatCellValue(row, column.key, index)
}

async function downloadExcelPreview(
  rows: LedgerReportRow[],
  selectedColumns: ColumnDefinition[],
  labels: Record<ColumnKey, string>,
  unpaidLabel: string,
): Promise<void> {
  const workbookRows = rows.map((row, index) =>
    selectedColumns.map((column) =>
      getWorkbookCellValue(row, column, index, unpaidLabel),
    ),
  )
  const numericColumnIndexes = selectedColumns.flatMap((column, index) =>
    column.align === "right" ? [index] : [],
  )
  const bytes = await buildReportWorkbookBytes(
    selectedColumns.map((column) => labels[column.key]),
    workbookRows,
    numericColumnIndexes,
  )
  const blob = createXlsxBlob(bytes)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = getMonthlyDebtReportFilename()
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

type ReportSummary = {
  rows: number
  customers: number
  totalSellingPrice: number
  totalIncome: number
}

function mapReportSummary(
  summary: TicketDebtReportPage["summary"],
): ReportSummary {
  return {
    rows: summary.rows,
    customers: summary.customers,
    totalSellingPrice: summary.total_selling_price,
    totalIncome: summary.total_income,
  }
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className={styles.metric}>
      <p className={patterns.eyebrow}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
    </div>
  )
}

export function LedgerReportClient({
  initialFrom,
  initialTo,
  initialPage,
}: LedgerReportClientProps) {
  const t = useI18n()
  const router = useRouter()
  const [reportRows, setReportRows] = React.useState(initialPage.items)
  const [pagination, setPagination] = React.useState(initialPage.pagination)
  const [summary, setSummary] = React.useState<ReportSummary>(() =>
    mapReportSummary(initialPage.summary),
  )
  const [fromValue, setFromValue] = React.useState(initialFrom)
  const [toValue, setToValue] = React.useState(initialTo)
  const [appliedFrom, setAppliedFrom] = React.useState(initialFrom)
  const [appliedTo, setAppliedTo] = React.useState(initialTo)
  const [searchValue, setSearchValue] = React.useState("")
  const [appliedSearch, setAppliedSearch] = React.useState("")
  const [tableView, setTableView] = React.useState<TableView>("summary")
  const [isApplying, setIsApplying] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [filterError, setFilterError] = React.useState<string | null>(null)
  const [exportError, setExportError] = React.useState<string | null>(null)
  const unpaidPaymentLabel = t("report.paymentNotRecorded")

  const columnLabels = React.useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column.key,
          t(`report.columns.${column.key}`),
        ]),
      ) as Record<ColumnKey, string>,
    [t],
  )
  const visibleColumns = React.useMemo(
    () => getColumnsForView(tableView),
    [tableView],
  )
  const scopeLabel =
    appliedFrom || appliedTo
      ? t("report.metrics.scopeFiltered")
      : t("report.metrics.scopeAll")

  React.useEffect(() => {
    setReportRows(initialPage.items)
    setPagination(initialPage.pagination)
    setSummary(mapReportSummary(initialPage.summary))
    setFromValue(initialFrom)
    setToValue(initialTo)
    setAppliedFrom(initialFrom)
    setAppliedTo(initialTo)
    setAppliedSearch("")
    setSearchValue("")
  }, [initialFrom, initialPage, initialTo])

  const loadReportPage = React.useCallback(
    async ({
      from,
      page,
      q,
      to,
    }: {
      from: string
      page: number
      q: string
      to: string
    }) => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: "50",
      })
      if (from) {
        params.set("from", from)
      }
      if (to) {
        params.set("to", to)
      }
      if (q.trim()) {
        params.set("q", q.trim())
      }

      const response = await fetch(`/report/data?${params.toString()}`, {
        cache: "no-store",
      })

      if (response.status === 401) {
        expireStoredSession("unauthorized")
        router.replace(SESSION_EXPIRED_LOGIN_PATH)
        return null
      }

      if (!response.ok) {
        throw new Error("Unable to refresh report rows.")
      }

      const payload = (await response.json()) as TicketDebtReportPage
      setReportRows(payload.items)
      setPagination(payload.pagination)
      setSummary(mapReportSummary(payload.summary))
      return payload
    },
    [router],
  )

  const handleApplyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsApplying(true)
    setFilterError(null)

    try {
      const fromDate = parseDateFilter(fromValue, "start")
      const toDate = parseDateFilter(toValue, "end")

      if (fromDate && toDate && fromDate > toDate) {
        setFilterError(t("report.filters.invalidRange"))
        return
      }

      await loadReportPage({
        from: fromValue,
        page: 1,
        q: searchValue,
        to: toValue,
      })
      setAppliedFrom(fromValue)
      setAppliedTo(toValue)
      setAppliedSearch(searchValue)
    } catch {
      setFilterError(t("report.filters.failure"))
    } finally {
      setIsApplying(false)
    }
  }

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > pagination.total_pages || isApplying) {
      return
    }

    setIsApplying(true)
    setFilterError(null)

    try {
      await loadReportPage({
        from: appliedFrom,
        page,
        q: appliedSearch,
        to: appliedTo,
      })
    } catch {
      setFilterError(t("report.filters.failure"))
    } finally {
      setIsApplying(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const params = new URLSearchParams({ all: "1" })
      if (appliedFrom) {
        params.set("from", appliedFrom)
      }
      if (appliedTo) {
        params.set("to", appliedTo)
      }
      if (appliedSearch.trim()) {
        params.set("q", appliedSearch.trim())
      }

      const response = await fetch(`/report/data?${params.toString()}`, {
        cache: "no-store",
      })

      if (response.status === 401) {
        expireStoredSession("unauthorized")
        router.replace(SESSION_EXPIRED_LOGIN_PATH)
        return
      }

      if (!response.ok) {
        throw new Error("Unable to load report export rows.")
      }

      const payload = (await response.json()) as { rows: LedgerReportRow[] }
      await downloadExcelPreview(
        payload.rows,
        visibleColumns,
        columnLabels,
        unpaidPaymentLabel,
      )
    } catch {
      setExportError(t("report.exportFailure"))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`${patterns.page} ${patterns.sectionStack}`}>
      <section className={styles.report}>
        <div className={styles.header}>
          <div className={patterns.minWidthZero}>
            <p className={patterns.accentEyebrow}>{t("report.eyebrow")}</p>
            <h1 className={styles.title}>{t("report.title")}</h1>
            <p className={styles.description}>{t("report.description")}</p>
          </div>

          <form className={styles.filters} onSubmit={handleApplyFilters}>
            <div className={patterns.fieldStack}>
              <label className={patterns.eyebrow} htmlFor="report-from">
                {t("report.filters.from")}
              </label>
              <Input
                id="report-from"
                name="from"
                onChange={(event) => setFromValue(event.target.value)}
                type="date"
                value={fromValue}
              />
            </div>
            <div className={patterns.fieldStack}>
              <label className={patterns.eyebrow} htmlFor="report-to">
                {t("report.filters.to")}
              </label>
              <Input
                id="report-to"
                name="to"
                onChange={(event) => setToValue(event.target.value)}
                type="date"
                value={toValue}
              />
            </div>
            <div className={cn(patterns.fieldStack, styles.searchField)}>
              <label className={patterns.eyebrow} htmlFor="report-search">
                {t("report.filters.searchLabel")}
              </label>
              <div className={styles.searchInput}>
                <Search aria-hidden="true" className={styles.searchIcon} />
                <Input
                  aria-label={t("report.filters.searchLabel")}
                  id="report-search"
                  name="search"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={t("report.filters.searchPlaceholder")}
                  type="search"
                  value={searchValue}
                />
              </div>
            </div>
            <Button disabled={isApplying} type="submit" variant="outline">
              {isApplying ? (
                <>
                  <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
                  {t("report.filters.applying")}
                </>
              ) : (
                t("report.filters.apply")
              )}
            </Button>
            <Button
              disabled={isExporting || reportRows.length === 0}
              onClick={handleExport}
              type="button"
            >
              {isExporting ? (
                <>
                  <Loader2 className={`${patterns.iconSmall} ${patterns.spinner}`} />
                  {t("report.exporting")}
                </>
              ) : (
                <>
                  <Download className={patterns.iconSmall} />
                  {t("report.exportAction")}
                </>
              )}
            </Button>
          </form>
        </div>

        {filterError || exportError ? (
          <p className={styles.error} role="alert">
            {filterError ?? exportError}
          </p>
        ) : null}

        <div className={styles.summary}>
          <div className={styles.summaryHeader}>
            <div>
              <p className={patterns.accentEyebrow}>
                {t("report.metrics.summary")}
              </p>
              <span className={patterns.supportingText}>{scopeLabel}</span>
            </div>
            <span className={styles.resultCount}>
              {summary.rows} {t("report.table.results")}
            </span>
          </div>
          <div className={styles.metrics}>
            <SummaryMetric
              label={t("report.metrics.rows")}
              value={summary.rows.toLocaleString("vi-VN")}
            />
            <SummaryMetric
              label={t("report.metrics.customers")}
              value={summary.customers.toLocaleString("vi-VN")}
            />
            <SummaryMetric
              label={t("report.metrics.totalSellingPrice")}
              value={formatCurrency(summary.totalSellingPrice)}
            />
            <SummaryMetric
              label={t("report.metrics.totalIncome")}
              value={formatCurrency(summary.totalIncome)}
            />
          </div>
        </div>

        <div className={styles.tableToolbar}>
          <div>
            <p className={patterns.accentEyebrow}>
              {t("report.table.eyebrow")}
            </p>
            <p className={patterns.supportingText}>
              {t("report.table.description")}
            </p>
          </div>
          <div className={styles.viewControls}>
            <span className={patterns.eyebrow}>
              {t("report.table.view.label")}
            </span>
            <div aria-label={t("report.table.view.label")} className={styles.viewButtons} role="group">
              <Button
                aria-pressed={tableView === "summary"}
                onClick={() => setTableView("summary")}
                size="sm"
                type="button"
                variant={tableView === "summary" ? "default" : "outline"}
              >
                {t("report.table.view.summary")}
              </Button>
              <Button
                aria-pressed={tableView === "full"}
                onClick={() => setTableView("full")}
                size="sm"
                type="button"
                variant={tableView === "full" ? "default" : "outline"}
              >
                {t("report.table.view.full")}
              </Button>
            </div>
          </div>
        </div>

        <TableScrollArea>
          <Table
            aria-busy={isApplying}
            className={cn(
              styles.table,
              tableView === "full" && styles.fullTable,
            )}
          >
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    className={cn(
                      styles.tableHead,
                      column.align === "right" && styles.numericCell,
                    )}
                    key={column.key}
                  >
                    {columnLabels[column.key]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportRows.length === 0 ? (
                <TableStateRow
                  colSpan={visibleColumns.length}
                  message={
                    appliedSearch
                      ? t("report.searchEmpty")
                      : t("report.empty")
                  }
                />
              ) : (
                reportRows.map((row, rowIndex) => (
                  <TableRow key={row.id}>
                    {visibleColumns.map((column) => {
                      const rawValue = formatCellValue(row, column.key, rowIndex)
                      const value =
                        column.key === "payment_method" && !rawValue
                          ? unpaidPaymentLabel
                          : rawValue

                      return (
                        <TableCell
                          className={cn(
                            styles.tableCell,
                            column.align === "right" && styles.numericCell,
                            column.key === "note" && styles.noteCell,
                          )}
                          key={`${row.id}-${column.key}`}
                        >
                          {column.key === "description" ? (
                            <div className={styles.recordContext}>
                              <span className={styles.recordPrimary}>
                                {row.passenger_names || t("report.emptyValue")}
                              </span>
                              <span className={styles.recordSecondary}>
                                {row.customer_name}
                              </span>
                            </div>
                          ) : (
                            value
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableScrollArea>
        <div className={styles.pagination}>
          <span className={patterns.supportingText}>
            {t("report.table.pagination.page", {
              page: pagination.page,
              totalPages: pagination.total_pages,
            })}
          </span>
          <div className={styles.paginationControls}>
            <Button
              aria-label={t("report.table.pagination.previous")}
              disabled={isApplying || pagination.page <= 1}
              onClick={() => void handlePageChange(pagination.page - 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft className={patterns.iconSmall} />
              {t("report.table.pagination.previous")}
            </Button>
            <Button
              aria-label={t("report.table.pagination.next")}
              disabled={isApplying || !pagination.has_next}
              onClick={() => void handlePageChange(pagination.page + 1)}
              size="sm"
              type="button"
              variant="outline"
            >
              {t("report.table.pagination.next")}
              <ChevronRight className={patterns.iconSmall} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
