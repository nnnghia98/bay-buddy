import patterns from "@/styles/ui-patterns.module.css"
import Link from "next/link"
import { CalendarClock, CircleDollarSign, FileWarning, Plane, Users } from "lucide-react"

import { EmptyState, MetricCard, Panel, StatusChip } from "@/components/command-center"
import { InitialsAvatar } from "@/components/operations-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/formatters"
import { fetchTicketInputActivityRows } from "@/lib/server-ticket-activity"
import { getI18n } from "@/locales/server"
import styles from "./activities.module.css"

type PageProps = {
  searchParams?: Promise<{
    from?: string
    to?: string
  }>
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

function getRouteLabel(ticket: {
  departure_code?: string | null
  arrival_code?: string | null
  itinerary?: string | null
}): string {
  if (ticket.departure_code && ticket.arrival_code) {
    return `${ticket.departure_code}-${ticket.arrival_code}`
  }

  return ticket.itinerary ?? "-"
}

export default async function TicketActivityPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const from = resolvedSearchParams?.from ?? ""
  const to = resolvedSearchParams?.to ?? ""
  const [t, rows] = await Promise.all([
    getI18n(),
    fetchTicketInputActivityRows({ from, to }),
  ])
  const totalIncome = rows.reduce((sum, row) => sum + row.ticket.true_income, 0)
  const missingTransactions = rows.filter((row) => !row.transaction).length
  const uniqueCustomerCount = new Set(
    rows.map((row) => row.customer?.id ?? row.ticket.customer_id),
  ).size

  return (
    <div className={`${patterns.page} ${patterns.sectionStack}`}>
      <Panel>
        <div className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.iconTile}>
              <Plane className={patterns.iconSmall} aria-hidden="true" />
            </div>
            <div className={patterns.minWidthZero}>
              <p className={patterns.accentEyebrow}>
                {t("tickets.activity.eyebrow")}
              </p>
              <h1 className={styles.title}>
                {t("tickets.activity.title")}
              </h1>
              <p className={styles.description}>
                {t("tickets.activity.description")}
              </p>
            </div>
          </div>

          <form
            action="/activities"
            className={styles.filters}
            method="get"
          >
            <div className={patterns.fieldStack}>
              <label
                className={patterns.eyebrow}
                htmlFor="ticket-activity-from"
              >
                {t("tickets.activity.filters.from")}
              </label>
              <Input
                defaultValue={from}
                id="ticket-activity-from"
                name="from"
                type="datetime-local"
              />
            </div>
            <div className={patterns.fieldStack}>
              <label
                className={patterns.eyebrow}
                htmlFor="ticket-activity-to"
              >
                {t("tickets.activity.filters.to")}
              </label>
              <Input
                defaultValue={to}
                id="ticket-activity-to"
                name="to"
                type="datetime-local"
              />
            </div>
            <Button className={patterns.alignEnd} type="submit">
              <CalendarClock className={patterns.iconSmall} aria-hidden="true" />
              {t("tickets.activity.filters.apply")}
            </Button>
          </form>
        </div>
      </Panel>

      <div className={patterns.threeColumnGrid}>
        <MetricCard
          icon={Plane}
          label={t("tickets.activity.metrics.tickets")}
          value={rows.length}
        />
        <MetricCard
          icon={Users}
          label={t("tickets.activity.metrics.customers")}
          value={uniqueCustomerCount}
        />
        <MetricCard
          icon={CircleDollarSign}
          label={t("tickets.activity.metrics.value")}
          value={formatCurrency(totalIncome)}
        />
      </div>

      <Panel>
        <div className={styles.listHeader}>
          <div className={patterns.row}>
            <span className={styles.statusDot} aria-hidden="true" />
            <p className={patterns.accentEyebrow}>
              {t("tickets.activity.list.eyebrow")}
            </p>
          </div>
          <span className={styles.reviewStatus}>
            {missingTransactions > 0
              ? t("tickets.activity.list.needsReview")
              : t("tickets.activity.list.reconciled")}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={FileWarning} message={t("tickets.activity.empty")} />
        ) : (
          <ul className={patterns.dividerList} role="list">
            {rows.map((row) => {
              const customerName =
                row.customer?.full_name ?? t("tickets.activity.list.unknownCustomer")
              const transactionId = row.transaction?.id ?? null

              return (
                <li
                  className={styles.activity}
                  key={row.id}
                >
                  <div className={styles.activityGrid}>
                    <div className={styles.customer}>
                      <InitialsAvatar value={customerName} />
                      <div className={patterns.minWidthZero}>
                        <Link
                          className={styles.primaryLink}
                          href={`/customers/${row.ticket.customer_id}`}
                        >
                          {customerName}
                        </Link>
                        <p className={styles.customerId}>
                          #{row.ticket.customer_id.slice(0, 8)}
                        </p>
                        <p className={styles.balancePill}>
                          {row.customer
                            ? formatCurrency(row.customer.current_balance)
                            : t("tickets.activity.list.noBalance")}
                        </p>
                      </div>
                    </div>

                    <div className={patterns.minWidthZero}>
                      <div className={patterns.wrapRow}>
                        <Link
                          className={styles.ticketLink}
                          href={`/tickets/${row.ticket.id}`}
                        >
                          {row.ticket.pnr ?? t("tickets.activity.list.noPnr")}
                        </Link>
                        <StatusChip tone="success">
                          {t(`tickets.statuses.${row.ticket.status}`)}
                        </StatusChip>
                      </div>
                      <p className={styles.route}>
                        {getRouteLabel(row.ticket)}
                      </p>
                      <p className={patterns.supportingText}>
                        {row.ticket.ticket_number ??
                          t("tickets.activity.list.noTicketNumber")}
                      </p>
                    </div>

                    <div className={styles.financial}>
                      <p className={styles.amount}>
                        {formatCurrency(row.ticket.selling_price)}
                      </p>
                      <p className={styles.timestamp}>
                        {formatDateTime(row.added_at)}
                      </p>
                      <div className={styles.transaction}>
                        <StatusChip tone={transactionId ? "info" : "danger"}>
                          {transactionId
                            ? t("tickets.activity.list.transactionLinked")
                            : t("tickets.activity.list.transactionMissing")}
                        </StatusChip>
                        {transactionId ? (
                          <span className={patterns.monoSupporting}>
                            #{transactionId.slice(0, 8)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
