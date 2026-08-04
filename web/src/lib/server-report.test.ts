import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/lib/server-api", () => ({
  fetchAuthenticatedApiPayload: vi.fn(),
  getEnvelopeData: (payload: unknown) =>
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload,
}))

import {
  fetchTicketDebtRows,
  mapLedgerToReportRows,
} from "@/lib/server-report"
import { fetchAuthenticatedApiPayload } from "@/lib/server-api"
import type { CustomerLedger } from "@/schemas"

const mockFetchAuthenticatedApiPayload = vi.mocked(fetchAuthenticatedApiPayload)

beforeEach(() => {
  mockFetchAuthenticatedApiPayload.mockReset()
})

const customerId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
const ticketId = "550e8400-e29b-41d4-a716-446655440000"
const unpaidTicketId = "550e8400-e29b-41d4-a716-446655440001"
const userId = "6ba7b812-9dad-11d1-80b4-00c04fd430c8"

function createTicket(id: string) {
  return {
    id,
    pnr: "ABC123",
    airline: "VNA" as const,
    ticket_number: "7381234567890",
    passengers: ["NGUYEN VAN A"],
    departure_place: null,
    arrival_place: null,
    departure_code: "HAN",
    arrival_code: "SGN",
    itinerary: "HAN-SGN",
    flight_date: new Date("2026-07-30T02:00:00.000Z"),
    booked_at: new Date("2026-07-28T00:00:00.000Z"),
    net_price: 1_000_000,
    ev_price: 0,
    ast_price: 0,
    thf_price: 0,
    web_price: 0,
    insurance_price: 0,
    selling_price: 1_200_000,
    discount: 0,
    true_income: 200_000,
    status: "CONFIRMED" as const,
    customer_id: customerId,
    service_fee: 200_000,
    created_at: new Date("2026-07-28T01:00:00.000Z"),
    updated_at: new Date("2026-07-28T01:00:00.000Z"),
  }
}

function createPayment(
  id: string,
  amount: number,
  note: string,
) {
  return {
    id,
    amount,
    type: "PAYMENT" as const,
    category: "PAYMENT" as const,
    method: "THF",
    note,
    evidence_url: null,
    customer_id: customerId,
    linked_ticket_id: ticketId,
    is_refund_confirmed: false,
    created_at: new Date("2026-07-28T02:00:00.000Z"),
    occurred_at: new Date("2026-07-28T00:00:00.000Z"),
    created_by: userId,
  }
}

function createTicketCharge(id: string, method: string) {
  return {
    id,
    amount: 1_200_000,
    type: "CHARGE" as const,
    category: "TICKET_PURCHASE" as const,
    method,
    note: "Auto-debt for ticket ABC123",
    evidence_url: null,
    customer_id: customerId,
    linked_ticket_id: ticketId,
    is_refund_confirmed: false,
    created_at: new Date("2026-07-28T01:00:00.000Z"),
    occurred_at: new Date("2026-07-28T01:00:00.000Z"),
    created_by: userId,
  }
}

