"use client"

import Link from "next/link"
import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Landmark,
  Plane,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
  Clock,
  AlertTriangle,
} from "lucide-react"

import { StatusChip, TableScrollArea } from "@/components/command-center"
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
import type { FinancialSummarySnapshot } from "@/lib/dashboard"
import { useI18n } from "@/locales/client"

type FinancialSummaryDashboardProps = {
  summary: FinancialSummarySnapshot | null
  initialRevenueVisible?: boolean
}
const REVENUE_FROM_PARAM = "revenue_from"
const REVENUE_FROM_STORAGE_KEY = "baybuddy:dashboard:revenue-from"

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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDateShort(value: string | Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function formatSignedCurrency(amount: number): string {
  if (amount === 0) {
    return formatCurrency(amount)
  }
  const sign = amount > 0 ? "+" : "-"
  return `${sign}${formatCurrency(Math.abs(amount))}`
}

function getQueueTone(
  severity: FinancialSummarySnapshot["actionQueues"][number]["severity"],
): "neutral" | "warning" | "danger" {
  if (severity === "high") return "danger"
  if (severity === "medium") return "warning"
  return "neutral"
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isRevenueVisible, setIsRevenueVisible] = React.useState(initialRevenueVisible)
  const [revenueFromInput, setRevenueFromInput] = React.useState("")

  React.useEffect(() => {
    if (!summary) return
    setRevenueFromInput(summary.revenueFromDate)
  }, [summary])

  React.useEffect(() => {
    if (!summary) return
    const storedCutoff = window.localStorage.getItem(REVENUE_FROM_STORAGE_KEY)
    if (!storedCutoff || storedCutoff === summary.revenueFromDate) return
    const params = new URLSearchParams(searchParams.toString())
    params.set(REVENUE_FROM_PARAM, storedCutoff)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams, summary])

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

  const getQueueLabel = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") return t("dashboard.summary.commandCenter.queues.heldCredit.label")
    if (key === "draftTickets") return t("dashboard.summary.commandCenter.queues.draftTickets.label")
    return t("dashboard.summary.commandCenter.queues.receivables.label")
  }

  const getQueueDescription = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") return t("dashboard.summary.commandCenter.queues.heldCredit.description")
    if (key === "draftTickets") return t("dashboard.summary.commandCenter.queues.draftTickets.description")
    return t("dashboard.summary.commandCenter.queues.receivables.description")
  }

  const getQueueAmountCaption = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") return t("dashboard.summary.commandCenter.queueAmounts.heldCredit")
    if (key === "draftTickets") return t("dashboard.summary.commandCenter.queueAmounts.draftTickets")
    return t("dashboard.summary.commandCenter.queueAmounts.receivables")
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

  const applyRevenueCutoff = () => {
    if (!revenueFromInput) return
    const params = new URLSearchParams(searchParams.toString())
    params.set(REVENUE_FROM_PARAM, revenueFromInput)
    window.localStorage.setItem(REVENUE_FROM_STORAGE_KEY, revenueFromInput)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const shortcuts = [
    {
      href: "/customers",
      icon: Users,
      label: t("dashboard.summary.commandCenter.shortcuts.customers.label"),
      description: t("dashboard.summary.commandCenter.shortcuts.customers.description"),
    },
    {
      href: "/tickets/capture",
      icon: Plane,
      label: t("dashboard.summary.commandCenter.shortcuts.tickets.label"),
      description: t("dashboard.summary.commandCenter.shortcuts.tickets.description"),
    },
    {
      href: "/invoices",
      icon: ReceiptText,
      label: t("dashboard.summary.commandCenter.shortcuts.invoices.label"),
      description: t("dashboard.summary.commandCenter.shortcuts.invoices.description"),
    },
  ]

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
          {/* Revenue cutoff control */}
          <div className="flex items-end gap-2 border-t border-border px-5 py-3">
            <div className="flex-1">
              <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("dashboard.summary.widgets.revenue.cutoffLabel")}
              </label>
              <Input
                className="mt-1 h-8 text-xs"
                max={summary.updatedAt.slice(0, 10)}
                onChange={(e) => setRevenueFromInput(e.target.value)}
                type="date"
                value={revenueFromInput}
              />
            </div>
            <Button
              onClick={applyRevenueCutoff}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-xs"
            >
              {t("dashboard.summary.widgets.revenue.applyCutoff")}
            </Button>
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">

        {/* Left: Work Queues */}
        <div className="space-y-6">
          <div>
            <SectionHeader
              title={t("dashboard.summary.commandCenter.needsAction.title")}
              id="dashboard-work-queues-title"
            />
            <Panel aria-labelledby="dashboard-work-queues-title">
              <div className="divide-y divide-border">
                {summary.actionQueues.map((queue) => (
                  <Link
                    key={queue.key}
                    href={queue.href}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-accent/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        {queue.severity !== "low" && (
                          <AlertTriangle
                            className={[
                              "h-3.5 w-3.5 shrink-0",
                              queue.severity === "high" ? "text-rose-500" : "text-amber-500",
                            ].join(" ")}
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {getQueueLabel(queue.key)}
                        </span>
                        <StatusChip tone={getQueueTone(queue.severity)}>
                          {queue.count}
                        </StatusChip>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {getQueueDescription(queue.key)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(queue.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getQueueAmountCaption(queue.key)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>

          {/* Top Debtors */}
          <div>
            <SectionHeader
              title={t("dashboard.summary.analytics.topDebtors.title")}
              id="dashboard-top-debtors-title"
              action={
                <Link
                  href="/customers"
                  className="flex items-center gap-1 text-xs text-primary transition-opacity hover:opacity-75"
                >
                  {t("dashboard.summary.commandCenter.shortcuts.customers.label")}
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

        {/* Right: Shortcuts + snapshot metadata */}
        <div className="space-y-6">
          <div>
            <SectionHeader
              title={t("dashboard.summary.commandCenter.shortcuts.title")}
              id="dashboard-shortcuts-title"
            />
            <div className="space-y-2" aria-labelledby="dashboard-shortcuts-title">
              {shortcuts.map((s) => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 transition-all duration-150 hover:border-primary/25 hover:bg-accent/45 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition-colors group-hover:border-primary/20 group-hover:bg-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {s.description}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Snapshot metadata */}
          <div>
            <SectionHeader title={t("dashboard.summary.snapshot.label")} />
            <Panel>
              <div className="divide-y divide-border">
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {t("dashboard.summary.snapshot.label")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {formatDateTime(summary.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("dashboard.summary.snapshot.sourceLabel")}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {t("dashboard.summary.snapshot.sourceValue")}
                  </p>
                </div>
                {summary.revenueFromDate && (
                  <div className="px-4 py-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {t("dashboard.summary.widgets.revenue.cutoffLabel")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {formatDateShort(summary.revenueFromDate)}
                    </p>
                  </div>
                )}
              </div>
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
