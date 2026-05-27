"use client"

import Link from "next/link"
import * as React from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Landmark,
  TrendingUp,
  WalletCards,
} from "lucide-react"

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
import type { FinancialSummarySnapshot } from "@/lib/dashboard"
import { useI18n } from "@/locales/client"

type FinancialSummaryDashboardProps = {
  summary: FinancialSummarySnapshot | null
  initialRevenueVisible?: boolean
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDateTime(value: string | Date): string {
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

function formatSignedCurrency(amount: number): string {
  if (amount === 0) {
    return formatCurrency(amount)
  }
  const sign = amount > 0 ? "+" : "-"
  return `${sign}${formatCurrency(Math.abs(amount))}`
}

function getActivityTone(
  type: FinancialSummarySnapshot["recentActivity"][number]["type"],
): "neutral" | "info" | "warning" | "danger" {
  if (type === "ticket") return "info"
  if (type === "refund") return "danger"
  if (type === "adjustment") return "warning"
  return "neutral"
}

// ---------------------------------------------------------------------------
// Section header — compact, no outer card
// ---------------------------------------------------------------------------
function SectionHeader({
  title,
  id,
  action,
}: {
  title: string
  id?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between pb-3">
      <h2
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
      >
        {title}
      </h2>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel: white card with border — replaces CommandPanel
// ---------------------------------------------------------------------------
function Panel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  )
}

export function FinancialSummaryDashboard({
  summary,
  initialRevenueVisible = false,
}: FinancialSummaryDashboardProps) {
  const t = useI18n()
  const [isRevenueVisible, setIsRevenueVisible] = React.useState(initialRevenueVisible)

  if (!summary) {
    return (
      <Panel>
        <div className="px-5 py-8">
          <h1 className="text-xl font-medium text-foreground">
            {t("dashboard.summary.unavailableTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("dashboard.summary.unavailableDescription")}
          </p>
        </div>
      </Panel>
    )
  }

  const getActivityTypeLabel = (
    type: FinancialSummarySnapshot["recentActivity"][number]["type"],
  ): string => {
    if (type === "ticket") return t("dashboard.summary.commandCenter.recent.types.ticket")
    if (type === "adjustment") return t("dashboard.summary.commandCenter.recent.types.adjustment")
    if (type === "refund") return t("dashboard.summary.commandCenter.recent.types.refund")
    return t("dashboard.summary.commandCenter.recent.types.payment")
  }

  const getActivityTitle = (
    activity: FinancialSummarySnapshot["recentActivity"][number],
  ): string => {
    const title = activity.title.trim()
    if (title) return title
    if (activity.category === "PAYMENT") return t("dashboard.summary.commandCenter.recent.fallbacks.payment")
    if (activity.category === "DISCOUNT") return t("dashboard.summary.commandCenter.recent.fallbacks.discount")
    if (activity.category === "ADDITIONAL_FEE") return t("dashboard.summary.commandCenter.recent.fallbacks.additionalFee")
    if (activity.category === "REFUND") return t("dashboard.summary.commandCenter.recent.fallbacks.refund")
    return t("dashboard.summary.commandCenter.recent.fallbacks.ticketPurchase")
  }

  return (
    <div className="space-y-6 pb-12 text-foreground">

      {/* ------------------------------------------------------------------ */}
      {/* Metric strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Revenue */}
        <Panel>
          <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                <WalletCards className="h-4 w-4" aria-hidden="true" />
              </div>
              <Button
                aria-label={
                  isRevenueVisible
                    ? t("dashboard.summary.widgets.revenue.hide")
                    : t("dashboard.summary.widgets.revenue.show")
                }
                onClick={() => setIsRevenueVisible((v) => !v)}
                size="icon"
                type="button"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-muted-foreground"
              >
                {isRevenueVisible ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("dashboard.summary.widgets.revenue.label")}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
              {isRevenueVisible ? formatCurrency(summary.totalRevenue) : "••••••"}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {summary.confirmedTickets} {t("dashboard.summary.widgets.revenue.detail")}
            </p>
          </div>
        </Panel>

        {/* Net Profit */}
        <Panel>
          <div className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("dashboard.summary.widgets.profit.label")}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
              {formatCurrency(summary.totalNetProfit)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatPercent(summary.averageMarginPercent)}% {t("dashboard.summary.widgets.profit.detail")}
            </p>
          </div>
        </Panel>

        {/* Receivables */}
        <Panel>
          <div className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
              <Landmark className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {t("dashboard.summary.widgets.receivables.label")}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
              {formatCurrency(summary.totalReceivables)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {summary.customersWithDebt} {t("dashboard.summary.widgets.receivables.detail")}
            </p>
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main two-column layout                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6">

        {/* Top Debtors */}
        <div className="space-y-6">
          <div>
            <SectionHeader
              title={t("dashboard.summary.analytics.topDebtors.title")}
              id="dashboard-top-debtors-title"
              action={
                <Link
                  href="/customers"
                  className="flex items-center gap-1 text-xs text-primary transition-opacity hover:opacity-75"
                >
                  {t("customers.directory.title")}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              }
            />
            <Panel aria-labelledby="dashboard-top-debtors-title">
              {summary.topDebtors.length === 0 ? (
                <div className="px-5 py-8 text-sm text-muted-foreground">
                  {t("dashboard.summary.analytics.topDebtors.empty")}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {summary.topDebtors.map((debtor, index) => (
                    <Link
                      key={debtor.id}
                      href={`/customers/${debtor.id}`}
                      className="grid gap-3 px-5 py-3.5 transition-colors hover:bg-accent/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="truncate">{debtor.name}</span>
                        </span>
                        <span className="mt-2 block">
                          <StatusChip tone={debtor.status === "high" ? "danger" : "warning"}>
                            {debtor.status === "high"
                              ? t("dashboard.summary.analytics.topDebtors.status.high")
                              : t("dashboard.summary.analytics.topDebtors.status.medium")}
                          </StatusChip>
                        </span>
                      </span>
                      <span className="text-left sm:text-right">
                        <span className="block text-sm font-semibold text-foreground">
                          {formatCurrency(debtor.outstandingBalance)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t("dashboard.summary.analytics.topDebtors.balanceLabel")}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Activity — full width                                        */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <SectionHeader
          title={t("dashboard.summary.commandCenter.recent.title")}
          id="dashboard-recent-activity-title"
        />
        <Panel aria-labelledby="dashboard-recent-activity-title">
          {summary.recentActivity.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              {t("dashboard.summary.commandCenter.recent.empty")}
            </div>
          ) : (
            <TableScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      {t("dashboard.summary.commandCenter.recent.columns.activity")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("dashboard.summary.commandCenter.recent.columns.amount")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("dashboard.summary.commandCenter.recent.columns.time")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="min-w-[240px]">
                        <Link
                          className="group inline-flex max-w-full flex-col gap-1.5"
                          href={activity.href}
                        >
                          <StatusChip tone={getActivityTone(activity.type)}>
                            {getActivityTypeLabel(activity.type)}
                          </StatusChip>
                          <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                            {getActivityTitle(activity)}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-semibold text-foreground">
                        {formatSignedCurrency(activity.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatDateTime(activity.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableScrollArea>
          )}
        </Panel>
      </div>

    </div>
  )
}
