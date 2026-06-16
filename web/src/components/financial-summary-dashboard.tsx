"use client"

import Link from "next/link"
import * as React from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  PlaneTakeoff,
  ReceiptText,
  TrendingUp,
  UploadCloud,
  Users,
  WalletCards,
} from "lucide-react"

import {
  CommandActionLink,
  MetricCard,
  Panel,
  SectionHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
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

function getQueueTone(
  severity: FinancialSummarySnapshot["actionQueues"][number]["severity"],
): "neutral" | "warning" | "danger" {
  if (severity === "high") return "danger"
  if (severity === "medium") return "warning"
  return "neutral"
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

  const getQueueLabel = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") return t("dashboard.summary.commandCenter.queues.heldCredit")
    if (key === "draftTickets") return t("dashboard.summary.commandCenter.queues.draftTickets")
    return t("dashboard.summary.commandCenter.queues.receivables")
  }

  const getQueueDescription = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") return t("dashboard.summary.commandCenter.queueDescriptions.heldCredit")
    if (key === "draftTickets") return t("dashboard.summary.commandCenter.queueDescriptions.draftTickets")
    return t("dashboard.summary.commandCenter.queueDescriptions.receivables")
  }
  const hasOpenActionQueue = (
    queue: FinancialSummarySnapshot["actionQueues"][number],
  ): boolean => queue.count > 0 || queue.amount !== 0
  const hasAnyOpenQueue = summary.actionQueues.some(hasOpenActionQueue)

  return (
    <div className="space-y-6 pb-12 text-foreground">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white/82 px-5 py-4 shadow-[var(--shadow-sm)] backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("dashboard.summary.eyebrow")}
          </p>
          <h1 className="mt-1 max-w-3xl text-2xl font-semibold tracking-normal text-foreground">
            {t("dashboard.summary.commandCenter.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("dashboard.summary.commandCenter.description")}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("dashboard.summary.commandCenter.updatedAt")}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatDateTime(summary.updatedAt)}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metric strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Revenue */}
        <MetricCard
          action={
            <Button
              aria-label={
                isRevenueVisible
                  ? t("dashboard.summary.widgets.revenue.hide")
                  : t("dashboard.summary.widgets.revenue.show")
              }
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={() => setIsRevenueVisible((v) => !v)}
              size="icon"
              type="button"
              variant="ghost"
            >
              {isRevenueVisible ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
            </Button>
          }
          description={`${summary.confirmedTickets} ${t("dashboard.summary.widgets.revenue.detail")}`}
          icon={WalletCards}
          label={t("dashboard.summary.widgets.revenue.label")}
          value={isRevenueVisible ? formatCurrency(summary.totalRevenue) : "••••••"}
        />

        {/* Net Profit */}
        <MetricCard
          description={`${formatPercent(summary.averageMarginPercent)}% ${t("dashboard.summary.widgets.profit.detail")}`}
          icon={TrendingUp}
          label={t("dashboard.summary.widgets.profit.label")}
          value={formatCurrency(summary.totalNetProfit)}
        />

        {/* Receivables */}
        <MetricCard
          description={`${summary.customersWithDebt} ${t("dashboard.summary.widgets.receivables.detail")}`}
          icon={Landmark}
          label={t("dashboard.summary.widgets.receivables.label")}
          value={formatCurrency(summary.totalReceivables)}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main two-column layout                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">

        {/* Top Debtors */}
        <div className="space-y-6">
          <div>
            <SectionHeader
              title={t("dashboard.summary.commandCenter.needsAction")}
              id="dashboard-action-queues-title"
            />
            <Panel aria-labelledby="dashboard-action-queues-title">
              {!hasAnyOpenQueue ? (
                <div className="border-b border-border bg-secondary/55 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {t("dashboard.summary.commandCenter.allClear.title")}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {t("dashboard.summary.commandCenter.allClear.description")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="divide-y divide-border">
                {summary.actionQueues.map((queue) => {
                  const hasOpenItems = hasOpenActionQueue(queue)
                  const QueueIcon = hasOpenItems ? AlertTriangle : CheckCircle2

                  return (
                    <Link
                      className="group grid gap-3 px-5 py-4 transition-colors hover:bg-accent/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      href={queue.href}
                      key={queue.key}
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <span
                          className={
                            hasOpenItems
                              ? "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-secondary text-primary transition-colors group-hover:border-primary/25 group-hover:bg-white"
                              : "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-white text-muted-foreground transition-colors group-hover:border-primary/15"
                          }
                        >
                          <QueueIcon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className={
                                hasOpenItems
                                  ? "text-sm font-semibold text-foreground"
                                  : "text-sm font-medium text-foreground"
                              }
                            >
                              {getQueueLabel(queue.key)}
                            </span>
                            <StatusChip
                              tone={hasOpenItems ? getQueueTone(queue.severity) : "neutral"}
                            >
                              {queue.count}
                            </StatusChip>
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {getQueueDescription(queue.key)}
                          </span>
                        </span>
                      </span>
                      <span className="text-left sm:text-right">
                        <span
                          className={
                            hasOpenItems
                              ? "block text-sm font-semibold text-foreground"
                              : "block text-sm font-medium text-muted-foreground"
                          }
                        >
                          {formatCurrency(queue.amount)}
                        </span>
                        <span
                          className={
                            hasOpenItems
                              ? "mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                              : "mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {hasOpenItems
                            ? t("dashboard.summary.commandCenter.openQueue")
                            : t("dashboard.summary.commandCenter.noQueue")}
                          {hasOpenItems ? (
                            <ArrowRight
                              aria-hidden="true"
                              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                            />
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div>
            <SectionHeader
              title={t("dashboard.summary.analytics.topDebtors.title")}
              id="dashboard-top-debtors-title"
              action={
                <Link
                  href="/customers"
                  className="flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:opacity-75"
                >
                  {t("appShell.nav.customers")}
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
                      className="grid gap-3 px-5 py-3.5 transition-colors hover:bg-accent/38 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
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

        <aside className="space-y-6">
          <div>
            <SectionHeader
              title={t("dashboard.summary.commandCenter.shortcuts.title")}
              id="dashboard-shortcuts-title"
            />
            <div aria-labelledby="dashboard-shortcuts-title" className="grid gap-3">
              <CommandActionLink
                description={t("dashboard.summary.commandCenter.shortcuts.customersDescription")}
                href="/customers"
                icon={Users}
                label={t("dashboard.summary.commandCenter.shortcuts.customers")}
              />
              <CommandActionLink
                description={t("dashboard.summary.commandCenter.shortcuts.ticketDescription")}
                href="/tickets/input"
                icon={PlaneTakeoff}
                label={t("dashboard.summary.commandCenter.shortcuts.ticket")}
              />
              <CommandActionLink
                description={t("dashboard.summary.commandCenter.shortcuts.importDescription")}
                href="/extract-ticket"
                icon={UploadCloud}
                label={t("dashboard.summary.commandCenter.shortcuts.import")}
              />
              <CommandActionLink
                description={t("dashboard.summary.commandCenter.shortcuts.reportDescription")}
                href="/report"
                icon={ReceiptText}
                label={t("dashboard.summary.commandCenter.shortcuts.report")}
              />
            </div>
          </div>

          <Panel className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-secondary text-primary">
                <CreditCard aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("dashboard.summary.metrics.credit.label")}
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatCurrency(summary.totalHeldCredit)}
                </p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {summary.customersWithCredit} {t("dashboard.summary.metrics.credit.detail")}
                </p>
              </div>
            </div>
          </Panel>
        </aside>
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
