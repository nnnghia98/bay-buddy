"use client"

import patterns from "@/styles/ui-patterns.module.css"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2 } from "lucide-react"

import { StatusChip, TableScrollArea } from "@/components/command-center"
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

type ColumnKey =
  | "order"
  | "customer_code"
  | "customer_name"
  | "customer_phone"
  | "entry_type"
  | "issued_at"
  | "booked_at"
  | "created_at"
  | "description"
  | "content"
  | "amount"
  | "paid"
  | "outcome"
  | "debt"
  | "running_balance"
  | "pnr"
  | "ticket_number"
  | "selling_price"
  | "discount"
  | "ev_price"
  | "ast_price"
  | "thf_price"
  | "web_price"
  | "insurance_price"
  | "true_income"
  | "airline"
  | "route"
  | "flight_date"
  | "ticket_status"
  | "transaction_category"
  | "transaction_method"
  | "evidence_url"

type ColumnDefinition = {
  key: ColumnKey
  align?: "left" | "right"
  getValue: (row: LedgerReportRow, index: number) => string
}

const columns: ColumnDefinition[] = [
  {
    key: "order",
    align: "right",
    getValue: (_row, index) => (index + 1).toString(),
  },
  { key: "booked_at", getValue: (row) => row.booked_at ?? "" },
  { key: "customer_code", getValue: (row) => `#${row.customer_id.slice(0, 8)}` },
  { key: "customer_name", getValue: (row) => row.customer_name },
  { key: "customer_phone", getValue: (row) => row.customer_phone ?? "" },
  { key: "entry_type", getValue: (row) => row.entry_type },
  { key: "issued_at", getValue: (row) => row.issued_at },
  { key: "created_at", getValue: (row) => row.created_at },
  { key: "description", getValue: (row) => row.passenger_names },
  { key: "content", getValue: (row) => row.content },
  {
    key: "amount",
    align: "right",
    getValue: (row) => row.amount.toString(),
  },
  {
    key: "paid",
    align: "right",
    getValue: (row) =>
      row.transaction_category === "PAYMENT"
        ? Math.abs(row.amount).toString()
        : "0",
  },
  {
    key: "outcome",
    align: "right",
    getValue: (row) => (row.amount > 0 ? row.amount : 0).toString(),
  },
  {
    key: "debt",
    align: "right",
    getValue: (row) => row.running_balance.toString(),
  },
  {
    key: "running_balance",
    align: "right",
    getValue: (row) => row.running_balance.toString(),
  },
  { key: "pnr", getValue: (row) => row.pnr ?? "" },
  { key: "ticket_number", getValue: (row) => row.ticket_number ?? "" },
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
  { key: "airline", getValue: (row) => row.airline ?? "" },
  { key: "route", getValue: (row) => row.route ?? "" },
  { key: "flight_date", getValue: (row) => row.flight_date ?? "" },
  { key: "ticket_status", getValue: (row) => row.ticket_status ?? "" },
  {
    key: "transaction_category",
    getValue: (row) => row.transaction_category ?? "",
  },
  {
    key: "transaction_method",
    getValue: (row) => row.transaction_method ?? "",
  },
  { key: "evidence_url", getValue: (row) => row.evidence_url ?? "" },
]

