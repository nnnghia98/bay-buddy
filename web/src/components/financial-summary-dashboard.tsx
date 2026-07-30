"use client"

import patterns from "@/styles/ui-patterns.module.css"

import Link from "next/link"
import * as React from "react"
import {
  ArrowRight,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  TrendingUp,
  WalletCards,
} from "lucide-react"

import {
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
import { formatCurrency, formatSignedCurrency } from "@/lib/formatters"
import { useI18n } from "@/locales/client"
import styles from "./financial-summary-dashboard.module.css"

type FinancialSummaryDashboardProps = {
  summary: FinancialSummarySnapshot | null
  initialRevenueVisible?: boolean
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

function getActivityTone(
  type: FinancialSummarySnapshot["recentActivity"][number]["type"],
): "neutral" | "info" | "warning" | "danger" {
  if (type === "ticket") return "info"
  if (type === "refund") return "danger"
  if (type === "adjustment") return "warning"
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
        <div className={styles.unavailable}>
          <h1 className={patterns.title}>
            {t("dashboard.summary.unavailableTitle")}
          </h1>
          <p className={styles.unavailableDescription}>
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
    <div className={patterns.pageStack}>
      {/* ------------------------------------------------------------------ */}
      {/* Metric strip                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className={patterns.threeColumnGrid}>
        {/* Revenue */}
        <MetricCard
          action={
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
            >
              {isRevenueVisible ? (
                <EyeOff aria-hidden="true" className={patterns.iconSmall} />
              ) : (
                <Eye aria-hidden="true" className={patterns.iconSmall} />
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
      <div className={styles.dashboardGrid}>

        {/* Top Debtors */}
        <div className={styles.primaryColumn}>
          <div>
            <SectionHeader
              title={t("dashboard.summary.analytics.topDebtors.title")}
              id="dashboard-top-debtors-title"
              action={
                <Link
                  href="/customers"
                  className={styles.sectionLink}
                >
                  {t("appShell.nav.customers")}
                  <ArrowRight className={patterns.iconCompact} aria-hidden="true" />
                </Link>
              }
            />
            <Panel aria-labelledby="dashboard-top-debtors-title">
              {summary.topDebtors.length === 0 ? (
                <div className={styles.empty}>
                  {t("dashboard.summary.analytics.topDebtors.empty")}
                </div>
              ) : (
                <div className={patterns.dividerList}>
                  {summary.topDebtors.map((debtor, index) => (
                    <Link
                      key={debtor.id}
                      href={`/customers/${debtor.id}`}
                      className={styles.debtorLink}
                    >
                      <span className={patterns.minWidthZero}>
                        <span className={styles.debtorNameRow}>
                          <span className={styles.debtorRank}>
                            {index + 1}
                          </span>
                          <span className={styles.debtorName}>
                            {debtor.name}
                          </span>
                        </span>
                        <span className={styles.debtorStatus}>
                          <StatusChip tone={debtor.status === "high" ? "danger" : "warning"}>
                            {debtor.status === "high"
                              ? t("dashboard.summary.analytics.topDebtors.status.high")
                              : t("dashboard.summary.analytics.topDebtors.status.medium")}
                          </StatusChip>
                        </span>
                      </span>
                      <span className={styles.debtorBalance}>
                        <span className={styles.debtorAmount}>
                          {formatCurrency(debtor.outstandingBalance)}
                        </span>
                        <span className={styles.debtorBalanceLabel}>
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

        <aside className={styles.secondaryColumn}>
          <Panel className={styles.creditPanel}>
            <div className={patterns.rowStart}>
              <span className={styles.creditIcon}>
                <CreditCard aria-hidden="true" className={patterns.iconSmall} />
              </span>
              <div className={patterns.minWidthZero}>
                <p className={patterns.accentEyebrow}>
                  {t("dashboard.summary.metrics.credit.label")}
                </p>
                <p className={styles.creditValue}>
                  {formatCurrency(summary.totalHeldCredit)}
                </p>
                <p className={styles.creditDescription}>
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
            <div className={styles.empty}>
              {t("dashboard.summary.commandCenter.recent.empty")}
            </div>
          ) : (
            <TableScrollArea>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("dashboard.summary.commandCenter.recent.columns.activity")}
                    </TableHead>
                    <TableHead className={patterns.textRight}>
                      {t("dashboard.summary.commandCenter.recent.columns.amount")}
                    </TableHead>
                    <TableHead className={patterns.textRight}>
                      {t("dashboard.summary.commandCenter.recent.columns.time")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className={styles.activityCell}>
                        <Link
                          className={styles.activityLink}
                          href={activity.href}
                        >
                          <StatusChip tone={getActivityTone(activity.type)}>
                            {getActivityTypeLabel(activity.type)}
                          </StatusChip>
                          <span className={styles.activityTitle}>
                            {getActivityTitle(activity)}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className={styles.numberCell}>
                        {formatSignedCurrency(activity.amount)}
                      </TableCell>
                      <TableCell className={styles.dateCell}>
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
