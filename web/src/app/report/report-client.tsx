"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Search } from "lucide-react"

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
import {
  buildReportWorkbookBytes,
  createXlsxBlob,
  getMonthlyDebtReportFilename,
  type ReportWorkbookCell,
} from "@/lib/report-export"
import type { LedgerReportRow } from "@/lib/server-report"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import styles from "./report.module.css"

type LedgerReportClientProps = {
  initialFrom: string
  initialTo: string
  rows: LedgerReportRow[]
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

  return row.transaction_method ?? ""
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
}

function getRowSearchText(row: LedgerReportRow): string {
  return normalizeSearch(
    [
      row.customer_name,
      row.customer_phone,
      row.passenger_names,
      row.content,
      row.pnr,
      row.ticket_number,
      row.airline,
      row.route,
      row.ticket_status,
      getRowPaymentMethod(row),
      row.linked_payment_note,
      row.booked_at ? formatDate(row.booked_at) : "",
      formatDate(row.created_at),
      row.ticket_selling_price,
      row.ticket_discount,
      row.ticket_ev_price,
      row.ticket_ast_price,
      row.ticket_thf_price,
      row.ticket_web_price,
      row.ticket_insurance_price,
      row.ticket_true_income,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  )
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
): ReportWorkbookCell {
  const value = column.getValue(row, index)

  return column.align === "right"
    ? Number(value)
    : formatCellValue(row, column.key, index)
}

async function downloadExcelPreview(
  rows: LedgerReportRow[],
  selectedColumns: ColumnDefinition[],
  labels: Record<ColumnKey, string>,
): Promise<void> {
  const workbookRows = rows.map((row, index) =>
    selectedColumns.map((column) => getWorkbookCellValue(row, column, index)),
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

type ReportRowsResponse = {
  rows: LedgerReportRow[]
}

type ReportSummary = {
  rows: number
  customers: number
  totalSellingPrice: number
  totalIncome: number
}

function getReportSummary(rows: LedgerReportRow[]): ReportSummary {
  return {
    rows: rows.length,
    customers: new Set(rows.map((row) => row.customer_id)).size,
    totalSellingPrice: rows.reduce(
      (sum, row) => sum + row.ticket_selling_price,
      0,
    ),
    totalIncome: rows.reduce((sum, row) => sum + row.ticket_true_income, 0),
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
  rows,
}: LedgerReportClientProps) {
  const t = useI18n()
  const router = useRouter()
  const [reportRows, setReportRows] = React.useState(rows)
  const [fromValue, setFromValue] = React.useState(initialFrom)
  const [toValue, setToValue] = React.useState(initialTo)
  const [appliedFrom, setAppliedFrom] = React.useState(initialFrom)
  const [appliedTo, setAppliedTo] = React.useState(initialTo)
  const [searchValue, setSearchValue] = React.useState("")
  const [tableView, setTableView] = React.useState<TableView>("summary")
  const [isApplying, setIsApplying] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [filterError, setFilterError] = React.useState<string | null>(null)
  const [exportError, setExportError] = React.useState<string | null>(null)

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
  const filteredRows = React.useMemo(() => {
    const normalizedQuery = normalizeSearch(searchValue)

    if (!normalizedQuery) {
      return reportRows
    }

    return reportRows.filter((row) =>
      getRowSearchText(row).includes(normalizedQuery),
    )
  }, [reportRows, searchValue])
  const summary = React.useMemo(
    () => getReportSummary(filteredRows),
    [filteredRows],
  )
  const scopeLabel =
    appliedFrom || appliedTo
      ? t("report.metrics.scopeFiltered")
      : t("report.metrics.scopeAll")

  React.useEffect(() => {
    setReportRows(rows)
    setFromValue(initialFrom)
    setToValue(initialTo)
    setAppliedFrom(initialFrom)
    setAppliedTo(initialTo)
  }, [initialFrom, initialTo, rows])

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

      const params = new URLSearchParams()
      if (fromValue) {
        params.set("from", fromValue)
      }
      if (toValue) {
        params.set("to", toValue)
      }

      const query = params.toString()
      const response = await fetch(`/report/data${query ? `?${query}` : ""}`, {
        cache: "no-store",
      })

      if (response.status === 401) {
        expireStoredSession("unauthorized")
        router.replace(SESSION_EXPIRED_LOGIN_PATH)
        return
      }

      if (!response.ok) {
        throw new Error("Unable to refresh report rows.")
      }

      const payload = (await response.json()) as ReportRowsResponse
      setReportRows(payload.rows)
      setAppliedFrom(fromValue)
      setAppliedTo(toValue)
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
      await downloadExcelPreview(filteredRows, visibleColumns, columnLabels)
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
              disabled={isExporting || filteredRows.length === 0}
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
              {filteredRows.length === 0 ? (
                <TableStateRow
                  colSpan={visibleColumns.length}
                  message={
                    reportRows.length === 0
                      ? t("report.empty")
                      : t("report.searchEmpty")
                  }
                />
              ) : (
                filteredRows.map((row, rowIndex) => (
                  <TableRow key={row.id}>
                    {visibleColumns.map((column) => {
                      const value = formatCellValue(row, column.key, rowIndex)

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
      </section>
    </div>
  )
}
