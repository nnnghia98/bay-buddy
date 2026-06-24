import Link from "next/link"
import type { ComponentType } from "react"
import { CalendarClock, CircleDollarSign, FileWarning, Plane, Users } from "lucide-react"

import { StatusChip } from "@/components/command-center"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/formatters"
import { fetchTicketInputActivityRows } from "@/lib/server-ticket-activity"
import { getI18n } from "@/locales/server"

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

function getInitials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
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

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>
  label: string
  value: string | number
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white p-4 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-200 hover:border-primary/20 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-primary/10 bg-accent text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-2xl font-semibold tracking-normal text-foreground tabular-nums">
          {value}
        </p>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {label}
      </p>
    </div>
  )
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
    <div className="space-y-4 pb-12 text-foreground">
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="grid gap-5 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] xl:items-end">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-primary/15 bg-accent text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Plane className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {t("tickets.activity.eyebrow")}
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-foreground">
                {t("tickets.activity.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("tickets.activity.description")}
              </p>
            </div>
          </div>

          <form
            action="/activities"
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            method="get"
          >
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor="ticket-activity-from"
              >
                {t("tickets.activity.filters.from")}
              </label>
              <input
                className="h-11 w-full rounded-[14px] border border-input bg-white px-3.5 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                defaultValue={from}
                id="ticket-activity-from"
                name="from"
                type="datetime-local"
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor="ticket-activity-to"
              >
                {t("tickets.activity.filters.to")}
              </label>
              <input
                className="h-11 w-full rounded-[14px] border border-input bg-white px-3.5 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                defaultValue={to}
                id="ticket-activity-to"
                name="to"
                type="datetime-local"
              />
            </div>
            <Button className="self-end" type="submit">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {t("tickets.activity.filters.apply")}
            </Button>
          </form>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
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

      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-2 border-b border-border bg-secondary/45 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {t("tickets.activity.list.eyebrow")}
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {missingTransactions > 0
              ? t("tickets.activity.list.needsReview")
              : t("tickets.activity.list.reconciled")}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
              <FileWarning className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("tickets.activity.empty")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border" role="list">
            {rows.map((row) => {
              const customerName =
                row.customer?.full_name ?? t("tickets.activity.list.unknownCustomer")
              const transactionId = row.transaction?.id ?? null

              return (
                <li
                  className="px-5 py-4 transition-colors duration-200 hover:bg-accent/25"
                  key={row.id}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.1fr)_minmax(260px,1fr)_minmax(220px,0.8fr)] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-primary/10 bg-accent text-xs font-semibold text-primary">
                        {getInitials(customerName)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                          href={`/customers/${row.ticket.customer_id}`}
                        >
                          {customerName}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          #{row.ticket.customer_id.slice(0, 8)}
                        </p>
                        <p className="mt-2 inline-flex rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {row.customer
                            ? formatCurrency(row.customer.current_balance)
                            : t("tickets.activity.list.noBalance")}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-mono text-sm font-semibold text-primary hover:underline"
                          href={`/tickets/${row.ticket.id}`}
                        >
                          {row.ticket.pnr ?? t("tickets.activity.list.noPnr")}
                        </Link>
                        <StatusChip tone="success">
                          {t(`tickets.statuses.${row.ticket.status}`)}
                        </StatusChip>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {getRouteLabel(row.ticket)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.ticket.ticket_number ??
                          t("tickets.activity.list.noTicketNumber")}
                      </p>
                    </div>

                    <div className="min-w-0 lg:text-right">
                      <p className="text-base font-semibold text-foreground">
                        {formatCurrency(row.ticket.selling_price)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {formatDateTime(row.added_at)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-end">
                        <StatusChip tone={transactionId ? "info" : "danger"}>
                          {transactionId
                            ? t("tickets.activity.list.transactionLinked")
                            : t("tickets.activity.list.transactionMissing")}
                        </StatusChip>
                        {transactionId ? (
                          <span className="font-mono text-xs text-muted-foreground">
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
      </section>
    </div>
  )
}
