import "server-only"

import { fetchCustomerDirectory, fetchCustomerLedger } from "@/lib/server-customers"
import type { CustomerLedger } from "@/schemas"

export type LedgerReportRow = {
  id: string
  customer_id: string
  customer_name: string
  customer_phone: string | null
  passenger_names: string
  entry_type: CustomerLedger["entries"][number]["entry_type"]
  issued_at: string
  created_at: string
  booked_at: string | null
  content: string
  amount: number
  running_balance: number
  ticket_id: string | null
  pnr: string | null
  ticket_number: string | null
  ticket_selling_price: number
  ticket_discount: number
  ticket_ev_price: number
  ticket_ast_price: number
  ticket_thf_price: number
  ticket_web_price: number
  ticket_insurance_price: number
  ticket_true_income: number
  airline: string | null
  route: string | null
  flight_date: string | null
  ticket_status: string | null
  transaction_id: string | null
  transaction_category: string | null
  transaction_method: string | null
  evidence_url: string | null
}

export type LedgerReportRange = {
  from?: string
  to?: string
}

function getTicketRoute(ticket: CustomerLedger["entries"][number]["ticket"]): string | null {
  if (!ticket) {
    return null
  }

  if (ticket.departure_code && ticket.arrival_code) {
    return `${ticket.departure_code}-${ticket.arrival_code}`
  }

  return ticket.itinerary ?? null
}

function mapLedgerToReportRows(ledger: CustomerLedger): LedgerReportRow[] {
  return ledger.entries.map((entry) => {
    const ticket = entry.ticket ?? null
    const transaction = entry.transaction ?? null

    return {
      id: entry.id,
      customer_id: ledger.customer.id,
      customer_name: ledger.customer.name,
      customer_phone: ledger.customer.phone ?? null,
      passenger_names: ticket?.passengers.join(", ") ?? entry.content,
      entry_type: entry.entry_type,
      issued_at:
        ticket?.created_at.toISOString() ??
        transaction?.created_at.toISOString() ??
        entry.created_at.toISOString(),
      created_at: entry.created_at.toISOString(),
      booked_at: ticket?.booked_at?.toISOString() ?? null,
      content: entry.content,
      amount: entry.amount,
      running_balance: entry.running_balance,
      ticket_id: ticket?.id ?? null,
      pnr: ticket?.pnr ?? null,
      ticket_number: ticket?.ticket_number ?? null,
      ticket_selling_price: ticket?.selling_price ?? 0,
      ticket_discount: ticket?.discount ?? 0,
      ticket_ev_price: ticket?.ev_price ?? 0,
      ticket_ast_price: ticket?.ast_price ?? 0,
      ticket_thf_price: ticket?.thf_price ?? 0,
      ticket_web_price: ticket?.web_price ?? 0,
      ticket_insurance_price: ticket?.insurance_price ?? 0,
      ticket_true_income: ticket?.true_income ?? 0,
      airline: ticket?.airline ?? null,
      route: getTicketRoute(ticket),
      flight_date: ticket?.flight_date.toISOString() ?? null,
      ticket_status: ticket?.status ?? null,
      transaction_id: transaction?.id ?? null,
      transaction_category: transaction?.category ?? null,
      transaction_method: transaction?.method ?? null,
      evidence_url: transaction?.evidence_url ?? null,
    }
  })
}

function parseRangeDate(value: string | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function parseDateOnlyRange(
  value: string | undefined,
  boundary: "start" | "end",
): Date | null {
  if (!value) {
    return null
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!dateOnlyMatch) {
    return parseRangeDate(value)
  }

  const [, yearValue, monthValue, dayValue] = dateOnlyMatch
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)

  return boundary === "start"
    ? new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0))
    : new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999))
}

function filterRowsByRange(
  rows: LedgerReportRow[],
  range: LedgerReportRange,
): LedgerReportRow[] {
  const fromDate = parseDateOnlyRange(range.from, "start")
  const toDate = parseDateOnlyRange(range.to, "end")

  return rows.filter((row) => {
    const rowDate = new Date(row.issued_at)

    if (fromDate && rowDate < fromDate) {
      return false
    }

    if (toDate && rowDate > toDate) {
      return false
    }

    return true
  })
}

function isNextRedirectError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  )
}

export async function fetchLedgerReportRows(
  range: LedgerReportRange = {},
): Promise<LedgerReportRow[]> {
  const customers = await fetchCustomerDirectory(500)
  const settledLedgers = await Promise.allSettled(
    customers.map((customer) => fetchCustomerLedger(customer.id)),
  )
  const redirectResult = settledLedgers.find(
    (result) =>
      result.status === "rejected" && isNextRedirectError(result.reason),
  )

  if (redirectResult?.status === "rejected") {
    throw redirectResult.reason
  }

  const rows = settledLedgers
    .flatMap((result) =>
      result.status === "fulfilled" ? mapLedgerToReportRows(result.value) : [],
    )
    .sort((first, second) => second.created_at.localeCompare(first.created_at))

  return filterRowsByRange(rows, range)
}
