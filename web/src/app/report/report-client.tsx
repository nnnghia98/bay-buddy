"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Loader2 } from "lucide-react"

import { StatusChip, TableScrollArea } from "@/components/command-center"
import { Button } from "@/components/ui/button"
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
import type { LedgerReportRow } from "@/lib/server-report"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

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
  { key: "customer_code", getValue: (row) => `#${row.customer_id.slice(0, 8)}` },
  { key: "customer_name", getValue: (row) => row.customer_name },
  { key: "customer_phone", getValue: (row) => row.customer_phone ?? "" },
  { key: "entry_type", getValue: (row) => row.entry_type },
  { key: "issued_at", getValue: (row) => row.issued_at },
  { key: "created_at", getValue: (row) => row.created_at },
  { key: "description", getValue: (row) => row.customer_name },
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
  "customer_code",
  "issued_at",
  "pnr",
  "description",
  "selling_price",
  "discount",
  "ev_price",
  "ast_price",
  "thf_price",
  "web_price",
  "true_income",
  "debt",
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatCellValue(
  row: LedgerReportRow,
  key: ColumnKey,
  index: number,
): string {
  if (key === "issued_at") {
    return formatDateTime(row.issued_at)
  }

  if (key === "created_at") {
    return formatDateTime(row.created_at)
  }

  if (key === "flight_date" && row.flight_date) {
    return formatDateTime(row.flight_date)
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

  if (key === "true_income") {
    return formatCurrency(row.ticket_true_income)
  }

  if (key === "running_balance") {
    return formatCurrency(row.running_balance)
  }

  return columns.find((column) => column.key === key)?.getValue(row, index) ?? ""
}

function downloadExcelPreview(
  rows: LedgerReportRow[],
  selectedColumns: ColumnDefinition[],
  labels: Record<ColumnKey, string>,
) {
  const header = selectedColumns
    .map((column) => `<th>${escapeHtml(labels[column.key])}</th>`)
    .join("")
  const body = rows
    .map((row, index) => {
      const cells = selectedColumns
        .map(
          (column) =>
            `<td>${escapeHtml(formatCellValue(row, column.key, index))}</td>`,
        )
        .join("")

      return `<tr>${cells}</tr>`
    })
    .join("")
  const html = `<!doctype html><html><head><meta charset="utf-8" /><style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th,td{border:1px solid #cfd8e3;padding:6px 8px;white-space:nowrap}th{background:#eef4fb;font-weight:700}</style></head><body><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "bay-buddy-ledger-report.xls"
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
    <div className="border-r border-border px-5 py-4 last:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-foreground">
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
  const [filterError, setFilterError] = React.useState<string | null>(null)
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

  return (
    <div className="space-y-4 pb-12 text-foreground">
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-3.5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("report.eyebrow")}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-foreground">
              {t("report.previewTitle")}
            </h1>
          </div>

          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end"
            onSubmit={handleApplyFilters}
          >
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor="report-from"
              >
                {t("report.filters.from")}
              </label>
              <input
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                id="report-from"
                name="from"
                onChange={(event) => setFromValue(event.target.value)}
                type="datetime-local"
                value={fromValue}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor="report-to"
              >
                {t("report.filters.to")}
              </label>
              <input
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                id="report-to"
                name="to"
                onChange={(event) => setToValue(event.target.value)}
                type="datetime-local"
                value={toValue}
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={isApplying}
              type="submit"
              variant="outline"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("report.filters.applying")}
                </>
              ) : (
                t("report.filters.apply")
              )}
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={reportRows.length === 0 || selectedColumns.length === 0}
              onClick={() => downloadExcelPreview(reportRows, selectedColumns, columnLabels)}
              type="button"
            >
              <Download className="h-4 w-4" />
              {t("report.exportAction")}
            </Button>
          </form>
        </div>

        {filterError ? (
          <p className="border-b border-border px-5 py-3 text-sm text-red-600" role="alert">
            {filterError}
          </p>
        ) : null}

        <div className="border-b border-border bg-secondary/20">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("report.metrics.summary")}
            </p>
            <span className="text-xs text-muted-foreground">{scopeLabel}</span>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
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
          <Table className="min-w-[760px] border-collapse">
            <TableHeader>
              <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                {selectedColumns.length === 0 ? (
                  <TableHead>{t("report.noColumns")}</TableHead>
                ) : (
                  selectedColumns.map((column) => (
                    <TableHead
                      className={cn(
                        "whitespace-nowrap border-r border-border px-5 py-3.5 font-semibold text-foreground last:border-r-0",
                        column.align === "right" && "text-right",
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
                <TableRow>
                  <TableCell
                    className="py-16 text-center text-sm text-muted-foreground"
                    colSpan={Math.max(selectedColumns.length, 1)}
                  >
                    {t("report.empty")}
                  </TableCell>
                </TableRow>
              ) : selectedColumns.length === 0 ? (
                <TableRow>
                  <TableCell className="py-16 text-center text-sm text-muted-foreground">
                    {t("report.noColumns")}
                  </TableCell>
                </TableRow>
              ) : (
                reportRows.map((row, rowIndex) => (
                  <TableRow className="hover:bg-accent/35" key={row.id}>
                    {selectedColumns.map((column) => {
                      const value = formatCellValue(row, column.key, rowIndex)
                      const isTicketLink =
                        column.key === "pnr" && row.ticket_id && value

                      return (
                        <TableCell
                          className={cn(
                            "whitespace-nowrap border-r border-border bg-white px-5 py-3.5 last:border-r-0",
                            column.align === "right" && "text-right font-semibold",
                          )}
                          key={`${row.id}-${column.key}`}
                        >
                          {column.key === "entry_type" ? (
                            <StatusChip tone={getEntryTone(row.entry_type)}>
                              {t(`report.entryTypes.${row.entry_type}`)}
                            </StatusChip>
                          ) : isTicketLink ? (
                            <Link
                              className="font-semibold text-primary hover:underline"
                              href={`/tickets/${row.ticket_id}`}
                            >
                              {value}
                            </Link>
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

      <details className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5">
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("report.columnsTitle")}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {selectedColumns.length}/{columns.length}
            </span>
          </span>
          <span className="text-sm font-medium text-primary">
            {t("report.columnsDescription")}
          </span>
        </summary>

        <div className="border-t border-border px-5 py-4">
          <div className="flex flex-wrap justify-end gap-2 pb-4">
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

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((column) => (
              <label
                className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-secondary/25 px-3 text-sm font-medium text-foreground"
                key={column.key}
              >
                <input
                  checked={selectedKeys.includes(column.key)}
                  className="h-4 w-4 accent-primary"
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
