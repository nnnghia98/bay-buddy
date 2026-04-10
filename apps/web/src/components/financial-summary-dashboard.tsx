"use client"

import { Landmark, TrendingUp, Wallet, WalletCards } from "lucide-react"

import { useI18n } from "@/locales/client"

type FinancialSummarySnapshot = {
  totalRevenue: number
  totalNetProfit: number
  totalReceivables: number
  totalHeldCredit: number
  confirmedTickets: number
  activeCustomers: number
  customersWithDebt: number
  customersWithCredit: number
  averageMarginPercent: number
  receivablesRatioPercent: number
  updatedAt: string
}

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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
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
    </div>
  )
}
