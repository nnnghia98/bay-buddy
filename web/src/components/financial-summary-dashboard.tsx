"use client"

import patterns from "@/styles/ui-patterns.module.css"

import Link from "next/link"
import {
  ArrowRight,
  ChartColumn,
  CircleDollarSign,
  FileCheck2,
  Ticket,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import {
  CommandActionLink,
  Panel,
  SectionHeader,
  StatusChip,
  TableScrollArea,
} from "@/components/command-center"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatSignedCurrency } from "@/lib/formatters"
import { useI18n } from "@/locales/client"
import type {
  DashboardActionQueue,
  DashboardRecentActivity,
  DashboardSummary,
} from "@/schemas/dashboard"
import styles from "./financial-summary-dashboard.module.css"

type FinancialSummaryDashboardProps = {
  summary: DashboardSummary | null
}

type Shortcut = {
  href: string
  icon: LucideIcon
  label: string
  description: string
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value)
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value)
}

function getQueueHref(key: DashboardActionQueue["key"]): string {
  return key === "draftTickets" ? "/tickets/input" : "/customers"
}

function getQueueTone(
  queue: DashboardActionQueue,
): "info" | "warning" | "success" {
  if (queue.count === 0) return "success"
  if (queue.key === "heldCredit") return "info"
  return "warning"
}

function getActivityTone(
  type: DashboardRecentActivity["type"],
): "neutral" | "info" | "warning" | "danger" {
  if (type === "ticket") return "info"
  if (type === "refund") return "danger"
  if (type === "adjustment") return "warning"
  return "neutral"
}

