import { describe, expect, it } from "vitest"

import { buildFinancialSummarySnapshot } from "@/lib/dashboard"
import type { CustomerDirectoryItem } from "@/schemas/customer"
import type { TicketRead } from "@/schemas/ticket"
import type { TransactionRead } from "@/schemas/transaction"

const customerA: CustomerDirectoryItem = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Cong ty Sen Vang",
  phone: "0900000001",
  current_balance: 18_500_000,
}

const customerB: CustomerDirectoryItem = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Le Thi Mai",
  phone: "0900000002",
  current_balance: -2_000_000,
}

const customerC: CustomerDirectoryItem = {
  id: "33333333-3333-4333-8333-333333333333",
  full_name: "Tran Van Nam",
  phone: "0900000003",
  current_balance: 1_250_000,
}

const ticketA: TicketRead = {
  id: "44444444-4444-4444-8444-444444444444",
  pnr: "ABC123",
  airline: "VNA",
  passengers: ["NGUYEN VAN A"],
  itinerary: "HAN-SGN",
  flight_date: new Date("2026-04-24T02:00:00.000Z"),
  net_price: 1_000_000,
  selling_price: 1_250_000,
  discount: 50_000,
  true_income: 300_000,
  service_fee: 250_000,
  status: "CONFIRMED",
  customer_id: customerA.id,
}

const ticketB: TicketRead = {
  id: "55555555-5555-4555-8555-555555555555",
  pnr: "XYZ789",
  airline: "VJ",
  passengers: ["TRAN THI B"],
  itinerary: "SGN-DAD",
  flight_date: new Date("2026-04-25T02:00:00.000Z"),
  net_price: 800_000,
  selling_price: 950_000,
  discount: 0,
  true_income: 150_000,
  service_fee: 150_000,
  status: "DRAFT",
  customer_id: customerC.id,
}

const ticketC: TicketRead = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  pnr: "LMN456",
  airline: "QH",
  passengers: ["LE THI C"],
  itinerary: "DAD-SGN",
  flight_date: new Date("2026-04-23T02:00:00.000Z"),
  net_price: 700_000,
  selling_price: 900_000,
  discount: 0,
  true_income: 200_000,
  service_fee: 200_000,
  status: "REFUNDED",
  customer_id: customerA.id,
}

const transactions: TransactionRead[] = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    amount: 1_250_000,
    type: "CHARGE",
    category: "TICKET_PURCHASE",
    method: "AUTO",
    note: "ABC123",
    evidence_url: null,
    customer_id: customerA.id,
    linked_ticket_id: ticketA.id,
    is_refund_confirmed: false,
    created_by: "77777777-7777-4777-8777-777777777777",
    created_at: new Date("2026-04-24T04:00:00.000Z"),
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    amount: 500_000,
    type: "PAYMENT",
    category: "PAYMENT",
    method: "BANK_TRANSFER",
    note: "Customer transferred deposit",
    evidence_url: null,
    customer_id: customerB.id,
    linked_ticket_id: null,
    is_refund_confirmed: false,
    created_by: "77777777-7777-4777-8777-777777777777",
    created_at: new Date("2026-04-24T05:00:00.000Z"),
  },
]

describe("buildFinancialSummarySnapshot command center fields", () => {
  it("counts revenue from ledger transactions on or after the cutoff date", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA],
      tickets: [ticketA],
      transactions: [
        transactions[0],
        {
          ...transactions[0],
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          category: "ADDITIONAL_FEE",
          amount: 100_000,
          created_at: new Date("2026-04-26T04:00:00.000Z"),
        },
      ],
      revenueFrom: new Date("2026-04-25T00:00:00.000Z"),
    })

    expect(snapshot.totalRevenue).toBe(100_000)
    expect(snapshot.revenueFromDate).toBe("2026-04-25")
  })

  it("handles zero revenue denominator safely for percentage metrics", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA],
      tickets: [],
      transactions: [],
      revenueFrom: new Date("2026-05-01T00:00:00.000Z"),
    })

    expect(snapshot.totalRevenue).toBe(0)
    expect(snapshot.averageMarginPercent).toBe(0)
    expect(snapshot.receivablesRatioPercent).toBe(0)
  })

  it("builds action queues for debt, credit, and draft ticket work", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA, customerB, customerC],
      tickets: [ticketA, ticketB],
      transactions,
    })

    expect(snapshot.actionQueues).toEqual([
      {
        key: "receivables",
        count: 2,
        amount: 19_750_000,
        href: "/customers",
        severity: "high",
      },
      {
        key: "heldCredit",
        count: 1,
        amount: 2_000_000,
        href: "/customers",
        severity: "medium",
      },
      {
        key: "draftTickets",
        count: 1,
        amount: 950_000,
        href: "/tickets/input",
        severity: "medium",
      },
    ])
  })

  it("keeps the receivables queue available for compact command-center rendering", () => {
    const summary = buildFinancialSummarySnapshot({
      customers: [customerA, customerB, customerC],
      tickets: [ticketA, ticketB],
      transactions,
    })

    expect(summary.actionQueues.some((queue) => queue.key === "receivables")).toBe(true)
  })

  it("builds recent activity sorted newest first", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA, customerB, customerC],
      tickets: [ticketA, ticketB, ticketC],
      transactions,
    })

    expect(snapshot.recentActivity.map((item) => item.id)).toEqual([
      "88888888-8888-4888-8888-888888888888",
      "44444444-4444-4444-8444-444444444444",
      "66666666-6666-4666-8666-666666666666",
    ])
    expect(snapshot.recentActivity[0]).toMatchObject({
      type: "payment",
      title: "Customer transferred deposit",
      amount: -500_000,
      href: `/customers/${customerB.id}`,
    })
    expect(snapshot.recentActivity[1]).toMatchObject({
      type: "ticket",
      title: "ABC123 - HAN-SGN",
      amount: 1_250_000,
      href: `/customers/${customerA.id}`,
    })
  })

  it("keeps blank transaction notes separate from category fallback metadata", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA],
      tickets: [],
      transactions: [
        {
          ...transactions[0],
          id: "99999999-9999-4999-8999-999999999999",
          note: "   ",
        },
      ],
    })

    expect(snapshot.recentActivity[0]).toMatchObject({
      id: "99999999-9999-4999-8999-999999999999",
      type: "ticket",
      category: "TICKET_PURCHASE",
      title: "",
    })
  })

  it("models outbound refunds separately from inbound payments", () => {
    const snapshot = buildFinancialSummarySnapshot({
      customers: [customerA],
      tickets: [ticketA],
      transactions: [
        {
          ...transactions[0],
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          category: "REFUND",
          type: "REFUND",
          amount: 300_000,
          note: "",
          linked_ticket_id: ticketA.id,
          created_at: new Date("2026-04-24T06:00:00.000Z"),
        },
      ],
    })

    expect(snapshot.recentActivity[0]).toMatchObject({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      type: "refund",
      category: "REFUND",
      amount: 300_000,
      title: "",
    })
  })
})
