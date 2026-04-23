"use client"

import { Landmark, TrendingUp, Wallet, WalletCards } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { FinancialSummarySnapshot } from "@/lib/dashboard"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"

type FinancialSummaryDashboardProps = {
  summary: FinancialSummarySnapshot | null
}

const revenueStroke = "#2d7ff9"

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)
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

  const secondaryMetrics = [
    {
      key: "customers",
      label: t("dashboard.summary.metrics.customers.label"),
      value: `${summary.activeCustomers}`,
      detail: `${summary.customersWithCredit} ${t("dashboard.summary.metrics.customers.detail")}`,
    },
    {
      key: "tickets",
      label: t("dashboard.summary.metrics.tickets.label"),
      value: `${summary.confirmedTickets}`,
      detail: t("dashboard.summary.metrics.tickets.detail"),
    },
    {
      key: "credit",
      label: t("dashboard.summary.metrics.credit.label"),
      value: formatCurrency(summary.totalHeldCredit),
      detail: `${summary.customersWithCredit} ${t("dashboard.summary.metrics.credit.detail")}`,
    },
    {
      key: "coverage",
      label: t("dashboard.summary.metrics.coverage.label"),
      value: `${formatPercent(summary.receivablesRatioPercent)}%`,
      detail: t("dashboard.summary.metrics.coverage.detail"),
    },
  ]
  const revenueLast30Days = summary.revenueTrend.reduce(
    (sum, point) => sum + point.revenue,
    0,
  )
  const currentGrowth = summary.revenueTrend.at(-1)?.cumulativeRevenue ?? 0

  return (
    <div className="space-y-5 text-foreground">
      <section className="overflow-hidden rounded-md border border-border bg-white">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border-b border-border px-5 py-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase text-primary">
              {t("dashboard.summary.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-0.02em] text-foreground">
              {t("dashboard.summary.title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("dashboard.summary.description")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-secondary px-5 py-5">
              <p className="text-[11px] font-semibold uppercase text-primary">
                {t("dashboard.summary.snapshot.label")}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatDateTime(summary.updatedAt)}
              </p>
            </div>
            <div className="bg-secondary px-5 py-5">
              <p className="text-[11px] font-semibold uppercase text-primary">
                {t("dashboard.summary.snapshot.sourceLabel")}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                <span>{t("dashboard.summary.snapshot.sourceValue")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label={t("dashboard.summary.primaryAriaLabel")}
        className="grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3"
      >
        {primaryWidgets.map((widget) => {
          const Icon = widget.icon

          return (
            <div className="bg-white px-5 py-5" key={widget.key}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-primary">
                    {widget.label}
                  </p>
                  <p className="mt-3 break-words text-3xl font-medium tracking-[-0.02em] text-foreground">
                    {widget.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {widget.detail}
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section
        aria-label={t("dashboard.summary.secondaryAriaLabel")}
        className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 xl:grid-cols-4"
      >
        {secondaryMetrics.map((metric) => (
          <div className="bg-white px-5 py-4" key={metric.key}>
            <p className="text-[11px] font-semibold uppercase text-primary">
              {metric.label}
            </p>
            <p className="mt-3 text-2xl font-medium tracking-[-0.02em] text-foreground">
              {metric.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {metric.detail}
            </p>
          </div>
        ))}
      </section>

      <section
        aria-label={t("dashboard.summary.analyticsAriaLabel")}
        className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <section className="overflow-hidden rounded-md border border-[#e2e8f0] bg-white">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase text-primary">
                {t("dashboard.summary.analytics.revenueTrend.eyebrow")}
              </p>
              <h2 className="text-lg font-medium tracking-[-0.02em] text-foreground">
                {t("dashboard.summary.analytics.revenueTrend.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.summary.analytics.revenueTrend.description")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border bg-secondary px-3 py-2">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {t("dashboard.summary.analytics.revenueTrend.totalLabel")}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatCurrency(revenueLast30Days)}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary px-3 py-2">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {t("dashboard.summary.analytics.revenueTrend.growthLabel")}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatCurrency(currentGrowth)}
                </p>
              </div>
            </div>
          </div>

          <div className="h-[320px] px-3 py-4 sm:px-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  minTickGap={24}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={formatCompactCurrency}
                  tickLine={false}
                  tickMargin={10}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "none",
                    color: "#0f172a",
                  }}
                  cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
                  formatter={(value, name) => {
                    const amount = typeof value === "number" ? value : 0

                    if (String(name) === "revenue") {
                      return [
                        formatCurrency(amount),
                        t("dashboard.summary.analytics.revenueTrend.tooltip.daily"),
                      ]
                    }

                    return [
                      formatCurrency(amount),
                      t("dashboard.summary.analytics.revenueTrend.tooltip.cumulative"),
                    ]
                  }}
                  labelFormatter={(value) =>
                    `${t("dashboard.summary.analytics.revenueTrend.tooltip.dateLabel")} ${value}`
                  }
                />
                <Area
                  dataKey="cumulativeRevenue"
                  fill={revenueStroke}
                  fillOpacity={0.08}
                  name="cumulativeRevenue"
                  stroke={revenueStroke}
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  dataKey="revenue"
                  fill="transparent"
                  name="revenue"
                  stroke="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-[#e2e8f0] bg-white">
          <div className="border-b border-border px-5 py-4 [font-family:var(--font-geist)]">
            <p className="text-xs font-semibold uppercase text-primary">
              {t("dashboard.summary.analytics.topDebtors.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-medium tracking-[-0.02em] text-foreground">
              {t("dashboard.summary.analytics.topDebtors.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.summary.analytics.topDebtors.description")}
            </p>
          </div>

          <div className="[font-family:var(--font-geist)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <span>{t("dashboard.summary.analytics.topDebtors.columns.customer")}</span>
              <span>{t("dashboard.summary.analytics.topDebtors.columns.balance")}</span>
            </div>

            {summary.topDebtors.length === 0 ? (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                {t("dashboard.summary.analytics.topDebtors.empty")}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.topDebtors.map((debtor, index) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3"
                    key={debtor.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="truncate">{debtor.name}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
                            debtor.status === "high"
                              ? "border-red-100 bg-red-50 text-red-600"
                              : "border-orange-100 bg-orange-50 text-orange-600",
                          )}
                        >
                          {debtor.status === "high"
                            ? t("dashboard.summary.analytics.topDebtors.status.high")
                            : t("dashboard.summary.analytics.topDebtors.status.medium")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(debtor.outstandingBalance)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("dashboard.summary.analytics.topDebtors.balanceLabel")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}