export function FinancialSummaryDashboard({
  summary,
}: FinancialSummaryDashboardProps) {
  const t = useI18n()

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

  const getQueueLabel = (key: DashboardActionQueue["key"]): string => {
    if (key === "heldCredit") {
      return t("dashboard.summary.commandCenter.queues.heldCredit")
    }
    if (key === "draftTickets") {
      return t("dashboard.summary.commandCenter.queues.draftTickets")
    }
    return t("dashboard.summary.commandCenter.queues.receivables")
  }

  const getQueueDescription = (
    key: DashboardActionQueue["key"],
  ): string => {
    if (key === "heldCredit") {
      return t("dashboard.summary.commandCenter.queueDescriptions.heldCredit")
    }
    if (key === "draftTickets") {
      return t("dashboard.summary.commandCenter.queueDescriptions.draftTickets")
    }
    return t("dashboard.summary.commandCenter.queueDescriptions.receivables")
  }

  const getQueueUnit = (key: DashboardActionQueue["key"]): string => {
    if (key === "heldCredit") {
      return t("dashboard.summary.commandCenter.queueUnits.balances")
    }
    if (key === "draftTickets") {
      return t("dashboard.summary.commandCenter.queueUnits.tickets")
    }
    return t("dashboard.summary.commandCenter.queueUnits.customers")
  }

  const getActivityTypeLabel = (
    type: DashboardRecentActivity["type"],
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

  const getActivityTitle = (activity: DashboardRecentActivity): string => {
    const title = activity.title.trim()
    if (title) return title
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

  const scopeLabel = summary.scope_started_at
    ? t("dashboard.summary.scope.fromDate", {
        date: formatDate(summary.scope_started_at),
      })
    : t("dashboard.summary.scope.allData")

  const shortcuts: Shortcut[] = [
    {
      href: "/debts/input",
      icon: CircleDollarSign,
      label: t("dashboard.summary.commandCenter.shortcuts.manualDebt"),
      description: t(
        "dashboard.summary.commandCenter.shortcuts.manualDebtDescription",
      ),
    },
    {
      href: "/tickets/input",
      icon: Ticket,
      label: t("dashboard.summary.commandCenter.shortcuts.ticket"),
      description: t(
        "dashboard.summary.commandCenter.shortcuts.ticketDescription",
      ),
    },
    {
      href: "/customers",
      icon: Users,
      label: t("dashboard.summary.commandCenter.shortcuts.customers"),
      description: t(
        "dashboard.summary.commandCenter.shortcuts.customersDescription",
      ),
    },
    {
      href: "/report",
      icon: ChartColumn,
      label: t("dashboard.summary.commandCenter.shortcuts.report"),
      description: t(
        "dashboard.summary.commandCenter.shortcuts.reportDescription",
      ),
    },
  ]

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeadingCopy}>
          <p className={patterns.eyebrow}>{t("dashboard.summary.eyebrow")}</p>
          <h1 className={styles.pageTitle}>{t("dashboard.summary.title")}</h1>
          <p className={styles.pageDescription}>
            {t("dashboard.summary.description")}
          </p>
        </div>
        <div className={styles.scopeBlock}>
          <span>{t("dashboard.summary.scope.current")}</span>
          <strong>{scopeLabel}</strong>
          <time dateTime={summary.updated_at.toISOString()}>
            {t("dashboard.summary.commandCenter.updatedAt")} {" "}
            {formatDateTime(summary.updated_at)}
          </time>
        </div>
      </header>

      <section
        aria-label={t("dashboard.summary.commandCenter.priorityAriaLabel")}
        className={styles.priorityGrid}
      >
        <Panel className={styles.priorityPanel}>
          <div className={styles.panelHeading}>
            <div>
              <p className={patterns.eyebrow}>
                {t("dashboard.summary.commandCenter.queueEyebrow")}
              </p>
              <h2>{t("dashboard.summary.commandCenter.needsAction")}</h2>
            </div>
            <span>{t("dashboard.summary.commandCenter.queueOrder")}</span>
          </div>
          <div className={styles.queueList}>
            {summary.action_queues.map((queue) => (
              <Link
                className={styles.queueRow}
                href={getQueueHref(queue.key)}
                key={queue.key}
              >
                <span className={styles.queueCopy}>
                  <strong>{getQueueLabel(queue.key)}</strong>
                  <span>{getQueueDescription(queue.key)}</span>
                </span>
                <span className={styles.queueCount}>
                  {queue.count} {getQueueUnit(queue.key)}
                </span>
                <span className={styles.queueAmount}>
                  {formatCurrency(queue.amount)}
                </span>
                <StatusChip tone={getQueueTone(queue)}>
                  {queue.count === 0
                    ? t("dashboard.summary.commandCenter.clear")
                    : t("dashboard.summary.commandCenter.review")}
                </StatusChip>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className={styles.shortcutsPanel}>
          <div className={styles.panelHeading}>
            <div>
              <p className={patterns.eyebrow}>
                {t("dashboard.summary.commandCenter.shortcuts.eyebrow")}
              </p>
              <h2>{t("dashboard.summary.commandCenter.shortcuts.title")}</h2>
            </div>
          </div>
          <div className={styles.shortcutGrid}>
            {shortcuts.map((shortcut) => (
              <CommandActionLink
                className={styles.shortcut}
                description={shortcut.description}
                href={shortcut.href}
                icon={shortcut.icon}
                key={shortcut.href}
                label={shortcut.label}
              />
            ))}
          </div>
        </Panel>
      </section>

      <section
        aria-label={t("dashboard.summary.checksum.ariaLabel")}
        className={styles.checksumStrip}
      >
        <div className={styles.checksumLabel}>
          <span>{t("dashboard.summary.checksum.label")}</span>
          <strong>{t("dashboard.summary.checksum.identifier")}</strong>
        </div>
        <div className={styles.checksumFlow}>
          <span className={styles.checksumConfirmed}>
            {summary.financial.confirmed_tickets} {" "}
            {t("dashboard.summary.checksum.confirmedTickets")}
          </span>
          <ArrowRight aria-hidden="true" />
          <span>
            {formatCurrency(summary.financial.total_ticket_sales)} {" "}
            {t("dashboard.summary.checksum.ticketSales")}
          </span>
          <ArrowRight aria-hidden="true" />
          <span className={styles.checksumIncome}>
            {formatCurrency(summary.financial.total_true_income)} {" "}
            {t("dashboard.summary.checksum.trueIncome")}
          </span>
        </div>
        <div className={styles.checksumScope}>
          {t("dashboard.summary.checksum.scope")} · {scopeLabel}
        </div>
      </section>

      <section aria-labelledby="dashboard-financial-title">
        <SectionHeader
          action={
            <span className={styles.sectionMeta}>
              {t("dashboard.summary.financial.source")}
            </span>
          }
          id="dashboard-financial-title"
          title={t("dashboard.summary.financial.title")}
        />
        <Panel className={styles.snapshotPanel}>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span>{t("dashboard.summary.financial.ticketSales.label")}</span>
              <strong>
                {formatCurrency(summary.financial.total_ticket_sales)}
              </strong>
              <small>{t("dashboard.summary.financial.ticketSales.detail")}</small>
            </div>
            <div className={styles.metric}>
              <span>{t("dashboard.summary.financial.trueIncome.label")}</span>
              <strong className={styles.incomeValue}>
                {formatCurrency(summary.financial.total_true_income)}
              </strong>
              <small>{t("dashboard.summary.financial.trueIncome.detail")}</small>
            </div>
            <div className={styles.metric}>
              <span>{t("dashboard.summary.financial.incomeRate.label")}</span>
              <strong>
                {formatPercent(summary.financial.income_rate_percent)}%
              </strong>
              <small>{t("dashboard.summary.financial.incomeRate.detail")}</small>
            </div>
            <div className={styles.metric}>
              <span>
                {t("dashboard.summary.financial.confirmedTickets.label")}
              </span>
              <strong>{summary.financial.confirmed_tickets}</strong>
              <small>
                {t("dashboard.summary.financial.confirmedTickets.detail")}
              </small>
            </div>
          </div>
          <div className={styles.substatList}>
            <div className={styles.substatRow}>
              <span className={styles.substatLabel}>
                {t("dashboard.summary.financial.receivables.label")}
              </span>
              <span className={styles.substatDetail}>
                {summary.financial.customers_with_debt} {" "}
                {t("dashboard.summary.financial.receivables.detail")}
              </span>
              <strong>
                {formatCurrency(summary.financial.total_receivables)}
              </strong>
            </div>
            <div className={styles.substatRow}>
              <span className={styles.substatLabel}>
                {t("dashboard.summary.financial.heldCredit.label")}
              </span>
              <span className={styles.substatDetail}>
                {summary.financial.customers_with_credit} {" "}
                {t("dashboard.summary.financial.heldCredit.detail")}
              </span>
              <strong>
                {formatCurrency(summary.financial.total_held_credit)}
              </strong>
            </div>
          </div>
          <div className={styles.scopeFooter}>
            <span>{t("dashboard.summary.scope.label")}</span>
            <strong>{scopeLabel}</strong>
          </div>
        </Panel>
      </section>

      <section
        aria-label={t("dashboard.summary.operationsAriaLabel")}
        className={styles.operationsGrid}
      >
        <div className={styles.recentColumn}>
          <SectionHeader
            action={
              <Link className={styles.sectionLink} href="/activities">
                {t("dashboard.summary.commandCenter.recent.viewAll")}
                <ArrowRight aria-hidden="true" />
              </Link>
            }
            id="dashboard-recent-activity-title"
            title={t("dashboard.summary.commandCenter.recent.title")}
          />
          <Panel aria-labelledby="dashboard-recent-activity-title">
            <div className={styles.tableNote}>
              <FileCheck2 aria-hidden="true" />
              <span>{t("dashboard.summary.commandCenter.recent.description")}</span>
            </div>
            {summary.recent_activity.length === 0 ? (
              <div className={styles.empty}>
                {t("dashboard.summary.commandCenter.recent.empty")}
              </div>
            ) : (
              <TableScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t(
                          "dashboard.summary.commandCenter.recent.columns.customer",
                        )}
                      </TableHead>
                      <TableHead>
                        {t(
                          "dashboard.summary.commandCenter.recent.columns.activity",
                        )}
                      </TableHead>
                      <TableHead className={styles.referenceColumn}>
                        {t(
                          "dashboard.summary.commandCenter.recent.columns.reference",
                        )}
                      </TableHead>
                      <TableHead className={patterns.textRight}>
                        {t(
                          "dashboard.summary.commandCenter.recent.columns.amount",
                        )}
                      </TableHead>
                      <TableHead className={patterns.textRight}>
                        {t("dashboard.summary.commandCenter.recent.columns.time")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recent_activity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Link
                            className={styles.customerLink}
                            href={`/customers/${activity.customer_id}`}
                          >
                            {activity.customer_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={getActivityTone(activity.type)}>
                            {getActivityTypeLabel(activity.type)}
                          </StatusChip>
                        </TableCell>
                        <TableCell className={styles.referenceColumn}>
                          <span className={styles.activityTitle}>
                            {getActivityTitle(activity)}
                          </span>
                        </TableCell>
                        <TableCell className={styles.numberCell}>
                          {formatSignedCurrency(activity.amount)}
                        </TableCell>
                        <TableCell className={styles.dateCell}>
                          {formatDateTime(activity.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScrollArea>
            )}
          </Panel>
        </div>

        <aside className={styles.debtorColumn}>
          <SectionHeader
            action={
              <Link className={styles.sectionLink} href="/customers">
                {t("appShell.nav.customers")}
                <ArrowRight aria-hidden="true" />
              </Link>
            }
            id="dashboard-top-debtors-title"
            title={t("dashboard.summary.analytics.topDebtors.title")}
          />
          <Panel aria-labelledby="dashboard-top-debtors-title">
            {summary.top_debtors.length === 0 ? (
              <div className={styles.empty}>
                {t("dashboard.summary.analytics.topDebtors.empty")}
              </div>
            ) : (
              <div className={styles.debtorList}>
                {summary.top_debtors.map((debtor, index) => (
                  <Link
                    className={styles.debtorRow}
                    href={`/customers/${debtor.customer_id}`}
                    key={debtor.customer_id}
                  >
                    <span className={styles.debtorRank}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.debtorCopy}>
                      <strong>{debtor.customer_name}</strong>
                      <span>
                        {t(
                          "dashboard.summary.analytics.topDebtors.balanceLabel",
                        )}
                      </span>
                    </span>
                    <strong className={styles.debtorAmount}>
                      {formatCurrency(debtor.outstanding_balance)}
                    </strong>
                  </Link>
                ))}
              </div>
            )}
            <div className={styles.creditSummary}>
              <span className={styles.creditIcon}>
                <WalletCards aria-hidden="true" />
              </span>
              <span className={styles.creditCopy}>
                <strong>{t("dashboard.summary.financial.heldCredit.label")}</strong>
                <span>
                  {summary.financial.customers_with_credit} {" "}
                  {t("dashboard.summary.financial.heldCredit.detail")}
                </span>
              </span>
              <strong className={styles.creditAmount}>
                {formatCurrency(summary.financial.total_held_credit)}
              </strong>
            </div>
          </Panel>
        </aside>
      </section>
    </div>
  )
}