describe("mapLedgerToReportRows", () => {
  it("joins linked payment totals and notes onto ticket rows", () => {
    const ticket = createTicket(ticketId)
    const unpaidTicket = createTicket(unpaidTicketId)
    const firstPayment = createPayment(
      "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
      300_000,
      "First payment",
    )
    const secondPayment = createPayment(
      "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
      200_000,
      "Second payment",
    )
    const ledger: CustomerLedger = {
      customer: {
        id: customerId,
        name: "Nguyen Van A",
        type: "INDIVIDUAL",
        balance: 1_900_000,
        is_active: true,
        phone: null,
      },
      current_balance: 1_900_000,
      balance_state: "debt",
      entries: [
        {
          id: ticket.id,
          entry_type: "ticket",
          created_at: ticket.updated_at,
          content: ticket.pnr,
          amount: ticket.selling_price,
          running_balance: ticket.selling_price,
          ticket,
          transaction: null,
        },
        {
          id: unpaidTicket.id,
          entry_type: "ticket",
          created_at: unpaidTicket.updated_at,
          content: unpaidTicket.pnr,
          amount: unpaidTicket.selling_price,
          running_balance: 2_400_000,
          ticket: unpaidTicket,
          transaction: null,
        },
        {
          id: firstPayment.id,
          entry_type: "payment",
          created_at: firstPayment.created_at,
          content: firstPayment.note,
          amount: -firstPayment.amount,
          running_balance: 2_100_000,
          transaction: firstPayment,
        },
        {
          id: secondPayment.id,
          entry_type: "payment",
          created_at: secondPayment.created_at,
          content: secondPayment.note,
          amount: -secondPayment.amount,
          running_balance: 1_900_000,
          transaction: secondPayment,
        },
      ],
    }

    const rows = mapLedgerToReportRows(ledger)
    const paidTicketRow = rows.find((row) => row.id === ticketId)
    const unpaidTicketRow = rows.find((row) => row.id === unpaidTicketId)

    expect(paidTicketRow).toMatchObject({
      linked_payment_amount: 500_000,
      linked_payment_note: "First payment; Second payment",
      linked_payment_methods: ["THF"],
      linked_payment_transaction_ids: [
        "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
      ],
    })
    expect(unpaidTicketRow).toMatchObject({
      linked_payment_amount: null,
      linked_payment_note: null,
      linked_payment_methods: [],
      linked_payment_transaction_ids: [],
    })
  })

  it("uses the ticket charge method when no linked payment exists", () => {
    const ticket = createTicket(ticketId)
    const charge = createTicketCharge(
      "6ba7b815-9dad-11d1-80b4-00c04fd430c8",
      "AST",
    )
    const ledger: CustomerLedger = {
      customer: {
        id: customerId,
        name: "Nguyen Van A",
        type: "INDIVIDUAL",
        balance: 1_200_000,
        is_active: true,
        phone: null,
      },
      current_balance: 1_200_000,
      balance_state: "debt",
      entries: [
        {
          id: ticket.id,
          entry_type: "ticket",
          created_at: ticket.updated_at,
          content: ticket.pnr,
          amount: ticket.selling_price,
          running_balance: ticket.selling_price,
          ticket,
          transaction: charge,
        },
      ],
    }

    const [row] = mapLedgerToReportRows(ledger)

    expect(row).toMatchObject({
      linked_payment_note: null,
      linked_payment_methods: ["AST"],
      linked_payment_transaction_ids: [charge.id],
    })
  })

  it("does not expose the legacy Ticket value as a payment method", () => {
    const ticket = createTicket(ticketId)
    const charge = createTicketCharge(
      "6ba7b817-9dad-11d1-80b4-00c04fd430c8",
      "Ticket",
    )
    const ledger: CustomerLedger = {
      customer: {
        id: customerId,
        name: "Nguyen Van A",
        type: "INDIVIDUAL",
        balance: 1_200_000,
        is_active: true,
        phone: null,
      },
      current_balance: 1_200_000,
      balance_state: "debt",
      entries: [
        {
          id: ticket.id,
          entry_type: "ticket",
          created_at: ticket.updated_at,
          content: ticket.pnr,
          amount: ticket.selling_price,
          running_balance: ticket.selling_price,
          ticket,
          transaction: charge,
        },
      ],
    }

    const [row] = mapLedgerToReportRows(ledger)

    expect(row).toMatchObject({
      transaction_method: null,
      linked_payment_methods: [],
      linked_payment_transaction_ids: [],
    })
  })

  it("shows a manually edited ticket note when no payment is linked", () => {
    const ticket = createTicket(ticketId)
    const charge = createTicketCharge(
      "6ba7b816-9dad-11d1-80b4-00c04fd430c8",
      "AST",
    )
    charge.note = "Customer requested an invoice copy"
    const ledger: CustomerLedger = {
      customer: {
        id: customerId,
        name: "Nguyen Van A",
        type: "INDIVIDUAL",
        balance: 1_200_000,
        is_active: true,
        phone: null,
      },
      current_balance: 1_200_000,
      balance_state: "debt",
      entries: [
        {
          id: ticket.id,
          entry_type: "ticket",
          created_at: ticket.updated_at,
          content: ticket.pnr,
          amount: ticket.selling_price,
          running_balance: ticket.selling_price,
          ticket,
          transaction: charge,
        },
      ],
    }

    const [row] = mapLedgerToReportRows(ledger)

    expect(row.linked_payment_note).toBe("Customer requested an invoice copy")
  })
})

describe("fetchTicketDebtRows", () => {
  it("loads all ticket rows from the global endpoint and keeps the end date inclusive", async () => {
    const ticket = createTicket(ticketId)
    ticket.created_at = new Date("2026-07-20T12:00:00.000Z")
    ticket.updated_at = new Date("2026-07-28T12:00:00.000Z")
    const ledger: CustomerLedger = {
      customer: {
        id: customerId,
        name: "Nguyen Van A",
        type: "INDIVIDUAL",
        balance: 1_200_000,
        is_active: true,
        phone: null,
      },
      current_balance: 1_200_000,
      balance_state: "debt",
      entries: [
        {
          id: ticket.id,
          entry_type: "ticket",
          created_at: ticket.updated_at,
          content: ticket.pnr,
          amount: ticket.selling_price,
          running_balance: ticket.selling_price,
          ticket,
          transaction: null,
        },
      ],
    }
    const row = mapLedgerToReportRows(ledger)[0]

    mockFetchAuthenticatedApiPayload.mockResolvedValue({
      success: true,
      data: [row],
      error: null,
    })

    const rows = await fetchTicketDebtRows({
      from: "2026-07-28",
      to: "2026-07-28",
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(ticketId)
    expect(rows[0].created_at).toBe("2026-07-20T12:00:00.000Z")
    expect(rows[0].updated_at).toBe("2026-07-28T12:00:00.000Z")
    expect(mockFetchAuthenticatedApiPayload).toHaveBeenCalledWith(
      "/finance/ticket-debts",
      "Unable to load ticket debts.",
    )
  })
})