const defaultColumnKeys: ColumnKey[] = [
  "order",
  "booked_at",
  "customer_name",
  "description",
  "debt",
  "selling_price",
  "discount",
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "insurance_price",
  "true_income",
]

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
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
  if (key === "issued_at") {
    return formatDate(row.issued_at)
  }

  if (key === "booked_at") {
    return row.booked_at ? formatDate(row.booked_at) : ""
  }

  if (key === "created_at") {
    return formatDate(row.created_at)
  }

  if (key === "flight_date" && row.flight_date) {
    return formatDate(row.flight_date)
  }

  if (key === "amount") {
    return formatCurrency(row.amount)
  }

  if (key === "paid") {
    return row.transaction_category === "PAYMENT"
      ? formatCurrency(Math.abs(row.amount))
      : formatCurrency(0)
  }

  if (key === "outcome") {
    return row.amount > 0 ? formatCurrency(row.amount) : ""
  }

  if (key === "debt") {
    return formatCurrency(row.running_balance)
  }

  if (key === "selling_price") {
    return row.ticket_selling_price > 0
      ? formatCurrency(row.ticket_selling_price)
      : formatCurrency(0)
  }

  if (key === "discount") {
    return row.ticket_discount > 0
      ? formatCurrency(row.ticket_discount)
      : formatCurrency(0)
  }

  if (key === "ev_price") {
    return formatCurrency(row.ticket_ev_price)
  }

  if (key === "ast_price") {
    return formatCurrency(row.ticket_ast_price)
  }

  if (key === "thf_price") {
    return formatCurrency(row.ticket_thf_price)
  }

  if (key === "web_price") {
    return formatCurrency(row.ticket_web_price)
  }

  if (key === "insurance_price") {
    return formatCurrency(row.ticket_insurance_price)
  }

  if (key === "true_income") {
    return formatCurrency(row.ticket_true_income)
  }

  if (key === "running_balance") {
    return formatCurrency(row.running_balance)
  }

  return columns.find((column) => column.key === key)?.getValue(row, index) ?? ""
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

function getEntryTone(
  entryType: LedgerReportRow["entry_type"],
): "neutral" | "info" | "warning" {
  if (entryType === "ticket") return "warning"
  if (entryType === "adjustment") return "neutral"
  return "info"
}

type ReportRowsResponse = {
  rows: LedgerReportRow[]
}

type ReportSummary = {
  totalSellingPrice: number
  totalPaid: number
  totalIncome: number
  totalDebt: number
}

