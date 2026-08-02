import "server-only"

import { z } from "zod"

import {
  fetchAuthenticatedApiPayload,
  getEnvelopeData,
} from "@/lib/server-api"
import { paymentMethodOptions, type CustomerLedger } from "@/schemas"

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
  linked_payment_amount: number | null
  linked_payment_note: string | null
  linked_payment_methods: string[]
  linked_payment_transaction_ids: string[]
}

export type LedgerReportRange = {
  from?: string
  to?: string
}

const ticketDebtReportRowSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  customer_phone: z.string().nullable(),
  passenger_names: z.string(),
  entry_type: z.literal("ticket"),
  issued_at: z.string(),
  created_at: z.string(),
  booked_at: z.string().nullable(),
  content: z.string(),
  amount: z.number(),
  running_balance: z.number(),
  ticket_id: z.string().uuid(),
  pnr: z.string().nullable(),
  ticket_number: z.string().nullable(),
  ticket_selling_price: z.number(),
  ticket_discount: z.number(),
  ticket_ev_price: z.number(),
  ticket_ast_price: z.number(),
  ticket_thf_price: z.number(),
  ticket_web_price: z.number(),
  ticket_insurance_price: z.number(),
  ticket_true_income: z.number(),
  airline: z.string().nullable(),
  route: z.string().nullable(),
  flight_date: z.string().nullable(),
  ticket_status: z.string().nullable(),
  transaction_id: z.string().uuid().nullable(),
  transaction_category: z.string().nullable(),
  transaction_method: z.string().nullable(),
  evidence_url: z.string().nullable(),
  linked_payment_amount: z.number().nullable(),
  linked_payment_note: z.string().nullable(),
  linked_payment_methods: z.array(z.string()),
  linked_payment_transaction_ids: z.array(z.string().uuid()),
})

const ticketDebtReportRowsSchema = z.array(ticketDebtReportRowSchema)

function getTicketRoute(ticket: CustomerLedger["entries"][number]["ticket"]): string | null {
  if (!ticket) {
    return null
  }

  if (ticket.departure_code && ticket.arrival_code) {
    return `${ticket.departure_code}-${ticket.arrival_code}`
  }

  return ticket.itinerary ?? null
}

type LinkedPaymentSummary = {
  amount: number
  notes: string[]
  methods: string[]
  transaction_ids: string[]
}

function isPaymentMethod(value: string | null | undefined): boolean {
  return (
    value != null &&
    (paymentMethodOptions as readonly string[]).includes(value)
  )
}

function getManualTicketNote(value: string | null | undefined): string | null {
  const note = value?.trim()

  if (!note || note.startsWith("Auto-debt for ticket ")) {
    return null
  }

  return note
}

function getLinkedPaymentSummaries(
  ledger: CustomerLedger,
): Map<string, LinkedPaymentSummary> {
  const summaries = new Map<string, LinkedPaymentSummary>()

  ledger.entries.forEach((entry) => {
    const transaction = entry.transaction
    const linkedTicketId = transaction?.linked_ticket_id

    if (
      entry.entry_type !== "payment" ||
      transaction?.category !== "PAYMENT" ||
      !linkedTicketId
    ) {
      return
    }

    const summary = summaries.get(linkedTicketId) ?? {
      amount: 0,
      notes: [],
      methods: [],
      transaction_ids: [],
    }
    const note = transaction.note?.trim()
    const method = transaction.method?.trim()

    summary.amount += transaction.amount
    if (note && !summary.notes.includes(note)) {
      summary.notes.push(note)
    }
    if (method && !summary.methods.includes(method)) {
      summary.methods.push(method)
    }
    summary.transaction_ids.push(transaction.id)

    summaries.set(linkedTicketId, summary)
  })

  return summaries
}

export function mapLedgerToReportRows(
  ledger: CustomerLedger,
): LedgerReportRow[] {
  const linkedPaymentSummaries = getLinkedPaymentSummaries(ledger)

  return ledger.entries.map((entry) => {
    const ticket = entry.ticket ?? null
    const transaction = entry.transaction ?? null
    const linkedPaymentSummary = ticket
      ? linkedPaymentSummaries.get(ticket.id)
      : undefined
    const ticketPaymentMethod =
      ticket &&
      transaction?.category === "TICKET_PURCHASE" &&
      isPaymentMethod(transaction.method)
        ? transaction.method
        : null
    const paymentMethods = [...(linkedPaymentSummary?.methods ?? [])]
    const paymentTransactionIds = [
      ...(linkedPaymentSummary?.transaction_ids ?? []),
    ]
    const ticketNote =
      ticket && transaction?.category === "TICKET_PURCHASE"
        ? getManualTicketNote(transaction.note)
        : null

    if (paymentMethods.length === 0 && ticketPaymentMethod) {
      paymentMethods.push(ticketPaymentMethod)
      paymentTransactionIds.push(transaction?.id ?? "")
    }

    return {
      id: entry.id,
      customer_id: ledger.customer.id,
      customer_name: ledger.customer.name,
      customer_phone: ledger.customer.phone ?? null,
      passenger_names: ticket?.passengers.join(", ") ?? entry.content,
      entry_type: entry.entry_type,
      issued_at: entry.created_at.toISOString(),
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
      linked_payment_amount: linkedPaymentSummary?.amount ?? null,
      linked_payment_note:
        linkedPaymentSummary && linkedPaymentSummary.notes.length > 0
          ? linkedPaymentSummary.notes.join("; ")
          : linkedPaymentSummary
            ? null
            : ticketNote,
      linked_payment_methods: paymentMethods,
      linked_payment_transaction_ids: paymentTransactionIds.filter(Boolean),
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
    const rowDate = new Date(row.created_at)

    if (fromDate && rowDate < fromDate) {
      return false
    }

    if (toDate && rowDate > toDate) {
      return false
    }

    return true
  })
}

export async function fetchTicketDebtRows(
  range: LedgerReportRange = {},
): Promise<LedgerReportRow[]> {
  const payload = await fetchAuthenticatedApiPayload(
    "/finance/ticket-debts",
    "Unable to load ticket debts.",
  )
  const rows = ticketDebtReportRowsSchema.parse(getEnvelopeData(payload))

  return filterRowsByRange(rows, range).sort((first, second) =>
    second.created_at.localeCompare(first.created_at),
  )
}

/** @deprecated Use fetchTicketDebtRows for global ticket debt rows. */
export async function fetchLedgerReportRows(
  range: LedgerReportRange = {},
): Promise<LedgerReportRow[]> {
  return fetchTicketDebtRows(range)
}
