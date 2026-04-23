import { afterEach, describe, expect, it, vi } from "vitest"

import {
  applyOptimisticPaymentToLedger,
  applyTransactionToBalance,
  cloneLedgerState,
  buildInvoiceSnapshot,
  calculateInvoiceTotal,
  calculateServiceFee,
  getBalanceState,
  getTransactionBalanceDelta,
  rebuildLedger,
  type FinanceLedgerState,
} from "@/lib/finance-core"

describe("finance-core", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("reduces outstanding debt correctly after a partial payment", () => {
    const result = applyTransactionToBalance(1_500_000, 500_000, "PAYMENT")

    expect(result).toEqual({
      nextBalance: 1_000_000,
      balanceState: "debt",
    })
  })

  it("returns credit when a payment overpays the balance", () => {
    const result = applyTransactionToBalance(200_000, 300_000, "PAYMENT")

    expect(result).toEqual({
      nextBalance: -100_000,
      balanceState: "credit",
    })
  })

  it("keeps debt-increasing and debt-reducing transaction directions aligned with finance rules", () => {
    expect(getTransactionBalanceDelta(750_000, "TICKET_PURCHASE")).toBe(750_000)
    expect(getTransactionBalanceDelta(50_000, "ADDITIONAL_FEE")).toBe(50_000)
    expect(getTransactionBalanceDelta(120_000, "REFUND")).toBe(120_000)
    expect(getTransactionBalanceDelta(500_000, "PAYMENT")).toBe(-500_000)
    expect(getTransactionBalanceDelta(80_000, "DISCOUNT")).toBe(-80_000)
  })

  it("derives the correct balance state boundaries", () => {
    expect(getBalanceState(1)).toBe("debt")
    expect(getBalanceState(0)).toBe("settled")
    expect(getBalanceState(-1)).toBe("credit")
  })

  it("rebuilds ledger running balances in chronological order with tickets before payments on ties", () => {
    const baseLedger: FinanceLedgerState = {
      current_balance: 0,
      balance_state: "settled",
      entries: [],
    }

    const rebuilt = rebuildLedger(baseLedger, [
      {
        id: "payment-1",
        entry_type: "payment",
        created_at: new Date("2026-04-10T09:00:00.000Z"),
        content: "Customer paid deposit",
        amount: -400_000,
        running_balance: 0,
      },
      {
        id: "ticket-1",
        entry_type: "ticket",
        created_at: new Date("2026-04-10T09:00:00.000Z"),
        content: "ABC123",
        amount: 1_200_000,
        running_balance: 0,
      },
      {
        id: "adjustment-1",
        entry_type: "adjustment",
        created_at: new Date("2026-04-10T10:00:00.000Z"),
        content: "Manual fee",
        amount: 50_000,
        running_balance: 0,
      },
    ])

    expect(rebuilt.entries.map((entry) => entry.id)).toEqual([
      "ticket-1",
      "payment-1",
      "adjustment-1",
    ])
    expect(rebuilt.entries.map((entry) => entry.running_balance)).toEqual([
      1_200_000,
      800_000,
      850_000,
    ])
    expect(rebuilt.current_balance).toBe(850_000)
    expect(rebuilt.balance_state).toBe("debt")
  })

  it("uses ids as the final sort key when entry types share the same timestamp", () => {
    const baseLedger: FinanceLedgerState = {
      current_balance: 0,
      balance_state: "settled",
      entries: [],
    }

    const rebuilt = rebuildLedger(baseLedger, [
      {
        id: "payment-2",
        entry_type: "payment",
        created_at: new Date("2026-04-10T11:00:00.000Z"),
        content: "Second payment",
        amount: -200_000,
        running_balance: 0,
      },
      {
        id: "payment-1",
        entry_type: "payment",
        created_at: new Date("2026-04-10T11:00:00.000Z"),
        content: "First payment",
        amount: -100_000,
        running_balance: 0,
      },
    ])

    expect(rebuilt.entries.map((entry) => entry.id)).toEqual([
      "payment-1",
      "payment-2",
    ])
  })

  it("appends an optimistic payment and recalculates the customer ledger immediately", () => {
    const ledger: FinanceLedgerState = {
      current_balance: 1_200_000,
      balance_state: "debt",
      entries: [
        {
          id: "ticket-1",
          entry_type: "ticket",
          created_at: new Date("2026-04-10T09:00:00.000Z"),
          content: "ABC123",
          amount: 1_200_000,
          running_balance: 1_200_000,
        },
      ],
    }

    const nextLedger = applyOptimisticPaymentToLedger(ledger, {
      id: "optimistic-1",
      amount: 300_000,
      note: "Customer transferred partial payment",
      created_at: new Date("2026-04-10T10:00:00.000Z"),
    })

    expect(nextLedger.entries).toHaveLength(2)
    expect(nextLedger.entries[1]).toMatchObject({
      id: "optimistic-1",
      entry_type: "payment",
      amount: -300_000,
      running_balance: 900_000,
    })
    expect(nextLedger.current_balance).toBe(900_000)
    expect(nextLedger.balance_state).toBe("debt")
  })

  it("creates default optimistic payment metadata when no id or timestamp is provided", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-10T12:30:00.000Z"))

    const ledger: FinanceLedgerState = {
      current_balance: 100_000,
      balance_state: "debt",
      entries: [
        {
          id: "ticket-1",
          entry_type: "ticket",
          created_at: new Date("2026-04-10T09:00:00.000Z"),
          content: "ABC123",
          amount: 100_000,
          running_balance: 100_000,
        },
      ],
    }

    const nextLedger = applyOptimisticPaymentToLedger(ledger, {
      amount: 100_000,
      note: "Full settlement",
    })

    expect(nextLedger.entries[1]).toMatchObject({
      id: "optimistic-1775824200000",
      created_at: new Date("2026-04-10T12:30:00.000Z"),
      running_balance: 0,
    })
    expect(nextLedger.balance_state).toBe("settled")
  })

  it("clones a confirmed ledger snapshot so rollback can restore a fresh baseline", () => {
    const ledger: FinanceLedgerState = {
      current_balance: 500_000,
      balance_state: "debt",
      entries: [
        {
          id: "ticket-1",
          entry_type: "ticket",
          created_at: new Date("2026-04-10T09:00:00.000Z"),
          content: "ABC123",
          amount: 500_000,
          running_balance: 500_000,
        },
      ],
    }

    const clonedLedger = cloneLedgerState({
      ...ledger,
      customer: {
        id: "customer-1",
        name: "Cong ty Bay Buddy",
        type: "INDIVIDUAL",
        balance: 500_000,
      },
    })

    expect(clonedLedger).toEqual({
      ...ledger,
      customer: {
        id: "customer-1",
        name: "Cong ty Bay Buddy",
        type: "INDIVIDUAL",
        balance: 500_000,
      },
    })
    expect(clonedLedger.customer).not.toBe(ledger.customer)
    expect(clonedLedger.entries).not.toBe(ledger.entries)
    expect(clonedLedger.entries[0]).not.toBe(ledger.entries[0])
    expect(clonedLedger.entries[0].created_at).not.toBe(ledger.entries[0].created_at)
  })

  it("calculates commission as the markup between selling price and net price", () => {
    expect(calculateServiceFee(1_000_000, 1_250_000)).toBe(250_000)
    expect(calculateServiceFee(1_000_000, 1_000_000)).toBe(0)
  })

  it("builds an immutable invoice snapshot from the current customer and ticket state", () => {
    const customer = {
      id: "customer-1",
      name: "Cong ty Bay Buddy",
      address: "1 Nguyen Hue, District 1",
      tax_code: "0312345678",
    }
    const tickets = [
      {
        id: "ticket-1",
        pnr: "ABC123",
        itinerary: "HAN-SGN",
        passengers: [" NGUYEN VAN A ", "TRAN THI B"],
        selling_price: 1_500_000,
      },
      {
        id: "ticket-2",
        pnr: "XYZ789",
        itinerary: "SGN-DAD",
        passengers: [],
        selling_price: 800_000,
      },
    ]

    const snapshot = buildInvoiceSnapshot({
      customer,
      tickets,
      taxAmount: 230_000.125,
      discountAmount: 100_000.119,
    })

    customer.name = "Cong ty da sua"
    customer.address = "Address changed"
    tickets[0].passengers[0] = "MUTATED"

    expect(snapshot).toEqual({
      customer_id: "customer-1",
      customer_name_snapshot: "Cong ty Bay Buddy",
      customer_address_snapshot: "1 Nguyen Hue, District 1",
      customer_tax_code_snapshot: "0312345678",
      items: [
        {
          linked_ticket_id: "ticket-1",
          description: "Flight PNR: ABC123 - HAN/SGN",
          quantity: 1,
          unit_price: 1_500_000,
          unit_price_snapshot: 1_500_000,
          passenger_name_snapshot: "NGUYEN VAN A, TRAN THI B",
          total: 1_500_000,
        },
        {
          linked_ticket_id: "ticket-2",
          description: "Flight PNR: XYZ789 - SGN/DAD",
          quantity: 1,
          unit_price: 800_000,
          unit_price_snapshot: 800_000,
          passenger_name_snapshot: "XYZ789",
          total: 800_000,
        },
      ],
      subtotal: 2_300_000,
      tax_amount: 230_000.13,
      discount_amount: 100_000.12,
      total_amount: 2_430_000.01,
    })
  })

  it("fills optional snapshot fields with finance-safe defaults when source fields are absent", () => {
    const snapshot = buildInvoiceSnapshot({
      customer: {
        id: "customer-2",
        name: "Le Thi B",
      },
      tickets: [
        {
          id: "ticket-3",
          pnr: "LMN456",
          itinerary: "DAD-HAN",
          passengers: ["LE THI B"],
          selling_price: 900_000,
        },
      ],
    })

    expect(snapshot.customer_address_snapshot).toBeNull()
    expect(snapshot.customer_tax_code_snapshot).toBeNull()
    expect(snapshot.tax_amount).toBe(0)
    expect(snapshot.discount_amount).toBe(0)
    expect(snapshot.total_amount).toBe(900_000)
  })

  it("clamps invoice totals at zero when discounts exceed subtotal plus tax", () => {
    expect(calculateInvoiceTotal(100_000, 0, 300_000)).toBe(0)
  })
})