function getReportSummary(rows: LedgerReportRow[]): ReportSummary {
  const latestBalanceByCustomer = new Map<
    string,
    { issuedAt: number; balance: number }
  >()

  for (const row of rows) {
    const issuedAt = new Date(row.issued_at).getTime()
    const current = latestBalanceByCustomer.get(row.customer_id)

    if (!current || issuedAt > current.issuedAt) {
      latestBalanceByCustomer.set(row.customer_id, {
        issuedAt,
        balance: row.running_balance,
      })
    }
  }

  return {
    totalSellingPrice: rows.reduce(
      (sum, row) => sum + row.ticket_selling_price,
      0,
    ),
    totalPaid: rows.reduce(
      (sum, row) =>
        row.transaction_category === "PAYMENT"
          ? sum + Math.abs(row.amount)
          : sum,
      0,
    ),
    totalIncome: rows.reduce((sum, row) => sum + row.ticket_true_income, 0),
    totalDebt: Array.from(latestBalanceByCustomer.values()).reduce(
      (sum, item) => sum + item.balance,
      0,
    ),
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
      <p className={patterns.eyebrow}>
        {label}
      </p>
      <p className={styles.metricValue}>
        {value}
      </p>
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
  const [isApplying, setIsApplying] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [filterError, setFilterError] = React.useState<string | null>(null)
  const [exportError, setExportError] = React.useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = React.useState<ColumnKey[]>(
    defaultColumnKeys,
  )
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
  const selectedColumns = React.useMemo(
    () => columns.filter((column) => selectedKeys.includes(column.key)),
    [selectedKeys],
  )
  const summary = React.useMemo(
    () => getReportSummary(reportRows),
    [reportRows],
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

  const toggleColumn = (key: ColumnKey) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((currentKey) => currentKey !== key)
        : [...current, key],
    )
  }

  const handleApplyFilters = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsApplying(true)
    setFilterError(null)

    try {
      const fromDate = parseDateFilter(fromValue, "start")
      const toDate = parseDateFilter(toValue, "start")

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
      await downloadExcelPreview(reportRows, selectedColumns, columnLabels)
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
            <p className={patterns.accentEyebrow}>
              {t("report.eyebrow")}
            </p>
            <h1 className={styles.title}>
              {t("report.previewTitle")}
            </h1>
          </div>

          <form
            className={styles.filters}
            onSubmit={handleApplyFilters}
          >
            <div className={patterns.fieldStack}>
              <label
                className={patterns.eyebrow}
                htmlFor="report-from"
              >
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
              <label
                className={patterns.eyebrow}
                htmlFor="report-to"
              >
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
            <Button
              disabled={isApplying}
              type="submit"
              variant="outline"
            >
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
              disabled={
                isExporting ||
                reportRows.length === 0 ||
                selectedColumns.length === 0
              }
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
            <p className={patterns.accentEyebrow}>
              {t("report.metrics.summary")}
            </p>
            <span className={patterns.supportingText}>{scopeLabel}</span>
          </div>
          <div className={styles.metrics}>
            <SummaryMetric
              label={t("report.metrics.totalSellingPrice")}
              value={formatCurrency(summary.totalSellingPrice)}
            />
            <SummaryMetric
              label={t("report.metrics.totalPaid")}
              value={formatCurrency(summary.totalPaid)}
            />
            <SummaryMetric
              label={t("report.metrics.totalIncome")}
              value={formatCurrency(summary.totalIncome)}
            />
            <SummaryMetric
              label={t("report.metrics.totalDebt")}
              value={formatCurrency(summary.totalDebt)}
            />
          </div>
        </div>

        <TableScrollArea>
          <Table className={styles.table}>
            <TableHeader>
              <TableRow>
                {selectedColumns.length === 0 ? (
                  <TableHead>{t("report.noColumns")}</TableHead>
                ) : (
                  selectedColumns.map((column) => (
                    <TableHead
                      className={cn(
                        styles.tableHead,
                      )}
                      key={column.key}
                    >
                      {columnLabels[column.key]}
                    </TableHead>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportRows.length === 0 ? (
                <TableStateRow
                  colSpan={Math.max(selectedColumns.length, 1)}
                  message={t("report.empty")}
                />
              ) : selectedColumns.length === 0 ? (
                <TableStateRow colSpan={1} message={t("report.noColumns")} />
              ) : (
                reportRows.map((row, rowIndex) => (
                  <TableRow key={row.id}>
                    {selectedColumns.map((column) => {
                      const value = formatCellValue(row, column.key, rowIndex)

                      return (
                        <TableCell
                          className={cn(
                            styles.tableCell,
                            column.align === "right" && styles.numericCell,
                          )}
                          key={`${row.id}-${column.key}`}
                        >
                          {column.key === "entry_type" ? (
                            <StatusChip tone={getEntryTone(row.entry_type)}>
                              {t(`report.entryTypes.${row.entry_type}`)}
                            </StatusChip>
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

      <details className={styles.columnPicker}>
        <summary className={styles.columnSummary}>
          <span>
            <span className={patterns.accentEyebrow}>
              {t("report.columnsTitle")}
            </span>
            <span className={styles.columnCount}>
              {selectedColumns.length}/{columns.length}
            </span>
          </span>
          <span className={styles.columnDescription}>
            {t("report.columnsDescription")}
          </span>
        </summary>

        <div className={styles.columnContent}>
          <div className={styles.columnActions}>
            <Button
              onClick={() => setSelectedKeys(columns.map((column) => column.key))}
              type="button"
              variant="outline"
            >
              {t("report.selectAll")}
            </Button>
            <Button
              onClick={() => setSelectedKeys([])}
              type="button"
              variant="outline"
            >
              {t("report.clearSelection")}
            </Button>
          </div>

          <div className={styles.columnGrid}>
            {columns.map((column) => (
              <label
                className={styles.columnOption}
                key={column.key}
              >
                <input
                  checked={selectedKeys.includes(column.key)}
                  className={styles.checkbox}
                  onChange={() => toggleColumn(column.key)}
                  type="checkbox"
                />
                <span>{columnLabels[column.key]}</span>
              </label>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}
