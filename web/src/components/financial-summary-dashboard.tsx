"use client"

import Link from "next/link"
import {
  Landmark,
  Plane,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react"

import {
  CommandActionLink,
  CommandPanel,
  CommandPanelHeader,
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  if (severity === "high") {
    return "danger"
  }

  if (severity === "medium") {
    return "warning"
  }

  return "neutral"
}

function getActivityTone(
  type: FinancialSummarySnapshot["recentActivity"][number]["type"],
): "neutral" | "info" | "warning" | "danger" {
  if (type === "ticket") {
    return "info"
  }

  if (type === "refund") {
    return "danger"
  }

  if (type === "adjustment") {
    return "warning"
  }

  return "neutral"
}

export function FinancialSummaryDashboard({
  summary,
}: FinancialSummaryDashboardProps) {
  const t = useI18n()

  if (!summary) {
    return (
      <section className="overflow-hidden rounded-md border border-border bg-white">
        <div className="border-b border-border bg-secondary px-5 py-4">
          <p className="text-xs font-semibold uppercase text-primary">
            {t("dashboard.summary.eyebrow")}
          </p>
        </div>
        <div className="px-5 py-8">
          <h1 className="text-2xl font-medium text-foreground">
            {t("dashboard.summary.unavailableTitle")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("dashboard.summary.unavailableDescription")}
          </p>
        </div>
      </section>
    )
  }

  const getQueueLabel = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") {
      return t("dashboard.summary.commandCenter.queues.heldCredit.label")
    }

    if (key === "draftTickets") {
      return t("dashboard.summary.commandCenter.queues.draftTickets.label")
    }

    return t("dashboard.summary.commandCenter.queues.receivables.label")
  }

  const getQueueDescription = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") {
      return t("dashboard.summary.commandCenter.queues.heldCredit.description")
    }

    if (key === "draftTickets") {
      return t("dashboard.summary.commandCenter.queues.draftTickets.description")
    }

    return t("dashboard.summary.commandCenter.queues.receivables.description")
  }

  const getQueueAmountCaption = (
    key: FinancialSummarySnapshot["actionQueues"][number]["key"],
  ): string => {
    if (key === "heldCredit") {
      return t("dashboard.summary.commandCenter.queueAmounts.heldCredit")
    }

    if (key === "draftTickets") {
      return t("dashboard.summary.commandCenter.queueAmounts.draftTickets")
    }

    return t("dashboard.summary.commandCenter.queueAmounts.receivables")
  }

  const getActivityTypeLabel = (
    type: FinancialSummarySnapshot["recentActivity"][number]["type"],
  ): string => {
    if (type === "ticket") {
      return t("dashboard.summary.commandCenter.recent.types.ticket")
    }

    if (type === "adjustment") {
      return t("dashboard.summary.commandCenter.recent.types.adjustment")
    }

    if (type === "refund") {
      return t("dashboard.summary.commandCenter.recent.types.refund")
    }

    return t("dashboard.summary.commandCenter.recent.types.payment")
  }

  const getActivityTitle = (
    activity: FinancialSummarySnapshot["recentActivity"][number],
  ): string => {
    const title = activity.title.trim()

    if (title) {
      return title
    }

    if (activity.category === "PAYMENT") {
      return t("dashboard.summary.commandCenter.recent.fallbacks.payment")
    }

    if (activity.category === "DISCOUNT") {
      return t("dashboard.summary.commandCenter.recent.fallbacks.discount")
    }

    if (activity.category === "ADDITIONAL_FEE") {
      return t("dashboard.summary.commandCenter.recent.fallbacks.additionalFee")
    }

    if (activity.category === "REFUND") {
      return t("dashboard.summary.commandCenter.recent.fallbacks.refund")
    }

    return t("dashboard.summary.commandCenter.recent.fallbacks.ticketPurchase")
  }

  const primaryWidgets = [
    {
      key: "revenue",
      icon: WalletCards,
      label: t("dashboard.summary.widgets.revenue.label"),
      value: formatCurrency(summary.totalRevenue),
      detail: `${summary.confirmedTickets} ${t("dashboard.summary.widgets.revenue.detail")}`,
    },
    {
      key: "profit",
      icon: TrendingUp,
      label: t("dashboard.summary.widgets.profit.label"),
      value: formatCurrency(summary.totalNetProfit),
      detail: `${formatPercent(summary.averageMarginPercent)}% ${t("dashboard.summary.widgets.profit.detail")}`,
    },
    {
      key: "receivables",
      icon: Landmark,
      label: t("dashboard.summary.widgets.receivables.label"),
      value: formatCurrency(summary.totalReceivables),
      detail: `${summary.customersWithDebt} ${t("dashboard.summary.widgets.receivables.detail")}`,
    },
  ]

  return (
    <div className="space-y-5 text-foreground">
      <CommandPanel>
        <CommandPanelHeader
          eyebrow={t("dashboard.summary.eyebrow")}
          title={t("dashboard.summary.commandCenter.title")}
          description={t("dashboard.summary.commandCenter.description")}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/customers">
                {t("dashboard.summary.commandCenter.shortcuts.customers.label")}
              </Link>
            </Button>
          }
        />
        <div
          aria-label={t("dashboard.summary.primaryAriaLabel")}
          className="grid gap-3 p-4 lg:grid-cols-3"
        >
          {primaryWidgets.map((widget) => {
            const Icon = widget.icon

            return (
              <div
                key={widget.key}
                className="rounded-lg border border-border bg-secondary/35 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      {widget.label}
                    </p>
                    <p className="text-2xl font-medium tracking-[-0.02em] text-foreground">
                      {widget.value}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {widget.detail}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-primary">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
          <div className="bg-secondary/70 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              {t("dashboard.summary.snapshot.label")}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {formatDateTime(summary.updatedAt)}
            </p>
          </div>
          <div className="bg-secondary/70 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              {t("dashboard.summary.snapshot.sourceLabel")}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {t("dashboard.summary.snapshot.sourceValue")}
            </p>
          </div>
        </div>
      </CommandPanel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <CommandPanel aria-labelledby="dashboard-work-queues-title">
          <CommandPanelHeader
            description={t(
              "dashboard.summary.commandCenter.needsAction.description",
            )}
            eyebrow={t("dashboard.summary.commandCenter.needsAction.eyebrow")}
            title={t("dashboard.summary.commandCenter.needsAction.title")}
            titleId="dashboard-work-queues-title"
          />
          <div className="divide-y divide-border">
            {summary.actionQueues.map((queue) => (
              <Link
                className="grid gap-3 px-5 py-4 transition-colors hover:bg-accent/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                href={queue.href}
                key={queue.key}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {getQueueLabel(queue.key)}
                    </span>
                    <StatusChip tone={getQueueTone(queue.severity)}>
                      {queue.count}
                    </StatusChip>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {getQueueDescription(queue.key)}
                  </span>
                </span>
                <span className="text-left sm:text-right">
                  <span className="block text-sm font-medium text-foreground">
                    {formatCurrency(queue.amount)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {getQueueAmountCaption(queue.key)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </CommandPanel>

        <CommandPanel aria-labelledby="dashboard-shortcuts-title">
          <CommandPanelHeader
            eyebrow={t("dashboard.summary.commandCenter.shortcuts.eyebrow")}
            title={t("dashboard.summary.commandCenter.shortcuts.title")}
            titleId="dashboard-shortcuts-title"
          />
          <div className="grid gap-3 p-4">
            <CommandActionLink
              description={t(
                "dashboard.summary.commandCenter.shortcuts.customers.description",
              )}
              href="/customers"
              icon={Users}
              label={t("dashboard.summary.commandCenter.shortcuts.customers.label")}
            />
            <CommandActionLink
              description={t(
                "dashboard.summary.commandCenter.shortcuts.tickets.description",
              )}
              href="/tickets/capture"
              icon={Plane}
              label={t("dashboard.summary.commandCenter.shortcuts.tickets.label")}
            />
            <CommandActionLink
              description={t(
                "dashboard.summary.commandCenter.shortcuts.invoices.description",
              )}
              href="/invoices"
              icon={ReceiptText}
              label={t("dashboard.summary.commandCenter.shortcuts.invoices.label")}
            />
          </div>
        </CommandPanel>
      </div>

      <CommandPanel aria-labelledby="dashboard-top-debtors-title">
        <CommandPanelHeader
          description={t("dashboard.summary.analytics.topDebtors.description")}
          eyebrow={t("dashboard.summary.analytics.topDebtors.eyebrow")}
          title={t("dashboard.summary.analytics.topDebtors.title")}
          titleId="dashboard-top-debtors-title"
        />
        {summary.topDebtors.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            {t("dashboard.summary.analytics.topDebtors.empty")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {summary.topDebtors.map((debtor, index) => (
              <Link
                className="grid gap-3 px-5 py-3 transition-colors hover:bg-accent/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                href={`/customers/${debtor.id}`}
                key={debtor.id}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate">{debtor.name}</span>
                  </span>
                  <span className="mt-2 block">
                    <StatusChip
                      tone={debtor.status === "high" ? "danger" : "warning"}
                    >
                      {debtor.status === "high"
                        ? t("dashboard.summary.analytics.topDebtors.status.high")
                        : t(
                            "dashboard.summary.analytics.topDebtors.status.medium",
                          )}
                    </StatusChip>
                  </span>
                </span>
                <span className="text-left sm:text-right">
                  <span className="block text-sm font-medium text-foreground">
                    {formatCurrency(debtor.outstandingBalance)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("dashboard.summary.analytics.topDebtors.balanceLabel")}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </CommandPanel>

      <CommandPanel aria-labelledby="dashboard-recent-activity-title">
        <CommandPanelHeader
          description={t("dashboard.summary.commandCenter.recent.description")}
          eyebrow={t("dashboard.summary.commandCenter.recent.eyebrow")}
          title={t("dashboard.summary.commandCenter.recent.title")}
          titleId="dashboard-recent-activity-title"
        />
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
                    <TableCell className="min-w-[260px]">
                      <Link
                        className="group inline-flex max-w-full flex-col gap-2"
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
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium text-foreground">
                      {formatSignedCurrency(activity.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                      {formatDateTime(activity.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
      </CommandPanel>
    </div>
  )
}
